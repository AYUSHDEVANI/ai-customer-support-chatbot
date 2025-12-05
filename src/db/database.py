# src/db/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.engine import make_url

from src.config.settings import DATABASE_URL

# detect drivername (sqlite, postgresql, mysql, etc.)
_drivername = make_url(DATABASE_URL).drivername
is_sqlite = _drivername.startswith("sqlite")

# Debug: helps confirm what DB URL SQLAlchemy sees (remove in production)
print(f"[db] DATABASE_URL drivername: {_drivername}")

if is_sqlite:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},  # only for sqlite
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # recommended for remote DBs like Postgres
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
