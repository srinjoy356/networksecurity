"""
networksecurity/utils/auth/dependencies.py
===========================================
FastAPI dependency-injection helpers.

Usage in route handlers:
    current_user = Depends(get_current_user)          # any logged-in user
    admin_user   = Depends(require_admin)              # admin only
"""

import sys

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from networksecurity.cloud.supabase_db import get_user_by_id
from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logging
from networksecurity.utils.auth.jwt_handler import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Decode the Bearer token and return the active user row from the DB.
    Raises 401 if the token is invalid or the user is not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id: int = int(payload.get("user_id", 0))
        if not user_id:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    user = get_user_by_id(user_id)
    if user is None or not user.get("is_active"):
        raise credentials_exception

    return user


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Allow only users whose role is 'admin'. Raises 403 otherwise."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required for this action.",
        )
    return current_user