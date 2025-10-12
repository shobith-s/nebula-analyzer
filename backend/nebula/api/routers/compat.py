from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class TabularData(BaseModel):
    headers: List[str]
    rows: List[List[str]]

class ProfileIn(BaseModel):
    filename: str
    tabular_data: TabularData

@router.post("/profile-data")
async def profile_data(
    request: Request,
    filename: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    """
    Compatibility endpoint for the current frontend:
      1) JSON mode (preferred):
         {
           "filename": "file.csv",
           "tabular_data": { "headers": [...], "rows": [[...],[...], ...] }
         }
      2) Fallback: multipart/form-data with a file field.
    """
    # Try JSON body first
    try:
      data = await request.json()
      body = ProfileIn(**data)  # raises ValidationError if wrong shape

      if not body.tabular_data.headers:
          raise HTTPException(status_code=422, detail="No headers found in tabular_data.")
      if not all(isinstance(r, list) for r in body.tabular_data.rows):
          raise HTTPException(status_code=422, detail="rows must be a list of lists of strings.")

      print("[BE] /profile-data JSON ok:",
            {"filename": body.filename,
             "n_cols": len(body.tabular_data.headers),
             "n_rows": len(body.tabular_data.rows)})

      # TODO: invoke real profiler here and return its summary
      return {
          "ok": True,
          "mode": "json",
          "filename": body.filename,
          "n_cols": len(body.tabular_data.headers),
          "n_rows": len(body.tabular_data.rows),
      }
    except Exception:
      # Fall through to multipart if JSON wasn't provided or invalid
      pass

    # Fallback: multipart CSV
    if file is not None:
        content = await file.read()
        print("[BE] /profile-data CSV received:",
              {"filename": filename or file.filename, "bytes": len(content)})

        # TODO: parse CSV -> profile
        return {"ok": True, "mode": "csv", "filename": filename or file.filename}

    raise HTTPException(status_code=422, detail="Provide JSON body (filename+tabular_data) or CSV file.")
