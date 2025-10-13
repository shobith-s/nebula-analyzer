from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from nebula.api.routers.compat import router as compat_router

from nebula.api.routers import analyze

app = FastAPI(title="NEBULABrain API", version="0.1")
app.include_router(analyze.router)

# CORS for local dev (adjust in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(compat_router, tags=["compat"])

@app.get("/")
def root():
    return {"message": "NEBULA running", "version": "0.1"}

@app.get("/health")
def health():
    return {"ok": True}
