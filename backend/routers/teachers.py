from fastapi import APIRouter
from backend.database import get_connection

router = APIRouter()

@router.get("/")
def list_teachers():
    conn = get_connection()
    rows = conn.execute("""
        SELECT t.*,
               sec.name AS section_name, sec.short_name AS section_short,
               sub.name AS subject_name, sub.short_name AS subject_short, sub.color AS subject_color,
               (SELECT COUNT(*) FROM timetable_entries WHERE teacher_id = t.id) AS scheduled_periods
        FROM teachers t
        JOIN sections sec ON t.section_id = sec.id
        LEFT JOIN subjects sub ON t.subject_id = sub.id
        ORDER BY t.is_link_teacher, sec.name, t.name
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.get("/{teacher_id}")
def get_teacher(teacher_id: int):
    conn = get_connection()
    row = conn.execute("""
        SELECT t.*,
               sec.name AS section_name,
               sub.name AS subject_name, sub.short_name AS subject_short
        FROM teachers t
        JOIN sections sec ON t.section_id = sec.id
        LEFT JOIN subjects sub ON t.subject_id = sub.id
        WHERE t.id = ?
    """, (teacher_id,)).fetchone()
    conn.close()
    return dict(row) if row else {"error": "Not found"}

@router.post("/")
def create_teacher(data: dict):
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO teachers
            (name, short_name, email, section_id, subject_id, is_link_teacher, max_periods_per_week)
            VALUES (?,?,?,?,?,?,?)
        """, (
            data["name"],
            data["short_name"].upper(),
            data.get("email"),
            data["section_id"],
            data.get("subject_id"),
            1 if data.get("is_link_teacher") else 0,
            data.get("max_periods_per_week", 29),
        ))
        conn.commit()
        return {"id": cur.lastrowid, "message": "Teacher created"}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

@router.put("/{teacher_id}")
def update_teacher(teacher_id: int, data: dict):
    conn = get_connection()
    try:
        conn.execute("""
            UPDATE teachers
            SET name=?, short_name=?, email=?, section_id=?, subject_id=?,
                is_link_teacher=?, max_periods_per_week=?
            WHERE id=?
        """, (
            data["name"],
            data["short_name"].upper(),
            data.get("email"),
            data["section_id"],
            data.get("subject_id"),
            1 if data.get("is_link_teacher") else 0,
            data.get("max_periods_per_week", 29),
            teacher_id,
        ))
        conn.commit()
        return {"message": "Teacher updated"}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

@router.delete("/{teacher_id}")
def delete_teacher(teacher_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM teachers WHERE id=?", (teacher_id,))
    conn.commit()
    conn.close()
    return {"message": "Teacher deleted"}
