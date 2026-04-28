"""
app.py
======
FastAPI application entry-point.

Routes
──────
Authentication
  POST /auth/register        → register a new user  (role = 'user')
  POST /auth/login           → login, receive JWT Bearer token
  GET  /auth/me              → current user profile

Training  [ADMIN ONLY]
  GET  /train                → run full ML training pipeline

Prediction  [ANY AUTHENTICATED USER]
  POST /predict/url          → submit URL → phishing verdict + 30 features logged to Supabase
  GET  /predict/history      → last 50 predictions for the logged-in user
  POST /predict              → original CSV batch-predict (HTML table response)

Utility
  GET  /                     → redirect to /docs
"""

import sys
import os

import certifi
ca = certifi.where()

from dotenv import load_dotenv
load_dotenv()

# ── third-party ───────────────────────────────────────────────────────────────
import pymongo
import pandas as pd

from fastapi import FastAPI, File, UploadFile, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from starlette.responses import RedirectResponse
from uvicorn import run as app_run

# ── project ───────────────────────────────────────────────────────────────────
from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logging
from networksecurity.pipeline.training_pipeline_cloud import TrainingPipeline
from networksecurity.utils.main_utils.utils import load_object
from networksecurity.utils.ml_utils.model.estimator import NetworkModel
from networksecurity.utils.auth.dependencies import get_current_user, require_admin
from networksecurity.components.feature_extractor import FeatureExtractor
from networksecurity.entity.config_entity import FeatureExtractionConfig
from networksecurity.cloud.supabase_db import (
    log_prediction,
    get_predictions_for_user,
    log_training_start,
    log_training_finish,
)
from networksecurity.constant.training_pipeline import (
    DATA_INGESTION_COLLECTION_NAME,
    DATA_INGESTION_DATABASE_NAME,
)

# ── auth router (registers /auth/register, /auth/login, /auth/me) ─────────────
from networksecurity.api.auth_router import router as auth_router


# ═══════════════════════════════════════════════════════════════════════════════
# MONGODB CLIENT  (unchanged — used by data ingestion pipeline)
# ═══════════════════════════════════════════════════════════════════════════════

mongo_db_url = os.getenv("MONGODB_URL_KEY")
mongo_client = pymongo.MongoClient(mongo_db_url, tlsCAFile=ca)
database     = mongo_client[DATA_INGESTION_DATABASE_NAME]
collection   = database[DATA_INGESTION_COLLECTION_NAME]


