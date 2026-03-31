import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { redis } from '../config/redis';

const router = Router();
router.use(authenticate);

// GET /dashboard/workspace/:workspaceId/summary
router.get('/workspace/:workspaceId/summary', async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const cacheKey = `dashboard:workspace:${workspaceId}`;

    // Cache for 60 seconds
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(JSON.parse(cached));
    }

    const now = new Date();

    // Get all boards in workspace
    const boards = await prisma.board.findMany({
      where: { workspaceId, isArchived: false },
      select: { id: true, name: true, color: true },
    });

    // Aggregate stats per board
    const boardStats = await Promise.all(
      boards.map(async (board) => {
        const lists = await prisma.list.findMany({
          where: { boardId: board.id, isArchived: false },
          select: { id: true, name: true },
        });

        const listIds = lists.map((l) => l.id);

        const [totalCards, overdueCards, highPriorityCards, assignedToMe] = await Promise.all([
          prisma.card.count({ where: { listId: { in: listIds }, isArchived: false } }),
          prisma.card.count({
            where: { listId: { in: listIds }, isArchived: false, deadline: { lt: now } },
          }),
          prisma.card.count({
            where: {
              listId: { in: listIds },
              isArchived: false,
              priority: { in: ['HIGH', 'URGENT'] },
            },
          }),
          prisma.card.count({
            where: {
              listId: { in: listIds },
              isArchived: false,
              assigneeId: req.user!.sub,
            },
          }),
        ]);

        // Find "done" list (last list by position)
        const doneList = lists[lists.length - 1];
        const completedCards = doneList
          ? await prisma.card.count({
              where: { listId: doneList.id, isArchived: false },
            })
          : 0;

        const completionRate = totalCards > 0
          ? Math.round((completedCards / totalCards) * 100)
          : 0;

        return {
          ...board,
          stats: {
            totalCards,
            completedCards,
            overdueCards,
            highPriorityCards,
            assignedToMe,
            completionRate,
          },
        };
      })
    );

    // Workspace totals
    const totals = boardStats.reduce(
      (acc, b) => ({
        totalCards: acc.totalCards + b.stats.totalCards,
        completedCards: acc.completedCards + b.stats.completedCards,
        overdueCards: acc.overdueCards + b.stats.overdueCards,
        assignedToMe: acc.assignedToMe + b.stats.assignedToMe,
      }),
      { totalCards: 0, completedCards: 0, overdueCards: 0, assignedToMe: 0 }
    );

    // Recent activity
    const recentActivity = await prisma.activity.findMany({
      where: {
        card: {
          list: {
            board: { workspaceId },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        card: { select: { id: true, title: true } },
      },
    });

    // Upcoming deadlines (next 7 days)
    const upcomingDeadlines = await prisma.card.findMany({
      where: {
        list: { board: { workspaceId } },
        isArchived: false,
        deadline: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { deadline: 'asc' },
      take: 10,
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        list: { include: { board: { select: { name: true, color: true } } } },
      },
    });

    const result = {
      workspace: { id: workspaceId },
      totals: {
        ...totals,
        completionRate: totals.totalCards > 0
          ? Math.round((totals.completedCards / totals.totalCards) * 100)
          : 0,
      },
      boards: boardStats,
      recentActivity,
      upcomingDeadlines,
      generatedAt: now.toISOString(),
    };

    await redis.setex(cacheKey, 60, JSON.stringify(result));
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
