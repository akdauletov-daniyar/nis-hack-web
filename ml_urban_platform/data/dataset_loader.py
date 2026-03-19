"""Data ingestion and preprocessing utilities for the urban ML platform."""

from __future__ import annotations

import ast
import json
import re
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler


COLUMN_ALIASES = {
    "user_id": ["user_id", "User_ID", "tourist_id", "Tourist_ID"],
    "category": ["category", "Category", "interests", "Interests"],
    "location_id": ["location_id", "Location_ID", "attraction", "Attraction"],
    "visitor_count": ["visitor_count", "Visitor_Count", "density", "Density"],
    "rating": ["rating", "Rating", "review_score", "Review_Score"],
    "post_content": ["post_content", "Post_Content", "text", "Text"],
    "sentiment_label": ["sentiment_label", "Sentiment_Label"],
    "cultural_diversity_index": [
        "cultural_diversity_index",
        "Cultural_Diversity_Index",
    ],
    "geometry_parameters": ["geometry_parameters", "Geometry_Parameters"],
}

CANONICAL_COLUMNS = tuple(COLUMN_ALIASES.keys())


class UrbanDataPreprocessor:
    """Loads and normalizes datasets across recommender/NLP/generative tasks."""

    def __init__(self) -> None:
        self.scaler = StandardScaler()

    def load_csv(self, csv_path: str | Path) -> pd.DataFrame:
        """Load CSV, normalize schema, and apply basic cleaning."""
        frame = pd.read_csv(csv_path)
        frame = self._normalize_columns(frame)
        frame = self._clean_frame(frame)
        return frame

    def _normalize_columns(self, frame: pd.DataFrame) -> pd.DataFrame:
        rename_map: dict[str, str] = {}
        for canonical, aliases in COLUMN_ALIASES.items():
            for alias in aliases:
                if alias in frame.columns:
                    rename_map[alias] = canonical
                    break

        normalized = frame.rename(columns=rename_map).copy()
        for canonical in CANONICAL_COLUMNS:
            if canonical not in normalized.columns:
                normalized[canonical] = np.nan

        return normalized

    def _clean_frame(self, frame: pd.DataFrame) -> pd.DataFrame:
        cleaned = frame.copy()

        cleaned["user_id"] = cleaned["user_id"].fillna("unknown_user").astype(str)
        cleaned["location_id"] = cleaned["location_id"].fillna("unknown_location").astype(str)
        cleaned["category"] = cleaned["category"].fillna("unknown").astype(str)

        cleaned["visitor_count"] = pd.to_numeric(cleaned["visitor_count"], errors="coerce")
        cleaned["visitor_count"] = cleaned["visitor_count"].fillna(
            cleaned["visitor_count"].median()
        )
        cleaned["visitor_count"] = cleaned["visitor_count"].fillna(0.0)

        cleaned["rating"] = pd.to_numeric(cleaned["rating"], errors="coerce")
        cleaned["rating"] = cleaned["rating"].fillna(cleaned["rating"].median())
        cleaned["rating"] = cleaned["rating"].fillna(3.0).clip(lower=1.0, upper=5.0)

        cleaned["post_content"] = cleaned["post_content"].fillna("").astype(str)
        cleaned["post_content"] = cleaned["post_content"].apply(self._clean_text)

        cleaned["sentiment_label"] = cleaned["sentiment_label"].fillna("Neutral").astype(str)

        cleaned["cultural_diversity_index"] = pd.to_numeric(
            cleaned["cultural_diversity_index"], errors="coerce"
        )
        cleaned["cultural_diversity_index"] = cleaned["cultural_diversity_index"].fillna(
            cleaned["cultural_diversity_index"].median()
        )
        cleaned["cultural_diversity_index"] = cleaned["cultural_diversity_index"].fillna(0.0)

        cleaned["geometry_parameters"] = cleaned["geometry_parameters"].apply(
            self._parse_geometry_parameters
        )

        return cleaned

    @staticmethod
    def _clean_text(text: str) -> str:
        text = text.lower().strip()
        text = re.sub(r"https?://\S+|www\.\S+", " ", text)
        text = re.sub(r"[^a-z0-9\s]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    @staticmethod
    def _parse_geometry_parameters(value: object) -> list[float]:
        if isinstance(value, (list, tuple, np.ndarray)):
            return [float(x) for x in value]

        if value is None or (isinstance(value, float) and np.isnan(value)):
            return []

        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []

            # Try JSON first, then Python literal, then comma-separated fallback.
            for parser in (json.loads, ast.literal_eval):
                try:
                    parsed = parser(raw)
                    if isinstance(parsed, (list, tuple)):
                        return [float(x) for x in parsed]
                except (ValueError, SyntaxError, json.JSONDecodeError, TypeError):
                    continue

            try:
                return [float(x.strip()) for x in raw.split(",") if x.strip()]
            except ValueError:
                return []

        return []

    def get_recommender_frame(self, frame: pd.DataFrame) -> pd.DataFrame:
        """Return interactions for recommender training."""
        cols = ["user_id", "location_id", "category", "visitor_count", "rating"]
        return frame[cols].dropna(subset=["user_id", "location_id", "rating"]).copy()

    def get_sentiment_frame(self, frame: pd.DataFrame) -> pd.DataFrame:
        """Return text/label pairs for sentiment training."""
        cols = ["post_content", "sentiment_label"]
        sentiment = frame[cols].copy()
        sentiment = sentiment[sentiment["post_content"].str.len() > 0]
        return sentiment

    def get_geometry_matrix(self, frame: pd.DataFrame) -> np.ndarray:
        """Return padded geometry matrix suitable for VAE/GAN skeletons."""
        geometries = frame["geometry_parameters"].tolist()
        if not geometries:
            return np.zeros((0, 0), dtype=np.float32)

        max_len = max((len(g) for g in geometries), default=0)
        if max_len == 0:
            return np.zeros((len(geometries), 1), dtype=np.float32)

        padded = np.zeros((len(geometries), max_len), dtype=np.float32)
        for i, geom in enumerate(geometries):
            if geom:
                padded[i, : len(geom)] = np.asarray(geom, dtype=np.float32)
        return padded

    def get_clustering_features(self, frame: pd.DataFrame) -> np.ndarray:
        """Build tabular features for K-Means/DBSCAN style tasks."""
        category_ohe = pd.get_dummies(frame["category"], prefix="cat")
        numeric = frame[["visitor_count", "cultural_diversity_index"]].to_numpy(dtype=np.float32)
        numeric = self.scaler.fit_transform(numeric)
        return np.concatenate([category_ohe.to_numpy(dtype=np.float32), numeric], axis=1)

    @staticmethod
    def summarize(frame: pd.DataFrame) -> dict[str, object]:
        """Provide quick dataset diagnostics for API responses."""
        return {
            "rows": int(len(frame)),
            "unique_users": int(frame["user_id"].nunique()),
            "unique_locations": int(frame["location_id"].nunique()),
            "rating_mean": float(frame["rating"].mean()),
            "visitor_count_mean": float(frame["visitor_count"].mean()),
            "sentiment_labels": sorted(frame["sentiment_label"].dropna().unique().tolist()),
        }


def ensure_columns(frame: pd.DataFrame, required_columns: Iterable[str]) -> None:
    """Raise a clear error if required columns are missing."""
    missing = [col for col in required_columns if col not in frame.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")
