import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/current', async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: req.user!.tid },
      include: {
        _count: { select: { users: true, workspaces: true } },
      },
    });
    res.json(tenant);
  } catch (err) { next(err); }
});

router.patch('/current', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { name } = req.body;
    const tenant = await prisma.tenant.update({
      where: { id: req.user!.tid },
      data: { name },
    });
    res.json(tenant);
  } catch (err) { next(err); }
});

router.get('/current/members', async (req, res, next) => {
  try {
    const members = await prisma.tenantUser.findMany({
      where: { tenantId: req.user!.tid },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    });
    res.json(members.map((m) => ({ ...m.user, role: m.role, joinedAt: m.joinedAt })));
  } catch (err) { next(err); }
});

export default router;
