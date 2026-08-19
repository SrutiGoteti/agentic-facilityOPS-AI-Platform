import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from app.core.database import SessionLocal
from app.models.db_models import EnergyUsage

def train():
    session = SessionLocal()
    records = session.query(EnergyUsage).all()
    session.close()

    df = pd.DataFrame([{
        "timestamp": r.timestamp,
        "power_consumption": r.power_consumption,
        "outdoor_temp": r.outdoor_temp,
        "occupancy": r.occupancy
    } for r in records])

    df["hour"] = df["timestamp"].dt.hour
    df["is_weekend"] = (df["timestamp"].dt.dayofweek >= 5).astype(int)

    feature_cols = ["hour", "outdoor_temp", "occupancy", "is_weekend"]
    X = df[feature_cols]
    y = df["power_consumption"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=200, random_state=42)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    print("MAE:", round(mae, 2))
    print("R²:", round(r2, 3))

    joblib.dump(model, "../ml_models/energy/consumption_model.pkl")
    print("Model saved to ml_models/energy/consumption_model.pkl")

if __name__ == "__main__":
    train()