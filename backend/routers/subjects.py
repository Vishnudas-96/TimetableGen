from fastapi import APIRouter
from backend.database import get_connection

router = APIRouter()

@router.get("/")
def list_subjects():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM subjects ORDER BY priority, name").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/")
def create_subject(data: dict):
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO subjects (name, short_name, color, priority) VALUES (?,?,?,?)",
            (data["name"], data["short_name"].upper(), data.get("color","#4A90E2"), data.get("priority",2))
        )
        conn.commit()
        return {"id": cur.lastrowid, "message": "Subject created"}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

@router.put("/{subject_id}")
def update_subject(subject_id: int, data: dict):
    conn = get_connection()
    conn.execute(
        "UPDATE subjects SET name=?, short_name=?, color=?, priority=? WHERE id=?",
        (data["name"], data["short_name"].upper(), data.get("color","#4A90E2"), data.get("priority",2), subject_id)
    )
    conn.commit()
    conn.close()
    return {"message": "Subject updated"}

@router.delete("/{subject_id}")
def delete_subject(subject_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM subjects WHERE id=?", (subject_id,))
    conn.commit()
    conn.close()
    return {"message": "Subject deleted"}
