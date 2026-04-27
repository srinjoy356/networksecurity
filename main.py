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

if __name__=='__main__':
    try:
        #Training pipeline config test
        
        trainingpipelineconfig=TrainingPipelineConfig()
        
        #Data Ingestion artifact test

        dataingestionconfig=DataIngestionConfig(trainingpipelineconfig)
        data_ingestion=DataIngestion(dataingestionconfig)
        logging.info("Initiate the data ingestion")
        dataingestionartifact=data_ingestion.initiate_data_ingestion()
        logging.info("Data Initiation Completed")
        print(dataingestionartifact)

        #Data validation artifact test

        data_validation_config=DataValidationConfig(trainingpipelineconfig)
        data_validation=DataValidation(dataingestionartifact,data_validation_config)
        logging.info("Initiate the data Validation")
        data_validation_artifact=data_validation.initiate_data_validation()
        logging.info("data Validation Completed")
        print(data_validation_artifact)

        #Data Transformation artifact test

        data_transformation_config=DataTransformationConfig(trainingpipelineconfig)
        logging.info("data Transformation started")
        data_transformation=DataTransformation(data_validation_artifact,data_transformation_config)
        data_transformation_artifact=data_transformation.initiate_data_transformation()
        print(data_transformation_artifact)
        logging.info("data Transformation completed")

        #Model trainer artifact test

        logging.info("Model Training sstared")
        model_trainer_config=ModelTrainerConfig(trainingpipelineconfig)
        model_trainer=ModelTrainer(model_trainer_config=model_trainer_config,data_transformation_artifact=data_transformation_artifact)
        model_trainer_artifact=model_trainer.initiate_model_trainer()
        logging.info("Model Training artifact created")

        # #Feature Extraction test
 
        # logging.info("Initiating feature extraction test")
        # feature_extraction_config=FeatureExtractionConfig()
        # feature_extractor=FeatureExtractor(feature_extraction_config)
 
        # # BUG FIX 1: Load model and preprocessor ONCE outside the loop.
        # # load_object() returns the unpickled Python object directly.
        # # The print showing <_io.BufferedReader> meant load_object was
        # # returning the open file handle — check your utils.py load_object
        # # uses pickle.load(f) not just open(f).
        # preprocessor=load_object("final_model/preprocessor.pkl")
        # classifier=load_object("final_model/model.pkl")
        # logging.info("Preprocessor and classifier loaded successfully")
 
        # # BUG FIX 2: Column order must exactly match the order the model
        # # was trained on (phisingData.csv column order), NOT alphabetical.
        # # RandomForestClassifier was fitted on a numpy array with no feature
        # # names — passing a DataFrame caused sklearn to warn and potentially
        # # misalign features. We reorder then convert to numpy explicitly.
        # FEATURE_COLUMNS=[
        #     "having_IP_Address","URL_Length","Shortining_Service","having_At_Symbol",
        #     "double_slash_redirecting","Prefix_Suffix","having_Sub_Domain","SSLfinal_State",
        #     "Domain_registeration_length","Favicon","port","HTTPS_token","Request_URL",
        #     "URL_of_Anchor","Links_in_tags","SFH","Submitting_to_email","Abnormal_URL",
        #     "Redirect","on_mouseover","RightClick","popUpWidnow","Iframe","age_of_domain",
        #     "DNSRecord","web_traffic","Page_Rank","Google_Index","Links_pointing_to_page",
        #     "Statistical_report",
        # ]
 
        # test_urls=[
        #     "http://192.168.1.1/paypal-secure/login.php",
        #     "https://www.google.com",
        #     "http://bit.ly/3xR9kQ2",
        #     "https://secure-paypal.verify-login.tk/confirm",
        # ]
 
        # logging.info(f"Running feature extraction on {len(test_urls)} test URLs")
 
        # for url in test_urls:
        #     logging.info(f"Extracting features for: {url}")
        #     features=feature_extractor.extract(url)
 
        #     # Reorder columns to match exact training schema order
        #     feature_df=pd.DataFrame([features])[FEATURE_COLUMNS]
        #     print(f"\nURL: {url}")
        #     print(feature_df.to_string())
 
        #     # Convert to numpy array — eliminates the feature names warning
        #     # and ensures the classifier receives data in the same format
        #     # it was trained on (raw numpy, no column metadata)
        #     feature_array=preprocessor.transform(feature_df)
 
        #     prediction=int(classifier.predict(feature_array)[0])
        #     label="Phishing" if prediction==-1 else "Legitimate"
        #     phishing_signals=sum(1 for v in features.values() if v==-1)
        #     print(f"Prediction : {label} ({prediction}) | Phishing signals: {phishing_signals}/30")
        #     logging.info(f"Prediction for {url} : {label} | Signals: {phishing_signals}")
 
        # logging.info("Feature extraction test completed")
       
        
    except Exception as e:
           raise NetworkSecurityException(e,sys)