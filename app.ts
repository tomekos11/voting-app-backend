import express from 'express';
import cookieParser from 'cookie-parser';
import userRoutes from './routes/userRoutes';
import voteRoutes from './routes/votingRoutes';
import cors from 'cors';

const app = express();

app.use(
  cors({
    origin: ['http://localhost:3000'],
    credentials: true,
  }),
)
app.use(express.json());
app.use(cookieParser());
//app.use('/api', userRoutes);

app.use('/api', voteRoutes)

export default app;
