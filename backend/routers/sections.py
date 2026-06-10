"""Sections router"""
from fastapi import APIRouter
from backend.database import get_connection

router = APIRouter()

@router.get("/")
def list_sections():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM sections ORDER BY name").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/")
def create_section(data: dict):
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO sections (name, short_name) VALUES (?, ?)",
            (data["name"], data["short_name"].upper())
        )
        conn.commit()
        return {"id": cur.lastrowid, "message": "Section created"}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

@router.put("/{section_id}")
def update_section(section_id: int, data: dict):
    conn = get_connection()
    conn.execute(
        "UPDATE sections SET name=?, short_name=? WHERE id=?",
        (data["name"], data["short_name"].upper(), section_id)
    )
    conn.commit()
    conn.close()
    return {"message": "Section updated"}

@router.delete("/{section_id}")
def delete_section(section_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM sections WHERE id=?", (section_id,))
    conn.commit()
    conn.close()
    return {"message": "Section deleted"}
