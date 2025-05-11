import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import db from './config/db.js'; // Import koneksi DB

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Menggunakan koneksi DB di sini
app.get('/test-db', (req, res) => {
  db.query('SELECT NOW()', (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error connecting to DB' });
    }
    res.json({ message: 'Database connected', time: results });
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, 'localhost', () => {
  console.log(`Server is running on port localhost:${PORT}`);
});
