import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder

def train():
    df = pd.read_csv("../data/raw/ai4i2020.csv")

    # Features: sensor readings + product type (encoded)
    le = LabelEncoder()
    df["Type_encoded"] = le.fit_transform(df["Type"])

    feature_cols = [
        "Type_encoded", "Air temperature [K]", "Process temperature [K]",
        "Rotational speed [rpm]", "Torque [Nm]", "Tool wear [min]"
    ]
    X = df[feature_cols]
    y = df["Machine failure"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=200,
        class_weight="balanced",
        random_state=42
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print("=== Classification Report ===")
    print(classification_report(y_test, y_pred, target_names=["No Failure", "Failure"]))
    print("=== Confusion Matrix ===")
    print(confusion_matrix(y_test, y_pred))

    # Feature importance — useful for explaining WHY the model predicts a failure
    importance = pd.Series(model.feature_importances_, index=feature_cols).sort_values(ascending=False)
    print("\n=== Feature Importance ===")
    print(importance)

    joblib.dump(model, "../ml_models/maintenance/failure_model.pkl")
    joblib.dump(le, "../ml_models/maintenance/type_encoder.pkl")
    print("\nModel saved to ml_models/maintenance/failure_model.pkl")

if __name__ == "__main__":
    train()