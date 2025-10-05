from typing import List, Dict, Any, Optional
import pandas as pd
from fastapi import HTTPException
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor

def _is_classification_target(y: pd.Series) -> bool:
    return (
        (pd.api.types.is_integer_dtype(y) or pd.api.types.is_bool_dtype(y))
        and y.dropna().nunique() > 1
        and y.dropna().nunique() <= 20
    )

def feature_importance_payloads(
    df: pd.DataFrame,
    target: str,
    top_n: Optional[int] = None,
) -> List[Dict[str, Any]]:
    if target not in df.columns:
        raise HTTPException(status_code=400, detail=f"Target '{target}' not found in columns.")

    X = df.drop(columns=[target]).select_dtypes(include="number")
    if X.empty:
        raise HTTPException(status_code=400, detail="No numeric features available for feature importance.")
    y = df[target]
    if y.dropna().empty:
        raise HTTPException(status_code=400, detail=f"Target '{target}' has no usable values.")

    X = X.fillna(0)
    is_class = _is_classification_target(y)
    model = RandomForestClassifier(random_state=0) if is_class else RandomForestRegressor(random_state=0)

    try:
        model.fit(X, y)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Training failed: {e}")

    imp = pd.Series(model.feature_importances_, index=X.columns).sort_values(ascending=False)
    if top_n is not None and top_n > 0:
        imp = imp.head(top_n)

    bar = {"kind": "bar", "x": imp.index.tolist(), "y": [round(float(v), 4) for v in imp.values.tolist()]}
    table = {"rows": [{"feature": k, "importance": round(float(v), 4)} for k, v in imp.items()]}

    return [
        {"type": "chart", "title": "Feature Importance", "data": bar},
        {"type": "table", "title": "Importance Scores", "data": table},
        {"type": "text", "title": "Model", "data": {"markdown": f"Used `{type(model).__name__}` on numeric features only."}},
    ]
