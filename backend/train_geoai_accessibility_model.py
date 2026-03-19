"""Train and persist GeoAI accessibility routing model from CSV data."""

from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from geoai_accessibility import GeoAIWheelchairRouter, REQUIRED_NODE_COLUMNS


def _default_data_path() -> Path:
    candidates = [
        Path("backend/training_data/accessibility_4.csv"),
        Path("training_data/accessibility_4.csv"),
    ]
    for path in candidates:
        if path.exists():
            return path
    return candidates[0]


def _default_model_output_path() -> Path:
    candidates = [
        Path("backend/artifacts/geoai_accessibility_router.joblib"),
        Path("artifacts/geoai_accessibility_router.joblib"),
    ]
    for path in candidates:
        if path.parent.exists():
            return path
    return candidates[0]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train GeoAI wheelchair accessibility routing model."
    )
    parser.add_argument(
        "--data-path",
        type=Path,
        default=_default_data_path(),
        help="Path to accessibility CSV data.",
    )
    parser.add_argument(
        "--model-output",
        type=Path,
        default=_default_model_output_path(),
        help="Output path for serialized model artifact (.joblib).",
    )
    parser.add_argument("--message-passing-steps", type=int, default=3)
    parser.add_argument("--neighborhood-blend", type=float, default=0.35)
    parser.add_argument("--tactile-weight", type=float, default=0.25)
    parser.add_argument("--wheelchair-weight", type=float, default=0.4)
    parser.add_argument("--kerb-weight", type=float, default=0.25)
    parser.add_argument("--signal-weight", type=float, default=0.1)
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if not args.data_path.exists():
        raise FileNotFoundError(f"Training data not found: {args.data_path}")

    frame = pd.read_csv(args.data_path)
    missing = [column for column in REQUIRED_NODE_COLUMNS if column not in frame.columns]
    if missing:
        raise ValueError(f"Training data missing required columns: {', '.join(missing)}")

    router = GeoAIWheelchairRouter(
        tactile_weight=args.tactile_weight,
        wheelchair_weight=args.wheelchair_weight,
        kerb_weight=args.kerb_weight,
        signal_weight=args.signal_weight,
        message_passing_steps=args.message_passing_steps,
        neighborhood_blend=args.neighborhood_blend,
    )
    router.fit(frame)
    model_path = router.save_model(args.model_output)

    node_count = len(router.node_scores)
    edge_count = int(sum(len(neighbors) for neighbors in router.graph.values()) / 2)
    avg_score = sum(router.node_scores.values()) / max(node_count, 1)
    low_access_nodes = sum(1 for score in router.node_scores.values() if score < 0.5)

    print(f"Data source: {args.data_path}")
    print(f"Trained nodes: {node_count}")
    print(f"Generated edges: {edge_count}")
    print(f"Average accessibility score: {avg_score:.4f}")
    print(f"Low-accessibility nodes (<0.5): {low_access_nodes}")
    print(f"Saved model artifact: {model_path}")


if __name__ == "__main__":
    main()
