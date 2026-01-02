require('dotenv').config(); // Loads environment variables from .env file
const express = require('express');
const cors = require('cors');
const path = require('path');
const xlsx = require('xlsx');

const app = express();
const port = process.env.PORT || 3000;

let db;

// --- Smart Database Connection ---
if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    // ---- PostgreSQL (for Hosting on Render / Vercel) ----
    console.log("Running in production mode. Connecting to PostgreSQL...");
    const { Pool } = require('pg');
    db = new Pool({
        connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    // Create table if it doesn't exist for PostgreSQL
    db.query(`
        CREATE TABLE IF NOT EXISTS registrations (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            registration_id TEXT UNIQUE NOT NULL,
            status TEXT DEFAULT 'Not Attended',
            timestamp TIMESTAMPTZ
        );
    `).then(() => console.log("PostgreSQL table 'registrations' is ready."))
      .catch(err => console.error("Error creating PostgreSQL table:", err));

} else {
    // ---- SQLite (for Local Development) ----
    console.log("Running in development mode. Connecting to SQLite...");
    const sqlite3 = require('sqlite3').verbose();
    db = new sqlite3.Database('./database.db', (err) => {
        if (err) return console.error(err.message);
        console.log('Connected to the local SQLite database.');
    });

    // Create table if it doesn't exist for SQLite
    db.run(`
        CREATE TABLE IF NOT EXISTS registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            registration_id TEXT UNIQUE NOT NULL,
            status TEXT DEFAULT 'Not Attended',
            timestamp TEXT
        );
    `, (err) => {
        if (err) return console.error("Error creating SQLite table:", err);
        console.log("SQLite table 'registrations' is ready.");
    });
}


// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));


// --- API Endpoints ---
// These endpoints will now work with either database

// 1. Register a new participant
app.post('/register', async (req, res) => {
    const { name, email, registration_id } = req.body;
    if (!name || !email || !registration_id) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    
    try {
        if (process.env.DATABASE_URL || process.env.POSTGRES_URL) { // PostgreSQL
            const sql = `INSERT INTO registrations (name, email, registration_id) VALUES ($1, $2, $3) RETURNING id`;
            const result = await db.query(sql, [name, email, registration_id]);
            res.status(201).json({ message: 'Registration successful!', id: result.rows[0].id });
        } else { // SQLite
            const sql = `INSERT INTO registrations (name, email, registration_id) VALUES (?, ?, ?)`;
            db.run(sql, [name, email, registration_id], function(err) {
                if (err) throw err;
                res.status(201).json({ message: 'Registration successful!', id: this.lastID });
            });
        }
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
        if (process.env.DATABASE_URL || process.env.POSTGRES_URL) { // PostgreSQL
            const findSql = `SELECT * FROM registrations WHERE registration_id = $1`;
            const findResult = await db.query(findSql, [registration_id]);
            if (findResult.rows.length === 0) return res.status(404).json({ error: 'Participant not found.' });

            const participant = findResult.rows[0];
            if (participant.status === 'Attended') return res.status(409).json({ error: 'Attendance already marked.', participant });

            const timestamp = new Date();
            const updateSql = `UPDATE registrations SET status = 'Attended', timestamp = $1 WHERE registration_id = $2`;
            await db.query(updateSql, [timestamp, registration_id]);
            
            participant.status = 'Attended';
            participant.timestamp = timestamp;
            res.status(200).json({ message: 'Attendance marked successfully!', participant });

        } else { // SQLite
            const findSql = `SELECT * FROM registrations WHERE registration_id = ?`;
            db.get(findSql, [registration_id], (err, row) => {
                if (err) throw err;
                if (!row) return res.status(404).json({ error: 'Participant not found.' });
                if (row.status === 'Attended') return res.status(409).json({ error: 'Attendance already marked.', participant: row });

                const timestamp = new Date().toLocaleString();
                const updateSql = `UPDATE registrations SET status = 'Attended', timestamp = ? WHERE registration_id = ?`;
                db.run(updateSql, [timestamp, registration_id], function(err) {
                    if (err) throw err;
                    res.status(200).json({ message: 'Attendance marked successfully!', participant: { ...row, status: 'Attended', timestamp } });
                });
            });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});


// 3. Get all attendees
app.get('/attendees', async (req, res) => {
    try {
        if (process.env.DATABASE_URL || process.env.POSTGRES_URL) { // PostgreSQL
            const sql = `SELECT name, email, registration_id, status, TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') as timestamp FROM registrations ORDER BY id DESC`;
            const result = await db.query(sql);
            res.json(result.rows);
        } else { // SQLite
            const sql = `SELECT name, email, registration_id, status, timestamp FROM registrations ORDER BY id DESC`;
            db.all(sql, [], (err, rows) => {
                if (err) throw err;
                res.json(rows);
            });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});


// 4. Export data to Excel
app.get('/export', async (req, res) => {
    try {
        let rows;
        if (process.env.DATABASE_URL || process.env.POSTGRES_URL) { // PostgreSQL
             const sql = `SELECT name AS "Name", email AS "Email", registration_id AS "Registration ID", status AS "Status", TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') AS "Check-in Time" FROM registrations`;
             const result = await db.query(sql);
             rows = result.rows;
        } else { // SQLite
            const sql = `SELECT name AS "Name", email AS "Email", registration_id AS "Registration ID", status AS "Status", timestamp AS "Check-in Time" FROM registrations`;
            rows = await new Promise((resolve, reject) => {
                db.all(sql, [], (err, resultRows) => {
                    if (err) reject(err);
                    resolve(resultRows);
                });
            });
        }
        
        const worksheet = xlsx.utils.json_to_sheet(rows);
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


// This catch-all route must be LAST
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});


if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
}

module.exports = app;