import { Router } from 'express';
import { CardController } from '../controllers/CardController';
import { authenticate, requireRole } from '../middleware/auth';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();
router.use(authenticate);

router.get('/list/:listId', CardController.getCards);
router.get('/:cardId', CardController.getCard);

router.post('/list/:listId',
  requireRole('ADMIN', 'MEMBER'),
  [body('title').trim().isLength({ min: 1, max: 255 })],
  validateRequest,
  CardController.createCard
);

router.patch('/:cardId',
  requireRole('ADMIN', 'MEMBER'),
  CardController.updateCard
);

router.patch('/:cardId/move',
  requireRole('ADMIN', 'MEMBER'),
  [body('targetListId').isUUID()],
  validateRequest,
  CardController.moveCard
);

router.delete('/:cardId',
  requireRole('ADMIN', 'MEMBER'),
  CardController.deleteCard
);

export default router;
