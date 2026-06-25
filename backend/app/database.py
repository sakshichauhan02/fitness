import sys
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Attempt to connect to PostgreSQL. If it fails, fall back to SQLite for seamless zero-config local development.
try:
    engine = create_engine(settings.DATABASE_URL)
    # Test connection immediately to trigger any authentication/network failures
    connection = engine.connect()
    connection.close()
except Exception as e:
    print(f"Database connection to PostgreSQL failed: {e}", file=sys.stderr)
    print("Falling back to local SQLite database: sqlite:///./fitai.db", file=sys.stderr)
    engine = create_engine(
        "sqlite:///./fitai.db",
        connect_args={"check_same_thread": False},
        execution_options={"schema_translate_map": {"public": None}}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
