import time
from typing import Dict, Any, Optional
import pandas as pd

class InMemoryDatasetStore:
    def __init__(self, ttl_seconds: int = 60 * 60):
        self.ttl = ttl_seconds
        self._data: Dict[str, Dict[str, Any]] = {}

    def put(self, dataset_id: str, df: pd.DataFrame, meta: Optional[dict] = None):
        self._data[dataset_id] = {"df": df, "meta": meta or {}, "ts": time.time()}

    def get(self, dataset_id: str) -> pd.DataFrame:
        item = self._data.get(dataset_id)
        if not item:
            raise KeyError("dataset not found")
        if time.time() - item["ts"] > self.ttl:
            del self._data[dataset_id]
            raise KeyError("dataset expired")
        return item["df"]

STORE = InMemoryDatasetStore()
