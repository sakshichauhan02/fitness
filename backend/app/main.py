from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import profile, workout, nutrition, gamification, history
from .database import engine, Base
from . import models  # Import models to register them on Base metadata

# Auto-create SQLAlchemy tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FitAI Personalization Engine",
    description="AI-powered personalization API engine running Gemini generative models.",
    version="1.0.0"
)

# Configure CORS for local development with Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Router Modules
app.include_router(profile.router)
app.include_router(workout.router)
app.include_router(nutrition.router)
app.include_router(gamification.router)
app.include_router(history.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "FitAI Personalization Engine",
        "api_docs": "/docs"
    }
