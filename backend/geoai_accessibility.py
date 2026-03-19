"""GeoAI accessibility routing engine for wheelchair-first navigation.

This module provides a production-ready, lightweight GeoAI model that can:
1) Ingest accessibility nodes from CSV/JSON (`geoid`, `tactile_paving`,
   `wheelchair`, `ramp_kerb`).
2) Build an accessibility graph (with optional edge overrides).
3) Run GNN-inspired message passing over node accessibility scores.
4) Return an optimized route with accessibility-aware post-processing.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from hashlib import sha1
from heapq import heappop, heappush
from pathlib import Path
from typing import Any, Iterable, Mapping, TypedDict
import re

import joblib
import numpy as np
import pandas as pd


REQUIRED_NODE_COLUMNS: list[str] = [
    "geoid",
    "tactile_paving",
    "wheelchair",
    "ramp_kerb",
]

OPTIONAL_NODE_COLUMNS: list[str] = ["traffic_signals_sound"]

EDGE_COLUMNS: list[str] = [
    "source_geoid",
    "target_geoid",
    "distance_m",
    "slope_pct",
]


class AccessibilityNodeRow(TypedDict, total=False):
    geoid: str
    tactile_paving: str
    wheelchair: str
    ramp_kerb: str
    traffic_signals_sound: str


class AccessibilityEdgeRow(TypedDict, total=False):
    source_geoid: str
    target_geoid: str
    distance_m: float
    slope_pct: float


class GeoAIRouteStep(TypedDict):
    geoid: str
    instruction: str


class GeoAIRouteResult(TypedDict):
    start_geoid: str
    destination_geoid: str
    resolved_start_from: str
    resolved_destination_from: str
    path: list[str]
    route: list[GeoAIRouteStep]
    description: str
    distance_m: float
    estimated_time_min: float
    accessibility_score: float
    confidence: float
    barriers_detected: int
    warnings: list[str]
    recommendation: str


_TACTILE_SCORE = {
    "yes": 1.0,
    "incorrect": 0.45,
    "no": 0.08,
}

_WHEELCHAIR_SCORE = {
    "yes": 1.0,
    "limited": 0.55,
    "no": 0.05,
}

_KERB_SCORE = {
    "yes": 1.0,
    "flush": 0.95,
    "lowered": 0.9,
    "no": 0.08,
}

_SOUND_SIGNAL_SCORE = {
    "yes": 1.0,
    "no": 0.65,
}


def _normalize_text(value: Any, default: str = "no") -> str:
    if value is None:
        return default
    text = str(value).strip().lower()
    return text or default


def _safe_mean(values: Iterable[float]) -> float:
    seq = list(values)
    if not seq:
        return 0.0
    return float(np.mean(seq))


@dataclass
class GeoAIWheelchairRouter:
    """Graph-routing model with GNN-style neighborhood propagation.

    Design summary:
    - Base node accessibility score from tactile paving + wheelchair status +
      kerb/ramp profile + optional audio-crossing support.
    - Message passing smooths local accessibility context over graph topology.
    - Dijkstra inference uses edge cost = distance * accessibility penalty *
      slope penalty.
    """

    tactile_weight: float = 0.25
    wheelchair_weight: float = 0.4
    kerb_weight: float = 0.25
    signal_weight: float = 0.1
    message_passing_steps: int = 3
    neighborhood_blend: float = 0.35
    graph: dict[str, dict[str, dict[str, float]]] = field(default_factory=dict)
    node_scores: dict[str, float] = field(default_factory=dict)
    node_features: dict[str, AccessibilityNodeRow] = field(default_factory=dict)
    _fitted: bool = False

    def fit(self, nodes: pd.DataFrame, edges: pd.DataFrame | None = None) -> "GeoAIWheelchairRouter":
        node_frame = self._normalize_node_frame(nodes)
        edge_frame = self._normalize_edge_frame(
            edges if edges is not None else self._synthesize_edges(node_frame)
        )

        self.node_features = {
            str(row["geoid"]): {
                "geoid": str(row["geoid"]),
                "tactile_paving": str(row["tactile_paving"]),
                "wheelchair": str(row["wheelchair"]),
                "ramp_kerb": str(row["ramp_kerb"]),
                "traffic_signals_sound": str(row["traffic_signals_sound"]),
            }
            for _, row in node_frame.iterrows()
        }

        self.graph = self._build_graph(edge_frame)
        self.node_scores = self._message_passing_scores(node_frame)
        self._fitted = True
        return self

    def predict_route(self, start: str, destination: str) -> GeoAIRouteResult:
        if not self._fitted:
            raise RuntimeError("GeoAIWheelchairRouter is not fitted.")

        start_geoid, start_from = self._resolve_geoid(start)
        destination_geoid, destination_from = self._resolve_geoid(destination)

        path, weighted_cost = self._shortest_path(start_geoid, destination_geoid)
        if not path:
            raise RuntimeError(
                f"No path found between '{start_geoid}' and '{destination_geoid}'."
            )

        total_distance = self._path_distance(path)
        accessibility_score = round(_safe_mean(self.node_scores[node] for node in path) * 100.0, 2)
        estimated_time_min = round(self._estimate_time_minutes(total_distance, accessibility_score), 2)
        barriers_detected = self._barrier_count(path)
        confidence = round(float(np.clip(0.55 + (accessibility_score / 100.0) * 0.4, 0.55, 0.97)), 2)

        route_steps: list[GeoAIRouteStep] = self._build_route_steps(path)
        warnings = self._collect_warnings(path)
        recommendation = self._recommendation(accessibility_score, barriers_detected)

        return {
            "start_geoid": start_geoid,
            "destination_geoid": destination_geoid,
            "resolved_start_from": start_from,
            "resolved_destination_from": destination_from,
            "path": path,
            "route": route_steps,
            "description": (
                f"GeoAI wheelchair route from {start_geoid} to {destination_geoid} "
                f"(weighted_cost={weighted_cost:.2f})."
            ),
            "distance_m": round(total_distance, 2),
            "estimated_time_min": estimated_time_min,
            "accessibility_score": accessibility_score,
            "confidence": confidence,
            "barriers_detected": barriers_detected,
            "warnings": warnings,
            "recommendation": recommendation,
        }

    def save_model(self, output_path: str | Path) -> Path:
        if not self._fitted:
            raise RuntimeError("GeoAIWheelchairRouter is not fitted.")

        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        artifact = {
            "params": {
                "tactile_weight": self.tactile_weight,
                "wheelchair_weight": self.wheelchair_weight,
                "kerb_weight": self.kerb_weight,
                "signal_weight": self.signal_weight,
                "message_passing_steps": self.message_passing_steps,
                "neighborhood_blend": self.neighborhood_blend,
            },
            "graph": self.graph,
            "node_scores": self.node_scores,
            "node_features": self.node_features,
            "fitted": self._fitted,
        }
        joblib.dump(artifact, path)
        return path

    @classmethod
    def load_model(cls, model_path: str | Path) -> "GeoAIWheelchairRouter":
        artifact = joblib.load(Path(model_path))
        params = artifact.get("params", {})
        router = cls(
            tactile_weight=float(params.get("tactile_weight", 0.25)),
            wheelchair_weight=float(params.get("wheelchair_weight", 0.4)),
            kerb_weight=float(params.get("kerb_weight", 0.25)),
            signal_weight=float(params.get("signal_weight", 0.1)),
            message_passing_steps=int(params.get("message_passing_steps", 3)),
            neighborhood_blend=float(params.get("neighborhood_blend", 0.35)),
        )
        router.graph = dict(artifact.get("graph", {}))
        router.node_scores = dict(artifact.get("node_scores", {}))
        router.node_features = dict(artifact.get("node_features", {}))
        router._fitted = bool(artifact.get("fitted", False))
        if not router._fitted:
            raise RuntimeError("Loaded GeoAI artifact is not fitted.")
        return router

    def _normalize_node_frame(self, nodes: pd.DataFrame) -> pd.DataFrame:
        missing_columns = [column for column in REQUIRED_NODE_COLUMNS if column not in nodes.columns]
        if missing_columns:
            raise ValueError(
                "Accessibility node data is missing required columns: "
                f"{', '.join(missing_columns)}"
            )

        frame = nodes.copy()
        for optional_column in OPTIONAL_NODE_COLUMNS:
            if optional_column not in frame.columns:
                frame[optional_column] = "no"

        frame = frame.dropna(subset=["geoid"]).drop_duplicates(subset=["geoid"], keep="first")
        if frame.empty:
            raise ValueError("No valid accessibility nodes available after normalization.")

        frame["geoid"] = frame["geoid"].astype(str)
        frame["tactile_paving"] = frame["tactile_paving"].map(_normalize_text)
        frame["wheelchair"] = frame["wheelchair"].map(_normalize_text)
        frame["ramp_kerb"] = frame["ramp_kerb"].map(_normalize_text)
        frame["traffic_signals_sound"] = frame["traffic_signals_sound"].map(_normalize_text)
        return frame

    def _normalize_edge_frame(self, edges: pd.DataFrame) -> pd.DataFrame:
        frame = edges.copy()
        for column in EDGE_COLUMNS:
            if column not in frame.columns:
                if column == "distance_m":
                    frame[column] = 120.0
                elif column == "slope_pct":
                    frame[column] = 2.0
                else:
                    raise ValueError(f"Edge data is missing required column '{column}'.")

        frame = frame.dropna(subset=["source_geoid", "target_geoid"]).copy()
        frame["source_geoid"] = frame["source_geoid"].astype(str)
        frame["target_geoid"] = frame["target_geoid"].astype(str)
        frame["distance_m"] = pd.to_numeric(frame["distance_m"], errors="coerce").fillna(120.0).clip(lower=10.0)
        frame["slope_pct"] = pd.to_numeric(frame["slope_pct"], errors="coerce").fillna(2.0).clip(lower=0.0)
        return frame

    def _build_graph(self, edges: pd.DataFrame) -> dict[str, dict[str, dict[str, float]]]:
        adjacency: dict[str, dict[str, dict[str, float]]] = {}
        for _, row in edges.iterrows():
            src = str(row["source_geoid"])
            dst = str(row["target_geoid"])
            edge_data = {
                "distance_m": float(row["distance_m"]),
                "slope_pct": float(row["slope_pct"]),
            }
            adjacency.setdefault(src, {})[dst] = edge_data
            adjacency.setdefault(dst, {})[src] = edge_data
        return adjacency

    def _message_passing_scores(self, node_frame: pd.DataFrame) -> dict[str, float]:
        base_scores = {
            str(row["geoid"]): self._base_accessibility_score(
                tactile=row["tactile_paving"],
                wheelchair=row["wheelchair"],
                ramp_kerb=row["ramp_kerb"],
                signal=row["traffic_signals_sound"],
            )
            for _, row in node_frame.iterrows()
        }

        scores = base_scores.copy()
        for _ in range(max(self.message_passing_steps, 1)):
            next_scores: dict[str, float] = {}
            for geoid, current_score in scores.items():
                neighbors = list(self.graph.get(geoid, {}).keys())
                if not neighbors:
                    next_scores[geoid] = current_score
                    continue
                neighborhood_score = _safe_mean(scores.get(neighbor, current_score) for neighbor in neighbors)
                blended = ((1.0 - self.neighborhood_blend) * current_score) + (
                    self.neighborhood_blend * neighborhood_score
                )
                next_scores[geoid] = float(np.clip(blended, 0.0, 1.0))
            scores = next_scores
        return scores

    def _base_accessibility_score(
        self,
        *,
        tactile: str,
        wheelchair: str,
        ramp_kerb: str,
        signal: str,
    ) -> float:
        tactile_score = _TACTILE_SCORE.get(tactile, 0.1)
        wheelchair_score = _WHEELCHAIR_SCORE.get(wheelchair, 0.1)
        kerb_score = _KERB_SCORE.get(ramp_kerb, 0.1)
        signal_score = _SOUND_SIGNAL_SCORE.get(signal, 0.7)

        weighted = (
            tactile_score * self.tactile_weight
            + wheelchair_score * self.wheelchair_weight
            + kerb_score * self.kerb_weight
            + signal_score * self.signal_weight
        )
        return float(np.clip(weighted, 0.0, 1.0))

    def _synthesize_edges(self, node_frame: pd.DataFrame) -> pd.DataFrame:
        """Create a fallback graph when an external edge list is unavailable."""

        geoids = sorted(node_frame["geoid"].astype(str).tolist(), key=self._geoid_sort_key)
        if len(geoids) < 2:
            raise ValueError("Need at least two geoid nodes to build a route graph.")

        synthetic_edges: list[AccessibilityEdgeRow] = []
        hop_offsets = [1, 2, 4, 8]
        for idx in range(len(geoids) - 1):
            src = geoids[idx]
            for offset in hop_offsets:
                next_idx = idx + offset
                if next_idx >= len(geoids):
                    continue

                dst = geoids[next_idx]
                numeric_delta = abs(self._geoid_numeric(src) - self._geoid_numeric(dst))
                base_distance = 70.0 + float(numeric_delta % 200)
                distance = base_distance * (1.0 + (offset - 1) * 0.28)
                slope = min(1.0 + float(numeric_delta % 6) + (offset - 1) * 0.45, 14.0)
                synthetic_edges.append(
                    {
                        "source_geoid": src,
                        "target_geoid": dst,
                        "distance_m": distance,
                        "slope_pct": slope,
                    }
                )

        return pd.DataFrame(synthetic_edges, columns=EDGE_COLUMNS)

    def _shortest_path(self, start: str, destination: str) -> tuple[list[str], float]:
        if start not in self.graph:
            raise ValueError(f"Start geoid '{start}' is not present in graph.")
        if destination not in self.graph:
            raise ValueError(f"Destination geoid '{destination}' is not present in graph.")

        queue: list[tuple[float, str]] = [(0.0, start)]
        distances: dict[str, float] = {start: 0.0}
        previous: dict[str, str] = {}

        while queue:
            current_cost, current_node = heappop(queue)
            if current_node == destination:
                break
            if current_cost > distances.get(current_node, float("inf")):
                continue

            for neighbor, edge_data in self.graph[current_node].items():
                edge_cost = self._edge_cost(current_node, neighbor, edge_data)
                candidate_cost = current_cost + edge_cost
                if candidate_cost < distances.get(neighbor, float("inf")):
                    distances[neighbor] = candidate_cost
                    previous[neighbor] = current_node
                    heappush(queue, (candidate_cost, neighbor))

        if destination not in distances:
            return [], float("inf")

        path = [destination]
        node = destination
        while node != start:
            node = previous[node]
            path.append(node)
        path.reverse()
        return path, float(distances[destination])

    def _edge_cost(self, source: str, target: str, edge_data: Mapping[str, float]) -> float:
        source_score = self.node_scores.get(source, 0.3)
        target_score = self.node_scores.get(target, 0.3)
        distance_m = float(edge_data.get("distance_m", 120.0))
        slope_pct = float(edge_data.get("slope_pct", 2.0))

        accessibility_penalty = 1.0 + ((2.0 - (source_score + target_score)) * 1.15)
        slope_penalty = 1.0 + max(0.0, slope_pct - 5.0) * 0.08
        return (distance_m / 100.0) * accessibility_penalty * slope_penalty

    def _path_distance(self, path: list[str]) -> float:
        if len(path) < 2:
            return 0.0
        distance = 0.0
        for idx in range(len(path) - 1):
            edge_data = self.graph[path[idx]][path[idx + 1]]
            distance += float(edge_data.get("distance_m", 0.0))
        return distance

    def _estimate_time_minutes(self, distance_m: float, accessibility_score: float) -> float:
        # Baseline wheelchair traversal speed ~64 m/min, degraded by route risk.
        accessibility_multiplier = float(np.clip(0.7 + (accessibility_score / 100.0) * 0.6, 0.7, 1.3))
        meters_per_minute = 64.0 * accessibility_multiplier
        return max(distance_m / meters_per_minute, 1.0)

    def _build_route_steps(self, path: list[str]) -> list[GeoAIRouteStep]:
        if len(path) == 1:
            return [{"geoid": path[0], "instruction": f"Arrive at {path[0]}."}]

        steps: list[GeoAIRouteStep] = []
        for idx, geoid in enumerate(path):
            if idx == 0:
                steps.append({"geoid": geoid, "instruction": f"Start at {geoid}."})
                continue
            previous = path[idx - 1]
            edge_data = self.graph[previous][geoid]
            slope = edge_data.get("slope_pct", 0.0)
            distance = edge_data.get("distance_m", 0.0)
            step_note = f"Move to {geoid} over {distance:.0f}m (slope {slope:.1f}%)."
            if idx == len(path) - 1:
                step_note = f"Arrive at {geoid}. Last segment {distance:.0f}m (slope {slope:.1f}%)."
            steps.append({"geoid": geoid, "instruction": step_note})
        return steps

    def _barrier_count(self, path: list[str]) -> int:
        barriers = 0
        for geoid in path:
            features = self.node_features.get(geoid, {})
            if _normalize_text(features.get("wheelchair")) == "no":
                barriers += 1
            if _normalize_text(features.get("ramp_kerb")) == "no":
                barriers += 1
        return barriers

    def _collect_warnings(self, path: list[str]) -> list[str]:
        warnings: list[str] = []
        for geoid in path:
            features = self.node_features.get(geoid, {})
            tactile = _normalize_text(features.get("tactile_paving"))
            wheelchair = _normalize_text(features.get("wheelchair"))
            ramp_kerb = _normalize_text(features.get("ramp_kerb"))

            if wheelchair == "limited":
                warnings.append(f"{geoid}: wheelchair access is limited.")
            elif wheelchair == "no":
                warnings.append(f"{geoid}: wheelchair access is not available.")

            if ramp_kerb == "no":
                warnings.append(f"{geoid}: missing lowered kerb/ramp.")

            if tactile in {"no", "incorrect"}:
                warnings.append(f"{geoid}: tactile paving is {tactile}.")

            if len(warnings) >= 6:
                break
        return warnings

    def _recommendation(self, accessibility_score: float, barriers_detected: int) -> str:
        if accessibility_score >= 82 and barriers_detected <= 1:
            return "Route is highly accessible for wheelchair users."
        if accessibility_score >= 65 and barriers_detected <= 3:
            return "Route is usable with caution at marked segments."
        return "Consider assistance support or alternate route due to barriers."

    def _resolve_geoid(self, value: str) -> tuple[str, str]:
        candidate = str(value).strip()
        if candidate in self.node_scores:
            return candidate, candidate

        if candidate.lower().startswith("node_"):
            numeric_candidate = self._closest_geoid_by_number(candidate)
            return numeric_candidate, candidate

        # For free-text addresses/coordinates, map deterministically to known nodes.
        digest = sha1(candidate.encode("utf-8")).hexdigest()
        idx = int(digest[:8], 16) % len(self.node_scores)
        selected_geoid = sorted(self.node_scores.keys(), key=self._geoid_sort_key)[idx]
        return selected_geoid, candidate

    def _closest_geoid_by_number(self, geoid_like: str) -> str:
        requested = self._geoid_numeric(geoid_like)
        known_geoids = list(self.node_scores.keys())
        return min(known_geoids, key=lambda geoid: abs(self._geoid_numeric(geoid) - requested))

    @staticmethod
    def _geoid_numeric(geoid: str) -> int:
        match = re.search(r"(\d+)", geoid)
        if not match:
            return 0
        return int(match.group(1))

    @classmethod
    def _geoid_sort_key(cls, geoid: str) -> tuple[int, str]:
        return (cls._geoid_numeric(geoid), geoid)


@dataclass
class GeoAIAccessibilityService:
    """Service wrapper for reusable routing in API handlers."""

    node_csv_path: str | Path
    router: GeoAIWheelchairRouter = field(default_factory=GeoAIWheelchairRouter)
    _loaded: bool = False

    def load(self) -> None:
        source_path = Path(self.node_csv_path)
        if source_path.suffix.lower() in {".joblib", ".pkl"}:
            self.router = GeoAIWheelchairRouter.load_model(source_path)
        else:
            frame = pd.read_csv(source_path)
            self.router.fit(nodes=frame)
        self._loaded = True

    def route(
        self,
        *,
        start: str,
        destination: str,
        nodes_override: Iterable[Mapping[str, Any]] | None = None,
        edges_override: Iterable[Mapping[str, Any]] | None = None,
    ) -> GeoAIRouteResult:
        if nodes_override is not None:
            temp_router = GeoAIWheelchairRouter(
                tactile_weight=self.router.tactile_weight,
                wheelchair_weight=self.router.wheelchair_weight,
                kerb_weight=self.router.kerb_weight,
                signal_weight=self.router.signal_weight,
                message_passing_steps=self.router.message_passing_steps,
                neighborhood_blend=self.router.neighborhood_blend,
            )
            node_frame = pd.DataFrame(list(nodes_override))
            edge_frame = pd.DataFrame(list(edges_override)) if edges_override is not None else None
            temp_router.fit(nodes=node_frame, edges=edge_frame)
            return temp_router.predict_route(start=start, destination=destination)

        if not self._loaded:
            self.load()
        return self.router.predict_route(start=start, destination=destination)

    def stats(self) -> dict[str, Any]:
        if not self._loaded:
            self.load()
        edge_count = int(sum(len(neighbors) for neighbors in self.router.graph.values()) / 2)
        return {
            "node_count": len(self.router.node_scores),
            "edge_count": edge_count,
            "message_passing_steps": self.router.message_passing_steps,
            "neighborhood_blend": self.router.neighborhood_blend,
        }