# ═══════════════════════════════════════════════════════════════════════════════
# APP  +  MIDDLEWARE
# ═══════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="Network Security — Phishing Detection API",
    description=(
        "JWT-secured REST API for phishing URL analysis.\n\n"
        "**Roles:**\n"
        "- `user`  — register / login, submit URLs, view own history\n"
        "- `admin` — everything above + trigger model retraining\n\n"
        "**How to authenticate in Swagger UI:** call `POST /auth/login`, "
        "copy the `access_token`, click the 🔒 **Authorize** button, "
        "and enter `Bearer <token>`."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── mount the auth router AFTER middleware ────────────────────────────────────
# This registers:  POST /auth/register  |  POST /auth/login  |  GET /auth/me
app.include_router(auth_router)

templates = Jinja2Templates(directory="./templates")


# ═══════════════════════════════════════════════════════════════════════════════
# PYDANTIC SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class URLRequest(BaseModel):
    url: str


class PredictionResponse(BaseModel):
    url: str
    prediction: int           # 0 = Phishing, 1 = Legitimate
    label: str                # "Phishing" | "Legitimate"
    phishing_signal_count: int
    suspicious_signal_count: int
    features: dict            # {feature_name: int}  — all 30 UCI features
    feature_vector: list      # [int x 30] ordered vector
    log_id: int               # row id in Supabase prediction_logs


# ═══════════════════════════════════════════════════════════════════════════════
# ROUTE — ROOT
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/", tags=["Root"], include_in_schema=False)
async def index():
    return RedirectResponse(url="/docs")


# ═══════════════════════════════════════════════════════════════════════════════
# ROUTE — TRAINING  [ADMIN ONLY]
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/train", tags=["Training"], summary="Trigger full ML training pipeline")
async def train_route(admin: dict = Depends(require_admin)):
    """
    Runs the complete training pipeline:
    Data Ingestion → Validation → Transformation → Model Trainer.

    **Requires admin role.**
    The run is logged (start time, finish time, status) to Supabase `training_logs`.
    """
    log_id = log_training_start(triggered_by=admin["id"])
    try:
        train_pipeline = TrainingPipeline()
        train_pipeline.run_pipeline()
        log_training_finish(log_id, success=True)
        logging.info(f"Training completed — triggered by admin user_id={admin['id']}")
        return {"message": "Training completed successfully.", "training_log_id": log_id}
    except Exception as e:
        log_training_finish(log_id, success=False, error_message=str(e))
        raise NetworkSecurityException(e, sys)


# ═══════════════════════════════════════════════════════════════════════════════
# ROUTE — URL PREDICTION  [ANY AUTHENTICATED USER]
# ═══════════════════════════════════════════════════════════════════════════════

@app.post(
    "/predict/url",
    response_model=PredictionResponse,
    tags=["Prediction"],
    summary="Check whether a URL is a phishing attempt",
)
async def predict_url(
    body: URLRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Submit a raw URL to extract all 30 UCI phishing-detection features,
    run them through the trained classifier, and get a verdict.

    The complete result — features, signal counts, feature vector, label —
    is persisted to Supabase `prediction_logs` and returned in the response.
    """
    try:
        preprocessor = load_object("final_model/preprocessor.pkl")
        classifier   = load_object("final_model/model.pkl")

        config    = FeatureExtractionConfig()
        extractor = FeatureExtractor(feature_extraction_config=config)

        artifact = extractor.initiate_feature_extraction(
            url=body.url,
            preprocessor=preprocessor,
            classifier=classifier,
        )

        db_row = log_prediction(
            user_id=current_user["id"],
            url=artifact.url,
            prediction=artifact.prediction,
            label=artifact.label,
            features=artifact.features,
            phishing_signal_count=artifact.phishing_signal_count,
            suspicious_signal_count=artifact.suspicious_signal_count,
            feature_vector=artifact.feature_vector,
        )

        return PredictionResponse(
            url=artifact.url,
            prediction=artifact.prediction,
            label=artifact.label,
            phishing_signal_count=artifact.phishing_signal_count,
            suspicious_signal_count=artifact.suspicious_signal_count,
            features=artifact.features,
            feature_vector=artifact.feature_vector,
            log_id=db_row["id"],
        )

    except Exception as e:
        raise NetworkSecurityException(e, sys)


# ═══════════════════════════════════════════════════════════════════════════════
# ROUTE — PREDICTION HISTORY  [ANY AUTHENTICATED USER]
# ═══════════════════════════════════════════════════════════════════════════════

@app.get(
    "/predict/history",
    tags=["Prediction"],
    summary="Retrieve your last 50 URL predictions",
)
async def prediction_history(current_user: dict = Depends(get_current_user)):
    """
    Returns the 50 most recent predictions made by the currently logged-in user,
    ordered newest-first.
    """
    try:
        rows = get_predictions_for_user(user_id=current_user["id"], limit=50)
        return {"user": current_user["username"], "predictions": rows}
    except Exception as e:
        raise NetworkSecurityException(e, sys)


# ═══════════════════════════════════════════════════════════════════════════════
# ROUTE — BATCH CSV PREDICTION  [ANY AUTHENTICATED USER]
# ═══════════════════════════════════════════════════════════════════════════════

@app.post(
    "/predict",
    tags=["Prediction"],
    summary="Batch predict from a pre-extracted feature CSV",
)
async def predict_route(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload a CSV whose columns are the 30 pre-extracted UCI features.
    Results are returned as an HTML table (original behaviour, now auth-gated).
    """
    try:
        df = pd.read_csv(file.file)
        preprocessor  = load_object("final_model/preprocessor.pkl")
        final_model   = load_object("final_model/model.pkl")
        network_model = NetworkModel(preprocessor=preprocessor, model=final_model)

        y_pred = network_model.predict(df)
        df["predicted_column"] = y_pred

        os.makedirs("prediction_output", exist_ok=True)
        df.to_csv("prediction_output/output.csv", index=False)

        table_html = df.to_html(classes="table table-striped")
        return templates.TemplateResponse(
            "table.html", {"request": request, "table": table_html}
        )
    except Exception as e:
        raise NetworkSecurityException(e, sys)


# ═══════════════════════════════════════════════════════════════════════════════
# ENTRY-POINT
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    app_run(app, host="0.0.0.0", port=8000)