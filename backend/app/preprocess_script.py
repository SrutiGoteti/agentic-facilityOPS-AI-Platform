import pandas as pd

def preprocess():
    df = pd.read_excel("../data/raw/cleandata.xlsx")

    # Feature engineering from timestamp — needed for Energy Agent analytics
    df["hour"] = df["date"].dt.hour
    df["day_of_week"] = df["date"].dt.day_name()
    df["is_weekend"] = df["date"].dt.dayofweek >= 5

    # Note: 41 rows share a duplicate timestamp (2018-09-17 05:15:00) due to a
    # source logging bug. Power Consumption is identical (69.0) but Outdoor
    # Temperature and Occupancy differ across them — these are genuine distinct
    # readings, not true duplicates, so they are retained as-is.

    df.to_csv("../data/processed/energy_data_processed.csv", index=False)
    print(f"Processed {len(df)} rows -> data/processed/energy_data_processed.csv")

if __name__ == "__main__":
    preprocess()