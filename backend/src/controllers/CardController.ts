import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { publishEvent } from '../websocket/publisher';
import { fractionalIndex } from '../utils/fractionalIndex';
import { logger } from '../config/logger';

export class CardController {
  static async getCards(req: Request, res: Response, next: NextFunction) {
    try {
      const { listId } = req.params;
      const { assigneeId, labelId, priority, overdueOnly } = req.query;

      const where: any = {
        listId,
        isArchived: false,
        ...(assigneeId && { assigneeId: String(assigneeId) }),
        ...(priority && { priority: String(priority) }),
        ...(labelId && {
          labels: { some: { labelId: String(labelId) } },
        }),
        ...(overdueOnly === 'true' && {
          deadline: { lt: new Date() },
        }),
      };

      const cards = await prisma.card.findMany({
        where,
        orderBy: { position: 'asc' },
        include: {
          assignee: { select: { id: true, name: true, avatar: true } },
          labels: { include: { label: true } },
          _count: { select: { comments: true } },
        },
      });

      res.json(cards);
    } catch (err) {
      next(err);
    }
  }

  static async createCard(req: Request, res: Response, next: NextFunction) {
    try {
      const { listId } = req.params;
      const { title, description, assigneeId, deadline, priority } = req.body;
      const userId = req.user!.sub;

      // Get max position in list for new card at bottom
      const lastCard = await prisma.card.findFirst({
        where: { listId, isArchived: false },
        orderBy: { position: 'desc' },
        select: { position: true },
      });

      const position = lastCard ? lastCard.position + 1000 : 1000;

      const card = await prisma.card.create({
        data: {
          listId,
          title,
          description,
          position,
          assigneeId,
          deadline: deadline ? new Date(deadline) : undefined,
          priority: priority ?? 'MEDIUM',
        },
        include: {
          assignee: { select: { id: true, name: true, avatar: true } },
          labels: { include: { label: true } },
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          cardId: card.id,
          userId,
          action: 'card.created',
          metadata: { title: card.title },
        },
      });

      // Publish real-time event
      await publishEvent('board', req.params.boardId ?? card.listId, {
        type: 'CARD_CREATED',
        card,
        userId,
      });

      res.status(201).json(card);
    } catch (err) {
      next(err);
    }
  }

  static async updateCard(req: Request, res: Response, next: NextFunction) {
    try {
      const { cardId } = req.params;
      const userId = req.user!.sub;
      const { title, description, assigneeId, deadline, priority, labels } = req.body;

      const card = await prisma.card.update({
        where: { id: cardId },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(assigneeId !== undefined && { assigneeId }),
          ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
          ...(priority !== undefined && { priority }),
          ...(labels && {
            labels: {
              deleteMany: {},
              create: labels.map((labelId: string) => ({ labelId })),
            },
          }),
        },
        include: {
          assignee: { select: { id: true, name: true, avatar: true } },
          labels: { include: { label: true } },
        },
      });

      await publishEvent('board', cardId, {
        type: 'CARD_UPDATED',
        card,
        userId,
      });

      res.json(card);
    } catch (err) {
      next(err);
    }
  }

  static async moveCard(req: Request, res: Response, next: NextFunction) {
    try {
      const { cardId } = req.params;
      const { targetListId, afterCardId, beforeCardId } = req.body;
      const userId = req.user!.sub;

      // Calculate fractional index position
      let newPosition: number;

      if (!afterCardId && !beforeCardId) {
        // Place at top
        const firstCard = await prisma.card.findFirst({
          where: { listId: targetListId, isArchived: false },
          orderBy: { position: 'asc' },
          select: { position: true },
        });
        newPosition = firstCard ? firstCard.position / 2 : 1000;
      } else if (!beforeCardId) {
        // Place after afterCardId (at bottom)
        const afterCard = await prisma.card.findUniqueOrThrow({
          where: { id: afterCardId },
          select: { position: true },
        });
        const nextCard = await prisma.card.findFirst({
          where: {
            listId: targetListId,
            position: { gt: afterCard.position },
            isArchived: false,
          },
          orderBy: { position: 'asc' },
          select: { position: true },
        });
        newPosition = nextCard
          ? fractionalIndex(afterCard.position, nextCard.position)
          : afterCard.position + 1000;
      } else {
        // Between two cards
        const [afterCard, beforeCard] = await Promise.all([
          prisma.card.findUniqueOrThrow({ where: { id: afterCardId }, select: { position: true } }),
          prisma.card.findUniqueOrThrow({ where: { id: beforeCardId }, select: { position: true } }),
        ]);
        newPosition = fractionalIndex(afterCard.position, beforeCard.position);
      }

      const originalCard = await prisma.card.findUniqueOrThrow({
        where: { id: cardId },
        select: { listId: true },
      });

      const card = await prisma.card.update({
        where: { id: cardId },
        data: {
          listId: targetListId,
          position: newPosition,
        },
        include: {
          assignee: { select: { id: true, name: true, avatar: true } },
          labels: { include: { label: true } },
        },
      });

      await prisma.activity.create({
        data: {
          cardId,
          userId,
          action: 'card.moved',
          metadata: {
            fromListId: originalCard.listId,
            toListId: targetListId,
          },
        },
      });

      await publishEvent('board', targetListId, {
        type: 'CARD_MOVED',
        card,
        fromListId: originalCard.listId,
        toListId: targetListId,
        userId,
      });

      res.json(card);
    } catch (err) {
      next(err);
    }
  }

  static async deleteCard(req: Request, res: Response, next: NextFunction) {
    try {
      const { cardId } = req.params;

      await prisma.card.update({
        where: { id: cardId },
        data: { isArchived: true },
      });

      await publishEvent('board', cardId, {
        type: 'CARD_DELETED',
        cardId,
        userId: req.user!.sub,
      });

      res.json({ message: 'Card archived' });
    } catch (err) {
      next(err);
    }
  }

  static async getCard(req: Request, res: Response, next: NextFunction) {
    try {
      const { cardId } = req.params;

      const card = await prisma.card.findUniqueOrThrow({
        where: { id: cardId },
        include: {
          assignee: { select: { id: true, name: true, avatar: true } },
          labels: { include: { label: true } },
          comments: {
            orderBy: { createdAt: 'desc' },
            include: {
              user: { select: { id: true, name: true, avatar: true } },
            },
          },
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      });

      res.json(card);
    } catch (err) {
      next(err);
    }
  }
}
