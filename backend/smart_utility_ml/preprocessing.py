"""Preprocessing utilities for smart utility forecasting and anomaly detection."""

from __future__ import annotations

from typing import Any, Literal, Sequence

import numpy as np
import pandas as pd
from numpy.typing import NDArray
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import MinMaxScaler, OneHotEncoder, StandardScaler

ScalerType = Literal["standard", "minmax"]
FloatArray = NDArray[np.float64]
SequenceArray = NDArray[np.float32]

TIME_DERIVED_COLUMNS: list[str] = [
    "hour_sin",
    "hour_cos",
    "day_of_week_sin",
    "day_of_week_cos",
    "is_weekend",
]


class DataProcessor:
    """Prepares utility telemetry for ML models.

    Responsibilities:
    - Parse and validate timestamps.
    - Normalize HVAC state representation.
    - Create periodic time features for demand cycles.
    - Impute missing values and scale numeric features.
    - Build sliding windows for sequence models (e.g., LSTM).
    """

    def __init__(self, *, time_column: str = "Timestamp", scaler_type: ScalerType = "standard") -> None:
        """Initialize a reusable preprocessing component.

        Args:
            time_column: Name of datetime column in source data.
            scaler_type: Numeric scaling strategy (`standard` or `minmax`).
        """

        self.time_column = time_column
        self.scaler_type = scaler_type

        self.preprocessor_: ColumnTransformer | None = None
        self.raw_feature_columns_: list[str] = []
        self.model_feature_columns_: list[str] = []
        self.categorical_columns_: list[str] = []
        self.numeric_columns_: list[str] = []
        self.feature_names_: list[str] = []

    def prepare_frame(self, dataframe: pd.DataFrame) -> pd.DataFrame:
        """Parse timestamps, engineer time features, and normalize raw fields.

        Args:
            dataframe: Raw utility dataframe.

        Returns:
            Cleaned dataframe sorted by timestamp.
        """

        frame = dataframe.copy()
        if self.time_column not in frame.columns:
            raise ValueError(f"Missing required time column: '{self.time_column}'.")

        frame[self.time_column] = pd.to_datetime(frame[self.time_column], errors="coerce", utc=True)
        frame = frame.dropna(subset=[self.time_column])
        frame[self.time_column] = frame[self.time_column].dt.tz_convert(None)
        frame = frame.sort_values(self.time_column).reset_index(drop=True)

        if "HVAC_Usage_State" in frame.columns:
            frame["HVAC_Usage_State"] = frame["HVAC_Usage_State"].map(self._normalize_hvac_state)

        self._add_time_features(frame)
        return frame

    def fit(
        self,
        dataframe: pd.DataFrame,
        feature_columns: Sequence[str],
        categorical_columns: Sequence[str] | None = None,
    ) -> "DataProcessor":
        """Fit imputation/encoding/scaling preprocessing graph.

        Args:
            dataframe: Training dataframe.
            feature_columns: Raw schema feature list requested by models.
            categorical_columns: Explicit categorical columns. If omitted,
                object/category/string columns are inferred.

        Returns:
            The fitted processor instance.
        """

        prepared = self.prepare_frame(dataframe)
        expanded_columns = self._expand_feature_columns(feature_columns)
        self._validate_columns(prepared, expanded_columns)

        categorical = self._resolve_categorical_columns(
            prepared,
            expanded_columns,
            categorical_columns,
        )
        numeric = [column for column in expanded_columns if column not in categorical]

        numeric_pipeline = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", self._build_scaler()),
            ]
        )

        categorical_pipeline = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("encoder", self._build_one_hot_encoder()),
            ]
        )

        self.preprocessor_ = ColumnTransformer(
            transformers=[
                ("num", numeric_pipeline, numeric),
                ("cat", categorical_pipeline, categorical),
            ],
            sparse_threshold=0.0,
            remainder="drop",
        )

        self.preprocessor_.fit(prepared.loc[:, expanded_columns])

        self.raw_feature_columns_ = list(feature_columns)
        self.model_feature_columns_ = expanded_columns
        self.categorical_columns_ = categorical
        self.numeric_columns_ = numeric
        self.feature_names_ = [str(name) for name in self.preprocessor_.get_feature_names_out()]
        return self

    def transform(self, dataframe: pd.DataFrame) -> FloatArray:
        """Transform new data using the fitted preprocessing pipeline.

        Args:
            dataframe: Input dataframe for inference/evaluation.

        Returns:
            Dense transformed feature matrix.
        """

        if self.preprocessor_ is None:
            raise RuntimeError("Processor is not fitted. Call fit() first.")

        prepared = self.prepare_frame(dataframe)
        self._validate_columns(prepared, self.model_feature_columns_)

        transformed = self.preprocessor_.transform(prepared.loc[:, self.model_feature_columns_])
        return np.asarray(transformed, dtype=np.float64)

    def fit_transform(
        self,
        dataframe: pd.DataFrame,
        feature_columns: Sequence[str],
        categorical_columns: Sequence[str] | None = None,
    ) -> FloatArray:
        """Fit preprocessing graph and transform in a single step."""

        self.fit(dataframe, feature_columns, categorical_columns)
        return self.transform(dataframe)

    def generate_sequences(
        self,
        dataframe: pd.DataFrame,
        feature_columns: Sequence[str],
        target_column: str,
        *,
        window_size: int,
        horizon: int = 1,
        stride: int = 1,
        categorical_columns: Sequence[str] | None = None,
        fit_processor: bool = False,
    ) -> tuple[SequenceArray, SequenceArray]:
        """Build sliding-window sequences for sequence forecasting models.

        Args:
            dataframe: Source dataframe sorted by time after processing.
            feature_columns: Features used for sequence inputs.
            target_column: Forecast target (e.g., `Global_active_power`).
            window_size: Number of consecutive timesteps per input sample.
            horizon: Forecast lead (1 means next timestep).
            stride: Step size between sequence starts.
            categorical_columns: Optional explicit categorical set.
            fit_processor: Fit preprocessing graph during this call.

        Returns:
            Tuple of `(X_seq, y_seq)` where:
            - `X_seq.shape == (samples, window_size, n_features)`
            - `y_seq.shape == (samples,)`
        """

        prepared = self.prepare_frame(dataframe)
        if target_column not in prepared.columns:
            raise ValueError(f"Missing target column '{target_column}' in dataframe.")

        if fit_processor or self.preprocessor_ is None:
            feature_matrix = self.fit_transform(prepared, feature_columns, categorical_columns)
        else:
            feature_matrix = self.transform(prepared)

        target_vector = prepared[target_column].to_numpy(dtype=np.float32)
        return self.generate_sequences_from_arrays(
            feature_matrix,
            target_vector,
            window_size=window_size,
            horizon=horizon,
            stride=stride,
        )

    @staticmethod
    def generate_sequences_from_arrays(
        feature_matrix: FloatArray,
        target_vector: NDArray[np.floating[Any]],
        *,
        window_size: int,
        horizon: int = 1,
        stride: int = 1,
    ) -> tuple[SequenceArray, SequenceArray]:
        """Create sliding windows from precomputed arrays.

        Args:
            feature_matrix: 2D matrix `(timesteps, n_features)`.
            target_vector: 1D target series aligned with `feature_matrix`.
            window_size: Timesteps included in each sequence sample.
            horizon: Number of steps ahead to predict.
            stride: Interval between two adjacent windows.

        Returns:
            Sequence tensor and aligned target vector.
        """

        if window_size < 1:
            raise ValueError("window_size must be >= 1")
        if horizon < 1:
            raise ValueError("horizon must be >= 1")
        if stride < 1:
            raise ValueError("stride must be >= 1")
        if feature_matrix.shape[0] != target_vector.shape[0]:
            raise ValueError("feature_matrix and target_vector must have equal lengths.")

        sample_count = feature_matrix.shape[0] - window_size - horizon + 1
        if sample_count <= 0:
            raise ValueError(
                "Not enough rows to create sequences with the requested "
                f"window_size={window_size} and horizon={horizon}."
            )

        features: list[NDArray[np.float32]] = []
        targets: list[np.float32] = []

        for start in range(0, sample_count, stride):
            end = start + window_size
            target_index = end + horizon - 1

            features.append(feature_matrix[start:end, :].astype(np.float32))
            targets.append(np.float32(target_vector[target_index]))

        return np.asarray(features, dtype=np.float32), np.asarray(targets, dtype=np.float32)

    def _expand_feature_columns(self, feature_columns: Sequence[str]) -> list[str]:
        """Replace `Timestamp` with engineered periodic time features."""

        expanded: list[str] = []
        for column in feature_columns:
            if column == self.time_column:
                expanded.extend(TIME_DERIVED_COLUMNS)
            else:
                expanded.append(column)

        # Preserve order and remove duplicates.
        deduped = list(dict.fromkeys(expanded))
        return deduped

    def _resolve_categorical_columns(
        self,
        frame: pd.DataFrame,
        expanded_columns: Sequence[str],
        categorical_columns: Sequence[str] | None,
    ) -> list[str]:
        """Resolve final categorical columns after time-feature expansion."""

        if categorical_columns is None:
            inferred: list[str] = []
            for column in expanded_columns:
                if pd.api.types.is_object_dtype(frame[column]) or pd.api.types.is_categorical_dtype(frame[column]):
                    inferred.append(column)
            return inferred

        expanded_categorical = self._expand_feature_columns(categorical_columns)
        return [column for column in expanded_categorical if column in expanded_columns]

    def _add_time_features(self, frame: pd.DataFrame) -> None:
        """Add cyclical time components used by forecasting models."""

        timestamps = frame[self.time_column]
        hours = timestamps.dt.hour.astype(float)
        day_of_week = timestamps.dt.dayofweek.astype(float)

        frame["hour_sin"] = np.sin(2.0 * np.pi * hours / 24.0)
        frame["hour_cos"] = np.cos(2.0 * np.pi * hours / 24.0)
        frame["day_of_week_sin"] = np.sin(2.0 * np.pi * day_of_week / 7.0)
        frame["day_of_week_cos"] = np.cos(2.0 * np.pi * day_of_week / 7.0)
        frame["is_weekend"] = (day_of_week >= 5.0).astype(int)

    def _validate_columns(self, frame: pd.DataFrame, columns: Sequence[str]) -> None:
        """Fail fast when required columns are not present in the frame."""

        missing = [column for column in columns if column not in frame.columns]
        if missing:
            raise ValueError(f"Missing required columns: {', '.join(missing)}")

    def _build_scaler(self) -> StandardScaler | MinMaxScaler:
        """Create scaler instance requested at class initialization."""

        if self.scaler_type == "standard":
            return StandardScaler()
        if self.scaler_type == "minmax":
            return MinMaxScaler()
        raise ValueError("scaler_type must be either 'standard' or 'minmax'.")

    @staticmethod
    def _build_one_hot_encoder() -> OneHotEncoder:
        """Build version-compatible OneHotEncoder instance."""

        try:
            return OneHotEncoder(handle_unknown="ignore", sparse_output=False)
        except TypeError:  # pragma: no cover
            return OneHotEncoder(handle_unknown="ignore", sparse=False)

    @staticmethod
    def _normalize_hvac_state(value: Any) -> int:
        """Map heterogeneous HVAC representations to binary integer states."""

        if pd.isna(value):
            return 0

        normalized = str(value).strip().lower()
        if normalized in {"1", "true", "on", "yes"}:
            return 1
        if normalized in {"0", "false", "off", "no"}:
            return 0

        try:
            return int(float(normalized) > 0.0)
        except ValueError:
            return 0
