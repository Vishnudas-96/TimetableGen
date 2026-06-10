"""
Timetable Generation Engine using Google OR-Tools CP-SAT solver.

Priority-based generation:
  Priority 1 → Core subjects (Math, Science, English, Computer)
  Priority 2 → Language & Social (Hindi, Arabic, SST, Moral)
  Priority 3 → Other (PE, Art)
  Priority 4 → Optimization pass (distribution, consecutive limits)

Constraints:
  HARD:
    - No teacher clash (same teacher, same slot)
    - No class clash (same class, same slot)
    - Link teachers only in their declared free slots
    - Max periods per teacher per week
    - All required periods placed

  SOFT (optimized):
    - Core subjects prefer morning slots (P1-P5)
    - No subject twice on same day for a class
    - No teacher more than 3 consecutive periods
    - Even spread across the week
"""

import time
from ortools.sat.python import cp_model
from backend.database import get_connection


DAY_NAMES = {1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday"}


class TimetableGenerator:

    def __init__(self):
        self.conn = get_connection()

    def generate(self, section_name="Middle Section", time_limit_seconds=120):
        start_time = time.time()
        conflicts = []

        # ── Load data ─────────────────────────────────────────
        section = self.conn.execute(
            "SELECT * FROM sections WHERE name = ?", (section_name,)
        ).fetchone()

        if not section:
            return {
                "success": False,
                "message": f"Section '{section_name}' not found.",
                "conflicts": [],
            }

        classes = self.conn.execute(
            "SELECT * FROM classes WHERE section_id = ? ORDER BY grade, division",
            (section["id"],)
        ).fetchall()

        teaching_slots = self.conn.execute(
            "SELECT * FROM time_slots WHERE is_break = 0 ORDER BY day_of_week, period_number"
        ).fetchall()

        all_slots = self.conn.execute(
            "SELECT * FROM time_slots ORDER BY day_of_week, period_number"
        ).fetchall()

        allocations = self.conn.execute("""
            SELECT sa.*,
                   c.grade, c.division,
                   s.name  AS subject_name,  s.short_name AS subject_short, s.priority AS subj_priority,
                   t.name  AS teacher_name,  t.short_name AS teacher_short,
                   t.is_link_teacher, t.max_periods_per_week,
                   t.section_id AS teacher_section_id
            FROM subject_allocations sa
            JOIN classes  c ON sa.class_id   = c.id
            JOIN subjects s ON sa.subject_id = s.id
            JOIN teachers t ON sa.teacher_id = t.id
            WHERE c.section_id = ?
            ORDER BY sa.priority ASC, sa.periods_per_week DESC
        """, (section["id"],)).fetchall()

        if not allocations:
            return {
                "success": False,
                "message": "No subject allocations found. Please add allocations first.",
                "conflicts": [],
            }

        # ── Teacher availability ───────────────────────────────
        # For link teachers: only slots marked available
        # For regular teachers: all teaching slots
        link_available = {}   # teacher_id -> set of slot_ids
        all_teacher_ids = set(a["teacher_id"] for a in allocations)

        for tid in all_teacher_ids:
            teacher = self.conn.execute(
                "SELECT * FROM teachers WHERE id = ?", (tid,)
            ).fetchone()
            if teacher["is_link_teacher"]:
                rows = self.conn.execute(
                    """SELECT time_slot_id FROM teacher_availability
                       WHERE teacher_id = ? AND is_available = 1""", (tid,)
                ).fetchall()
                link_available[tid] = {r["time_slot_id"] for r in rows}
            else:
                link_available[tid] = {s["id"] for s in teaching_slots}

        slot_ids = [s["id"] for s in teaching_slots]
        slot_index = {s["id"]: i for i, s in enumerate(teaching_slots)}
        num_slots = len(slot_ids)

        # ── Build CP-SAT model ────────────────────────────────
        model = cp_model.CpModel()

        # Variables: assign[alloc_id][slot_id] = BoolVar
        assign = {}
        for alloc in allocations:
            alloc_id = alloc["id"]
            assign[alloc_id] = {}

            allowed_slots = link_available.get(alloc["teacher_id"], set())

            for slot in teaching_slots:
                sid = slot["id"]
                if sid in allowed_slots:
                    assign[alloc_id][sid] = model.NewBoolVar(
                        f"a{alloc_id}_s{sid}"
                    )
                # else: slot not allowed, variable simply doesn't exist

        # ── Hard Constraint 1: Each allocation gets exactly periods_per_week ──
        for alloc in allocations:
            alloc_id = alloc["id"]
            vars_list = list(assign[alloc_id].values())

            if len(vars_list) < alloc["periods_per_week"]:
                conflicts.append({
                    "type": "INSUFFICIENT_SLOTS",
                    "message": (
                        f"{alloc['subject_name']} for {alloc['grade']} {alloc['division']} "
                        f"— teacher {alloc['teacher_name']} has only {len(vars_list)} "
                        f"available slots but needs {alloc['periods_per_week']} periods/week."
                    )
                })
                model.Add(sum(vars_list) <= len(vars_list))
            else:
                model.Add(sum(vars_list) == alloc["periods_per_week"])

        # ── Hard Constraint 2: No class clash ─────────────────
        class_allocs = {}
        for alloc in allocations:
            cid = alloc["class_id"]
            class_allocs.setdefault(cid, []).append(alloc)

        for cid, class_alloc_list in class_allocs.items():
            for slot in teaching_slots:
                sid = slot["id"]
                vars_in_slot = [
                    assign[a["id"]][sid]
                    for a in class_alloc_list
                    if sid in assign[a["id"]]
                ]
                if len(vars_in_slot) > 1:
                    model.AddAtMostOne(vars_in_slot)

        # ── Hard Constraint 3: No teacher clash ───────────────
        teacher_allocs = {}
        for alloc in allocations:
            tid = alloc["teacher_id"]
            teacher_allocs.setdefault(tid, []).append(alloc)

        for tid, t_alloc_list in teacher_allocs.items():
            for slot in teaching_slots:
                sid = slot["id"]
                vars_in_slot = [
                    assign[a["id"]][sid]
                    for a in t_alloc_list
                    if sid in assign[a["id"]]
                ]
                if len(vars_in_slot) > 1:
                    model.AddAtMostOne(vars_in_slot)

        # ── Hard Constraint 4: Max periods per teacher per week ──
        for tid, t_alloc_list in teacher_allocs.items():
            teacher = self.conn.execute(
                "SELECT * FROM teachers WHERE id = ?", (tid,)
            ).fetchone()
            max_p = teacher["max_periods_per_week"]
            all_vars = [
                v
                for a in t_alloc_list
                for v in assign[a["id"]].values()
            ]
            if all_vars:
                model.Add(sum(all_vars) <= max_p)

        # ── Soft Constraint 1: Same subject not twice on same day ──
        # Build day → slot_ids mapping
        day_slots = {}
        for slot in teaching_slots:
            day_slots.setdefault(slot["day_of_week"], []).append(slot["id"])

        day_penalties = []
        for cid, class_alloc_list in class_allocs.items():
            for alloc in class_alloc_list:
                alloc_id = alloc["id"]
                for day, dslots in day_slots.items():
                    vars_on_day = [
                        assign[alloc_id][sid]
                        for sid in dslots
                        if sid in assign[alloc_id]
                    ]
                    if len(vars_on_day) > 1:
                        # Penalize placing more than 1 of same subject on same day
                        over = model.NewIntVar(0, len(vars_on_day), f"over_{alloc_id}_d{day}")
                        model.Add(over >= sum(vars_on_day) - 1)
                        day_penalties.append(over)

        # ── Soft Constraint 2: Core subjects prefer morning slots ──
        morning_slot_ids = {
            s["id"] for s in teaching_slots if s["period_number"] <= 5
        }
        core_morning_bonus = []
        for alloc in allocations:
            if alloc["subj_priority"] == 1:  # Core subject
                for sid, var in assign[alloc["id"]].items():
                    if sid in morning_slot_ids:
                        core_morning_bonus.append(var)

        # ── Soft Constraint 3: No teacher > 3 consecutive periods ──
        consecutive_penalties = []
        for tid, t_alloc_list in teacher_allocs.items():
            for day in range(1, 6):
                dslots = sorted(
                    [s for s in teaching_slots if s["day_of_week"] == day],
                    key=lambda x: x["period_number"]
                )
                for i in range(len(dslots) - 3):
                    window = [dslots[i], dslots[i+1], dslots[i+2], dslots[i+3]]
                    window_vars = [
                        assign[a["id"]][s["id"]]
                        for a in t_alloc_list
                        for s in window
                        if s["id"] in assign[a["id"]]
                    ]
                    if len(window_vars) >= 4:
                        over = model.NewBoolVar(f"consec_{tid}_d{day}_i{i}")
                        model.Add(sum(window_vars) <= 3 + over)
                        consecutive_penalties.append(over)

        # ── Objective: minimize penalties, maximize morning core ──
        model.Minimize(
            sum(day_penalties) * 10
            + sum(consecutive_penalties) * 5
            - sum(core_morning_bonus) * 2
        )

        # ── Solve ──────────────────────────────────────────────
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = time_limit_seconds
        solver.parameters.num_workers = 4
        solver.parameters.log_search_progress = False

        status = solver.Solve(model)
        solve_time = round(time.time() - start_time, 2)

        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return {
                "success": False,
                "message": "OR-Tools could not find a feasible timetable. Check allocations and teacher availability.",
                "conflicts": conflicts,
                "solve_time": solve_time,
            }

        # ── Extract solution and save to DB ───────────────────
        self.conn.execute("DELETE FROM timetable_entries WHERE class_id IN (SELECT id FROM classes WHERE section_id = ?)", (section["id"],))

        placed = 0
        entries = []
        for alloc in allocations:
            alloc_id = alloc["id"]
            for sid, var in assign[alloc_id].items():
                if solver.Value(var) == 1:
                    entries.append((
                        alloc["class_id"],
                        alloc["subject_id"],
                        alloc["teacher_id"],
                        sid,
                    ))
                    placed += 1

        self.conn.executemany(
            """INSERT OR REPLACE INTO timetable_entries
               (class_id, subject_id, teacher_id, time_slot_id)
               VALUES (?,?,?,?)""",
            entries
        )

        # Count required
        total_required = sum(a["periods_per_week"] for a in allocations)

        # Workload warnings
        for tid, t_alloc_list in teacher_allocs.items():
            teacher = self.conn.execute(
                "SELECT * FROM teachers WHERE id = ?", (tid,)
            ).fetchone()
            assigned = sum(
                1 for a in t_alloc_list
                for sid, var in assign[a["id"]].items()
                if solver.Value(var) == 1
            )
            if assigned > teacher["max_periods_per_week"]:
                conflicts.append({
                    "type": "OVERLOAD",
                    "message": f"{teacher['name']} assigned {assigned} periods (max {teacher['max_periods_per_week']})"
                })

        # Log generation
        self.conn.execute(
            """INSERT INTO generation_logs (status, total_placed, total_required, conflicts, solve_time_sec)
               VALUES (?,?,?,?,?)""",
            (
                "SUCCESS" if placed == total_required else "PARTIAL",
                placed,
                total_required,
                str(conflicts),
                solve_time,
            )
        )
        self.conn.commit()

        success = placed == total_required
        return {
            "success": success,
            "message": (
                f"Timetable generated! {placed}/{total_required} periods placed in {solve_time}s."
                if success else
                f"Partial timetable: {placed}/{total_required} periods placed in {solve_time}s. Check conflicts."
            ),
            "placed": placed,
            "required": total_required,
            "solve_time": solve_time,
            "status": "OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE",
            "conflicts": conflicts,
        }

    def get_class_timetable(self, class_id: int):
        rows = self.conn.execute("""
            SELECT te.*,
                   ts.day_of_week, ts.period_number, ts.start_time, ts.end_time, ts.is_break,
                   s.name  AS subject_name,  s.short_name AS subject_short, s.color AS subject_color,
                   t.name  AS teacher_name,  t.short_name AS teacher_short, t.is_link_teacher
            FROM timetable_entries te
            JOIN time_slots ts ON te.time_slot_id = ts.id
            JOIN subjects   s  ON te.subject_id   = s.id
            JOIN teachers   t  ON te.teacher_id   = t.id
            WHERE te.class_id = ?
            ORDER BY ts.day_of_week, ts.period_number
        """, (class_id,)).fetchall()

        slots = self.conn.execute(
            "SELECT * FROM time_slots ORDER BY day_of_week, period_number"
        ).fetchall()

        class_info = self.conn.execute(
            "SELECT * FROM classes WHERE id = ?", (class_id,)
        ).fetchone()

        return {
            "class_info": dict(class_info) if class_info else None,
            "entries": [dict(r) for r in rows],
            "time_slots": [dict(s) for s in slots],
        }

    def get_teacher_timetable(self, teacher_id: int):
        rows = self.conn.execute("""
            SELECT te.*,
                   ts.day_of_week, ts.period_number, ts.start_time, ts.end_time,
                   s.name  AS subject_name,  s.short_name AS subject_short, s.color AS subject_color,
                   c.grade, c.division
            FROM timetable_entries te
            JOIN time_slots ts ON te.time_slot_id = ts.id
            JOIN subjects   s  ON te.subject_id   = s.id
            JOIN classes    c  ON te.class_id      = c.id
            WHERE te.teacher_id = ?
            ORDER BY ts.day_of_week, ts.period_number
        """, (teacher_id,)).fetchall()

        slots = self.conn.execute(
            "SELECT * FROM time_slots ORDER BY day_of_week, period_number"
        ).fetchall()

        teacher_info = self.conn.execute(
            """SELECT t.*, s.name AS section_name, sub.name AS subject_name
               FROM teachers t
               JOIN sections s ON t.section_id = s.id
               LEFT JOIN subjects sub ON t.subject_id = sub.id
               WHERE t.id = ?""", (teacher_id,)
        ).fetchone()

        return {
            "teacher_info": dict(teacher_info) if teacher_info else None,
            "entries": [dict(r) for r in rows],
            "time_slots": [dict(s) for s in slots],
        }

    def close(self):
        self.conn.close()
