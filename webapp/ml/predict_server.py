from fastapi import FastAPI, HTTPException, Body
from typing import Dict, Any
import numpy as np
import os

app = FastAPI()
_model = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Feature order must match X_train.columns from the Colab notebook exactly.
# Load from features.json if present; otherwise fall back to the known training order.
_features_path = os.path.join(BASE_DIR, "features.json")
if os.path.exists(_features_path):
    import json
    with open(_features_path) as f:
        FEATURE_COLUMNS = json.load(f)
else:
    FEATURE_COLUMNS = [
        "Customer_Tier_Enc", "Replace", "Remove", "Firedoor",
        "Drop_Test", "Bumpers", "Is_Lenworth", "Specialty_Door",
        "Dock_Seal", "Door_General", "Hardware_Parts",
        "Dim_Width", "Dim_Height", "Dim_SqFt", "Door_Size",
        "Work_Type_Enc", "Product_Type_Enc",
        "Flat_Fee", "Has_Flat_Service",
        "FS_Operator_Opener", "FS_Dock_Seal", "FS_Drop_Test",
        "FS_Shelters", "FS_Extra_Work", "FS_Bumper", "FS_Telehandler",
        "Install_Flag", "Distance", "Distance_Tier", "Job_complexity",
    ]


def _load_model():
    global _model
    if _model is not None:
        return _model
    pkl_path = os.path.join(BASE_DIR, "pricing_model.pkl")
    if os.path.exists(pkl_path):
        import joblib
        _model = joblib.load(pkl_path)
        print("Model loaded successfully")
    return _model


@app.post("/predict")
def predict(features: Dict[str, Any] = Body(...)):
    model = _load_model()
    if model is None:
        raise HTTPException(status_code=503, detail="Model file not found — drop pricing_model.pkl into ml/")

    # Build the feature vector in training column order.
    # Accepts both exact-case and lowercase key names from the caller.
    lower_dict = {k.lower(): v for k, v in features.items()}
    X = np.array([[features.get(col, lower_dict.get(col.lower(), 0.0)) for col in FEATURE_COLUMNS]])
    
    log_path = os.path.join(BASE_DIR, "latest_prediction.log")
    with open(log_path, "w") as f_log:
        f_log.write("--- INCOMING PREDICTION REQUEST ---\n")
        f_log.write(f"Incoming Features Dict: {features}\n")
        f_log.write("Constructed X array mapped to model columns:\n")
        for col, val in zip(FEATURE_COLUMNS, X[0]):
            f_log.write(f"  {col}: {val}\n")
        f_log.write("-----------------------------------\n")
    
    print(f"Prediction details written to {log_path}")
    
    unit_price = float(model.predict(X)[0])
    return {"unit_price": round(unit_price, 2)}
