"""Data preprocessing pipeline for traffic congestion classification.

This module implements the exact project metrics schema and transforms raw traffic
sensor + contextual inputs into model-ready features.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final, Sequence, TypedDict

import numpy as np
import pandas as pd
from pandas.tseries.holiday import USFederalHolidayCalendar
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# Required model input feature names. Do not add/remove/rename.
FEATURE_COLUMNS: Final[list[str]] = [
    "Timestamp",
    "Location_ID",
    "Latitude",
    "Longitude",
    "Vehicle_Count",
    "Traffic_Speed_kmh",
    "Road_Occupancy_Pct",
    "Vehicle_Count_Cars",
    "Vehicle_Count_Bikes",
    "Vehicle_Count_Buses",
    "Vehicle_Count_Trucks",
    "Traffic_Light_State",
    "Weather_Condition",
    "Accident_Report",
    "Sentiment_Score",
    "horn_events_per_min",
    "CO2_Emissions_ppm",
]

TARGET_COLUMN: Final[str] = "Traffic_Congestion_Level"

TEMPORAL_FEATURE_COLUMNS: Final[list[str]] = [
    "hour_sin",
    "hour_cos",
    "day_of_week_sin",
    "day_of_week_cos",
    "is_weekend",
    "is_holiday",
]

NUMERIC_FEATURE_COLUMNS: Final[list[str]] = [
    "Latitude",
    "Longitude",
    "Vehicle_Count",
    "Traffic_Speed_kmh",
    "Road_Occupancy_Pct",
    "Vehicle_Count_Cars",
    "Vehicle_Count_Bikes",
    "Vehicle_Count_Buses",
    "Vehicle_Count_Trucks",
    "Accident_Report",
    "Sentiment_Score",
    "horn_events_per_min",
    "CO2_Emissions_ppm",
]

CATEGORICAL_FEATURE_COLUMNS: Final[list[str]] = [
    "Location_ID",
    "Traffic_Light_State",
    "Weather_Condition",
]


class TrafficInputRow(TypedDict):
    """Typed schema for one incoming traffic record.

    Physical meaning of core metrics:
    - Vehicle_Count: absolute flow in the most recent 10-15 minute sensing window.
    - Traffic_Speed_kmh: average kinematic speed of passing vehicles.
    - Road_Occupancy_Pct: road space occupancy ratio (0-100%), proxy for density.
    - horn_events_per_min: acoustic stress/aggression signal from honking frequency.
    - CO2_Emissions_ppm: local pollution load, often rising under stop-go congestion.
    """

    Timestamp: str
    Location_ID: str
    Latitude: float
    Longitude: float
    Vehicle_Count: int
    Traffic_Speed_kmh: float
    Road_Occupancy_Pct: float
    Vehicle_Count_Cars: int
    Vehicle_Count_Bikes: int
    Vehicle_Count_Buses: int
    Vehicle_Count_Trucks: int
    Traffic_Light_State: str
    Weather_Condition: str
    Accident_Report: int
    Sentiment_Score: float
    horn_events_per_min: int
    CO2_Emissions_ppm: float


@dataclass
class TimestampFeatureExtractor(BaseEstimator, TransformerMixin):
    """Extract cyclic and calendar signals from `Timestamp`.

    Derived signals model recurrent urban traffic dynamics:
    - hour/day sin-cos terms encode periodic rush-hour and weekday cycles.
    - weekend/holiday flags encode institutional demand shifts.
    """

    timestamp_column: str = "Timestamp"

    def fit(self, X: pd.DataFrame, y: Sequence[str] | None = None) -> "TimestampFeatureExtractor":
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X, columns=[self.timestamp_column])

        if self.timestamp_column not in X.columns:
            raise ValueError(
                f"Missing required timestamp column '{self.timestamp_column}'."
            )

        timestamps = pd.to_datetime(X[self.timestamp_column], errors="coerce", utc=True)
        timestamps = timestamps.dt.tz_convert(None)

        hours = timestamps.dt.hour.fillna(0).astype(np.int16)
        day_of_week = timestamps.dt.dayofweek.fillna(0).astype(np.int16)

        feature_frame = pd.DataFrame(
            {
                "hour_sin": np.sin(2 * np.pi * hours / 24.0),
                "hour_cos": np.cos(2 * np.pi * hours / 24.0),
                "day_of_week_sin": np.sin(2 * np.pi * day_of_week / 7.0),
                "day_of_week_cos": np.cos(2 * np.pi * day_of_week / 7.0),
                "is_weekend": (day_of_week >= 5).astype(np.int8),
                "is_holiday": self._holiday_flag_series(timestamps),
            },
            index=X.index,
        )
        return feature_frame

    def _holiday_flag_series(self, timestamps: pd.Series) -> pd.Series:
        normalized_dates = timestamps.dt.normalize()
        valid_dates = normalized_dates.dropna()
        if valid_dates.empty:
            return pd.Series(0, index=timestamps.index, dtype=np.int8)

        holiday_calendar = USFederalHolidayCalendar()
        holiday_index = holiday_calendar.holidays(
            start=valid_dates.min(),
            end=valid_dates.max(),
        ).normalize()

        return normalized_dates.isin(holiday_index).astype(np.int8)

    def get_feature_names_out(self, input_features: Sequence[str] | None = None) -> np.ndarray:
        return np.asarray(TEMPORAL_FEATURE_COLUMNS, dtype=object)


def validate_feature_schema(frame: pd.DataFrame) -> None:
    """Validate that all required input features are present.

    The function enforces the agreed traffic sensing schema to prevent silent
    training-serving skew caused by missing or renamed metrics.
    """

    missing_columns = [column for column in FEATURE_COLUMNS if column not in frame.columns]
    if missing_columns:
        raise ValueError(
            "Input data is missing required feature columns: "
            f"{', '.join(missing_columns)}"
        )


def _build_one_hot_encoder() -> OneHotEncoder:
    """Instantiate OneHotEncoder with sklearn-version-compatible arguments."""

    try:
        return OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    except TypeError:
        return OneHotEncoder(handle_unknown="ignore", sparse=False)


def build_preprocessing_pipeline() -> ColumnTransformer:
    """Build preprocessing graph for temporal, categorical, and numeric metrics."""

    temporal_pipeline = Pipeline(
        steps=[
            ("timestamp_features", TimestampFeatureExtractor()),
            ("temporal_scaler", StandardScaler()),
        ]
    )

    numeric_pipeline = Pipeline(
        steps=[
            ("numeric_imputer", SimpleImputer(strategy="median")),
            ("numeric_scaler", StandardScaler()),
        ]
    )

    categorical_pipeline = Pipeline(
        steps=[
            ("categorical_imputer", SimpleImputer(strategy="most_frequent")),
            ("categorical_one_hot", _build_one_hot_encoder()),
        ]
    )

    return ColumnTransformer(
        transformers=[
            ("temporal", temporal_pipeline, ["Timestamp"]),
            ("numerical", numeric_pipeline, NUMERIC_FEATURE_COLUMNS),
            ("categorical", categorical_pipeline, CATEGORICAL_FEATURE_COLUMNS),
        ],
        remainder="drop",
        sparse_threshold=0.0,
    )
