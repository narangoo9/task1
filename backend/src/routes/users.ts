// users.ts
import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const usersRouter = Router();
usersRouter.use(authenticate);

usersRouter.get('/workspace/:workspaceId', async (req, res, next) => {
  try {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: req.params.workspaceId },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    });
    res.json(members.map((m) => ({ ...m.user, role: m.role })));
  } catch (err) { next(err); }
});

usersRouter.patch('/me', authenticate, async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.sub },
      data: { ...(name && { name }), ...(avatar !== undefined && { avatar }) },
      select: { id: true, email: true, name: true, avatar: true },
    });
    res.json(user);
  } catch (err) { next(err); }
});

export default usersRouter;
