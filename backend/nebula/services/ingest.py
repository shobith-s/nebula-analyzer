from typing import Optional
import pandas as pd

# Robust defaults for messy CSVs
NA_VALUES = ["", "na", "n/a", "null", "none", "-", "--", " NaN", "nan", "NAN", "NULL", "N/A", "?"]

def read_csv_robust(
    file_path: str,
    *,
    sample_rows: Optional[int] = None,
    try_pyarrow: bool = True,
    assume_headers: bool = True,
) -> pd.DataFrame:
    engine = "pyarrow" if try_pyarrow else None
    kwargs = dict(
        na_values=NA_VALUES,
        keep_default_na=True,
        encoding_errors="replace",
    )
    if assume_headers:
        kwargs["header"] = 0

    # Prefer pyarrow engine if available; fall back gracefully
    try:
        if engine == "pyarrow":
            df = pd.read_csv(file_path, engine="pyarrow", **kwargs)
        else:
            df = pd.read_csv(file_path, **kwargs)
    except Exception:
        df = pd.read_csv(file_path, **kwargs)

    if sample_rows and len(df) > sample_rows:
        df = df.sample(sample_rows, random_state=0).reset_index(drop=True)
    return df
