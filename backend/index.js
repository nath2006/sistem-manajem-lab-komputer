import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import userRoutes from './router/userRoutes.js';
import authRoutes from './router/authRoutes.js';
import indexRoutes from './router/indexRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);
app.use(indexRoutes)


const PORT = process.env.PORT || 5000;

app.listen(PORT, 'localhost', () => {
  console.log(`Server is running on port localhost:${PORT}`);
});
