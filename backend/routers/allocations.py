from fastapi import APIRouter
from backend.database import get_connection

router = APIRouter()

@router.get("/")
def list_allocations(class_id: int = None, section_id: int = None):
    conn = get_connection()
    where = []
    params = []

    if class_id:
        where.append("sa.class_id = ?")
        params.append(class_id)
    if section_id:
        where.append("c.section_id = ?")
        params.append(section_id)

    where_clause = ("WHERE " + " AND ".join(where)) if where else ""

    rows = conn.execute(f"""
        SELECT sa.*,
               c.grade, c.division,
               s.name  AS subject_name, s.short_name AS subject_short, s.color AS subject_color, s.priority AS subject_priority,
               t.name  AS teacher_name, t.short_name AS teacher_short, t.is_link_teacher,
               sec.name AS section_name
        FROM subject_allocations sa
        JOIN classes  c   ON sa.class_id   = c.id
        JOIN subjects s   ON sa.subject_id = s.id
        JOIN teachers t   ON sa.teacher_id = t.id
        JOIN sections sec ON c.section_id  = sec.id
        {where_clause}
        ORDER BY c.grade, c.division, s.priority, s.name
    """, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/")
def create_allocation(data: dict):
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO subject_allocations
            (class_id, subject_id, teacher_id, periods_per_week, is_double_period, priority)
            VALUES (?,?,?,?,?,?)
        """, (
            data["class_id"],
            data["subject_id"],
            data["teacher_id"],
            data.get("periods_per_week", 1),
            1 if data.get("is_double_period") else 0,
            data.get("priority", 2),
        ))
        conn.commit()
        return {"id": cur.lastrowid, "message": "Allocation created"}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

@router.put("/{alloc_id}")
def update_allocation(alloc_id: int, data: dict):
    conn = get_connection()
    try:
        conn.execute("""
            UPDATE subject_allocations
            SET class_id=?, subject_id=?, teacher_id=?,
                periods_per_week=?, is_double_period=?, priority=?
            WHERE id=?
        """, (
            data["class_id"],
            data["subject_id"],
            data["teacher_id"],
            data.get("periods_per_week", 1),
            1 if data.get("is_double_period") else 0,
            data.get("priority", 2),
            alloc_id,
        ))
        conn.commit()
        return {"message": "Allocation updated"}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

@router.delete("/{alloc_id}")
def delete_allocation(alloc_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM subject_allocations WHERE id=?", (alloc_id,))
    conn.commit()
    conn.close()
    return {"message": "Allocation deleted"}

@router.get("/summary/teacher-load")
def teacher_load_summary(section_id: int = None):
    """How many periods each teacher is allocated vs their max."""
    conn = get_connection()
    where = ""
    params = []
    if section_id:
        where = "WHERE c.section_id = ?"
        params.append(section_id)

    rows = conn.execute(f"""
        SELECT t.id, t.name, t.short_name, t.max_periods_per_week,
               t.is_link_teacher,
               sec.name AS section_name,
               sub.name AS subject_name,
               COALESCE(SUM(sa.periods_per_week), 0) AS allocated_periods
        FROM teachers t
        JOIN sections sec ON t.section_id = sec.id
        LEFT JOIN subjects sub ON t.subject_id = sub.id
        LEFT JOIN subject_allocations sa ON t.id = sa.teacher_id
        LEFT JOIN classes c ON sa.class_id = c.id
        {where}
        GROUP BY t.id
        ORDER BY t.is_link_teacher, sec.name, t.name
    """, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]
