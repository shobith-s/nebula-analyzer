import uuid
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException

from nebula.services.ingest import read_csv_robust
from nebula.services.dataset_store import STORE
from nebula.services.profile import profile_payloads

router = APIRouter()

@router.post("", summary="Upload a CSV and get dataset_id")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Only CSV accepted for now.")

    dataset_id = str(uuid.uuid4())

    # Save to a temporary file (Windows-safe)
    tmpdir = tempfile.gettempdir()
    path = f"{tmpdir}\\{dataset_id}.csv"
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)

    df = read_csv_robust(path, sample_rows=None)
    STORE.put(dataset_id, df, {"filename": file.filename})
    return {"dataset_id": dataset_id, "rows": int(len(df)), "cols": int(len(df.columns))}

@router.get("/{dataset_id}/profile")
def profile_dataset(dataset_id: str):
    try:
        df = STORE.get(dataset_id)
    except KeyError as e:
        raise HTTPException(404, str(e))
    return {"outputs": profile_payloads(df)}
