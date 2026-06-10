from fastapi import APIRouter
from backend.database import get_connection

router = APIRouter()

@router.get("/")
def get_stats():
    conn = get_connection()

    stats = {
        "sections":    conn.execute("SELECT COUNT(*) FROM sections").fetchone()[0],
        "teachers":    conn.execute("SELECT COUNT(*) FROM teachers").fetchone()[0],
        "link_teachers": conn.execute("SELECT COUNT(*) FROM teachers WHERE is_link_teacher=1").fetchone()[0],
        "subjects":    conn.execute("SELECT COUNT(*) FROM subjects").fetchone()[0],
        "classes":     conn.execute("SELECT COUNT(*) FROM classes").fetchone()[0],
        "allocations": conn.execute("SELECT COUNT(*) FROM subject_allocations").fetchone()[0],
        "scheduled_periods": conn.execute("SELECT COUNT(*) FROM timetable_entries").fetchone()[0],
        "required_periods": conn.execute("SELECT COALESCE(SUM(periods_per_week),0) FROM subject_allocations").fetchone()[0],
        "last_generated": conn.execute(
            "SELECT created_at FROM generation_logs ORDER BY id DESC LIMIT 1"
        ).fetchone(),
    }

    stats["last_generated"] = stats["last_generated"][0] if stats["last_generated"] else None

    # Coverage percentage
    if stats["required_periods"] > 0:
        stats["coverage_pct"] = round(
            stats["scheduled_periods"] / stats["required_periods"] * 100, 1
        )
    else:
        stats["coverage_pct"] = 0

    # Teacher workload
    workload = conn.execute("""
        SELECT t.id, t.name, t.short_name, t.max_periods_per_week, t.is_link_teacher,
               sec.name AS section_name,
               sub.name AS subject_name, sub.color AS subject_color,
               COALESCE(SUM(sa.periods_per_week), 0) AS allocated_periods,
               (SELECT COUNT(*) FROM timetable_entries WHERE teacher_id = t.id) AS scheduled_periods
        FROM teachers t
        JOIN sections sec ON t.section_id = sec.id
        LEFT JOIN subjects sub ON t.subject_id = sub.id
        LEFT JOIN subject_allocations sa ON t.id = sa.teacher_id
        GROUP BY t.id
        ORDER BY allocated_periods DESC
    """).fetchall()

    # Grade-wise coverage
    grade_coverage = conn.execute("""
        SELECT c.grade,
               COUNT(DISTINCT c.id) AS class_count,
               COALESCE(SUM(sa.periods_per_week), 0) AS required,
               (SELECT COUNT(*) FROM timetable_entries te
                JOIN classes cc ON te.class_id = cc.id
                WHERE cc.grade = c.grade) AS scheduled
        FROM classes c
        LEFT JOIN subject_allocations sa ON c.id = sa.class_id
        GROUP BY c.grade
        ORDER BY c.grade
    """).fetchall()

    conn.close()

    return {
        "stats": stats,
        "workload": [dict(r) for r in workload],
        "grade_coverage": [dict(r) for r in grade_coverage],
    }
