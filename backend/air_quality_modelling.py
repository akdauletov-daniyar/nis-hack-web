"""Hybrid air-quality modelling with LSTM + XGBoost + CatBoost.

This module supports calibration and forecasting in a Safe Smart City context:
- Temporal representation learning with an LSTM encoder.
- Ensemble regression/classification heads for pollutant and AQI prediction.
- Time-series aware cross-validation with TimeSeriesSplit.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping, Sequence

import joblib
import numpy as np
import pandas as pd
from numpy.typing import NDArray
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import LabelEncoder, StandardScaler

# Optional ML dependencies are imported lazily/fail-soft so this module can be
# imported in environments where heavy libraries are not installed yet.
# NOTE: On some macOS setups, loading torch before xgboost avoids OpenMP
# runtime conflicts that can crash Python.
try:
    import torch
    from torch import nn
    from torch.utils.data import DataLoader, TensorDataset
except Exception:  # pragma: no cover - runtime dependency gate.
    torch = None  # type: ignore[assignment]
    nn = None  # type: ignore[assignment]
    DataLoader = None  # type: ignore[assignment]
    TensorDataset = None  # type: ignore[assignment]

try:
    from xgboost import XGBClassifier, XGBRegressor
except Exception:  # pragma: no cover - runtime dependency gate.
    XGBClassifier = None  # type: ignore[assignment]
    XGBRegressor = None  # type: ignore[assignment]

try:
    from catboost import CatBoostClassifier, CatBoostRegressor
except Exception:  # pragma: no cover - runtime dependency gate.
    CatBoostClassifier = None  # type: ignore[assignment]
    CatBoostRegressor = None  # type: ignore[assignment]

FloatArray = NDArray[np.float64]
IntArray = NDArray[np.int64]

DATE_COLUMN = "DATE_OCC"
TIME_COLUMN = "TIME_OCC"
LAT_COLUMN = "Lat"
LON_COLUMN = "Lon"
CO_RAW_COLUMN = "PT08.S1(CO)"
TEMP_COLUMN = "Temperature_C"
WIND_COLUMN = "Wind_Speed"
C6H6_TARGET_COLUMN = "C6H6(GT)"
AQI_TARGET_COLUMN = "AQI"


@dataclass
class AirQualityConfig:
    """Hyperparameter and schema configuration for hybrid modelling."""

    window_size: int = 24
    horizon: int = 1
    n_splits: int = 5
    batch_size: int = 64
    lstm_epochs: int = 25
    learning_rate: float = 1e-3
    lstm_hidden_size: int = 64
    lstm_num_layers: int = 2
    lstm_dropout: float = 0.2
    embedding_dim: int = 32
    random_state: int = 42


@dataclass
class SequenceDataset:
    """Container holding sequence data and aligned labels."""

    x_sequence: FloatArray
    x_static: FloatArray
    y_c6h6: FloatArray
    y_co: FloatArray
    y_aqi: IntArray


class AirQualityPreprocessor:
    """Preprocessing pipeline for air-quality time-series modelling.

    Responsibilities:
    - Parse date/time into a timestamp and engineer cyclical temporal features.
    - Handle missing data with forward filling (and backward fill at series start).
    - Normalize dynamic and static features for stable LSTM/ensemble training.
    """

    def __init__(self) -> None:
        self.humidity_column_: str | None = None
        self.dynamic_scaler_ = StandardScaler()
        self.static_scaler_ = StandardScaler()
        self.dynamic_feature_columns_: list[str] = []
        self.static_feature_columns_: list[str] = [LAT_COLUMN, LON_COLUMN, WIND_COLUMN]
        self.is_fitted_ = False

    def fit_transform(self, dataframe: pd.DataFrame) -> tuple[FloatArray, FloatArray, pd.DataFrame]:
        """Fit scalers on training data and return transformed matrices."""

        prepared = self._prepare_dataframe(dataframe)
        self.humidity_column_ = self._resolve_humidity_column(prepared)
        self.dynamic_feature_columns_ = self._build_dynamic_feature_list(self.humidity_column_)

        dynamic_raw = prepared.loc[:, self.dynamic_feature_columns_].to_numpy(dtype=np.float64)
        static_raw = prepared.loc[:, self.static_feature_columns_].to_numpy(dtype=np.float64)

        dynamic_scaled = self.dynamic_scaler_.fit_transform(dynamic_raw)
        static_scaled = self.static_scaler_.fit_transform(static_raw)

        self.is_fitted_ = True
        return dynamic_scaled.astype(np.float64), static_scaled.astype(np.float64), prepared

    def transform(self, dataframe: pd.DataFrame) -> tuple[FloatArray, FloatArray, pd.DataFrame]:
        """Transform inference/evaluation data using fitted scalers."""

        if not self.is_fitted_:
            raise RuntimeError("Preprocessor is not fitted. Call fit_transform() first.")

        prepared = self._prepare_dataframe(dataframe)
        if self.humidity_column_ is None:
            raise RuntimeError("Humidity column was not resolved during fitting.")

        missing_columns = [
            col
            for col in self.dynamic_feature_columns_ + self.static_feature_columns_
            if col not in prepared.columns
        ]
        if missing_columns:
            raise ValueError(f"Missing required columns for transform: {', '.join(missing_columns)}")

        dynamic_raw = prepared.loc[:, self.dynamic_feature_columns_].to_numpy(dtype=np.float64)
        static_raw = prepared.loc[:, self.static_feature_columns_].to_numpy(dtype=np.float64)

        dynamic_scaled = self.dynamic_scaler_.transform(dynamic_raw)
        static_scaled = self.static_scaler_.transform(static_raw)
        return dynamic_scaled.astype(np.float64), static_scaled.astype(np.float64), prepared

    def create_sequences(
        self,
        dynamic_features: FloatArray,
        static_features: FloatArray,
        prepared_frame: pd.DataFrame,
        *,
        window_size: int,
        horizon: int,
    ) -> SequenceDataset:
        """Create sliding-window samples for LSTM + hybrid heads.

        For each sample:
        - LSTM input uses `window_size` historical timesteps.
        - Label corresponds to timestep `horizon` ahead.
        """

        if window_size < 1:
            raise ValueError("window_size must be >= 1")
        if horizon < 1:
            raise ValueError("horizon must be >= 1")

        y_c6h6 = prepared_frame[C6H6_TARGET_COLUMN].to_numpy(dtype=np.float64)
        y_co = prepared_frame[CO_RAW_COLUMN].to_numpy(dtype=np.float64)
        y_aqi = prepared_frame[AQI_TARGET_COLUMN].to_numpy(dtype=np.int64)

        max_start = dynamic_features.shape[0] - window_size - horizon + 1
        if max_start <= 0:
            raise ValueError(
                "Not enough rows to create sequence data with "
                f"window_size={window_size} and horizon={horizon}."
            )

        x_sequence_list: list[FloatArray] = []
        x_static_list: list[FloatArray] = []
        y_c6h6_list: list[float] = []
        y_co_list: list[float] = []
        y_aqi_list: list[int] = []

        for start in range(max_start):
            end = start + window_size
            target_index = end + horizon - 1

            x_sequence_list.append(dynamic_features[start:end])
            # Use latest observed static/instantaneous context at sequence end.
            x_static_list.append(static_features[end - 1])
            y_c6h6_list.append(float(y_c6h6[target_index]))
            y_co_list.append(float(y_co[target_index]))
            y_aqi_list.append(int(y_aqi[target_index]))

        x_sequence = np.asarray(x_sequence_list, dtype=np.float64)
        x_static = np.asarray(x_static_list, dtype=np.float64)

        return SequenceDataset(
            x_sequence=x_sequence,
            x_static=x_static,
            y_c6h6=np.asarray(y_c6h6_list, dtype=np.float64),
            y_co=np.asarray(y_co_list, dtype=np.float64),
            y_aqi=np.asarray(y_aqi_list, dtype=np.int64),
        )

    def _prepare_dataframe(self, dataframe: pd.DataFrame) -> pd.DataFrame:
        """Prepare dataframe: parse time, fill missing values, engineer features."""

        frame = dataframe.copy()
        timestamp = self._build_timestamp(frame)
        frame["_timestamp"] = timestamp
        frame = frame.dropna(subset=["_timestamp"]).sort_values("_timestamp").reset_index(drop=True)

        # Time-series friendly imputation for low-cost drifting sensors.
        frame = frame.ffill().bfill()

        hour = frame["_timestamp"].dt.hour.astype(float)
        day_of_week = frame["_timestamp"].dt.dayofweek.astype(float)
        month = frame["_timestamp"].dt.month.astype(float)

        frame["hour_sin"] = np.sin(2.0 * np.pi * hour / 24.0)
        frame["hour_cos"] = np.cos(2.0 * np.pi * hour / 24.0)
        frame["dow_sin"] = np.sin(2.0 * np.pi * day_of_week / 7.0)
        frame["dow_cos"] = np.cos(2.0 * np.pi * day_of_week / 7.0)
        frame["month_sin"] = np.sin(2.0 * np.pi * month / 12.0)
        frame["month_cos"] = np.cos(2.0 * np.pi * month / 12.0)

        self._validate_required_columns(frame)
        frame[AQI_TARGET_COLUMN] = frame[AQI_TARGET_COLUMN].astype(int)
        return frame

    def _build_timestamp(self, frame: pd.DataFrame) -> pd.Series:
        """Parse timestamp from DATE_OCC and TIME_OCC columns."""

        if DATE_COLUMN in frame.columns and TIME_COLUMN in frame.columns:
            return pd.to_datetime(
                frame[DATE_COLUMN].astype(str) + " " + frame[TIME_COLUMN].astype(str),
                errors="coerce",
            )

        if DATE_COLUMN in frame.columns:
            return pd.to_datetime(frame[DATE_COLUMN], errors="coerce")

        raise ValueError("Input data must contain DATE_OCC (and optionally TIME_OCC).")

    @staticmethod
    def _resolve_humidity_column(frame: pd.DataFrame) -> str:
        """Resolve humidity column variant from schema (`RH%` or `RH_%`)."""

        for candidate in ("RH%", "RH_%"):
            if candidate in frame.columns:
                return candidate
        raise ValueError("Missing humidity column. Expected one of: RH% or RH_%")

    @staticmethod
    def _build_dynamic_feature_list(humidity_column: str) -> list[str]:
        """Build feature list used as dynamic sequence input to LSTM."""

        return [
            CO_RAW_COLUMN,
            TEMP_COLUMN,
            humidity_column,
            WIND_COLUMN,
            "hour_sin",
            "hour_cos",
            "dow_sin",
            "dow_cos",
            "month_sin",
            "month_cos",
        ]

    def _validate_required_columns(self, frame: pd.DataFrame) -> None:
        """Validate minimum schema needed for training and evaluation."""

        humidity_column = self._resolve_humidity_column(frame)
        required = {
            LAT_COLUMN,
            LON_COLUMN,
            CO_RAW_COLUMN,
            TEMP_COLUMN,
            humidity_column,
            WIND_COLUMN,
            C6H6_TARGET_COLUMN,
            AQI_TARGET_COLUMN,
        }
        missing = [column for column in required if column not in frame.columns]
        if missing:
            raise ValueError(f"Missing required columns: {', '.join(sorted(missing))}")


class _LSTMFeatureExtractor(nn.Module):
    """LSTM encoder to capture temporal pollutant dynamics."""

    def __init__(
        self,
        input_size: int,
        hidden_size: int,
        num_layers: int,
        dropout: float,
        embedding_dim: int,
    ) -> None:
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout if num_layers > 1 else 0.0,
            batch_first=True,
        )
        self.embedding_head = nn.Sequential(
            nn.Linear(hidden_size, embedding_dim),
            nn.ReLU(),
        )
        # Auxiliary multi-target regression head (C6H6 + CO proxy).
        self.regression_head = nn.Linear(embedding_dim, 2)

    def forward(self, sequence_batch: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        sequence_output, _ = self.lstm(sequence_batch)
        last_hidden = sequence_output[:, -1, :]
        embedding = self.embedding_head(last_hidden)
        regression_output = self.regression_head(embedding)
        return embedding, regression_output


@dataclass
class FoldMetrics:
    """Container for a single cross-validation fold metrics."""

    c6h6_r2: float
    c6h6_rmse: float
    co_r2: float
    co_rmse: float


@dataclass
class AirQualityHybridModel:
    """Hybrid ensemble model for air quality forecasting and AQI classification.

    Architecture:
    - LSTM encoder on dynamic time-series signals.
    - Embedding concatenation with static/instantaneous features (Lat/Lon/Wind).
    - XGBoost and CatBoost heads for regression (C6H6, CO) and AQI class.
    """

    config: AirQualityConfig = field(default_factory=AirQualityConfig)

    def __post_init__(self) -> None:
        self.preprocessor = AirQualityPreprocessor()
        self.label_encoder_: LabelEncoder | None = None

        self.lstm_encoder_: _LSTMFeatureExtractor | None = None
        self.lstm_input_size_: int | None = None

        self.xgb_regressor_c6h6_: Any | None = None
        self.cat_regressor_c6h6_: Any | None = None
        self.xgb_regressor_co_: Any | None = None
        self.cat_regressor_co_: Any | None = None
        self.xgb_classifier_aqi_: Any | None = None
        self.cat_classifier_aqi_: Any | None = None

        self.cv_metrics_: list[FoldMetrics] = []
        self.is_trained_: bool = False

    def train(self, dataframe: pd.DataFrame) -> dict[str, float]:
        """Train hybrid model with TimeSeriesSplit cross-validation.

        Returns:
            Aggregated cross-validation metrics for pollutant regression.
        """

        self._assert_runtime_dependencies()

        dynamic, static, prepared = self.preprocessor.fit_transform(dataframe)
        sequence_data = self.preprocessor.create_sequences(
            dynamic,
            static,
            prepared,
            window_size=self.config.window_size,
            horizon=self.config.horizon,
        )

        self.label_encoder_ = LabelEncoder()
        y_aqi_encoded = self.label_encoder_.fit_transform(sequence_data.y_aqi)

        tscv = TimeSeriesSplit(n_splits=self.config.n_splits)
        self.cv_metrics_ = []

        for train_idx, valid_idx in tscv.split(sequence_data.x_sequence):
            x_train_seq = sequence_data.x_sequence[train_idx]
            x_valid_seq = sequence_data.x_sequence[valid_idx]

            x_train_static = sequence_data.x_static[train_idx]
            x_valid_static = sequence_data.x_static[valid_idx]

            y_train_c6h6 = sequence_data.y_c6h6[train_idx]
            y_valid_c6h6 = sequence_data.y_c6h6[valid_idx]

            y_train_co = sequence_data.y_co[train_idx]
            y_valid_co = sequence_data.y_co[valid_idx]

            lstm_model = self._train_lstm_encoder(
                x_train_seq,
                y_train_c6h6,
                y_train_co,
            )

            emb_train = self._extract_embeddings(lstm_model, x_train_seq)
            emb_valid = self._extract_embeddings(lstm_model, x_valid_seq)

            fused_train = np.hstack([emb_train, x_train_static])
            fused_valid = np.hstack([emb_valid, x_valid_static])

            xgb_reg_c6h6 = self._build_xgb_regressor()
            cat_reg_c6h6 = self._build_catboost_regressor()
            xgb_reg_co = self._build_xgb_regressor()
            cat_reg_co = self._build_catboost_regressor()

            xgb_reg_c6h6.fit(fused_train, y_train_c6h6)
            cat_reg_c6h6.fit(fused_train, y_train_c6h6)
            xgb_reg_co.fit(fused_train, y_train_co)
            cat_reg_co.fit(fused_train, y_train_co)

            y_pred_c6h6 = 0.5 * (
                xgb_reg_c6h6.predict(fused_valid) + cat_reg_c6h6.predict(fused_valid)
            )
            y_pred_co = 0.5 * (xgb_reg_co.predict(fused_valid) + cat_reg_co.predict(fused_valid))

            fold_metric = FoldMetrics(
                c6h6_r2=float(r2_score(y_valid_c6h6, y_pred_c6h6)),
                c6h6_rmse=float(np.sqrt(mean_squared_error(y_valid_c6h6, y_pred_c6h6))),
                co_r2=float(r2_score(y_valid_co, y_pred_co)),
                co_rmse=float(np.sqrt(mean_squared_error(y_valid_co, y_pred_co))),
            )
            self.cv_metrics_.append(fold_metric)

        # Final full-data fit for production inference.
        self.lstm_encoder_ = self._train_lstm_encoder(
            sequence_data.x_sequence,
            sequence_data.y_c6h6,
            sequence_data.y_co,
        )
        self.lstm_input_size_ = int(sequence_data.x_sequence.shape[2])

        emb_all = self._extract_embeddings(self.lstm_encoder_, sequence_data.x_sequence)
        fused_all = np.hstack([emb_all, sequence_data.x_static])

        self.xgb_regressor_c6h6_ = self._build_xgb_regressor()
        self.cat_regressor_c6h6_ = self._build_catboost_regressor()
        self.xgb_regressor_co_ = self._build_xgb_regressor()
        self.cat_regressor_co_ = self._build_catboost_regressor()
        self.xgb_classifier_aqi_ = self._build_xgb_classifier(len(self.label_encoder_.classes_))
        self.cat_classifier_aqi_ = self._build_catboost_classifier(len(self.label_encoder_.classes_))

        self.xgb_regressor_c6h6_.fit(fused_all, sequence_data.y_c6h6)
        self.cat_regressor_c6h6_.fit(fused_all, sequence_data.y_c6h6)
        self.xgb_regressor_co_.fit(fused_all, sequence_data.y_co)
        self.cat_regressor_co_.fit(fused_all, sequence_data.y_co)

        self.xgb_classifier_aqi_.fit(fused_all, y_aqi_encoded)
        self.cat_classifier_aqi_.fit(fused_all, y_aqi_encoded)

        self.is_trained_ = True
        return self._aggregate_cv_metrics()

    def evaluate(self, dataframe: pd.DataFrame) -> dict[str, float]:
        """Evaluate trained model with R² and RMSE reporting."""

        self._assert_trained()

        dynamic, static, prepared = self.preprocessor.transform(dataframe)
        sequence_data = self.preprocessor.create_sequences(
            dynamic,
            static,
            prepared,
            window_size=self.config.window_size,
            horizon=self.config.horizon,
        )

        predictions = self._predict_from_sequences(sequence_data.x_sequence, sequence_data.x_static)

        c6h6_r2 = float(r2_score(sequence_data.y_c6h6, predictions["c6h6"]))
        c6h6_rmse = float(np.sqrt(mean_squared_error(sequence_data.y_c6h6, predictions["c6h6"])))
        co_r2 = float(r2_score(sequence_data.y_co, predictions["co"]))
        co_rmse = float(np.sqrt(mean_squared_error(sequence_data.y_co, predictions["co"])))

        return {
            "c6h6_r2": c6h6_r2,
            "c6h6_rmse": c6h6_rmse,
            "co_r2": co_r2,
            "co_rmse": co_rmse,
        }

    def predict(self, input_data: pd.DataFrame | Mapping[str, Any] | Sequence[Mapping[str, Any]]) -> pd.DataFrame:
        """Predict concentrations and AQI for incoming records.

        If fewer than `window_size` rows are provided, the method pads the
        history by duplicating the earliest row so sequence inference remains
        operational for real-time single-event calls.
        """

        self._assert_trained()

        frame = self._to_dataframe(input_data)
        frame = self._pad_to_window_size(frame)

        dynamic, static, prepared = self.preprocessor.transform(frame)
        sequence_data = self.preprocessor.create_sequences(
            dynamic,
            static,
            prepared,
            window_size=self.config.window_size,
            horizon=self.config.horizon,
        )

        predictions = self._predict_from_sequences(sequence_data.x_sequence, sequence_data.x_static)

        output = pd.DataFrame(
            {
                "predicted_co_concentration": predictions["co"],
                "predicted_c6h6_concentration": predictions["c6h6"],
                "predicted_aqi": predictions["aqi"],
            }
        )
        output["predicted_aqi_category"] = output["predicted_aqi"].map(aqi_to_category)
        return output

    def save_model(self, output_path: str | Path) -> Path:
        """Persist trained model artifacts into one joblib file."""

        self._assert_trained()

        if self.lstm_encoder_ is None or self.lstm_input_size_ is None:
            raise RuntimeError("LSTM encoder is missing despite trained state.")

        artifact = {
            "config": self.config,
            "preprocessor": self.preprocessor,
            "label_encoder": self.label_encoder_,
            "lstm_input_size": self.lstm_input_size_,
            "lstm_state_dict": self.lstm_encoder_.state_dict(),
            "xgb_regressor_c6h6": self.xgb_regressor_c6h6_,
            "cat_regressor_c6h6": self.cat_regressor_c6h6_,
            "xgb_regressor_co": self.xgb_regressor_co_,
            "cat_regressor_co": self.cat_regressor_co_,
            "xgb_classifier_aqi": self.xgb_classifier_aqi_,
            "cat_classifier_aqi": self.cat_classifier_aqi_,
            "cv_metrics": [metrics.__dict__ for metrics in self.cv_metrics_],
        }

        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(artifact, path)
        return path

    @classmethod
    def load_model(cls, model_path: str | Path) -> "AirQualityHybridModel":
        """Load model artifact from disk."""

        # Patch for cross-version Pickling of scikit-learn
        import sklearn.compose._column_transformer as ct
        if not hasattr(ct, '_RemainderColsList'):
            ct._RemainderColsList = list

        artifact = joblib.load(Path(model_path))
        config: AirQualityConfig = artifact["config"]

        model = cls(config=config)
        model.preprocessor = artifact["preprocessor"]
        model.label_encoder_ = artifact["label_encoder"]
        model.lstm_input_size_ = int(artifact["lstm_input_size"])

        model.lstm_encoder_ = model._build_lstm_network(model.lstm_input_size_)
        model.lstm_encoder_.load_state_dict(artifact["lstm_state_dict"])
        model.lstm_encoder_.eval()

        model.xgb_regressor_c6h6_ = artifact["xgb_regressor_c6h6"]
        model.cat_regressor_c6h6_ = artifact["cat_regressor_c6h6"]
        model.xgb_regressor_co_ = artifact["xgb_regressor_co"]
        model.cat_regressor_co_ = artifact["cat_regressor_co"]
        model.xgb_classifier_aqi_ = artifact["xgb_classifier_aqi"]
        model.cat_classifier_aqi_ = artifact["cat_classifier_aqi"]

        model.cv_metrics_ = [FoldMetrics(**entry) for entry in artifact.get("cv_metrics", [])]
        model.is_trained_ = True
        return model

    def _predict_from_sequences(self, x_sequence: FloatArray, x_static: FloatArray) -> dict[str, FloatArray]:
        """Internal hybrid inference over prepared sequences."""

        if self.lstm_encoder_ is None or self.label_encoder_ is None:
            raise RuntimeError("Model state is incomplete. LSTM or label encoder missing.")

        embedding = self._extract_embeddings(self.lstm_encoder_, x_sequence)
        fused_features = np.hstack([embedding, x_static])

        if any(
            estimator is None
            for estimator in (
                self.xgb_regressor_c6h6_,
                self.cat_regressor_c6h6_,
                self.xgb_regressor_co_,
                self.cat_regressor_co_,
                self.xgb_classifier_aqi_,
                self.cat_classifier_aqi_,
            )
        ):
            raise RuntimeError("Hybrid heads are not trained.")

        pred_c6h6 = 0.5 * (
            self.xgb_regressor_c6h6_.predict(fused_features)
            + self.cat_regressor_c6h6_.predict(fused_features)
        )
        pred_co = 0.5 * (
            self.xgb_regressor_co_.predict(fused_features)
            + self.cat_regressor_co_.predict(fused_features)
        )

        proba_xgb = self.xgb_classifier_aqi_.predict_proba(fused_features)
        proba_cat = self.cat_classifier_aqi_.predict_proba(fused_features)
        avg_proba = 0.5 * (proba_xgb + proba_cat)

        aqi_encoded = np.argmax(avg_proba, axis=1)
        aqi_decoded = self.label_encoder_.inverse_transform(aqi_encoded)

        return {
            "co": np.asarray(pred_co, dtype=np.float64),
            "c6h6": np.asarray(pred_c6h6, dtype=np.float64),
            "aqi": np.asarray(aqi_decoded, dtype=np.float64),
        }

    def _train_lstm_encoder(
        self,
        x_sequence: FloatArray,
        y_c6h6: FloatArray,
        y_co: FloatArray,
    ) -> _LSTMFeatureExtractor:
        """Train LSTM encoder with auxiliary multi-target regression loss."""

        input_size = int(x_sequence.shape[2])
        model = self._build_lstm_network(input_size)

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.to(device)

        x_tensor = torch.tensor(x_sequence, dtype=torch.float32)
        y_tensor = torch.tensor(np.column_stack([y_c6h6, y_co]), dtype=torch.float32)

        dataset = TensorDataset(x_tensor, y_tensor)
        loader = DataLoader(dataset, batch_size=self.config.batch_size, shuffle=False)

        optimizer = torch.optim.Adam(model.parameters(), lr=self.config.learning_rate)
        criterion = nn.MSELoss()

        model.train()
        for _ in range(self.config.lstm_epochs):
            for batch_x, batch_y in loader:
                batch_x = batch_x.to(device)
                batch_y = batch_y.to(device)

                optimizer.zero_grad()
                _, predicted_targets = model(batch_x)
                loss = criterion(predicted_targets, batch_y)
                loss.backward()
                optimizer.step()

        model.eval()
        return model

    def _extract_embeddings(self, model: _LSTMFeatureExtractor, x_sequence: FloatArray) -> FloatArray:
        """Extract latent temporal embeddings from sequence input."""

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.to(device)

        x_tensor = torch.tensor(x_sequence, dtype=torch.float32, device=device)
        with torch.no_grad():
            embedding, _ = model(x_tensor)

        return embedding.detach().cpu().numpy().astype(np.float64)

    def _build_lstm_network(self, input_size: int) -> _LSTMFeatureExtractor:
        """Create LSTM encoder instance from configuration."""

        return _LSTMFeatureExtractor(
            input_size=input_size,
            hidden_size=self.config.lstm_hidden_size,
            num_layers=self.config.lstm_num_layers,
            dropout=self.config.lstm_dropout,
            embedding_dim=self.config.embedding_dim,
        )

    def _build_xgb_regressor(self) -> Any:
        """Instantiate XGBoost regressor head."""

        return XGBRegressor(
            n_estimators=220,
            max_depth=8,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            objective="reg:squarederror",
            random_state=self.config.random_state,
            n_jobs=1,
        )

    def _build_catboost_regressor(self) -> Any:
        """Instantiate CatBoost regressor head."""

        return CatBoostRegressor(
            iterations=260,
            learning_rate=0.05,
            depth=8,
            loss_function="RMSE",
            random_seed=self.config.random_state,
            thread_count=1,
            verbose=False,
        )

    def _build_xgb_classifier(self, n_classes: int) -> Any:
        """Instantiate XGBoost classifier head."""

        objective = "multi:softprob" if n_classes > 2 else "binary:logistic"
        params: dict[str, Any] = {
            "n_estimators": 220,
            "max_depth": 7,
            "learning_rate": 0.05,
            "subsample": 0.9,
            "colsample_bytree": 0.9,
            "objective": objective,
            "random_state": self.config.random_state,
            "n_jobs": 1,
            "eval_metric": "mlogloss" if n_classes > 2 else "logloss",
        }
        if n_classes > 2:
            params["num_class"] = n_classes

        return XGBClassifier(**params)

    def _build_catboost_classifier(self, n_classes: int) -> Any:
        """Instantiate CatBoost classifier head."""

        loss = "MultiClass" if n_classes > 2 else "Logloss"
        return CatBoostClassifier(
            iterations=260,
            learning_rate=0.05,
            depth=8,
            loss_function=loss,
            random_seed=self.config.random_state,
            thread_count=1,
            verbose=False,
        )

    def _aggregate_cv_metrics(self) -> dict[str, float]:
        """Aggregate cross-validation metrics across folds."""

        if not self.cv_metrics_:
            return {
                "c6h6_r2_cv_mean": float("nan"),
                "c6h6_rmse_cv_mean": float("nan"),
                "co_r2_cv_mean": float("nan"),
                "co_rmse_cv_mean": float("nan"),
            }

        c6h6_r2 = np.mean([m.c6h6_r2 for m in self.cv_metrics_])
        c6h6_rmse = np.mean([m.c6h6_rmse for m in self.cv_metrics_])
        co_r2 = np.mean([m.co_r2 for m in self.cv_metrics_])
        co_rmse = np.mean([m.co_rmse for m in self.cv_metrics_])

        return {
            "c6h6_r2_cv_mean": float(c6h6_r2),
            "c6h6_rmse_cv_mean": float(c6h6_rmse),
            "co_r2_cv_mean": float(co_r2),
            "co_rmse_cv_mean": float(co_rmse),
        }

    def _assert_runtime_dependencies(self) -> None:
        """Ensure required heavy ML dependencies are available at runtime."""

        missing: list[str] = []
        if torch is None or nn is None or DataLoader is None or TensorDataset is None:
            missing.append("torch")
        if XGBRegressor is None or XGBClassifier is None:
            missing.append("xgboost")
        if CatBoostRegressor is None or CatBoostClassifier is None:
            missing.append("catboost")

        if missing:
            raise ImportError(
                "Missing required dependencies for AirQualityHybridModel: "
                f"{', '.join(missing)}. Install them via requirements.txt."
            )

    def _assert_trained(self) -> None:
        """Guard inference/evaluation calls before model fitting."""

        if not self.is_trained_:
            raise RuntimeError("Model is not trained. Call train() and save_model() first.")

    @staticmethod
    def _to_dataframe(
        input_data: pd.DataFrame | Mapping[str, Any] | Sequence[Mapping[str, Any]],
    ) -> pd.DataFrame:
        """Normalize payload to dataframe format."""

        if isinstance(input_data, pd.DataFrame):
            return input_data.copy()
        if isinstance(input_data, Mapping):
            return pd.DataFrame([dict(input_data)])
        return pd.DataFrame([dict(item) for item in input_data])

    def _pad_to_window_size(self, frame: pd.DataFrame) -> pd.DataFrame:
        """Pad short histories to minimum length required by sequence modelling."""

        minimum_rows = self.config.window_size + self.config.horizon
        if frame.shape[0] >= minimum_rows:
            return frame

        required_padding = minimum_rows - frame.shape[0]
        first_row = frame.iloc[[0]].copy()
        padding = pd.concat([first_row] * required_padding, ignore_index=True)
        return pd.concat([padding, frame], ignore_index=True)


def aqi_to_category(aqi_value: float | int) -> str:
    """Map numeric AQI value to standard public health category."""

    value = int(round(float(aqi_value)))
    if value <= 50:
        return "Good"
    if value <= 100:
        return "Moderate"
    if value <= 150:
        return "Unhealthy for Sensitive Groups"
    if value <= 200:
        return "Unhealthy"
    if value <= 300:
        return "Very Unhealthy"
    return "Hazardous"


__all__ = [
    "AirQualityConfig",
    "AirQualityHybridModel",
    "AirQualityPreprocessor",
    "aqi_to_category",
]
