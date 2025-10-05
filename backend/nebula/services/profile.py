import pandas as pd

def missing_report(df: pd.DataFrame):
    miss = df.isna().mean().sort_values(ascending=False)
    return [{"column": c, "missing_frac": round(float(m), 4)} for c, m in miss.items()]

def describe_table(df: pd.DataFrame):
    try:
        desc_df = df.describe(include="all", datetime_is_numeric=True)
    except TypeError:
        desc_df = df.describe(include="all")
    return (
        desc_df.transpose()
        .reset_index()
        .rename(columns={"index": "column"})
        .fillna("")
        .to_dict("records")
    )

def profile_payloads(df: pd.DataFrame):
    return [
        {"type": "table", "title": "Missing Value Ratio", "data": {"rows": missing_report(df)}},
        {"type": "table", "title": "Descriptive Stats", "data": {"rows": describe_table(df)}},
    ]
