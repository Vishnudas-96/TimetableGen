"""
SQLite Database initialization, schema, and seed data.
Database file: /data/timetable.db
"""

import sqlite3
import os
from pathlib import Path

DATA_DIR = Path(os.environ.get("DATA_DIR", Path(__file__).parent.parent / "data"))
DB_PATH = DATA_DIR / "timetable.db"


def get_connection():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def init_db():
    """Create all tables and seed initial data."""
    conn = get_connection()
    try:
        _create_tables(conn)
        _seed_data(conn)
        conn.commit()
    finally:
        conn.close()


def _create_tables(conn):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS sections (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL UNIQUE,
            short_name  TEXT NOT NULL UNIQUE,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS subjects (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            short_name  TEXT NOT NULL UNIQUE,
            color       TEXT DEFAULT '#4A90E2',
            priority    INTEGER DEFAULT 2,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS teachers (
            id                   INTEGER PRIMARY KEY AUTOINCREMENT,
            name                 TEXT NOT NULL,
            short_name           TEXT NOT NULL UNIQUE,
            email                TEXT,
            section_id           INTEGER NOT NULL,
            subject_id           INTEGER,
            is_link_teacher      INTEGER DEFAULT 0,
            max_periods_per_week INTEGER DEFAULT 29,
            created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (section_id) REFERENCES sections(id),
            FOREIGN KEY (subject_id) REFERENCES subjects(id)
        );

        CREATE TABLE IF NOT EXISTS classes (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            grade       TEXT NOT NULL,
            division    TEXT NOT NULL,
            section_id  INTEGER NOT NULL,
            strength    INTEGER DEFAULT 35,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (section_id) REFERENCES sections(id),
            UNIQUE(grade, division)
        );

        CREATE TABLE IF NOT EXISTS time_slots (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            day_of_week     INTEGER NOT NULL,
            period_number   INTEGER NOT NULL,
            start_time      TEXT NOT NULL,
            end_time        TEXT NOT NULL,
            is_break        INTEGER DEFAULT 0,
            break_name      TEXT,
            UNIQUE(day_of_week, period_number)
        );

        CREATE TABLE IF NOT EXISTS teacher_availability (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id   INTEGER NOT NULL,
            time_slot_id INTEGER NOT NULL,
            is_available INTEGER DEFAULT 1,
            FOREIGN KEY (teacher_id)   REFERENCES teachers(id)   ON DELETE CASCADE,
            FOREIGN KEY (time_slot_id) REFERENCES time_slots(id) ON DELETE CASCADE,
            UNIQUE(teacher_id, time_slot_id)
        );

        CREATE TABLE IF NOT EXISTS subject_allocations (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id         INTEGER NOT NULL,
            subject_id       INTEGER NOT NULL,
            teacher_id       INTEGER NOT NULL,
            periods_per_week INTEGER NOT NULL DEFAULT 1,
            is_double_period INTEGER DEFAULT 0,
            priority         INTEGER DEFAULT 2,
            created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (class_id)   REFERENCES classes(id)   ON DELETE CASCADE,
            FOREIGN KEY (subject_id) REFERENCES subjects(id)  ON DELETE CASCADE,
            FOREIGN KEY (teacher_id) REFERENCES teachers(id)  ON DELETE CASCADE,
            UNIQUE(class_id, subject_id)
        );

        CREATE TABLE IF NOT EXISTS timetable_entries (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id     INTEGER NOT NULL,
            subject_id   INTEGER NOT NULL,
            teacher_id   INTEGER NOT NULL,
            time_slot_id INTEGER NOT NULL,
            generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (class_id)     REFERENCES classes(id)    ON DELETE CASCADE,
            FOREIGN KEY (subject_id)   REFERENCES subjects(id)   ON DELETE CASCADE,
            FOREIGN KEY (teacher_id)   REFERENCES teachers(id)   ON DELETE CASCADE,
            FOREIGN KEY (time_slot_id) REFERENCES time_slots(id) ON DELETE CASCADE,
            UNIQUE(class_id,   time_slot_id),
            UNIQUE(teacher_id, time_slot_id)
        );

        CREATE TABLE IF NOT EXISTS generation_logs (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            status         TEXT NOT NULL,
            total_placed   INTEGER DEFAULT 0,
            total_required INTEGER DEFAULT 0,
            conflicts      TEXT,
            solve_time_sec REAL,
            created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)


def _seed_data(conn):
    """Seed initial data only if tables are empty."""
    if conn.execute("SELECT COUNT(*) FROM sections").fetchone()[0] > 0:
        return

    # ── Sections ──────────────────────────────────────────────
    conn.executemany(
        "INSERT INTO sections (name, short_name) VALUES (?,?)",
        [("Primary Section","PRI"), ("Middle Section","MID"), ("High School Section","HIG")]
    )
    sec = {r["short_name"]: r["id"] for r in conn.execute("SELECT * FROM sections")}

    # ── Subjects (priority 1=core, 2=language/social, 3=other) ─
    conn.executemany(
        "INSERT INTO subjects (name, short_name, color, priority) VALUES (?,?,?,?)",
        [
            ("Mathematics",      "MATH", "#E74C3C", 1),
            ("English",          "ENG",  "#3498DB", 1),
            ("Science",          "SCI",  "#2ECC71", 1),
            ("Computer Science", "CS",   "#1ABC9C", 1),
            ("Hindi",            "HIN",  "#9B59B6", 2),
            ("Social Studies",   "SST",  "#F39C12", 2),
            ("Arabic",           "ARB",  "#E67E22", 2),
            ("Moral Science",    "MOR",  "#607D8B", 2),
            ("Physical Ed",      "PE",   "#27AE60", 3),
            ("Art & Craft",      "ART",  "#E91E63", 3),
        ]
    )
    subj = {r["short_name"]: r["id"] for r in conn.execute("SELECT * FROM subjects")}

    # ── Time Slots (5 days x 10 slots = 50 rows) ──────────────
    period_times = [
        (1,  "08:00","08:45", 0, None),
        (2,  "08:45","09:30", 0, None),
        (3,  "09:30","10:15", 0, None),
        (4,  "10:15","10:30", 1, "Short Break"),
        (5,  "10:30","11:15", 0, None),
        (6,  "11:15","12:00", 0, None),
        (7,  "12:00","12:45", 0, None),
        (8,  "12:45","13:30", 1, "Lunch Break"),
        (9,  "13:30","14:15", 0, None),
        (10, "14:15","15:00", 0, None),
    ]
    for day in range(1, 6):
        for (pnum, start, end, is_b, bname) in period_times:
            conn.execute(
                "INSERT OR IGNORE INTO time_slots (day_of_week,period_number,start_time,end_time,is_break,break_name) VALUES (?,?,?,?,?,?)",
                (day, pnum, start, end, is_b, bname)
            )

    # ── Classes: Middle Section 27 total ──────────────────────
    mid = sec["MID"]
    for div in "ABCDEFGHIJ": conn.execute("INSERT OR IGNORE INTO classes (grade,division,section_id,strength) VALUES (?,?,?,?)", ("Grade 6", div, mid, 35))
    for div in "ABCDEFGHI":  conn.execute("INSERT OR IGNORE INTO classes (grade,division,section_id,strength) VALUES (?,?,?,?)", ("Grade 7", div, mid, 35))
    for div in "ABCDEFGH":   conn.execute("INSERT OR IGNORE INTO classes (grade,division,section_id,strength) VALUES (?,?,?,?)", ("Grade 8", div, mid, 35))

    cls_map = {(r["grade"],r["division"]): r["id"] for r in conn.execute("SELECT * FROM classes")}

    # ── Teachers ───────────────────────────────────────────────
    # Proper distribution based on load analysis:
    # MATH (162p) → 6 teachers @ ~27p each
    # ENG  (135p) → 5 teachers @ ~27p each
    # SCI  (108p) → 4 teachers @ ~27p each
    # CS   ( 54p) → 2 teachers @ ~27p each
    # HIN  (108p) → 3 mid + 1 link = 4 total
    # SST  ( 81p) → 2 mid + 1 link = 3 total
    # ARB  ( 54p) → 1 mid + 1 link = 2 total
    # MOR  ( 27p) → 1 teacher
    # PE   ( 54p) → 2 teachers
    # ART  ( 27p) → 1 teacher

    mid_teachers = [
        # (name, short, section_id, subject_id, is_link, max_p)
        # MATH x6
        ("Arun Kumar",       "ARK", mid, subj["MATH"], 0, 36),
        ("Beena Thomas",     "BET", mid, subj["MATH"], 0, 36),
        ("Chandran Nair",    "CHN", mid, subj["MATH"], 0, 30),
        ("Divya Menon",      "DIV", mid, subj["MATH"], 0, 27),
        ("Elias Joseph",     "ELJ", mid, subj["MATH"], 0, 27),
        ("Farida Begum",     "FAR", mid, subj["MATH"], 0, 27),
        # ENG x5
        ("Grace Thomas",     "GRT", mid, subj["ENG"],  0, 30),
        ("Hari Krishnan",    "HAR", mid, subj["ENG"],  0, 30),
        ("Indira Pillai",    "IND", mid, subj["ENG"],  0, 27),
        ("Jacob Mathew",     "JAC", mid, subj["ENG"],  0, 27),
        ("Kavitha Raj",      "KAV", mid, subj["ENG"],  0, 27),
        # SCI x4
        ("Latha Suresh",     "LAT", mid, subj["SCI"],  0, 29),
        ("Manoj Kumar",      "MAN", mid, subj["SCI"],  0, 29),
        ("Nisha George",     "NIS", mid, subj["SCI"],  0, 27),
        ("Omana Kurian",     "OMA", mid, subj["SCI"],  0, 27),
        # CS x2
        ("Peter Varghese",   "PET", mid, subj["CS"],   0, 29),
        ("Qumar Ahmed",      "QUM", mid, subj["CS"],   0, 29),
        # HIN x3 mid
        ("Rani Devi",        "RAN", mid, subj["HIN"],  0, 32),
        ("Suresh Babu",      "SUR", mid, subj["HIN"],  0, 29),
        ("Thara Nair",       "THA", mid, subj["HIN"],  0, 27),
        # SST x2 mid
        ("Uma Sharma",       "UMA", mid, subj["SST"],  0, 30),
        ("Vimal Raj",        "VIM", mid, subj["SST"],  0, 29),
        # ARB x1 mid
        ("Wilson Thomas",    "WIL", mid, subj["ARB"],  0, 29),
        # MOR x1
        ("Xavier Fernandez", "XAV", mid, subj["MOR"],  0, 29),
        # PE x2
        ("Yamuna Devi",      "YAM", mid, subj["PE"],   0, 29),
        ("Zainab Ali",       "ZAI", mid, subj["PE"],   0, 29),
        # ART x1
        ("Anita John",       "ANJ", mid, subj["ART"],  0, 29),
    ]

    pri = sec["PRI"]
    hig = sec["HIG"]
    link_teachers = [
        # HIN x1 link (covers remaining ~28 periods)
        ("Meera Pillai",   "MEP", pri, subj["HIN"], 1, 29),
        # SST x1 link
        ("Rajan Suresh",   "RJS", pri, subj["SST"], 1, 29),
        # ARB x1 link
        ("Nasser Ali",     "NAS", pri, subj["ARB"], 1, 29),
        # ENG x1 link (High School)
        ("Priya Suresh",   "PRS", hig, subj["ENG"], 1, 29),
        # SCI x1 link (High School)  
        ("Samuel Davis",   "SAM", hig, subj["SCI"], 1, 29),
        # MOR x1 link
        ("Sunitha Das",    "SUD", pri, subj["MOR"], 1, 29),
    ]

    for (name, short, sec_id, sub_id, is_link, max_p) in mid_teachers + link_teachers:
        conn.execute(
            "INSERT OR IGNORE INTO teachers (name,short_name,section_id,subject_id,is_link_teacher,max_periods_per_week) VALUES (?,?,?,?,?,?)",
            (name, short, sec_id, sub_id, is_link, max_p)
        )

    tch = {r["short_name"]: r["id"] for r in conn.execute("SELECT * FROM teachers")}

    # ── Link teacher availability ──────────────────────────────
    # Link teachers free in periods 5-10 (after their morning home section duties)
    link_shorts = ["MEP","RJS","NAS","PRS","SAM","SUD"]
    free_slots = conn.execute(
        "SELECT id FROM time_slots WHERE period_number IN (5,6,7,9,10) AND is_break=0"
    ).fetchall()
    for short in link_shorts:
        tid = tch[short]
        for slot in free_slots:
            conn.execute(
                "INSERT OR IGNORE INTO teacher_availability (teacher_id,time_slot_id,is_available) VALUES (?,?,1)",
                (tid, slot["id"])
            )

    # ── Subject Allocations ────────────────────────────────────
    # Periods per week per subject
    ppw = {"MATH":6,"ENG":5,"SCI":4,"CS":2,"HIN":4,"SST":3,"ARB":2,"MOR":1,"PE":2,"ART":1}
    pri_map = {"MATH":1,"ENG":1,"SCI":1,"CS":1,"HIN":2,"SST":2,"ARB":2,"MOR":2,"PE":3,"ART":3}

    # Teacher pools per subject (ordered, classes assigned round-robin)
    teacher_pools = {
        "MATH": ["ARK","BET","CHN","DIV","ELJ","FAR"],
        "ENG":  ["GRT","HAR","IND","JAC","KAV","PRS"],   # PRS=link covers extra
        "SCI":  ["LAT","MAN","NIS","OMA","SAM"],          # SAM=link covers extra
        "CS":   ["PET","QUM"],
        "HIN":  ["RAN","SUR","THA","MEP"],                # MEP=link
        "SST":  ["UMA","VIM","RJS"],                      # RJS=link
        "ARB":  ["WIL","NAS"],                            # NAS=link
        "MOR":  ["XAV","SUD"],                            # SUD=link
        "PE":   ["YAM","ZAI"],
        "ART":  ["ANJ"],
    }

    grade_divs = {
        "Grade 6": list("ABCDEFGHIJ"),  # 10
        "Grade 7": list("ABCDEFGHI"),   # 9
        "Grade 8": list("ABCDEFGH"),    # 8
    }

    for grade, divisions in grade_divs.items():
        for s_short, pool in teacher_pools.items():
            sid = subj[s_short]
            p   = ppw[s_short]
            pri = pri_map[s_short]
            for i, div in enumerate(divisions):
                cls_id = cls_map.get((grade, div))
                if not cls_id:
                    continue
                t_short = pool[i % len(pool)]
                t_id    = tch[t_short]
                conn.execute(
                    "INSERT OR IGNORE INTO subject_allocations (class_id,subject_id,teacher_id,periods_per_week,priority) VALUES (?,?,?,?,?)",
                    (cls_id, sid, t_id, p, pri)
                )


if __name__ == "__main__":
    init_db()
    print(f"Database initialized at: {DB_PATH}")
