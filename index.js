const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const pool = require("./db"); 

const app = express();
const port = 7190;

app.use(cors());
app.use(bodyParser.json());

app.get("/api/attendance", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM attendances");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching attendances:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/attendance/by-employee/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const result = await pool.query(
      "SELECT * FROM attendances WHERE employee_id = $1",
      [employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No attendance found" });
    }

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching attendance by employeeId:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/attendance/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM attendances WHERE id = $1",
      [id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Attendance not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching attendance by id:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/attendance/clock-in", async (req, res) => {
  try {
    const { date, in_time, employee_id } = req.body;

    const result = await pool.query(
      "INSERT INTO attendances (date, in_time, employee_id) VALUES ($1, $2, $3) RETURNING *",
      [date, in_time, employee_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error clocking in:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/attendance/clock-out/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { date, out_time } = req.body;

    const existing = await pool.query(
      "SELECT * FROM attendances WHERE employee_id=$1 AND date=$2",
      [employeeId, date]
    );

    if (existing.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "No clock-in record found for this employee on the given date." });
    }

    const attendance = existing.rows[0];

    let totalHours = attendance.total_hours;
    if (attendance.in_time && out_time) {
      const inTime = new Date(`1970-01-01T${attendance.in_time}`);
      const outTime = new Date(`1970-01-01T${out_time}`);
      totalHours = (outTime - inTime) / (1000 * 60 * 60);
    }

    const result = await pool.query(
      "UPDATE attendances SET out_time=$1, total_hours=$2 WHERE id=$3 RETURNING *",
      [out_time, totalHours, attendance.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error clocking out:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () =>
  console.log(`Attendance API running at http://localhost:${port}`)
);
