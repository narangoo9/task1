import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const workspaces = await prisma.workspace.findMany({
      where: {
        tenantId: req.user!.tid,
        members: { some: { userId: req.user!.sub } },
      },
      include: {
        _count: { select: { boards: true, members: true } },
      },
    });
    res.json(workspaces);
  } catch (err) { next(err); }
});

router.get('/:workspaceId', async (req, res, next) => {
  try {
    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: req.params.workspaceId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        },
        boards: { where: { isArchived: false }, orderBy: { position: 'asc' } },
      },
    });
    res.json(workspace);
  } catch (err) { next(err); }
});

router.post('/', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const workspace = await prisma.workspace.create({
      data: {
        tenantId: req.user!.tid,
        name,
        description,
        members: { create: { userId: req.user!.sub, role: 'ADMIN' } },
      },
    });
    res.status(201).json(workspace);
  } catch (err) { next(err); }
});

router.post('/:workspaceId/members', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { userId, role = 'MEMBER' } = req.body;
    await prisma.workspaceMember.upsert({
      where: { userId_workspaceId: { userId, workspaceId: req.params.workspaceId } },
      update: { role },
      create: { userId, workspaceId: req.params.workspaceId, role },
    });
    res.json({ message: 'Member added' });
  } catch (err) { next(err); }
});

router.delete('/:workspaceId/members/:userId', requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.workspaceMember.delete({
      where: {
        userId_workspaceId: {
          userId: req.params.userId,
          workspaceId: req.params.workspaceId,
        },
      },
    });
    res.json({ message: 'Member removed' });
  } catch (err) { next(err); }
});

export default router;
