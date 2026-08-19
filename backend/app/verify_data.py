import pandas as pd
df = pd.read_csv("../data/raw/ai4i2020.csv")
print(df.shape)
print(df.columns.tolist())
print(df.head())
print(df["Machine failure"].value_counts())