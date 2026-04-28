from networksecurity.components.data_ingestion import DataIngestion
from networksecurity.components.data_validation import DataValidation
from networksecurity.components.data_transformation import DataTransformation
from networksecurity.components.feature_extractor import FeatureExtractor
from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logging
from networksecurity.entity.config_entity import DataIngestionConfig, DataValidationConfig, DataTransformationConfig, FeatureExtractionConfig
from networksecurity.entity.config_entity import TrainingPipelineConfig
from networksecurity.components.model_trainer import ModelTrainer
from networksecurity.entity.config_entity import ModelTrainerConfig


from networksecurity.utils.main_utils.utils import load_object
import pandas as pd

import sys

# ── column order must match training schema exactly ──────────────────────────
FEATURE_COLUMNS = [
    "having_IP_Address", "URL_Length", "Shortining_Service", "having_At_Symbol",
    "double_slash_redirecting", "Prefix_Suffix", "having_Sub_Domain", "SSLfinal_State",
    "Domain_registeration_length", "Favicon", "port", "HTTPS_token", "Request_URL",
    "URL_of_Anchor", "Links_in_tags", "SFH", "Submitting_to_email", "Abnormal_URL",
    "Redirect", "on_mouseover", "RightClick", "popUpWidnow", "Iframe", "age_of_domain",
    "DNSRecord", "web_traffic", "Page_Rank", "Google_Index", "Links_pointing_to_page",
    "Statistical_report",
]
 
TEST_URLS = [
    "http://192.168.1.1/paypal-secure/login.php",       # IP address, HTTP → phishing
    "https://www.google.com",                            # known-good → legitimate
    "http://bit.ly/3xR9kQ2",                            # URL shortener → phishing
    "https://secure-paypal.verify-login.tk/confirm",    # hyphenated, suspicious TLD → phishing
]

if __name__=='__main__':
    try:
        #Training pipeline config test
        
        trainingpipelineconfig=TrainingPipelineConfig()
        
        # #Data Ingestion artifact test

        # dataingestionconfig=DataIngestionConfig(trainingpipelineconfig)
        # data_ingestion=DataIngestion(dataingestionconfig)
        # logging.info("Initiate the data ingestion")
        # dataingestionartifact=data_ingestion.initiate_data_ingestion()
        # logging.info("Data Initiation Completed")
        # print(dataingestionartifact)

        # #Data validation artifact test

        # data_validation_config=DataValidationConfig(trainingpipelineconfig)
        # data_validation=DataValidation(dataingestionartifact,data_validation_config)
        # logging.info("Initiate the data Validation")
        # data_validation_artifact=data_validation.initiate_data_validation()
        # logging.info("data Validation Completed")
        # print(data_validation_artifact)

        # #Data Transformation artifact test

        # data_transformation_config=DataTransformationConfig(trainingpipelineconfig)
        # logging.info("data Transformation started")
        # data_transformation=DataTransformation(data_validation_artifact,data_transformation_config)
        # data_transformation_artifact=data_transformation.initiate_data_transformation()
        # print(data_transformation_artifact)
        # logging.info("data Transformation completed")

        # #Model trainer artifact test

        # logging.info("Model Training sstared")
        # model_trainer_config=ModelTrainerConfig(trainingpipelineconfig)
        # model_trainer=ModelTrainer(model_trainer_config=model_trainer_config,data_transformation_artifact=data_transformation_artifact)
        # model_trainer_artifact=model_trainer.initiate_model_trainer()
        # logging.info("Model Training artifact created")

        # ── 5. Feature Extraction + Inference ───────────────────────────────
        logging.info("Initiating feature extraction test")
 
        # Load artifacts produced by the training pipeline.
        # load_object() must return the unpickled object (pickle.load(f)),
        # NOT the open file handle — verify your utils.py if you see
        # <_io.BufferedReader> printed instead of a sklearn object.
        preprocessor = load_object("final_model/preprocessor.pkl")
        classifier   = load_object("final_model/model.pkl")
        logging.info("Preprocessor and classifier loaded")
 
        # Build the extractor.
        # • fetch_page=True  → full 30-feature extraction (slower, needs network)
        # • fetch_page=False → URL-only mode (faster, 18 features active)
        feature_extraction_config = FeatureExtractionConfig()
        feature_extractor = FeatureExtractor(feature_extraction_config)
 
        logging.info(f"Running feature extraction on {len(TEST_URLS)} URLs")
        print("\n" + "=" * 70)
        print("  FEATURE EXTRACTION + INFERENCE RESULTS")
        print("=" * 70)
 
        for url in TEST_URLS:
            logging.info(f"Extracting features for: {url}")
 
            # Returns {feature_name: int} — all 30 features, values in {-1, 0, 1}
            features = feature_extractor.extract(url)
 
            # Build DataFrame → reorder to exact training-schema column order
            # → convert to numpy so the classifier receives the same raw-array
            # format it was trained on (no sklearn feature-name warning).
            feature_df    = pd.DataFrame([features])[FEATURE_COLUMNS]
            feature_array = preprocessor.transform(feature_df)   # shape (1, 30)
 
            prediction = int(classifier.predict(feature_array)[0])
            label      = "Legitimate" if prediction == 1 else "Phishing"
 
            phishing_signals  = sum(1 for v in features.values() if v == -1)
            suspicious_signals = sum(1 for v in features.values() if v == 0)
 
            print(f"\n  URL     : {url}")
            print(f"  Result  : {label} (raw={prediction})")
            print(f"  Signals : 🚨 Phishing={phishing_signals}/30  "
                  f"⚠️  Suspicious={suspicious_signals}/30")
            print("  Feature breakdown:")
            label_map = {1: "✅", 0: "⚠️ ", -1: "🚨"}
            for feat_name, val in features.items():
                print(f"    {label_map[val]}  {feat_name:<32} {val:+d}")
 
            logging.info(
                f"URL={url} | Prediction={label} | "
                f"Phishing_signals={phishing_signals} | Suspicious={suspicious_signals}"
            )
 
        print("\n" + "=" * 70)
        logging.info("Feature extraction test completed")
       
        
    except Exception as e:
           raise NetworkSecurityException(e,sys)