import { Router } from 'express';
import UserController from '../controllers/userController';

const router = Router();

router.get('/user', UserController.getProfile);

export default router;
