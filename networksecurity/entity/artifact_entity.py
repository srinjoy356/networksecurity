from dataclasses import dataclass
from typing import Dict, List

@dataclass
class DataIngestionArtifact:
    trained_file_path:str
    test_file_path:str

@dataclass
class DataValidationArtifact:
    validation_status: bool
    valid_train_file_path: str
    valid_test_file_path: str
    invalid_train_file_path: str
    invalid_test_file_path: str
    drift_report_file_path: str

@dataclass
class DataTransformationArtifact:
    transformed_object_file_path: str
    transformed_train_file_path: str
    transformed_test_file_path: str

@dataclass
class ClassificationMetricArtifact:
    f1_score: float
    precision_score: float
    recall_score: float
    
@dataclass
class ModelTrainerArtifact:
    trained_model_file_path: str
    train_metric_artifact: ClassificationMetricArtifact
    test_metric_artifact: ClassificationMetricArtifact

@dataclass
class FeatureExtractionArtifact:
    """
    Produced by FeatureExtractor.extract() for a single URL.
 
    Fields
    ------
    url : str
        The original URL that was analysed.
    prediction : int
        Raw model output: 1 = Legitimate, -1 = Phishing.
    label : str
        Human-readable label: "Legitimate" or "Phishing".
    features : Dict[str, int]
        All 30 extracted features, values in {-1, 0, 1},
        keyed by the exact column names from phisingData.csv.
    phishing_signal_count : int
        Number of features that returned -1 (phishing signal).
    suspicious_signal_count : int
        Number of features that returned 0 (suspicious signal).
    feature_vector : List[int]
        Features as an ordered list matching phisingData.csv column order.
        Ready to pass directly into preprocessor.transform().
    """
    url: str
    prediction: int
    label: str
    features: Dict[str, int]
    phishing_signal_count: int
    suspicious_signal_count: int
    feature_vector: List[int]