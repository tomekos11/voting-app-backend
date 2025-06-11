import { Router } from 'express';
import { verifyTransaction } from '../controllers/voteController';

const router = Router();

router.post('/voting', verifyTransaction);

export default router;
