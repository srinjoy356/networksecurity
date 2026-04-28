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

import logging as stdlib_logging  # use stdlib directly to avoid circular imports

def _truncate(plain: str) -> bytes:
    """Encode to UTF-8 and hard-cap at 72 bytes — bcrypt's hard limit."""
    encoded = plain.encode("utf-8")
    if len(encoded) > 72:
        stdlib_logging.warning(
            f"[jwt_handler] Password is {len(encoded)} bytes — truncating to 72. "
            "Ensure registration also used truncation."
        )
    return encoded[:72]

def hash_password(plain: str) -> str:
    truncated = _truncate(plain)
    stdlib_logging.debug(
        f"[jwt_handler] hash_password called | "
        f"original_len={len(plain.encode('utf-8'))}B | "
        f"truncated_len={len(truncated)}B"
    )
    return _pwd_context.hash(truncated)

def verify_password(plain: str, hashed: str) -> bool:
    truncated = _truncate(plain)
    stdlib_logging.debug(
        f"[jwt_handler] verify_password called | "
        f"original_len={len(plain.encode('utf-8'))}B | "
        f"truncated_len={len(truncated)}B | "
        f"hash_prefix={hashed[:10]}..."
    )
    try:
        result = _pwd_context.verify(truncated, hashed)
        stdlib_logging.debug(f"[jwt_handler] verify_password result={result}")
        return result
    except Exception as ex:
        stdlib_logging.error(
            f"[jwt_handler] verify_password FAILED | "
            f"error_type={type(ex).__name__} | "
            f"error={ex}"
        )
        raise


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