from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from nebula.api.routers.datasets import router as datasets_router
from nebula.api.routers.chat import router as chat_router
from nebula.api.routers.compat import router as compat_router  # <-- old FE endpoints

app = FastAPI(title="NEBULABrain API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# New modular routers
app.include_router(datasets_router, prefix="/datasets", tags=["datasets"])
app.include_router(chat_router, tags=["chat"])
# Compatibility shim for the existing frontend calls (/memory, /profile-data)
app.include_router(compat_router, tags=["compat"])

@app.get("/")
def root():
    return {"message": "NEBULA running"}
