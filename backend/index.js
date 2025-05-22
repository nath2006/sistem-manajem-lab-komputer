import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import userRoutes from './router/userRoutes.js';
import authRoutes from './router/authRoutes.js';
import indexRoutes from './router/indexRoutes.js';
import labRoutes from './router/labRoutes.js'; 
import deviceRoutes from './router/deviceRoutes.js';
import pemeriksaanRouter from './router/pemerikasaanRouter.js';
import pengumumanRouter from './router/pengumumanRoutes.js';
import pengecekanRouter from './router/pengecekanRoutes.js';

dotenv.config();

const app = express();

// Untuk __dirname di ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));



// ✅ Serve folder uploads (agar gambar bisa diakses dari browser)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/lab", labRoutes); 
app.use("/api/perangkat", deviceRoutes);
app.use("/api/pemeriksaan", pemeriksaanRouter);
app.use("/api/pengumuman", pengumumanRouter);
app.use("/api/pengecekan", pengecekanRouter);
app.use(indexRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, 'localhost', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
