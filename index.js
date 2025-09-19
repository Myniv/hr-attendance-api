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
    const result = await pool.query("SELECT * FROM attendances ORDER BY date DESC");
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
      "SELECT * FROM attendances WHERE employee_id = $1 ORDER BY date DESC",
      [employeeId]
    );

    if (result.rows.length === 0) {
      // return res.status(404).json({ error: "No attendance found" });
        return res.json([]);
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
      "SELECT * FROM attendances WHERE id = $1 ORDER BY date DESC",
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
    const { date, in_time, employee_id, in_photo, in_latlong } = req.body;

    const result = await pool.query(
      "INSERT INTO attendances (date, in_time, employee_id, in_photo, in_latlong) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [date, in_time, employee_id, in_photo, in_latlong]
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
    const { date, out_time, out_photo, out_latlong, status } = req.body;

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
      "UPDATE attendances SET out_time=$1, total_hours=$2, out_photo=$4, out_latlong=$5, status=$6 WHERE id=$3 RETURNING *",
      [out_time, totalHours, attendance.id, out_photo, out_latlong, status]
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
