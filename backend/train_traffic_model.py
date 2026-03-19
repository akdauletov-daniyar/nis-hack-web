"""Train the traffic congestion model from CSV.

For the current ensemble baseline (Random Forest), the `epochs` argument is
mapped to `n_estimators` so the training CLI stays consistent with a future
BiLSTM implementation where epochs are native optimization passes.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Final

import pandas as pd
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split

from data_preprocessing import FEATURE_COLUMNS, TARGET_COLUMN, validate_feature_schema
from traffic_model import RandomForestBackend, TrafficCongestionPredictor


DEFAULT_DATA_PATH: Final[Path] = Path("backend/training_data/traffic_data_1.csv")
DEFAULT_MODEL_PATH: Final[Path] = Path("backend/artifacts/traffic_congestion_model.joblib")


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""

    parser = argparse.ArgumentParser(description="Train traffic congestion classifier.")
    parser.add_argument(
        "--data-path",
        type=Path,
        default=DEFAULT_DATA_PATH,
        help="Path to training CSV file.",
    )
    parser.add_argument(
        "--model-output",
        type=Path,
        default=DEFAULT_MODEL_PATH,
        help="Path to save trained model artifact.",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=15,
        help=(
            "Training epochs requested by operator. For RandomForest baseline this "
            "is mapped to number of estimators."
        ),
    )
    parser.add_argument(
        "--test-size",
        type=float,
        default=0.2,
        help="Validation split ratio.",
    )
    parser.add_argument(
        "--random-state",
        type=int,
        default=42,
        help="Random seed for split reproducibility.",
    )
    return parser.parse_args()


def main() -> None:
    """Train, evaluate, and persist a congestion classification model."""

    args = parse_args()
    if args.epochs < 1:
        raise ValueError("--epochs must be >= 1")

    training_frame = pd.read_csv(args.data_path)
    validate_feature_schema(training_frame)

    if TARGET_COLUMN not in training_frame.columns:
        raise ValueError(f"CSV must include target column '{TARGET_COLUMN}'.")

    train_df, validation_df = train_test_split(
        training_frame,
        test_size=args.test_size,
        random_state=args.random_state,
        stratify=training_frame[TARGET_COLUMN],
    )

    backend = RandomForestBackend(n_estimators=args.epochs, random_state=args.random_state)
    predictor = TrafficCongestionPredictor(model_backend=backend)
    predictor.train(train_df)

    validation_predictions = predictor.predict(validation_df.loc[:, FEATURE_COLUMNS])
    y_true = validation_df[TARGET_COLUMN].astype(str).tolist()

    accuracy = accuracy_score(y_true, validation_predictions)
    report = classification_report(
        y_true,
        validation_predictions,
        labels=["Low", "Medium", "High"],
        zero_division=0,
    )

    model_path = predictor.save_model(args.model_output)

    print(f"Trained using data: {args.data_path}")
    print(f"Epochs requested: {args.epochs} (mapped to n_estimators)")
    print(f"Validation accuracy: {accuracy:.4f}")
    print("Classification report:")
    print(report)
    print(f"Saved model artifact: {model_path}")


if __name__ == "__main__":
    main()
