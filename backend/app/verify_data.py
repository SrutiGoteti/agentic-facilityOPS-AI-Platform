import pandas as pd
df = pd.read_excel("../data/raw/cleandata.xlsx")
print(df["Occupancy"].describe())
print(df["Occupancy"].value_counts().head(10))