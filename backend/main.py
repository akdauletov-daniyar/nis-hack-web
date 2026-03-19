from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers import users, routes, alerts

# Initialize FastAPI application
app = FastAPI(
    title="Demo 1.0 API",
    description="Backend API for Urban Mobility Platform (Demo 1.0)",
    version="1.0.0"
)

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:5173", # Vite Default Port
    # Add mobile app domains / production domains here
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(routes.router, prefix="/api/routes", tags=["Routes"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Emergency Alerts"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Demo 1.0 API is running."}
