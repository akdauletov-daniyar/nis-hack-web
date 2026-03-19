"""Example: run one real-time traffic payload through a trained model."""

from __future__ import annotations

from pathlib import Path

from data_preprocessing import TrafficInputRow
from traffic_model import TrafficCongestionPredictor


def predict_single_realtime_event(model_path: str | Path) -> str:
    """Load saved model artifact and classify one incoming traffic event."""

    predictor = TrafficCongestionPredictor.load_model(model_path)

    realtime_payload: TrafficInputRow = {
        "Timestamp": "2026-03-19T08:45:00Z",
        "Location_ID": "ALM_004",
        "Latitude": 43.2460,
        "Longitude": 76.9285,
        "Vehicle_Count": 208,
        "Traffic_Speed_kmh": 26.4,
        "Road_Occupancy_Pct": 71.2,
        "Vehicle_Count_Cars": 159,
        "Vehicle_Count_Bikes": 18,
        "Vehicle_Count_Buses": 11,
        "Vehicle_Count_Trucks": 20,
        "Traffic_Light_State": "Red",
        "Weather_Condition": "Rain",
        "Accident_Report": 1,
        "Sentiment_Score": -0.42,
        "horn_events_per_min": 34,
        "CO2_Emissions_ppm": 612.5,
    }

    return predictor.predict(realtime_payload)[0]


if __name__ == "__main__":
    model_file = Path("backend/artifacts/traffic_congestion_model.joblib")
    result = predict_single_realtime_event(model_file)
    print(f"Predicted Traffic_Congestion_Level: {result}")
