import { Router } from 'express';
import voteController from '../controllers/voteController';

const router = Router();

router.post('/voting', voteController.verifyTransaction);

export default router;
