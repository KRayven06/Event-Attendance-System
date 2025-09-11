const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const xlsx = require('xlsx');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files from the 'frontend' directory, which is one level up and in the same root
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Database setup
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});

// Create table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    registration_id TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'Not Attended',
    timestamp TEXT
)`);

// --- API Endpoints ---

// 1. Register a new participant
app.post('/register', (req, res) => {
    const { name, email, registration_id } = req.body;
    if (!name || !email || !registration_id) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    const sql = `INSERT INTO registrations (name, email, registration_id) VALUES (?, ?, ?)`;
    db.run(sql, [name, email, registration_id], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Registration ID or Email might already exist.' });
        }
        res.status(201).json({ message: 'Registration successful!', id: this.lastID });
    });
});

// 2. Mark attendance
app.post('/mark-attendance', (req, res) => {
    const { registration_id } = req.body;
    if (!registration_id) {
        return res.status(400).json({ error: 'Registration ID is required.' });
    }

    const findSql = `SELECT * FROM registrations WHERE registration_id = ?`;
    db.get(findSql, [registration_id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Participant not found.' });
        }
        if (row.status === 'Attended') {
            return res.status(409).json({ error: 'Attendance already marked.', participant: row });
        }

        const timestamp = new Date().toLocaleString();
        const updateSql = `UPDATE registrations SET status = 'Attended', timestamp = ? WHERE registration_id = ?`;
        db.run(updateSql, [timestamp, registration_id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(200).json({ message: 'Attendance marked successfully!', participant: { ...row, status: 'Attended', timestamp } });
        });
    });
});

// 3. Get all attendees (for Admin Dashboard)
app.get('/attendees', (req, res) => {
    const sql = `SELECT name, email, registration_id, status, timestamp FROM registrations ORDER BY id DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 4. Export data to Excel
app.get('/export', (req, res) => {
    const sql = `SELECT name AS Name, email AS Email, registration_id AS "Registration ID", status AS Status, timestamp AS "Check-in Time" FROM registrations`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch data for export.' });
        }

        const worksheet = xlsx.utils.json_to_sheet(rows);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Attendance");

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.xlsx');
        
        const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
        res.send(buffer);
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});