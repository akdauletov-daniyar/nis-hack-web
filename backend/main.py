from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from api.routers import alerts, ecology, events, routes, users, ml_inference

# Initialize FastAPI application
app = FastAPI(
    title="Demo 1.0 API",
    description="Backend API for Urban Mobility Platform (Demo 1.0)",
    version="1.0.0",
    redirect_slashes=True,
)

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:5173", # Vite Default Port
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    # Add mobile app domains / production domains here
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler to ensure CORS headers on unhandled errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in origins:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        
    status_code = 500
    detail = f"Internal server error: {str(exc)}"
    
    if isinstance(exc, HTTPException):
        status_code = exc.status_code
        detail = exc.detail
    elif isinstance(exc, RequestValidationError):
        status_code = 422
        detail = exc.errors()

    return JSONResponse(
        status_code=status_code,
        content={"detail": detail},
        headers=headers,
    )


# Include API Routers
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(routes.router, prefix="/api/routes", tags=["Routes"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Emergency Alerts"])
app.include_router(ecology.router, prefix="/api/ecology", tags=["Air Quality"])
app.include_router(events.router, prefix="/api/events", tags=["Events"])
app.include_router(ml_inference.router, prefix="/api/ml", tags=["ML Inference"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Demo 1.0 API is running."}

