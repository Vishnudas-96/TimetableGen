from fastapi import APIRouter
from backend.database import get_connection

router = APIRouter()

@router.get("/")
def list_timeslots():
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM time_slots ORDER BY day_of_week, period_number"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.put("/{slot_id}")
def update_timeslot(slot_id: int, data: dict):
    conn = get_connection()
    conn.execute(
        "UPDATE time_slots SET start_time=?, end_time=?, break_name=? WHERE id=?",
        (data["start_time"], data["end_time"], data.get("break_name"), slot_id)
    )
    conn.commit()
    conn.close()
    return {"message": "Time slot updated"}
