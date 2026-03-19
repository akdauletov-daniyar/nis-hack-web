"""Anomaly detection pipeline for utility leak/fraud/sensor-failure alerts."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Mapping, Sequence

import joblib
import numpy as np
import pandas as pd
from numpy.typing import NDArray
from sklearn.ensemble import IsolationForest
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

from .preprocessing import DataProcessor

IntArray = NDArray[np.int64]


class AnomalyDetector:
    """Detects anomalous utility behavior using Isolation Forest.

    The model is trained primarily on normal operational samples (`Anomaly_Label=0`)
    and returns binary flags where 1 indicates anomaly.
    """

    def __init__(
        self,
        *,
        processor: DataProcessor,
        feature_columns: Sequence[str],
        label_column: str = "Anomaly_Label",
        categorical_columns: Sequence[str] | None = None,
        contamination: float = 0.02,
        random_state: int = 42,
        model_params: Mapping[str, Any] | None = None,
    ) -> None:
        """Initialize anomaly detector.

        Args:
            processor: Shared data processor for feature preparation.
            feature_columns: Feature set for anomaly scoring.
            label_column: Binary label column (1 anomaly, 0 normal) when available.
            categorical_columns: Optional explicit categorical list.
            contamination: Expected anomaly ratio.
            random_state: Reproducibility seed.
            model_params: Optional model override dictionary.
        """

        self.processor = processor
        self.feature_columns = list(feature_columns)
        self.label_column = label_column
        self.categorical_columns = list(categorical_columns or [])

        defaults: dict[str, Any] = {
            "n_estimators": 400,
            "contamination": contamination,
            "random_state": random_state,
            "n_jobs": -1,
        }
        defaults.update(model_params or {})
        self.model = IsolationForest(**defaults)

        self.is_trained_ = False

    def train(self, dataframe: pd.DataFrame, *, train_on_normal_only: bool = True) -> None:
        """Train anomaly detector.

        Args:
            dataframe: Input dataset including normal/anomalous operating points.
            train_on_normal_only: Restrict fitting to `Anomaly_Label == 0`
                when label is present, which is recommended for leak/fraud
                detection baselines.
        """

        prepared = self.processor.prepare_frame(dataframe)

        if train_on_normal_only and self.label_column in prepared.columns:
            training_frame = prepared[prepared[self.label_column].astype(int) == 0].copy()
            if training_frame.empty:
                raise ValueError("No normal samples found for anomaly model training.")
        else:
            training_frame = prepared

        feature_matrix = self.processor.fit_transform(
            training_frame,
            self.feature_columns,
            categorical_columns=self.categorical_columns,
        )

        self.model.fit(feature_matrix)
        self.is_trained_ = True

    def predict(
        self,
        input_data: pd.DataFrame | Mapping[str, Any] | Sequence[Mapping[str, Any]],
    ) -> IntArray:
        """Predict anomaly flags for one record or a batch.

        Returns:
            Array of `0` (normal) and `1` (anomaly) values.
        """

        if not self.is_trained_:
            raise RuntimeError("Anomaly detector is not trained. Call train() first.")

        frame = self._to_dataframe(input_data)
        prepared = self.processor.prepare_frame(frame)

        feature_matrix = self.processor.transform(prepared)
        raw_predictions = self.model.predict(feature_matrix)

        # IsolationForest outputs 1 for inliers and -1 for outliers.
        anomaly_flags = np.where(raw_predictions == -1, 1, 0)
        return anomaly_flags.astype(np.int64)

    def evaluate(self, dataframe: pd.DataFrame) -> dict[str, float]:
        """Evaluate anomaly detector on a labeled dataset."""

        if not self.is_trained_:
            raise RuntimeError("Anomaly detector is not trained. Call train() first.")

        prepared = self.processor.prepare_frame(dataframe)
        if self.label_column not in prepared.columns:
            raise ValueError(f"Missing label column '{self.label_column}' for evaluation.")

        y_true = prepared[self.label_column].astype(int).to_numpy()
        y_pred = self.predict(prepared)

        return {
            "accuracy": float(accuracy_score(y_true, y_pred)),
            "precision": float(precision_score(y_true, y_pred, zero_division=0)),
            "recall": float(recall_score(y_true, y_pred, zero_division=0)),
            "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        }

    def save(self, output_path: str | Path) -> Path:
        """Persist trained anomaly detector."""

        if not self.is_trained_:
            raise RuntimeError("Anomaly detector is not trained. Train before saving.")

        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, path)
        return path

    @classmethod
    def load(cls, model_path: str | Path) -> "AnomalyDetector":
        """Load serialized anomaly detector artifact."""

        model = joblib.load(Path(model_path))
        if not isinstance(model, cls):
            raise TypeError("Loaded artifact is not an AnomalyDetector instance.")
        return model

    @staticmethod
    def _to_dataframe(
        input_data: pd.DataFrame | Mapping[str, Any] | Sequence[Mapping[str, Any]],
    ) -> pd.DataFrame:
        """Normalize inference payloads into dataframe format."""

        if isinstance(input_data, pd.DataFrame):
            return input_data.copy()
        if isinstance(input_data, Mapping):
            return pd.DataFrame([dict(input_data)])
        return pd.DataFrame([dict(item) for item in input_data])
