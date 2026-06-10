"""
School Timetable Generator — FastAPI Backend
Runs on: http://localhost:8000
API docs: http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
import os

from backend.database import init_db
from backend.routers import (
    teachers, subjects, classes, sections,
    allocations, timeslots, timetable, stats, availability
)

app = FastAPI(
    title="School Timetable Generator",
    description="OR-Tools powered timetable generation for Middle Section",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(sections.router,     prefix="/api/sections",     tags=["Sections"])
app.include_router(teachers.router,     prefix="/api/teachers",     tags=["Teachers"])
app.include_router(subjects.router,     prefix="/api/subjects",     tags=["Subjects"])
app.include_router(classes.router,      prefix="/api/classes",      tags=["Classes"])
app.include_router(timeslots.router,    prefix="/api/timeslots",    tags=["Time Slots"])
app.include_router(availability.router, prefix="/api/availability", tags=["Availability"])
app.include_router(allocations.router,  prefix="/api/allocations",  tags=["Allocations"])
app.include_router(timetable.router,    prefix="/api/timetable",    tags=["Timetable"])
app.include_router(stats.router,        prefix="/api/stats",        tags=["Stats"])

# Serve React frontend in production
frontend_dist = Path(__file__).parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = frontend_dist / "index.html"
        return FileResponse(str(index))


@app.on_event("startup")
async def startup():
    init_db()
    print("✅ Database initialized")
    print("🏫 School Timetable Generator running")
    print("📖 API docs: http://localhost:8000/docs")


@app.get("/api/health")
def health():
    return {"status": "ok", "message": "Timetable Generator is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
