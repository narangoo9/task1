import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../utils/AppError';

const router = Router();
router.use(authenticate);

// GET /boards/workspace/:workspaceId
router.get('/workspace/:workspaceId', async (req, res, next) => {
  try {
    const boards = await prisma.board.findMany({
      where: { workspaceId: req.params.workspaceId, isArchived: false },
      orderBy: { position: 'asc' },
      include: { _count: { select: { lists: true } } },
    });
    res.json(boards);
  } catch (err) { next(err); }
});

// GET /boards/:boardId (full board with lists and cards)
router.get('/:boardId', async (req, res, next) => {
  try {
    const board = await prisma.board.findUniqueOrThrow({
      where: { id: req.params.boardId },
      include: {
        lists: {
          where: { isArchived: false },
          orderBy: { position: 'asc' },
          include: {
            cards: {
              where: { isArchived: false },
              orderBy: { position: 'asc' },
              include: {
                assignee: { select: { id: true, name: true, avatar: true } },
                labels: { include: { label: true } },
                _count: { select: { comments: true } },
              },
            },
          },
        },
      },
    });
    res.json(board);
  } catch (err) { next(err); }
});

// POST /boards
router.post('/', requireRole('ADMIN', 'MEMBER'), async (req, res, next) => {
  try {
    const { workspaceId, name, description, color } = req.body;
    const lastBoard = await prisma.board.findFirst({
      where: { workspaceId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const board = await prisma.board.create({
      data: {
        workspaceId,
        name,
        description,
        color: color ?? '#6366f1',
        position: (lastBoard?.position ?? 0) + 1000,
        lists: {
          create: [
            { name: 'To Do', position: 1000 },
            { name: 'In Progress', position: 2000 },
            { name: 'Done', position: 3000 },
          ],
        },
      },
    });
    res.status(201).json(board);
  } catch (err) { next(err); }
});

// PATCH /boards/:boardId
router.patch('/:boardId', requireRole('ADMIN', 'MEMBER'), async (req, res, next) => {
  try {
    const { name, description, color } = req.body;
    const board = await prisma.board.update({
      where: { id: req.params.boardId },
      data: { name, description, color },
    });
    res.json(board);
  } catch (err) { next(err); }
});

// DELETE /boards/:boardId
router.delete('/:boardId', requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.board.update({
      where: { id: req.params.boardId },
      data: { isArchived: true },
    });
    res.json({ message: 'Board archived' });
  } catch (err) { next(err); }
});

// GET /boards/:boardId/labels
router.get('/:boardId/labels', async (req, res, next) => {
  try {
    const labels = await prisma.label.findMany({
      where: { boardId: req.params.boardId },
    });
    res.json(labels);
  } catch (err) { next(err); }
});

// POST /boards/:boardId/labels
router.post('/:boardId/labels', requireRole('ADMIN', 'MEMBER'), async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const label = await prisma.label.create({
      data: { boardId: req.params.boardId, name, color },
    });
    res.status(201).json(label);
  } catch (err) { next(err); }
});

export default router;
