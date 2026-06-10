from fastapi import APIRouter
from backend.database import get_connection

router = APIRouter()

@router.get("/{teacher_id}")
def get_availability(teacher_id: int):
    conn = get_connection()
    rows = conn.execute("""
        SELECT ta.*, ts.day_of_week, ts.period_number, ts.start_time, ts.end_time, ts.is_break
        FROM teacher_availability ta
        JOIN time_slots ts ON ta.time_slot_id = ts.id
        WHERE ta.teacher_id = ?
        ORDER BY ts.day_of_week, ts.period_number
    """, (teacher_id,)).fetchall()

    all_slots = conn.execute(
        "SELECT * FROM time_slots WHERE is_break=0 ORDER BY day_of_week, period_number"
    ).fetchall()

    available_slot_ids = {r["time_slot_id"] for r in rows}
    conn.close()

    return {
        "teacher_id": teacher_id,
        "available_slot_ids": list(available_slot_ids),
        "all_teaching_slots": [dict(s) for s in all_slots],
    }

@router.post("/{teacher_id}")
def set_availability(teacher_id: int, data: dict):
    """
    data = { "slot_ids": [1, 2, 5, 8, ...] }
    Replaces all availability for this teacher.
    """
    conn = get_connection()
    slot_ids = data.get("slot_ids", [])

    conn.execute(
        "DELETE FROM teacher_availability WHERE teacher_id=?", (teacher_id,)
    )
    for sid in slot_ids:
        conn.execute(
            """INSERT OR REPLACE INTO teacher_availability
               (teacher_id, time_slot_id, is_available) VALUES (?,?,1)""",
            (teacher_id, sid)
        )
    conn.commit()
    conn.close()
    return {"message": f"Availability updated: {len(slot_ids)} slots marked free"}

@router.delete("/{teacher_id}")
def clear_availability(teacher_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM teacher_availability WHERE teacher_id=?", (teacher_id,))
    conn.commit()
    conn.close()
    return {"message": "Availability cleared"}
