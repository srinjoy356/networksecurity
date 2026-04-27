import mlflow
import os

MLFLOW_DIR = os.path.abspath("mlruns")
mlflow.set_tracking_uri(f"file:///{MLFLOW_DIR}")

print("Tracking URI:", mlflow.get_tracking_uri())

# 🔥 Test run
with mlflow.start_run():
    mlflow.log_metric("test_metric", 1)

print("Test run created successfully!")