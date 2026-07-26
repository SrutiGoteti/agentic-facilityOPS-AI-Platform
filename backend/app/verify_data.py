import pandas as pd

df = pd.read_excel("../data/raw/cleandata.xlsx")
pd.set_option('display.max_columns', None)
pd.set_option('display.width', None)
dupes = df[df.duplicated(keep=False)].sort_values("date")
print(dupes)