import { Request, Response } from 'express';

class UserController {
  getProfile(req: Request, res: Response) {
    res.json({
      success: true,
      user: {
        id: 1,
        name: 'Jan Kowalski2',
        email: 'jan@example.com'
      }
    });
  }
}

export default new UserController();
