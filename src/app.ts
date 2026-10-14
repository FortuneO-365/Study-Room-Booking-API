import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import authRoutes from './routes/authRoutes.js'

export const app = express();

app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN
}))
app.use(express.json());

app.get("/health", (req, res) => {
    res.status(200).json({ status : "OK"});
})

app.use('/api/auth', authRoutes);
