# 🏫 School Timetable Generator v2.0
### Powered by Google OR-Tools CP-SAT Solver

A production-ready timetable generator for schools with 27+ classes and 50+ teachers,
including full support for **link teachers** from other sections.

---

## ✨ Features

- **OR-Tools CP-SAT solver** — provably optimal scheduling
- **27 classes** pre-configured (Grade 6×10, Grade 7×9, Grade 8×8)
- **Link teacher support** — teachers from Primary/High School with availability grid
- **Priority-based generation** — core subjects scheduled first, best slots
- **Conflict detection** — teacher clash, class clash, workload overload
- **PDF export** — per class, professional layout
- **Excel export** — per class + all classes in one workbook
- **Teacher workload view** — percentage bar, overload warnings
- **Zero external database** — SQLite, auto-created on first run

---

## 🚀 Running on Windows

### Step 1 — Install Prerequisites (one time only)

```
Python 3.10+     → https://python.org  (check "Add to PATH")
Node.js 18+      → https://nodejs.org  (LTS version)
```

### Step 2 — Install Python packages

Open Command Prompt and run:
```
pip install fastapi uvicorn[standard] ortools reportlab openpyxl python-multipart
```

Or use requirements.txt:
```
pip install -r requirements.txt
```

### Step 3 — Install frontend packages

```
cd frontend
npm install
cd ..
```

### Step 4 — Start the app

**Option A — Double-click:**
```
start.bat
```

**Option B — Manual (two Command Prompt windows):**

Window 1 — Backend:
```
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Window 2 — Frontend:
```
cd frontend
npm run dev
```

### Step 5 — Open browser

```
http://localhost:3000
```

---

## 📁 Project Structure

```
school-timetable-v2/
├── main.py                    ← FastAPI server entry point
├── requirements.txt           ← Python dependencies
├── start.bat                  ← Windows one-click launcher
├── stop.bat                   ← Stop all servers
├── data/
│   └── timetable.db           ← SQLite database (auto-created)
├── backend/
│   ├── database.py            ← Schema, seed data, DB connection
│   ├── generator.py           ← OR-Tools CP-SAT solver engine
│   └── routers/
│       ├── sections.py        ← Section CRUD
│       ├── teachers.py        ← Teacher CRUD
│       ├── subjects.py        ← Subject CRUD
│       ├── classes.py         ← Class CRUD
│       ├── timeslots.py       ← Period timings
│       ├── availability.py    ← Link teacher free slots
│       ├── allocations.py     ← Subject-class-teacher mapping
│       ├── timetable.py       ← Generate + PDF + Excel export
│       └── stats.py           ← Dashboard statistics
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx           ← React entry + routing
        ├── index.css          ← Global styles
        ├── components/
        │   └── index.jsx      ← Sidebar, TimetableGrid, Toast, etc.
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── Teachers.jsx   ← With availability grid for link teachers
        │   ├── Subjects.jsx   ← With priority and color picker
        │   ├── Classes.jsx    ← Grouped by grade
        │   ├── Allocations.jsx
        │   ├── TimeSlots.jsx
        │   ├── Generate.jsx   ← One-click with live timer
        │   ├── ClassView.jsx  ← PDF + Excel export
        │   └── TeacherView.jsx
        └── utils/
            └── api.js         ← All API calls + download helpers
```

---

## 🧠 OR-Tools Generation Algorithm

```
INPUT:
  All subject allocations for Middle Section
  Link teacher free slot availability
  Teacher max period limits

CONSTRAINTS (Hard — never violated):
  ✅ No teacher in two places at once
  ✅ No class has two subjects at once
  ✅ Link teachers only placed in free slots
  ✅ Max 29 periods per teacher per week
  ✅ 100% period coverage target

OPTIMIZATION (Soft — best effort):
  ⭐ Core subjects (Math, Science, English, CS) → Priority 1, morning slots
  ⭐ Language/Social → Priority 2
  ⭐ PE, Art → Priority 3
  ⭐ Same subject not twice on same day
  ⭐ No teacher more than 3 consecutive periods

SOLVE TIME: 30–120 seconds for 27 classes (configurable)
```

---

## 🔗 Link Teacher Workflow

1. Add teacher → set Home Section = "Primary Section" or "High School Section"
2. Check "Link Teacher" checkbox
3. After saving → click **Set Free Slots** button
4. Mark all periods they are FREE (green = available for Middle section)
5. Assign them to classes in Allocations page
6. Generate — solver will only place them in their free slots

---

## 🌐 API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stats/` | Dashboard stats |
| GET/POST | `/api/teachers/` | Teacher management |
| GET/POST | `/api/subjects/` | Subject management |
| GET/POST | `/api/classes/` | Class management |
| GET/POST | `/api/allocations/` | Subject allocations |
| GET/POST | `/api/availability/{id}` | Link teacher free slots |
| POST | `/api/timetable/generate` | Run OR-Tools solver |
| GET | `/api/timetable/class/{id}` | Class timetable |
| GET | `/api/timetable/teacher/{id}` | Teacher timetable |
| GET | `/api/timetable/export/class/{id}/pdf` | PDF download |
| GET | `/api/timetable/export/class/{id}/excel` | Excel download |
| GET | `/api/timetable/export/all/excel` | All classes Excel |

Interactive API docs: **http://localhost:8000/docs**

---

## 🗄️ Seed Data (loaded on first run)

- **3 sections**: Primary, Middle, High School
- **10 subjects**: Math, English, Science, CS, Hindi, Social, Arabic, Moral Science, PE, Art
- **27 classes**: Grade 6A–J, Grade 7A–I, Grade 8A–H
- **12 regular teachers** (Middle section)
- **6 link teachers** (from Primary and High School)
- **Full allocations** for all 27 classes

---

## 🐛 Troubleshooting

| Problem | Fix |
|---|---|
| `python` not found | Reinstall Python, check "Add to PATH" |
| `ortools` import error | `pip install ortools` |
| Port 8000 in use | `set PORT=8080 && python -m uvicorn main:app --port 8080` |
| Port 3000 in use | Edit `frontend/vite.config.js`, change port |
| Database errors | Delete `data/timetable.db` and restart |
| Frontend won't load | Run `cd frontend && npm install` |
| Generation fails | Check allocations exist and link teachers have free slots set |

---

## 📋 Recommended Usage Order

```
1. Sections     → Verify Primary, Middle, High School are there
2. Subjects     → Add/edit subjects, set priority correctly
3. Classes      → Verify all 27 classes are present
4. Teachers     → Add all teachers, mark link teachers
5. Availability → Set free slots for EVERY link teacher
6. Allocations  → Assign teachers to classes (check workload warnings)
7. Time Slots   → Adjust period timings if needed
8. Generate     → Click Generate, wait 30-120 seconds
9. Class View   → View and export per-class timetables
10. Teacher View → Check individual schedules
```
