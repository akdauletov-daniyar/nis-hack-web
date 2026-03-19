# Creative Urban Industry ML Platform

This module provides an integrated ML stack for:

- Tourism recommendations with crowd-density penalty
- City branding sentiment analysis from text
- Generative urban design from geometry parameters

## Project Structure

```text
/ml_urban_platform
  ├── data/
  │   └── dataset_loader.py
  ├── models/
  │   ├── recommender.py
  │   ├── sentiment_nlp.py
  │   └── generative_design.py
  ├── api/
  │   └── main.py
  ├── requirements.txt
  └── README.md
```

## Data Schema Support

The data loader automatically maps aliases to canonical columns:

- `User_ID` or `Tourist_ID` -> `user_id`
- `Category` or `Interests` -> `category`
- `Location_ID` or `Attraction` -> `location_id`
- `Visitor_Count` or `Density` -> `visitor_count`
- `Rating` or `Review_Score` -> `rating`
- `Post_Content` or `Text` -> `post_content`
- `Sentiment_Label` -> `sentiment_label`
- `Cultural_Diversity_Index` -> `cultural_diversity_index`
- `Geometry_Parameters` -> `geometry_parameters`

## Setup

```bash
cd ml_urban_platform
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run API

From the repository root (`nis-hack-web`):

```bash
uvicorn ml_urban_platform.api.main:app --reload --host 0.0.0.0 --port 8000
```

Swagger UI:

- [http://localhost:8000/docs](http://localhost:8000/docs)

## API Endpoints

- `GET /health` - service health check
- `POST /dataset/summary` - validate and summarize dataset
- `POST /recommender/train` - train hybrid recommender
- `POST /recommender/recommend` - generate recommendations
- `POST /sentiment/train` - fine-tune transformer sentiment model
- `POST /sentiment/predict` - sentiment predictions
- `POST /design/train` - train VAE on geometry vectors
- `POST /design/generate` - generate new geometry vectors

## Example Requests

### 1) Dataset Summary

```bash
curl -X POST http://localhost:8000/dataset/summary \
  -H "Content-Type: application/json" \
  -d '{"dataset_path":"backend/training_data/creative_industry.csv"}'
```

### 2) Train Recommender

```bash
curl -X POST http://localhost:8000/recommender/train \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_path":"backend/training_data/creative_industry.csv",
    "latent_dim":32,
    "epochs":20,
    "density_alpha":0.4
  }'
```

### 3) Recommend for User

```bash
curl -X POST http://localhost:8000/recommender/recommend \
  -H "Content-Type: application/json" \
  -d '{"user_id":"U_1001","top_k":5}'
```

### 4) Predict Sentiment

```bash
curl -X POST http://localhost:8000/sentiment/predict \
  -H "Content-Type: application/json" \
  -d '{"texts":["Amazing urban art district and clean parks"]}'
```

### 5) Train and Sample Generative Model

```bash
curl -X POST http://localhost:8000/design/train \
  -H "Content-Type: application/json" \
  -d '{"dataset_path":"backend/training_data/creative_industry.csv","epochs":50}'

curl -X POST http://localhost:8000/design/generate \
  -H "Content-Type: application/json" \
  -d '{"num_samples":3}'
```

## Notes

- `transformers` model download requires internet on first use unless cached locally.
- For production, add persistent model storage (save/load from object store or volume).
- You can extend `UrbanDesignGenerator` to a conditional GAN/VAE by concatenating context vectors (e.g., cultural diversity and density features).
