import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';
import { publishEvent } from '../websocket/publisher';

const router = Router();
router.use(authenticate);

// GET /lists/board/:boardId
router.get('/board/:boardId', async (req, res, next) => {
  try {
    const lists = await prisma.list.findMany({
      where: { boardId: req.params.boardId, isArchived: false },
      orderBy: { position: 'asc' },
      include: { _count: { select: { cards: true } } },
    });
    res.json(lists);
  } catch (err) { next(err); }
});

// POST /lists
router.post('/', requireRole('ADMIN', 'MEMBER'), async (req, res, next) => {
  try {
    const { boardId, name } = req.body;
    const last = await prisma.list.findFirst({
      where: { boardId, isArchived: false },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const list = await prisma.list.create({
      data: { boardId, name, position: (last?.position ?? 0) + 1000 },
    });
    await publishEvent('board', boardId, { type: 'LIST_CREATED', list, userId: req.user!.sub });
    res.status(201).json(list);
  } catch (err) { next(err); }
});

// PATCH /lists/:listId
router.patch('/:listId', requireRole('ADMIN', 'MEMBER'), async (req, res, next) => {
  try {
    const { name, position } = req.body;
    const list = await prisma.list.update({
      where: { id: req.params.listId },
      data: { ...(name && { name }), ...(position !== undefined && { position }) },
    });
    res.json(list);
  } catch (err) { next(err); }
});

// DELETE /lists/:listId
router.delete('/:listId', requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.list.update({
      where: { id: req.params.listId },
      data: { isArchived: true },
    });
    res.json({ message: 'List archived' });
  } catch (err) { next(err); }
});

export default router;
