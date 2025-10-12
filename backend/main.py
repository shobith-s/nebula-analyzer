from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# If you have these modules, keep them; otherwise you can remove the includes.
# from nebula.api.routers.datasets import router as datasets_router
# from nebula.api.routers.chat import router as chat_router
from nebula.api.routers.compat import router as compat_router  # <-- /profile-data

app = FastAPI(title="NEBULABrain API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers. IMPORTANT: do NOT prefix these with '/api'.
# Vite proxy will map '/api/*' -> '*' on the server.
# app.include_router(datasets_router, prefix="/datasets", tags=["datasets"])
# app.include_router(chat_router, tags=["chat"])
app.include_router(compat_router, tags=["compat"])

@app.get("/")
def root():
    return {"message": "NEBULA running"}
