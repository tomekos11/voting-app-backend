import { Router } from 'express';
import { verifyTransaction, createVoting, getVotingByCID } from '../controllers/voteController';

const router = Router();

router.post('/voting', verifyTransaction);

router.post('/createVote', createVoting);
router.get('/voting', getVotingByCID);
export default router;
