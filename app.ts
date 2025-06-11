import express from 'express';
import cookieParser from 'cookie-parser';
import voteRoutes from './routes/votingRoutes';
import cors from 'cors';
import dotenv from 'dotenv';


const app = express();
dotenv.config();
app.use(
  cors({
    origin: ['http://localhost:3000'],
    credentials: true,
  }),
)
app.use(express.json());
app.use(cookieParser());

app.use('/api', voteRoutes)

export default app;
