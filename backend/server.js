const express = require('express');
const { Pool } = require('pg'); // Changed from sqlite3
const cors = require('cors');
const path = require('path');
const xlsx = require('xlsx');

const app = express();
const port = process.env.PORT || 3000; // Hosting will set the PORT

// --- Database Connection ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // This will be provided by Render
    ssl: {
        rejectUnauthorized: false
    }
});

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// --- Check Database Connection and Create Table ---
pool.query(`
    CREATE TABLE IF NOT EXISTS registrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        registration_id TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'Not Attended',
        timestamp TIMESTAMPTZ
    );
`).then(() => {
    console.log("Table 'registrations' is ready.");
}).catch(err => {
    console.error("Error creating table:", err);
});

// --- API Endpoints (Updated for PostgreSQL) ---

// 1. Register a new participant
app.post('/register', async (req, res) => {
    const { name, email, registration_id } = req.body;
    if (!name || !email || !registration_id) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    const sql = `INSERT INTO registrations (name, email, registration_id) VALUES ($1, $2, $3) RETURNING id`;
    try {
        const result = await pool.query(sql, [name, email, registration_id]);
        res.status(201).json({ message: 'Registration successful!', id: result.rows[0].id });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Registration ID or Email might already exist.' });
    }
});

// 2. Mark attendance
app.post('/mark-attendance', async (req, res) => {
    const { registration_id } = req.body;
    if (!registration_id) {
        return res.status(400).json({ error: 'Registration ID is required.' });
    }
    try {
        const findSql = `SELECT * FROM registrations WHERE registration_id = $1`;
        const findResult = await pool.query(findSql, [registration_id]);
        
        if (findResult.rows.length === 0) {
            return res.status(404).json({ error: 'Participant not found.' });
        }

        const participant = findResult.rows[0];
        if (participant.status === 'Attended') {
            return res.status(409).json({ error: 'Attendance already marked.', participant });
        }

        const timestamp = new Date();
        const updateSql = `UPDATE registrations SET status = 'Attended', timestamp = $1 WHERE registration_id = $2`;
        await pool.query(updateSql, [timestamp, registration_id]);
        
        participant.status = 'Attended';
        participant.timestamp = timestamp;
        res.status(200).json({ message: 'Attendance marked successfully!', participant });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// 3. Get all attendees (for Admin Dashboard)
app.get('/attendees', async (req, res) => {
    const sql = `SELECT name, email, registration_id, status, TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') as timestamp FROM registrations ORDER BY id DESC`;
    try {
        const result = await pool.query(sql);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// 4. Export data to Excel
app.get('/export', async (req, res) => {
    const sql = `SELECT name AS "Name", email AS "Email", registration_id AS "Registration ID", status AS "Status", TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') AS "Check-in Time" FROM registrations`;
    try {
        const result = await pool.query(sql);
        const worksheet = xlsx.utils.json_to_sheet(result.rows);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Attendance");

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.xlsx');
        const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
        res.send(buffer);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch data for export.' });
    }
});

// --- Serve Frontend ---
// This part must be AFTER your API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});