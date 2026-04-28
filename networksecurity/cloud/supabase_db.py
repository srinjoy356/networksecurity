"""
networksecurity/cloud/supabase_db.py
=====================================
PostgreSQL (Supabase) database layer.

Manages:
  • User accounts & role lookups
  • Prediction log persistence
  • Training run logging

All DB interaction is funnelled through this module to keep the rest of the
codebase free of raw SQL.
"""

import json
import os
import sys
from datetime import datetime
from typing import Optional

import psycopg2
import psycopg2.extras

from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logging


# ── connection helper ─────────────────────────────────────────────────────────

def _get_connection():
    """Return a new psycopg2 connection using DATABASE_URL from env."""
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL environment variable is not set.")
    return psycopg2.connect(dsn=url, cursor_factory=psycopg2.extras.RealDictCursor)


# ═══════════════════════════════════════════════════════════════════════════════
# USER OPERATIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_user_by_username(username: str) -> Optional[dict]:
    """Return the user row as a dict or None if not found."""
    try:
        conn = _get_connection()
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM users WHERE username = %s AND is_active = TRUE",
                    (username,),
                )
                row = cur.fetchone()
        conn.close()
        return dict(row) if row else None
    except Exception as e:
        raise NetworkSecurityException(e, sys)


def get_user_by_id(user_id: int) -> Optional[dict]:
    """Return the user row as a dict or None if not found."""
    try:
        conn = _get_connection()
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM users WHERE id = %s AND is_active = TRUE",
                    (user_id,),
                )
                row = cur.fetchone()
        conn.close()
        return dict(row) if row else None
    except Exception as e:
        raise NetworkSecurityException(e, sys)


def create_user(username: str, email: str, hashed_password: str, role: str = "user") -> dict:
    """Insert a new user and return the created row."""
    try:
        conn = _get_connection()
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO users (username, email, hashed_password, role)
                    VALUES (%s, %s, %s, %s)
                    RETURNING *
                    """,
                    (username, email, hashed_password, role),
                )
                row = cur.fetchone()
        conn.close()
        logging.info(f"Created user: {username} with role: {role}")
        return dict(row)
    except Exception as e:
        raise NetworkSecurityException(e, sys)


# ═══════════════════════════════════════════════════════════════════════════════
# PREDICTION LOG OPERATIONS
# ═══════════════════════════════════════════════════════════════════════════════

def log_prediction(
    user_id: int,
    url: str,
    prediction: int,
    label: str,
    features: dict,
    phishing_signal_count: int,
    suspicious_signal_count: int,
    feature_vector: list,
) -> dict:
    """
    Persist a FeatureExtractionArtifact result to prediction_logs.

    Parameters mirror FeatureExtractionArtifact fields exactly so the caller
    can simply unpack artifact.__dict__.
    """
    try:
        conn = _get_connection()
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO prediction_logs
                        (user_id, url, prediction, label,
                         phishing_signal_count, suspicious_signal_count,
                         features, feature_vector)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (
                        user_id,
                        url,
                        prediction,
                        label,
                        phishing_signal_count,
                        suspicious_signal_count,
                        json.dumps(features),        # JSONB
                        feature_vector,              # INTEGER[]
                    ),
                )
                row = cur.fetchone()
        conn.close()
        logging.info(f"Logged prediction for user_id={user_id} | url={url} | label={label}")
        return dict(row)
    except Exception as e:
        raise NetworkSecurityException(e, sys)


def get_predictions_for_user(user_id: int, limit: int = 50) -> list:
    """Return the most recent *limit* predictions for a given user."""
    try:
        conn = _get_connection()
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT * FROM prediction_logs
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s
                    """,
                    (user_id, limit),
                )
                rows = cur.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        raise NetworkSecurityException(e, sys)


# ═══════════════════════════════════════════════════════════════════════════════
# TRAINING LOG OPERATIONS
# ═══════════════════════════════════════════════════════════════════════════════

def log_training_start(triggered_by: int) -> int:
    """Insert a training_logs row with status='started'. Returns the log id."""
    try:
        conn = _get_connection()
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO training_logs (triggered_by, status)
                    VALUES (%s, 'started')
                    RETURNING id
                    """,
                    (triggered_by,),
                )
                log_id = cur.fetchone()["id"]
        conn.close()
        logging.info(f"Training started — log_id={log_id} by user_id={triggered_by}")
        return log_id
    except Exception as e:
        raise NetworkSecurityException(e, sys)


def log_training_finish(log_id: int, success: bool, error_message: Optional[str] = None) -> None:
    """Update an existing training_logs row to success or failed."""
    try:
        status = "success" if success else "failed"
        conn = _get_connection()
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE training_logs
                    SET status = %s, error_message = %s, finished_at = NOW()
                    WHERE id = %s
                    """,
                    (status, error_message, log_id),
                )
        conn.close()
        logging.info(f"Training finished — log_id={log_id} status={status}")
    except Exception as e:
        raise NetworkSecurityException(e, sys)