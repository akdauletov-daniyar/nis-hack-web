"""FastAPI service exposing the urban ML pipeline."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from ml_urban_platform.data.dataset_loader import UrbanDataPreprocessor
from ml_urban_platform.models.generative_design import UrbanDesignGenerator
from ml_urban_platform.models.recommender import HybridTourismRecommender, RecommenderConfig
from ml_urban_platform.models.sentiment_nlp import CityBrandSentimentAnalyzer

app = FastAPI(
    title="Creative Urban Industry ML API",
    version="1.0.0",
    description="Recommender + sentiment NLP + generative design service.",
)

BASE_DIR = Path(__file__).resolve().parents[2]
preprocessor = UrbanDataPreprocessor()

recommender_model: HybridTourismRecommender | None = None
sentiment_model: CityBrandSentimentAnalyzer | None = None
generative_model: UrbanDesignGenerator | None = None


class DatasetRequest(BaseModel):
    dataset_path: str = Field(..., description="Absolute or project-relative CSV path")


class RecommenderTrainRequest(DatasetRequest):
    latent_dim: int = 32
    learning_rate: float = 1e-2
    epochs: int = 30
    batch_size: int = 256
    density_alpha: float = 0.3
    l2_reg: float = 1e-5


class RecommendationRequest(BaseModel):
    user_id: str
    top_k: int = 5
    candidate_locations: list[str] | None = None
    density_overrides: dict[str, float] | None = None
    exclude_known: bool = True


class SentimentTrainRequest(DatasetRequest):
    model_name: str = "distilbert-base-uncased"
    epochs: int = 1
    batch_size: int = 8
    learning_rate: float = 2e-5


class SentimentPredictRequest(BaseModel):
    texts: list[str]


class GenerativeTrainRequest(DatasetRequest):
    latent_dim: int = 8
    hidden_dim: int = 64
    beta: float = 1e-3
    epochs: int = 100
    batch_size: int = 32
    learning_rate: float = 1e-3


class DesignGenerateRequest(BaseModel):
    num_samples: int = 5
    boundary_conditions: list[float] | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/dataset/summary")
def dataset_summary(payload: DatasetRequest) -> dict[str, Any]:
    frame = _load_dataset(payload.dataset_path)
    return {
        "dataset_path": str(_resolve_path(payload.dataset_path)),
        "summary": preprocessor.summarize(frame),
    }


@app.post("/recommender/train")
def train_recommender(payload: RecommenderTrainRequest) -> dict[str, Any]:
    global recommender_model

    frame = _load_dataset(payload.dataset_path)
    interactions = preprocessor.get_recommender_frame(frame)

    config = RecommenderConfig(
        latent_dim=payload.latent_dim,
        learning_rate=payload.learning_rate,
        epochs=payload.epochs,
        batch_size=payload.batch_size,
        density_alpha=payload.density_alpha,
        l2_reg=payload.l2_reg,
    )

    recommender_model = HybridTourismRecommender(config=config)
    metrics = recommender_model.fit(interactions)

    return {
        "message": "Recommender trained successfully.",
        "dataset_summary": preprocessor.summarize(frame),
        "metrics": metrics,
    }


@app.post("/recommender/recommend")
def recommend(payload: RecommendationRequest) -> dict[str, Any]:
    if recommender_model is None:
        raise HTTPException(status_code=400, detail="Recommender model is not trained yet.")

    recommendations = recommender_model.recommend(
        user_id=payload.user_id,
        top_k=payload.top_k,
        candidate_locations=payload.candidate_locations,
        density_overrides=payload.density_overrides,
        exclude_known=payload.exclude_known,
    )
    return {"user_id": payload.user_id, "recommendations": recommendations}


@app.post("/sentiment/train")
def train_sentiment(payload: SentimentTrainRequest) -> dict[str, Any]:
    global sentiment_model

    frame = _load_dataset(payload.dataset_path)
    sentiment_frame = preprocessor.get_sentiment_frame(frame)

    texts = sentiment_frame["post_content"].tolist()
    labels = sentiment_frame["sentiment_label"].tolist()
    if not texts:
        raise HTTPException(status_code=400, detail="No valid text records found for sentiment training.")

    try:
        sentiment_model = CityBrandSentimentAnalyzer(model_name=payload.model_name)
        metrics = sentiment_model.train(
            texts=texts,
            labels=labels,
            epochs=payload.epochs,
            batch_size=payload.batch_size,
            learning_rate=payload.learning_rate,
        )
    except Exception as exc:  # pragma: no cover - runtime env/network dependent
        raise HTTPException(status_code=500, detail=f"Sentiment training failed: {exc}") from exc

    return {
        "message": "Sentiment model trained successfully.",
        "dataset_summary": preprocessor.summarize(frame),
        "metrics": metrics,
    }


@app.post("/sentiment/predict")
def predict_sentiment(payload: SentimentPredictRequest) -> dict[str, Any]:
    global sentiment_model

    if sentiment_model is None:
        try:
            sentiment_model = CityBrandSentimentAnalyzer(model_name="distilbert-base-uncased")
        except Exception as exc:  # pragma: no cover - runtime env/network dependent
            raise HTTPException(
                status_code=500,
                detail=f"Sentiment model is not available. Train first or ensure model download access. {exc}",
            ) from exc

    predictions = sentiment_model.predict(payload.texts)
    return {"predictions": predictions}


@app.post("/design/train")
def train_design_generator(payload: GenerativeTrainRequest) -> dict[str, Any]:
    global generative_model

    frame = _load_dataset(payload.dataset_path)
    matrix = preprocessor.get_geometry_matrix(frame)

    generative_model = UrbanDesignGenerator(
        latent_dim=payload.latent_dim,
        hidden_dim=payload.hidden_dim,
        beta=payload.beta,
    )

    metrics = generative_model.fit(
        geometry_matrix=matrix,
        epochs=payload.epochs,
        batch_size=payload.batch_size,
        learning_rate=payload.learning_rate,
    )

    return {
        "message": "Generative design model trained successfully.",
        "dataset_summary": preprocessor.summarize(frame),
        "metrics": metrics,
    }


@app.post("/design/generate")
def generate_design(payload: DesignGenerateRequest) -> dict[str, Any]:
    if generative_model is None:
        raise HTTPException(status_code=400, detail="Generative model is not trained yet.")

    generated = generative_model.generate(
        num_samples=payload.num_samples,
        boundary_conditions=payload.boundary_conditions,
    )

    return {
        "num_samples": int(generated.shape[0]),
        "dimension": int(generated.shape[1]) if generated.ndim > 1 else 1,
        "samples": generated.tolist(),
    }


def _resolve_path(path_str: str) -> Path:
    path = Path(path_str)
    if path.is_absolute():
        return path
    return BASE_DIR / path


def _load_dataset(dataset_path: str):
    path = _resolve_path(dataset_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Dataset file not found: {path}")

    try:
        return preprocessor.load_csv(path)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to load dataset: {exc}") from exc
