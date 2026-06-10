from fastapi import APIRouter
from backend.database import get_connection

router = APIRouter()

@router.get("/")
def list_classes(section_id: int = None):
    conn = get_connection()
    if section_id:
        rows = conn.execute("""
            SELECT c.*, s.name AS section_name,
                   (SELECT COUNT(*) FROM subject_allocations WHERE class_id = c.id) AS alloc_count
            FROM classes c JOIN sections s ON c.section_id = s.id
            WHERE c.section_id = ?
            ORDER BY c.grade, c.division
        """, (section_id,)).fetchall()
    else:
        rows = conn.execute("""
            SELECT c.*, s.name AS section_name,
                   (SELECT COUNT(*) FROM subject_allocations WHERE class_id = c.id) AS alloc_count
            FROM classes c JOIN sections s ON c.section_id = s.id
            ORDER BY s.name, c.grade, c.division
        """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/")
def create_class(data: dict):
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO classes (grade, division, section_id, strength) VALUES (?,?,?,?)",
            (data["grade"], data["division"].upper(), data["section_id"], data.get("strength", 35))
        )
        conn.commit()
        return {"id": cur.lastrowid, "message": "Class created"}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

@router.put("/{class_id}")
def update_class(class_id: int, data: dict):
    conn = get_connection()
    conn.execute(
        "UPDATE classes SET grade=?, division=?, section_id=?, strength=? WHERE id=?",
        (data["grade"], data["division"].upper(), data["section_id"], data.get("strength",35), class_id)
    )
    conn.commit()
    conn.close()
    return {"message": "Class updated"}

@router.delete("/{class_id}")
def delete_class(class_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM classes WHERE id=?", (class_id,))
    conn.commit()
    conn.close()
    return {"message": "Class deleted"}
