<p align="center">
  <img src="frontend/public/app-logo.png" alt="Sonar Logo" width="80" />
</p>

<h1 align="center">Sonar — AI-Powered Smart City Platform</h1>

<p align="center">
  <strong>Real-time urban mobility, air quality forecasting, wheelchair-accessible routing, and emergency response — unified in one platform.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss" />
  <img src="https://img.shields.io/badge/Supabase-BaaS-3ECF8E?logo=supabase" />
  <img src="https://img.shields.io/badge/PyTorch-2.2-EE4C2C?logo=pytorch" />
</p>

---

## Table of Contents

- [The Problem](#the-problem)
- [Our Solution](#our-solution)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Machine Learning Models](#machine-learning-models)
  - [Air Quality Hybrid Model](#1-air-quality-hybrid-model)
  - [Traffic Congestion Model](#2-traffic-congestion-model)
  - [GeoAI Accessibility Router](#3-geoai-accessibility-router)
  - [Data Preprocessing Pipeline](#4-data-preprocessing-pipeline)
  - [Integration Service](#5-integration-service)
- [API Endpoints](#api-endpoints)
- [Role-Based Dashboards](#role-based-dashboards)
- [Key Features](#key-features)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Contributing](#contributing)
- [License](#license)

---

## The Problem

Modern cities are growing at an unprecedented rate. The United Nations projects that **68% of the world's population will live in urban areas by 2050**, placing enormous strain on infrastructure that was never designed for this scale. Today's cities face a convergence of critical, interconnected challenges:

### 🌫️ Air Quality Crisis
Urban air pollution is responsible for an estimated **4.2 million premature deaths annually** (WHO). Cities lack real-time, hyper-local air quality forecasting — most rely on sparse monitoring stations that report hourly averages, missing dangerous pollution spikes in neighborhoods between sensors. Citizens have no way to plan their outdoor activities around predicted air quality.

### 🚗 Traffic Congestion
Urban congestion costs the global economy over **$1 trillion per year** in lost productivity and wasted fuel. Existing traffic management systems are reactive, not predictive — they respond to congestion after it has already formed. There is no unified platform that combines speed data, vehicle mix, weather conditions, acoustic stress signals, and CO₂ emissions into a single congestion prediction.

### ♿ Accessibility Gaps
Over **1 billion people worldwide live with disabilities**, yet urban routing services like Google Maps and Waze are designed exclusively for able-bodied users. Wheelchair users, visually impaired pedestrians, and mobility-aid users cannot find routes optimized for their specific needs — accounting for tactile paving, kerb ramps, slope gradients, and audio traffic signals.

### 🚨 Emergency Response Fragmentation
When accidents, floods, or hazards occur, there is no unified citizen-to-government reporting channel. Emergency information flows through fragmented 911 calls, social media posts, and news reports. First responders lack real-time situational awareness, and citizens have no way to see active hazards in their area.

### 🏛️ Data Silos Between Stakeholders
Government agencies, emergency services, volunteers, and citizens each operate in isolation. Traffic data doesn't inform air quality models. Accessibility data isn't integrated into routing. Emergency alerts don't reach volunteers. The city operates as disconnected fragments instead of a unified, intelligent system.

---

## Our Solution

**Sonar** is an AI-powered urban intelligence platform that unifies these fragmented systems into a single, role-aware application. It combines five machine learning models, real-time sensor integration, and a multi-stakeholder dashboard system to create a living, predictive model of the city.

### How Sonar Solves Each Problem

| Problem | Sonar's Solution |
|---|---|
| Air pollution blind spots | **LSTM + XGBoost + CatBoost hybrid model** forecasts CO, C6H6, and AQI at the sensor level, enabling hyper-local predictions |
| Reactive traffic management | **RandomForest congestion classifier** fuses 16+ features (speed, occupancy, weather, horn events, CO₂) into proactive Low/Medium/High predictions |
| Inaccessible routing | **GeoAI wheelchair router** builds accessibility-weighted graphs with tactile paving, kerb, and ramp scoring, then runs Dijkstra with custom penalties |
| Fragmented emergency response | **Real-time Supabase channels** push citizen-reported incidents to Emergency and Admin dashboards instantly via WebSocket subscriptions |
| Stakeholder silos | **5 role-based dashboards** (Citizen, Volunteer, Emergency, Government, Admin) each see the data and actions relevant to their role |

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **React** | 19.2 | Component-based UI with hooks and context |
| **Vite** | 8.0 | Lightning-fast dev server and production bundler |
| **Tailwind CSS** | 4.2 | Utility-first CSS with custom design tokens |
| **React Router** | 7.13 | Client-side routing with role-based guards |
| **Lucide React** | 0.577 | Consistent, tree-shakeable icon system |
| **Supabase JS** | 2.99 | Auth, real-time subscriptions, and database queries |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **FastAPI** | ≥0.115 | High-performance async Python API framework |
| **Uvicorn** | ≥0.30 | ASGI server for production deployment |
| **Pydantic** | ≥2.8 | Request/response validation and serialization |
| **pandas** | ≥2.2 | Data manipulation and CSV processing |
| **scikit-learn** | ≥1.4 | Data preprocessing pipelines and model backends |
| **XGBoost** | ≥2.0 | Gradient-boosted tree ensemble for regression/classification |
| **CatBoost** | ≥1.2 | Categorical-aware gradient boosting for robust predictions |
| **PyTorch** | ≥2.2 | LSTM sequence encoder for temporal feature extraction |
| **Supabase** | ≥2.17 | Server-side auth verification and database access |

### Infrastructure
| Service | Purpose |
|---|---|
| **Supabase** | PostgreSQL database, authentication, real-time WebSocket channels, Row-Level Security |
| **Google Maps Embed API** | Interactive map views with directions, place search, and geolocation |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  React 19 + Vite 8 + Tailwind 4                            │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Auth    │  │ Landing  │  │Dashboards│  │ ML Model   │  │
│  │  Pages   │  │  Page    │  │(5 roles) │  │ Pages (5)  │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│                                                             │
│  Context: Auth │ Theme │ Language │ UI                      │
└───────────┬─────────────────────────┬───────────────────────┘
            │ REST API                │ Real-time WS
            ▼                         ▼
┌──────────────────────┐   ┌─────────────────────┐
│    FastAPI Backend    │   │     Supabase BaaS    │
│                      │   │                      │
│  /api/users          │   │  Auth (JWT)          │
│  /api/routes         │   │  PostgreSQL          │
│  /api/alerts         │   │  Real-time Channels  │
│  /api/ecology        │   │  Row-Level Security  │
│  /api/ml             │   └─────────────────────┘
│    ├─ air-quality     │
│    ├─ traffic         │
│    └─ geoai           │
│                      │
│  ML Models:          │
│  ├─ LSTM+XGB+CB      │
│  ├─ RandomForest     │
│  └─ GNN Dijkstra    │
└──────────────────────┘
```

---

## Project Structure

```
nis-hack-web/
├── frontend/                          # React SPA
│   ├── public/                        # Static assets (logo, icons)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx             # Top nav with AI Models dropdown
│   │   │   ├── Footer.jsx             # Site footer
│   │   │   ├── Layout.jsx             # Outlet wrapper (Navbar + Footer)
│   │   │   ├── Sidebar.jsx            # Dashboard sidebar navigation
│   │   │   ├── ProtectedRoute.jsx     # Role-based route guard
│   │   │   ├── MapRoutingWidget.jsx   # Google Maps with routing
│   │   │   ├── AIChatWidget.jsx       # AI assistant chat interface
│   │   │   ├── EmergencyAlertsBanner.jsx
│   │   │   ├── GamificationWidget.jsx # Points/badges system
│   │   │   └── AccessibilityControls.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx        # Supabase auth state
│   │   │   ├── ThemeContext.jsx       # Light/dark mode with persistence
│   │   │   ├── LanguageContext.jsx    # i18n (EN/RU/KZ)
│   │   │   └── UIContext.jsx          # Sidebar/layout state
│   │   ├── lib/
│   │   │   ├── supabase.js            # Supabase client singleton
│   │   │   └── env.js                 # Environment variable validation
│   │   ├── pages/
│   │   │   ├── Auth.jsx               # Login/Register
│   │   │   ├── LandingPage.jsx        # Public map view with routing
│   │   │   ├── Profile.jsx            # User profile management
│   │   │   ├── Settings.jsx           # Theme & language preferences
│   │   │   ├── dashboards/
│   │   │   │   ├── CitizenDashboard.jsx
│   │   │   │   ├── VolunteerDashboard.jsx
│   │   │   │   ├── EmergencyDashboard.jsx
│   │   │   │   ├── GovernmentDashboard.jsx
│   │   │   │   └── AdminDashboard.jsx
│   │   │   └── models/
│   │   │       ├── AirQualityModel.jsx    # CSV upload → AQ predictions
│   │   │       ├── DataPreprocessing.jsx  # CSV preview + pipeline docs
│   │   │       ├── GeoAIAccessibility.jsx # Route form → accessibility route
│   │   │       ├── IntegrationService.jsx # Sensor event form → predictions
│   │   │       └── TrafficModel.jsx       # CSV upload → congestion levels
│   │   ├── App.jsx                    # Route definitions
│   │   ├── main.jsx                   # React entry point
│   │   └── index.css                  # Tailwind + design tokens
│   ├── index.html                     # FOUC prevention script
│   └── package.json
│
├── backend/                           # FastAPI server
│   ├── main.py                        # App entry, CORS, router registration
│   ├── requirements.txt               # Python dependencies
│   ├── api/
│   │   ├── deps.py                    # Supabase client, auth dependencies
│   │   └── routers/
│   │       ├── users.py               # User CRUD
│   │       ├── routes.py              # GeoAI routing + traffic prediction
│   │       ├── alerts.py              # Emergency alert CRUD
│   │       ├── ecology.py             # Air quality sensor ingestion
│   │       └── ml_inference.py        # ML model CSV upload endpoints
│   ├── core/
│   │   └── config.py                  # Pydantic settings (env loading)
│   ├── air_quality_modelling.py       # LSTM + XGBoost + CatBoost hybrid
│   ├── data_preprocessing.py          # Traffic feature engineering
│   ├── geoai_accessibility.py         # Wheelchair-accessible graph routing
│   ├── integration_service.py         # Air quality inference wrapper
│   └── traffic_model.py              # RandomForest congestion classifier
│
├── supabase/
│   └── schema.sql                     # Database DDL + trigger functions
│
└── .gitignore                         # Comprehensive ignore patterns
```

---

## Machine Learning Models

### 1. Air Quality Hybrid Model

**File:** `backend/air_quality_modelling.py`  
**Endpoint:** `POST /api/ml/air-quality/predict`  
**Input:** CSV upload with sensor readings

#### Why This Architecture?

Air quality data is inherently **temporal** — pollutant concentrations follow diurnal cycles, seasonal trends, and weather-driven patterns. A single-point regression model misses these dynamics. Our hybrid approach combines:

- **LSTM Encoder** (PyTorch) — Captures temporal dependencies across a 24-timestep sliding window. The bidirectional nature of pollutant dispersion (wind-driven advection + local emission cycles) makes sequence modeling essential.
- **XGBoost Head** — Handles the tabular, non-linear relationships between static features (location, wind speed) and the LSTM embeddings. XGBoost excels at finding complex feature interactions without manual engineering.
- **CatBoost Head** — Provides a second opinion on the same features. CatBoost's ordered boosting reduces overfitting on small datasets, and its native categorical handling is ideal for station IDs.
- **Ensemble Average** — The two gradient-boosted heads are averaged, reducing variance and improving robustness.

#### Prediction Targets

| Target | Type | Why |
|---|---|---|
| CO Concentration | Regression | Carbon monoxide is the primary urban traffic pollutant |
| C6H6 Concentration | Regression | Benzene is a carcinogenic VOC from vehicle exhaust |
| AQI Classification | Multi-class | Provides actionable "Good/Moderate/Unhealthy" categories for citizens |

#### Key Hyperparameters

| Parameter | Value | Rationale |
|---|---|---|
| Window Size | 24 | One full diurnal cycle for temporal encoding |
| LSTM Hidden | 64 | Balances capacity vs. overfitting on sensor-scale data |
| LSTM Layers | 2 | Captures multi-scale temporal patterns |
| CV Strategy | 5-fold TimeSeriesSplit | Respects temporal ordering — no future data leakage |

---

### 2. Traffic Congestion Model

**File:** `backend/traffic_model.py`  
**Endpoint:** `POST /api/ml/traffic/predict`  
**Input:** CSV upload with traffic sensor data

#### Why RandomForest?

Traffic congestion prediction requires a model that handles **heterogeneous feature types** (continuous speed data, categorical weather, binary accident flags, acoustic stress signals) with high interpretability. RandomForest was chosen because:

- **Feature importance** — Government dashboards can show which factors drive congestion (speed vs. weather vs. accidents), enabling evidence-based policy decisions.
- **Robustness to noise** — Urban sensor data is noisy (GPS drift, sensor failures). Bagging across 400 trees smooths out individual sensor anomalies.
- **Class imbalance handling** — `class_weight='balanced'` ensures the model learns "High" congestion patterns even when most observations are "Low".
- **Pluggable backend** — The `ModelBackend` protocol (`fit`/`predict`) allows swapping RandomForest for a BiLSTM when enough sequential data is collected, without changing the preprocessing pipeline.

#### Feature Groups (16+ features)

| Group | Features | Why Included |
|---|---|---|
| Traffic State | Speed, Occupancy, Vehicle Count | Core congestion indicators |
| Vehicle Mix | Cars, Bikes, Buses, Trucks | Different vehicle types have different congestion impacts |
| Control & Context | Light State, Weather, Accidents | External factors that modulate congestion |
| Stress Signals | Horn events/min, CO₂ ppm, Sentiment | Novel proxy signals for congestion severity |

#### Congestion Classes

| Level | Description |
|---|---|
| **Low** | Free-flowing traffic, no intervention needed |
| **Medium** | Moderate delays, consider alternate routes |
| **High** | Severe gridlock, active management required |

---

### 3. GeoAI Accessibility Router

**File:** `backend/geoai_accessibility.py`  
**Endpoint:** `POST /api/ml/geoai/route`  
**Input:** JSON (start + destination geoids)

#### Why GNN-Style Routing?

Traditional routing (Dijkstra on distance/time) is **fundamentally inaccessible** — it doesn't know that a 50m shortcut through a park has no kerb ramps, or that a particular intersection lacks audio traffic signals. Our approach:

1. **Node Scoring** — Each intersection/node gets a weighted accessibility score from four features:
   - Wheelchair access (40%) — the most critical barrier
   - Tactile paving (25%) — essential for visually impaired users
   - Kerb/ramp availability (25%) — physical barrier elimination
   - Audio signals (10%) — intersection safety for hearing-impaired

2. **GNN-Inspired Message Passing** — Accessibility scores are smoothed over the graph topology through 3 rounds of neighborhood blending (35% blend factor). This propagates "good" and "bad" accessibility information between connected nodes, so an inaccessible node penalizes its neighbors.

3. **Modified Dijkstra** — Edge costs are `distance × accessibility_penalty × slope_penalty`. Routes prefer slightly longer paths that maintain consistent accessibility over shorter paths with barriers.

#### Why Not Just Google Maps API?

Google Maps has no accessibility routing. It optimizes for distance or time, not for wheelchair traversability. Our model uses **custom graph features** (tactile paving, kerb profiles, ramp availability) that aren't available in any commercial routing API.

---

### 4. Data Preprocessing Pipeline

**File:** `backend/data_preprocessing.py`  
**Frontend:** Client-side CSV preview (no backend endpoint — runs server-side during traffic prediction)

#### Why a Dedicated Pipeline?

Raw sensor data is messy — missing values, inconsistent timestamps, categorical strings. The preprocessing pipeline uses **sklearn ColumnTransformers** for reproducible, versioned feature engineering:

| Stage | What It Does | Why |
|---|---|---|
| Temporal Extraction | Cyclic sin/cos encoding of hour and day-of-week | Captures periodicity without ordinal bias (23:00 is close to 00:00) |
| Holiday Flagging | US Federal holiday boolean | Traffic patterns differ dramatically on holidays |
| Numeric Imputation | Median fill → StandardScaler | Robust to outliers, normalizes feature scales for model convergence |
| Categorical Encoding | Most-frequent fill → OneHotEncoder | Converts Weather_Condition, Traffic_Light_State to model-ready dummies |

---

### 5. Integration Service

**File:** `backend/integration_service.py`  
**Frontend:** Sensor event form → single prediction via air quality endpoint

#### Why a Wrapper Service?

The raw `AirQualityHybridModel` expects a full windowed DataFrame. In production, sensor events arrive **one at a time**. The Integration Service provides:

- **Rolling History Buffer** — A fixed-size deque maintains the last `window_size + horizon` events. New readings are appended, oldest are evicted.
- **Auto-Padding** — When fewer readings exist than the minimum window, the earliest row is duplicated to pad the sequence. This enables **single-event inference** from a cold start.
- **JSON Serialization** — Converts numpy predictions to JSON-safe Python types for API responses.

---

## API Endpoints

### Core Platform APIs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/users/` | — | Create/manage users |
| `GET` | `/api/routes/accessible-route` | — | GeoAI wheelchair routing (query params) |
| `POST` | `/api/routes/accessible-route/geoai` | — | GeoAI routing with inline node/edge data |
| `GET` | `/api/routes/accessible-route/geoai-stats` | — | Graph statistics |
| `POST` | `/api/alerts/` | Bearer | Create emergency alert |
| `GET` | `/api/alerts/` | — | List active emergency alerts |
| `POST` | `/api/ecology/sensor-ingest` | — | Ingest air quality sensor event |

### ML Inference APIs

| Method | Endpoint | Input | Returns |
|---|---|---|---|
| `POST` | `/api/ml/air-quality/predict` | CSV file | CO, C6H6, AQI predictions per row |
| `POST` | `/api/ml/traffic/predict` | CSV file | Congestion level (Low/Medium/High) per row |
| `POST` | `/api/ml/geoai/route` | JSON body | Accessible route with distance, time, score |

---

## Role-Based Dashboards

Sonar implements **Role-Based Access Control (RBAC)** with 5 user roles, each with a dedicated dashboard:

| Role | Dashboard | Capabilities |
|---|---|---|
| **Citizen** | Routing & Map | Google Maps navigation, destination routing, location tracking |
| **Volunteer** | Volunteer Board | Community task assignments, gamification points, badge progression |
| **Emergency** | Emergencies | Real-time critical alerts feed, accident self-reporting form, severity classification |
| **Government** | City Analytics | Aggregate traffic/air quality metrics, policy-level analytics, trend visualization |
| **Admin** | Admin Dashboard | Full platform oversight, user management, system-wide monitoring |

Roles are assigned during registration and stored in Supabase's `profiles` table. The `ProtectedRoute` component checks the user's role before rendering each dashboard.

---

## Key Features

### 🌗 Light/Dark Theme Toggle
- System preference detection via `prefers-color-scheme`
- `localStorage` persistence across sessions
- FOUC prevention with synchronous `<head>` script
- Tailwind CSS custom properties for seamless switching

### 🌍 Multilingual Support
- English, Russian (Русский), Kazakh (Қазақша)
- `LanguageContext` with `localStorage` persistence
- Dynamic label switching across all UI elements

### 📍 Google Maps Integration
- Interactive embedded maps on Landing, Admin, and Citizen pages
- Real-time geolocation with "locate me" floating action button
- A-to-B routing with Google Directions API

### 🚨 Real-Time Emergency Alerts
- **Supabase Realtime** WebSocket subscriptions
- Citizen self-reporting form with:
  - 6 event categories (Traffic Accident, Flooding, Pothole, etc.)
  - 4-level severity classification
  - Visual evidence upload
  - Anonymous reporting option
- Live alert feed on Emergency and Admin dashboards

### 🎮 Gamification
- Points-based engagement system for Volunteers
- Badge progression incentivizes community participation
- Leaderboard visibility in Volunteer Dashboard

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **Python** ≥ 3.11
- **pip** (Python package manager)
- A **Supabase** project (free tier is sufficient)
- A **Google Cloud** API key with Maps Embed API enabled

### 1. Clone the Repository

```bash
git clone https://github.com/akdauletov-daniyar/nis-hack-web.git
cd nis-hack-web
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (macOS/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create `backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
ACCESSIBILITY_DATA_PATH=./training_data/accessibility_4.csv
```

Start the server:
```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

Create `frontend/.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_GOOGLE_CLOUD_API=your-google-maps-api-key
```

Start the dev server:
```bash
npm run dev
```

### 4. Database Setup

Run the SQL in `supabase/schema.sql` in your Supabase SQL editor to create:
- The `user_role` enum type
- The `handle_new_user()` trigger function
- Automatic profile creation on user signup

---

## Environment Variables

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase public anon key |
| `VITE_GOOGLE_CLOUD_API` | ✅ | Google Cloud API key (Maps Embed) |

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_KEY` | ✅ | Supabase service role key |
| `ACCESSIBILITY_DATA_PATH` | ❌ | Path to accessibility CSV (default: `training_data/accessibility_4.csv`) |

---

## Database Schema

```sql
-- User roles
ENUM user_role: 'citizen', 'volunteer', 'admin', 'government', 'emergency'

-- profiles table (auto-created on signup)
profiles (
  id          UUID PRIMARY KEY (references auth.users),
  role        user_role DEFAULT 'citizen',
  points      INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ
)

-- role_assignments table (RBAC tracking)
role_assignments (
  user_id     UUID,
  role        TEXT,       -- 'resident', 'emergency_service', 'government'
  active      BOOLEAN
)

-- emergency_alerts table
emergency_alerts (
  id            UUID PRIMARY KEY,
  reporter_id   UUID,
  title         TEXT,
  description   TEXT,
  location_lat  FLOAT,
  location_lng  FLOAT,
  status        TEXT DEFAULT 'active',
  created_at    TIMESTAMPTZ
)
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## License

This project was built for the **NIS Hackathon 2026**. All rights reserved.

---

<p align="center">
  Built with ❤️ by the Sonar team
</p>
