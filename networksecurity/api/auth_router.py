"""
networksecurity/api/auth_router.py
===================================
Mounts under /auth:
    POST /auth/register   — create a new 'user' account
    POST /auth/login      — exchange credentials for a JWT
    GET  /auth/me         — return current user profile
"""

import sys

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr

from networksecurity.cloud.supabase_db import create_user, get_user_by_username
from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logging
from networksecurity.utils.auth.dependencies import get_current_user
from networksecurity.utils.auth.jwt_handler import (
    create_access_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class UserProfile(BaseModel):
    id: int
    username: str
    email: str
    role: str


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    """
    Create a new user account (role='user' by default).
    Admin accounts must be seeded directly in the database.
    """
    try:
        existing = get_user_by_username(body.username)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken.",
            )
        hashed = hash_password(body.password)
        user = create_user(
            username=body.username,
            email=body.email,
            hashed_password=hashed,
            role="user",
        )
        logging.info(f"New user registered: {body.username}")
        return UserProfile(**user)
    except HTTPException:
        raise
    except Exception as e:
        raise NetworkSecurityException(e, sys)


@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Authenticate with username + password, receive a JWT.
    Use the token as a Bearer header on protected routes.
    """
    try:
        user = get_user_by_username(form_data.username)
        if not user or not verify_password(form_data.password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token = create_access_token(
            data={"sub": user["username"], "user_id": user["id"], "role": user["role"]}
        )
        logging.info(f"Login successful: {user['username']} (role={user['role']})")
        return TokenResponse(access_token=token, role=user["role"])
    except HTTPException:
        raise
    except Exception as e:
        raise NetworkSecurityException(e, sys)


@router.get("/me", response_model=UserProfile)
async def me(current_user: dict = Depends(get_current_user)):
    """Return the profile of the currently authenticated user."""
    return UserProfile(**current_user)