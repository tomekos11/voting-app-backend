import express from 'express';
import cookieParser from 'cookie-parser';
import voteRoutes from './routes/votingRoutes';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';


const app = express();
dotenv.config();
app.use(
  cors({
    origin: ['http://localhost:3000'],
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: '100mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', voteRoutes);

export default app;
