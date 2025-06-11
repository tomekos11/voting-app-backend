import { Router } from 'express';
import { verifyTransaction, createVoting } from '../controllers/voteController';

const router = Router();

router.post('/voting', verifyTransaction);
router.post('/createVote', createVoting);
export default router;
