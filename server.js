require("dotenv").config(); // Load .env variables
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());
app.use(cors());

// ✅ Connect to NeonDB using connection string from .env
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ✅ Route 1: Fetch all user details (Return only date, no time)
app.get("/users", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                user_id, 
                account_type, 
                TO_CHAR(opening_date, 'YYYY-MM-DD') AS opening_date, 
                TO_CHAR(closing_date, 'YYYY-MM-DD') AS closing_date, 
                lop 
            FROM user_details`
        );
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Route 2: Add a new user to NeonDB (Ensure date format)
app.post("/users", async (req, res) => {
    let { user_id, account_type, opening_date, closing_date, lop } = req.body;
    
    try {
        const result = await pool.query(
            `INSERT INTO user_details (user_id, account_type, opening_date, closing_date, lop) 
            VALUES ($1, $2, $3::DATE, $4::DATE, $5) 
            RETURNING user_id, account_type, 
                      TO_CHAR(opening_date, 'YYYY-MM-DD') AS opening_date, 
                      TO_CHAR(closing_date, 'YYYY-MM-DD') AS closing_date, 
                      lop`,
            [user_id, account_type, opening_date, closing_date, lop]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Route 3: Fetch active users (closing_date is NULL)
app.get("/active-users", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT user_id, account_type, 
                    TO_CHAR(opening_date, 'YYYY-MM-DD') AS opening_date, 
                    TO_CHAR(closing_date, 'YYYY-MM-DD') AS closing_date, 
                    lop 
            FROM user_details 
            WHERE closing_date IS NULL`
        );
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Route 4: Fetch data from Supabase API
app.get("/supabase-data", async (req, res) => {
    try {
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_details`, {
            headers: {
                "apikey": process.env.SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${process.env.SUPABASE_ANON_KEY}`
            }
        });
        const data = await response.json();
        res.json({ data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
