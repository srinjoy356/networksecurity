"""
networksecurity/utils/auth/jwt_handler.py
==========================================
JWT creation, verification, and password hashing utilities.

Keeps all auth logic in one place — imported by app.py only.
"""

import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logging


# ── config (read from environment) ───────────────────────────────────────────

SECRET_KEY: str = os.getenv("JWT_SECRET_KEY")
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES"))

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── password helpers ──────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


# ── token helpers ─────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a signed JWT.

    *data* must include at least ``sub`` (username) and ``role``.
    """
    try:
        payload = data.copy()
        expire = datetime.now(timezone.utc) + (
            expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        payload.update({"exp": expire})
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        logging.info(f"JWT issued for sub={data.get('sub')} role={data.get('role')}")
        return token
    except Exception as e:
        raise NetworkSecurityException(e, sys)


def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT.

    Returns the payload dict on success.
    Raises ``NetworkSecurityException`` on any failure.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise NetworkSecurityException(e, sys)