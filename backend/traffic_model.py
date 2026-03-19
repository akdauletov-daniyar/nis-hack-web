"""Traffic congestion classifier with pluggable model backend.

The default implementation uses an ensemble model (RandomForest) as a robust
baseline. The backend interface is intentionally simple so it can be replaced
with a sequence model (e.g., BiLSTM) later.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Protocol, Sequence

import joblib
import numpy as np
import pandas as pd
from numpy.typing import NDArray
from sklearn.ensemble import RandomForestClassifier

try:
    from data_preprocessing import (
        FEATURE_COLUMNS,
        TARGET_COLUMN,
        TrafficInputRow,
        build_preprocessing_pipeline,
        validate_feature_schema,
    )
except ImportError:  # pragma: no cover - supports package-style imports.
    from .data_preprocessing import (  # type: ignore[no-redef]
        FEATURE_COLUMNS,
        TARGET_COLUMN,
        TrafficInputRow,
        build_preprocessing_pipeline,
        validate_feature_schema,
    )


class ModelBackend(Protocol):
    """Protocol for swappable traffic classifiers (RF now, BiLSTM later)."""

    def fit(self, X: NDArray[np.float64], y: Sequence[str]) -> "ModelBackend":
        """Train the classifier."""

    def predict(self, X: NDArray[np.float64]) -> NDArray[np.str_]:
        """Predict congestion label for each sample."""


@dataclass
class RandomForestBackend:
    """Baseline ensemble backend for multi-class congestion prediction.

    Random forest is robust to mixed feature interactions (speed, occupancy,
    weather/light state, and incident shock signals) and serves as a strong
    tabular benchmark before introducing sequence architectures.
    """

    n_estimators: int = 400
    max_depth: int | None = 18
    min_samples_leaf: int = 1
    random_state: int = 42

    def __post_init__(self) -> None:
        self.estimator = RandomForestClassifier(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            min_samples_leaf=self.min_samples_leaf,
            class_weight="balanced",
            n_jobs=-1,
            random_state=self.random_state,
        )

    def fit(self, X: NDArray[np.float64], y: Sequence[str]) -> "RandomForestBackend":
        self.estimator.fit(X, y)
        return self

    def predict(self, X: NDArray[np.float64]) -> NDArray[np.str_]:
        predictions = self.estimator.predict(X)
        return predictions.astype(str)


class TrafficCongestionPredictor:
    """End-to-end trainer/inference wrapper for traffic congestion levels.

    Input metrics include direct traffic state (speed/occupancy/flow), control
    state (traffic light), exogenous stressors (weather/accident/sentiment),
    and environmental/acoustic stress proxies (CO2/horn events).
    """

    def __init__(self, model_backend: ModelBackend | None = None) -> None:
        self.preprocessor = build_preprocessing_pipeline()
        self.model_backend: ModelBackend = model_backend or RandomForestBackend()
        self._is_fitted = False

    def train(self, training_data: pd.DataFrame) -> None:
        """Train the model on a labeled dataframe.

        Parameters:
            training_data: Frame containing all required feature columns plus
                `Traffic_Congestion_Level` target labels (`Low`, `Medium`, `High`).
        """

        validate_feature_schema(training_data)
        if TARGET_COLUMN not in training_data.columns:
            raise ValueError(
                f"Training data must include target column '{TARGET_COLUMN}'."
            )

        X = training_data.loc[:, FEATURE_COLUMNS].copy()
        y = training_data.loc[:, TARGET_COLUMN].astype(str).to_numpy()

        transformed_features = self.preprocessor.fit_transform(X)
        transformed_array = np.asarray(transformed_features, dtype=np.float64)

        self.model_backend.fit(transformed_array, y)
        self._is_fitted = True

    def predict(self, input_data: pd.DataFrame | Mapping[str, Any] | TrafficInputRow) -> list[str]:
        """Predict congestion class for batch or single real-time payload."""

        if not self._is_fitted:
            raise RuntimeError("Model is not trained. Call train() before predict().")

        feature_frame = self._normalize_input(input_data)
        transformed_features = self.preprocessor.transform(feature_frame)
        transformed_array = np.asarray(transformed_features, dtype=np.float64)

        predictions = self.model_backend.predict(transformed_array)
        return [str(label) for label in predictions]

    def save_model(self, output_path: str | Path) -> Path:
        """Persist trained preprocessor + model backend for production inference."""

        if not self._is_fitted:
            raise RuntimeError("Model is not trained. Train before saving.")

        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        artifact = {
            "preprocessor": self.preprocessor,
            "model_backend": self.model_backend,
            "is_fitted": self._is_fitted,
        }
        joblib.dump(artifact, path)
        return path

    @classmethod
    def load_model(cls, model_path: str | Path) -> "TrafficCongestionPredictor":
        """Load a previously persisted predictor artifact from disk."""

        artifact = joblib.load(Path(model_path))
        predictor = cls(model_backend=artifact["model_backend"])
        predictor.preprocessor = artifact["preprocessor"]
        predictor._is_fitted = bool(artifact["is_fitted"])
        return predictor

    def _normalize_input(
        self,
        input_data: pd.DataFrame | Mapping[str, Any] | TrafficInputRow,
    ) -> pd.DataFrame:
        if isinstance(input_data, pd.DataFrame):
            frame = input_data.copy()
        else:
            frame = pd.DataFrame([dict(input_data)])

        validate_feature_schema(frame)
        return frame.loc[:, FEATURE_COLUMNS].copy()
