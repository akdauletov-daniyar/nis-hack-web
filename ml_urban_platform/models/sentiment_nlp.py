"""Transformer-based sentiment model for city branding analytics."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import torch
from sklearn.metrics import accuracy_score, classification_report
from torch.utils.data import DataLoader, Dataset
from transformers import AutoModelForSequenceClassification, AutoTokenizer

LABEL2ID = {"Negative": 0, "Neutral": 1, "Positive": 2}
ID2LABEL = {v: k for k, v in LABEL2ID.items()}


class TextClassificationDataset(Dataset):
    def __init__(
        self,
        texts: list[str],
        labels: list[int],
        tokenizer: AutoTokenizer,
        max_length: int,
    ) -> None:
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self) -> int:
        return len(self.texts)

    def __getitem__(self, idx: int) -> dict[str, torch.Tensor]:
        encoded = self.tokenizer(
            self.texts[idx],
            max_length=self.max_length,
            truncation=True,
            padding="max_length",
            return_tensors="pt",
        )
        item = {k: v.squeeze(0) for k, v in encoded.items()}
        item["labels"] = torch.tensor(self.labels[idx], dtype=torch.long)
        return item


class CityBrandSentimentAnalyzer:
    """Simple train/infer wrapper around HuggingFace sequence classifiers."""

    def __init__(
        self,
        model_name: str = "distilbert-base-uncased",
        max_length: int = 128,
        device: str | None = None,
    ) -> None:
        self.model_name = model_name
        self.max_length = max_length
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))

        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            model_name,
            num_labels=3,
            id2label=ID2LABEL,
            label2id=LABEL2ID,
            ignore_mismatched_sizes=True,
        ).to(self.device)

    @staticmethod
    def encode_labels(labels: list[str]) -> list[int]:
        encoded = []
        for label in labels:
            if label not in LABEL2ID:
                encoded.append(LABEL2ID["Neutral"])
            else:
                encoded.append(LABEL2ID[label])
        return encoded

    def train(
        self,
        texts: list[str],
        labels: list[str] | list[int],
        epochs: int = 1,
        batch_size: int = 8,
        learning_rate: float = 2e-5,
    ) -> dict[str, Any]:
        if not texts:
            raise ValueError("No training texts provided for sentiment model.")

        if labels and isinstance(labels[0], str):
            encoded_labels = self.encode_labels(labels)  # type: ignore[arg-type]
        else:
            encoded_labels = [int(x) for x in labels]  # type: ignore[arg-type]

        dataset = TextClassificationDataset(
            texts=texts,
            labels=encoded_labels,
            tokenizer=self.tokenizer,
            max_length=self.max_length,
        )
        loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

        optimizer = torch.optim.AdamW(self.model.parameters(), lr=learning_rate)
        history: list[float] = []

        self.model.train()
        for _ in range(epochs):
            running_loss = 0.0
            total = 0
            for batch in loader:
                batch = {k: v.to(self.device) for k, v in batch.items()}
                outputs = self.model(**batch)
                loss = outputs.loss

                optimizer.zero_grad()
                loss.backward()
                optimizer.step()

                bsz = batch["labels"].shape[0]
                running_loss += float(loss.detach().cpu()) * bsz
                total += bsz

            history.append(running_loss / max(total, 1))

        return {
            "epochs": epochs,
            "final_loss": history[-1] if history else None,
            "history": history,
        }

    def predict(self, texts: list[str], batch_size: int = 16) -> list[dict[str, float | str]]:
        if not texts:
            return []

        self.model.eval()
        outputs: list[dict[str, float | str]] = []

        with torch.no_grad():
            for i in range(0, len(texts), batch_size):
                chunk = texts[i : i + batch_size]
                encoded = self.tokenizer(
                    chunk,
                    padding=True,
                    truncation=True,
                    max_length=self.max_length,
                    return_tensors="pt",
                )
                encoded = {k: v.to(self.device) for k, v in encoded.items()}
                logits = self.model(**encoded).logits
                probs = torch.softmax(logits, dim=-1).detach().cpu().numpy()

                for row in probs:
                    best_idx = int(np.argmax(row))
                    outputs.append(
                        {
                            "label": ID2LABEL[best_idx],
                            "score": float(row[best_idx]),
                            "negative": float(row[LABEL2ID["Negative"]]),
                            "neutral": float(row[LABEL2ID["Neutral"]]),
                            "positive": float(row[LABEL2ID["Positive"]]),
                        }
                    )

        return outputs

    def evaluate(
        self,
        texts: list[str],
        labels: list[str] | list[int],
        batch_size: int = 16,
    ) -> dict[str, Any]:
        if labels and isinstance(labels[0], str):
            y_true = self.encode_labels(labels)  # type: ignore[arg-type]
        else:
            y_true = [int(x) for x in labels]  # type: ignore[arg-type]

        predictions = self.predict(texts, batch_size=batch_size)
        y_pred = [LABEL2ID[p["label"]] for p in predictions]

        return {
            "accuracy": float(accuracy_score(y_true, y_pred)),
            "report": classification_report(
                y_true,
                y_pred,
                target_names=["Negative", "Neutral", "Positive"],
                zero_division=0,
            ),
        }

    def save(self, output_dir: str | Path) -> None:
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        self.tokenizer.save_pretrained(output_path)
        self.model.save_pretrained(output_path)

    @classmethod
    def load(cls, model_dir: str | Path, device: str | None = None) -> "CityBrandSentimentAnalyzer":
        model_dir = str(model_dir)
        instance = cls(model_name=model_dir, device=device)
        return instance


def train_from_dataframe(
    frame: pd.DataFrame,
    model_name: str = "distilbert-base-uncased",
    text_col: str = "post_content",
    label_col: str = "sentiment_label",
    epochs: int = 1,
    batch_size: int = 8,
    learning_rate: float = 2e-5,
) -> tuple[CityBrandSentimentAnalyzer, dict[str, Any]]:
    texts = frame[text_col].fillna("").astype(str).tolist()
    labels = frame[label_col].fillna("Neutral").astype(str).tolist()

    model = CityBrandSentimentAnalyzer(model_name=model_name)
    metrics = model.train(
        texts=texts,
        labels=labels,
        epochs=epochs,
        batch_size=batch_size,
        learning_rate=learning_rate,
    )
    return model, metrics
