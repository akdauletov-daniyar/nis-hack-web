"""Hybrid tourism recommender with matrix factorization + density-aware ranking."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import torch
from torch import nn
from torch.utils.data import DataLoader, Dataset


@dataclass
class RecommenderConfig:
    latent_dim: int = 32
    learning_rate: float = 1e-2
    epochs: int = 30
    batch_size: int = 256
    density_alpha: float = 0.3
    l2_reg: float = 1e-5
    device: str | None = None


class InteractionDataset(Dataset):
    def __init__(
        self,
        user_idx: np.ndarray,
        item_idx: np.ndarray,
        ratings: np.ndarray,
        density_norm: np.ndarray,
    ) -> None:
        self.user_idx = torch.as_tensor(user_idx, dtype=torch.long)
        self.item_idx = torch.as_tensor(item_idx, dtype=torch.long)
        self.ratings = torch.as_tensor(ratings, dtype=torch.float32)
        self.density_norm = torch.as_tensor(density_norm, dtype=torch.float32)

    def __len__(self) -> int:
        return int(self.user_idx.shape[0])

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, ...]:
        return (
            self.user_idx[idx],
            self.item_idx[idx],
            self.ratings[idx],
            self.density_norm[idx],
        )


class MatrixFactorizationModel(nn.Module):
    def __init__(self, num_users: int, num_items: int, latent_dim: int) -> None:
        super().__init__()
        self.user_embedding = nn.Embedding(num_users, latent_dim)
        self.item_embedding = nn.Embedding(num_items, latent_dim)
        self.user_bias = nn.Embedding(num_users, 1)
        self.item_bias = nn.Embedding(num_items, 1)
        self.global_bias = nn.Parameter(torch.zeros(1))

        nn.init.normal_(self.user_embedding.weight, std=0.02)
        nn.init.normal_(self.item_embedding.weight, std=0.02)
        nn.init.zeros_(self.user_bias.weight)
        nn.init.zeros_(self.item_bias.weight)

    def forward(self, user_idx: torch.Tensor, item_idx: torch.Tensor) -> torch.Tensor:
        user_vec = self.user_embedding(user_idx)
        item_vec = self.item_embedding(item_idx)
        dot = (user_vec * item_vec).sum(dim=1)
        bias = self.user_bias(user_idx).squeeze(1) + self.item_bias(item_idx).squeeze(1)
        return dot + bias + self.global_bias


class HybridTourismRecommender:
    """Density-aware collaborative filtering model for POI recommendation."""

    def __init__(self, config: RecommenderConfig | None = None) -> None:
        self.config = config or RecommenderConfig()
        self.device = torch.device(
            self.config.device or ("cuda" if torch.cuda.is_available() else "cpu")
        )

        self.model: MatrixFactorizationModel | None = None
        self.user_to_idx: dict[str, int] = {}
        self.idx_to_user: dict[int, str] = {}
        self.item_to_idx: dict[str, int] = {}
        self.idx_to_item: dict[int, str] = {}

        self.user_seen_items: dict[str, set[str]] = {}
        self.item_density_avg: dict[str, float] = {}
        self.item_rating_avg: dict[str, float] = {}
        self.global_rating_mean: float = 3.0
        self.density_min: float = 0.0
        self.density_max: float = 1.0

    def fit(
        self,
        interactions: pd.DataFrame,
        user_col: str = "user_id",
        item_col: str = "location_id",
        rating_col: str = "rating",
        density_col: str = "visitor_count",
    ) -> dict[str, Any]:
        required = {user_col, item_col, rating_col, density_col}
        missing = [col for col in required if col not in interactions.columns]
        if missing:
            raise ValueError(f"Missing required columns for recommender fit: {missing}")

        train = interactions[[user_col, item_col, rating_col, density_col]].copy()
        train = train.dropna()
        train[user_col] = train[user_col].astype(str)
        train[item_col] = train[item_col].astype(str)
        train[rating_col] = pd.to_numeric(train[rating_col], errors="coerce")
        train[density_col] = pd.to_numeric(train[density_col], errors="coerce")
        train = train.dropna()

        if train.empty:
            raise ValueError("No valid rows available to train recommender.")

        users = sorted(train[user_col].unique().tolist())
        items = sorted(train[item_col].unique().tolist())

        self.user_to_idx = {u: i for i, u in enumerate(users)}
        self.idx_to_user = {i: u for u, i in self.user_to_idx.items()}
        self.item_to_idx = {i: j for j, i in enumerate(items)}
        self.idx_to_item = {j: i for i, j in self.item_to_idx.items()}

        self.user_seen_items = (
            train.groupby(user_col)[item_col].apply(lambda s: set(s.tolist())).to_dict()
        )
        self.item_density_avg = train.groupby(item_col)[density_col].mean().to_dict()
        self.item_rating_avg = train.groupby(item_col)[rating_col].mean().to_dict()
        self.global_rating_mean = float(train[rating_col].mean())

        self.density_min = float(train[density_col].min())
        self.density_max = float(train[density_col].max())

        user_idx = train[user_col].map(self.user_to_idx).to_numpy(dtype=np.int64)
        item_idx = train[item_col].map(self.item_to_idx).to_numpy(dtype=np.int64)
        ratings = train[rating_col].to_numpy(dtype=np.float32)
        density = train[density_col].to_numpy(dtype=np.float32)
        density_norm = self._normalize_density(density)

        dataset = InteractionDataset(user_idx, item_idx, ratings, density_norm)
        loader = DataLoader(dataset, batch_size=self.config.batch_size, shuffle=True)

        self.model = MatrixFactorizationModel(
            num_users=len(self.user_to_idx),
            num_items=len(self.item_to_idx),
            latent_dim=self.config.latent_dim,
        ).to(self.device)

        optimizer = torch.optim.AdamW(
            self.model.parameters(),
            lr=self.config.learning_rate,
            weight_decay=self.config.l2_reg,
        )

        history: list[float] = []
        self.model.train()
        for _ in range(self.config.epochs):
            running_loss = 0.0
            total = 0

            for users_b, items_b, ratings_b, density_b in loader:
                users_b = users_b.to(self.device)
                items_b = items_b.to(self.device)
                ratings_b = ratings_b.to(self.device)
                density_b = density_b.to(self.device)

                preds = self.model(users_b, items_b)
                mse = (preds - ratings_b) ** 2

                weighted_mse = mse * (1.0 + self.config.density_alpha * density_b)
                over_tourism_penalty = torch.relu(preds - 3.5) * density_b
                loss = weighted_mse.mean() + (self.config.density_alpha * over_tourism_penalty.mean())

                optimizer.zero_grad()
                loss.backward()
                optimizer.step()

                batch_size = users_b.shape[0]
                running_loss += float(loss.detach().cpu()) * batch_size
                total += batch_size

            history.append(running_loss / max(total, 1))

        return {
            "epochs": self.config.epochs,
            "final_loss": history[-1] if history else None,
            "history": history,
            "num_users": len(self.user_to_idx),
            "num_items": len(self.item_to_idx),
        }

    def recommend(
        self,
        user_id: str,
        top_k: int = 5,
        candidate_locations: list[str] | None = None,
        density_overrides: dict[str, float] | None = None,
        exclude_known: bool = True,
    ) -> list[dict[str, float | str]]:
        if self.model is None:
            raise RuntimeError("Recommender has not been trained yet.")

        candidate_locations = candidate_locations or list(self.item_to_idx.keys())
        density_overrides = density_overrides or {}

        seen = self.user_seen_items.get(user_id, set()) if exclude_known else set()
        output: list[dict[str, float | str]] = []

        for location_id in candidate_locations:
            if location_id in seen:
                continue

            predicted = self._predict_raw(user_id, location_id)
            density_value = float(
                density_overrides.get(
                    location_id,
                    self.item_density_avg.get(location_id, self.density_min),
                )
            )
            density_norm = float(self._normalize_density(np.asarray([density_value], dtype=np.float32))[0])

            final_score = predicted - (self.config.density_alpha * density_norm)
            output.append(
                {
                    "location_id": location_id,
                    "predicted_rating": float(predicted),
                    "density_penalty": float(self.config.density_alpha * density_norm),
                    "final_score": float(final_score),
                }
            )

        output.sort(key=lambda row: row["final_score"], reverse=True)
        return output[: max(top_k, 1)]

    def _predict_raw(self, user_id: str, location_id: str) -> float:
        if self.model is None:
            raise RuntimeError("Recommender has not been trained yet.")

        user_known = user_id in self.user_to_idx
        item_known = location_id in self.item_to_idx

        if not user_known and not item_known:
            return self.global_rating_mean

        if not user_known and item_known:
            return float(self.item_rating_avg.get(location_id, self.global_rating_mean))

        if user_known and not item_known:
            return self.global_rating_mean

        assert user_known and item_known
        self.model.eval()
        with torch.no_grad():
            user_tensor = torch.tensor([self.user_to_idx[user_id]], dtype=torch.long, device=self.device)
            item_tensor = torch.tensor([self.item_to_idx[location_id]], dtype=torch.long, device=self.device)
            pred = self.model(user_tensor, item_tensor)
            return float(pred.detach().cpu().item())

    def _normalize_density(self, density_values: np.ndarray) -> np.ndarray:
        denom = max(self.density_max - self.density_min, 1e-8)
        return (density_values - self.density_min) / denom

    def save(self, path: str | Path) -> None:
        if self.model is None:
            raise RuntimeError("Cannot save an untrained recommender model.")

        state = {
            "model_state_dict": self.model.state_dict(),
            "config": self.config.__dict__,
            "user_to_idx": self.user_to_idx,
            "item_to_idx": self.item_to_idx,
            "user_seen_items": {k: list(v) for k, v in self.user_seen_items.items()},
            "item_density_avg": self.item_density_avg,
            "item_rating_avg": self.item_rating_avg,
            "global_rating_mean": self.global_rating_mean,
            "density_min": self.density_min,
            "density_max": self.density_max,
        }
        torch.save(state, path)

    @classmethod
    def load(cls, path: str | Path) -> "HybridTourismRecommender":
        checkpoint = torch.load(path, map_location="cpu")
        config = RecommenderConfig(**checkpoint["config"])
        instance = cls(config=config)

        instance.user_to_idx = checkpoint["user_to_idx"]
        instance.idx_to_user = {i: u for u, i in instance.user_to_idx.items()}
        instance.item_to_idx = checkpoint["item_to_idx"]
        instance.idx_to_item = {i: u for u, i in instance.item_to_idx.items()}

        instance.user_seen_items = {
            k: set(v) for k, v in checkpoint.get("user_seen_items", {}).items()
        }
        instance.item_density_avg = checkpoint.get("item_density_avg", {})
        instance.item_rating_avg = checkpoint.get("item_rating_avg", {})
        instance.global_rating_mean = float(checkpoint.get("global_rating_mean", 3.0))
        instance.density_min = float(checkpoint.get("density_min", 0.0))
        instance.density_max = float(checkpoint.get("density_max", 1.0))

        instance.model = MatrixFactorizationModel(
            num_users=len(instance.user_to_idx),
            num_items=len(instance.item_to_idx),
            latent_dim=instance.config.latent_dim,
        )
        instance.model.load_state_dict(checkpoint["model_state_dict"])
        instance.model.to(instance.device)
        instance.model.eval()
        return instance
