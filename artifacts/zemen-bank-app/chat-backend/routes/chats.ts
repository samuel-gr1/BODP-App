/**
 * Chat router for the Zemen Bank Fit & Proper mobile app.
 *
 * Mount in your Express app like:
 *   import chatRouter from "./routes/chats";
 *   app.use("/api/chats", requireAuth, chatRouter);
 *
 * Adjust the imports below to match your project's `prisma` client
 * and the way your auth middleware injects `req.user`.
 */

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";

import { prisma } from "../lib/prisma";          // <-- your Prisma client
import { chatUpload, publicUrlFor } from "../middleware/upload";
import { assertChatAccess } from "../lib/permissions";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; name?: string; email?: string };
    }
  }
}

const router = Router();

const messageInclude = {
  sender: { select: { id: true, name: true, email: true } },
  attachments: true,
  parent: {
    select: {
      id: true,
      content: true,
      sender: { select: { id: true, name: true } },
    },
  },
};

const chatInclude = {
  members: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  messages: {
    where: { isDeleted: false },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    include: {
      sender: { select: { id: true, name: true } },
      attachments: true,
    },
  },
  _count: { select: { members: true, messages: true } },
};

async function attachUnread<T extends { id: string; lastMessageAt: Date }>(
  chats: T[],
  userId: string,
) {
  if (chats.length === 0) return chats;
  const reads = await prisma.chatRead.findMany({
    where: { userId, chatId: { in: chats.map((c) => c.id) } },
  });
  const readMap = new Map(reads.map((r) => [r.chatId, r.lastReadAt]));

  const counts = await Promise.all(
    chats.map((c) =>
      prisma.chatMessage.count({
        where: {
          chatId: c.id,
          isDeleted: false,
          senderId: { not: userId },
          createdAt: { gt: readMap.get(c.id) ?? new Date(0) },
        },
      }),
    ),
  );

  return chats.map((c, i) => ({ ...c, unreadCount: counts[i] }));
}

// ----- LIST -----------------------------------------------------------------
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const type = (req.query.type as string) || "INDIVIDUAL";

    const chats = await prisma.chat.findMany({
      where: {
        type: type as any,
        members: { some: { userId } },
      },
      orderBy: { lastMessageAt: "desc" },
      include: chatInclude,
    });

    const withUnread = await attachUnread(chats, userId);
    res.json({ chats: withUnread });
  } catch (err) {
    next(err);
  }
});

// ----- GLOBAL CHAT (singleton) ---------------------------------------------
router.get("/global", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    let chat = await prisma.chat.findFirst({
      where: { type: "GLOBAL" },
      include: chatInclude,
    });
    if (!chat) {
      chat = await prisma.chat.create({
        data: { type: "GLOBAL", name: "Global Chat" },
        include: chatInclude,
      });
    }
    const [withUnread] = await attachUnread([chat], userId);
    res.json({ chat: withUnread });
  } catch (err) {
    next(err);
  }
});

// ----- UNREAD TOTAL ---------------------------------------------------------
router.get("/unread-count", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const memberships = await prisma.chatMember.findMany({
      where: { userId },
      select: { chatId: true },
    });
    const reads = await prisma.chatRead.findMany({ where: { userId } });
    const readMap = new Map(reads.map((r) => [r.chatId, r.lastReadAt]));

    const counts = await Promise.all(
      memberships.map((m) =>
        prisma.chatMessage.count({
          where: {
            chatId: m.chatId,
            isDeleted: false,
            senderId: { not: userId },
            createdAt: { gt: readMap.get(m.chatId) ?? new Date(0) },
          },
        }),
      ),
    );
    res.json({ unreadCount: counts.reduce((a, b) => a + b, 0) });
  } catch (err) {
    next(err);
  }
});

// ----- CREATE ---------------------------------------------------------------
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { type, name, memberIds = [] } = req.body as {
      type: "INDIVIDUAL" | "GROUP";
      name?: string;
      memberIds?: string[];
    };

    if (type !== "INDIVIDUAL" && type !== "GROUP") {
      return res.status(400).json({ error: "Invalid chat type" });
    }
    if (memberIds.length === 0) {
      return res.status(400).json({ error: "memberIds required" });
    }
    if (type === "GROUP" && !name?.trim()) {
      return res.status(400).json({ error: "Group name required" });
    }

    // Reuse existing 1:1 chat if it exists
    if (type === "INDIVIDUAL" && memberIds.length === 1) {
      const otherId = memberIds[0];
      const existing = await prisma.chat.findFirst({
        where: {
          type: "INDIVIDUAL",
          AND: [
            { members: { some: { userId } } },
            { members: { some: { userId: otherId } } },
          ],
        },
        include: chatInclude,
      });
      if (existing) return res.json({ chat: existing });
    }

    const allMemberIds = Array.from(new Set([userId, ...memberIds]));

    const chat = await prisma.chat.create({
      data: {
        type,
        name: type === "GROUP" ? name?.trim() : null,
        createdById: userId,
        members: {
          create: allMemberIds.map((uid) => ({
            userId: uid,
            role: uid === userId ? "ADMIN" : "MEMBER",
          })),
        },
      },
      include: chatInclude,
    });
    res.json({ chat });
  } catch (err) {
    next(err);
  }
});

// ----- GET ONE --------------------------------------------------------------
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    await assertChatAccess(prisma, req.params.id, userId);
    const chat = await prisma.chat.findUnique({
      where: { id: req.params.id },
      include: chatInclude,
    });
    res.json({ chat });
  } catch (err) {
    next(err);
  }
});

// ----- LIST MESSAGES --------------------------------------------------------
router.get(
  "/:id/messages",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      await assertChatAccess(prisma, req.params.id, userId);
      const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 200);
      const before = req.query.before as string | undefined;

      const cursorClause = before ? { id: before } : undefined;

      const messages = await prisma.chatMessage.findMany({
        where: { chatId: req.params.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: cursorClause ? 1 : 0,
        cursor: cursorClause,
        include: messageInclude,
      });

      // return oldest -> newest for the UI
      res.json({ messages: messages.reverse() });
    } catch (err) {
      next(err);
    }
  },
);

// ----- SEND TEXT ------------------------------------------------------------
router.post(
  "/:id/messages",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      await assertChatAccess(prisma, req.params.id, userId);

      const { content, replyToId } = req.body as {
        content?: string;
        replyToId?: string;
      };
      if (!content?.trim()) {
        return res.status(400).json({ error: "Empty message" });
      }

      const message = await prisma.chatMessage.create({
        data: {
          chatId: req.params.id,
          senderId: userId,
          content: content.trim(),
          parentId: replyToId || null,
        },
        include: messageInclude,
      });

      await prisma.chat.update({
        where: { id: req.params.id },
        data: { lastMessageAt: message.createdAt },
      });
      res.json({ message });
    } catch (err) {
      next(err);
    }
  },
);

// ----- UPLOAD ATTACHMENT ----------------------------------------------------
router.post(
  "/:id/attachments",
  chatUpload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      await assertChatAccess(prisma, req.params.id, userId);
      if (!req.file) return res.status(400).json({ error: "file required" });

      const { content, replyToId, durationMs } = req.body as {
        content?: string;
        replyToId?: string;
        durationMs?: string;
      };

      const url = publicUrlFor(req.file.filename, req);

      const message = await prisma.chatMessage.create({
        data: {
          chatId: req.params.id,
          senderId: userId,
          content: content?.trim() || null,
          parentId: replyToId || null,
          attachments: {
            create: {
              url,
              fileType: req.file.mimetype || "application/octet-stream",
              fileName: req.file.originalname,
              fileSize: req.file.size,
              durationMs: durationMs ? parseInt(durationMs, 10) : null,
            },
          },
        },
        include: messageInclude,
      });

      await prisma.chat.update({
        where: { id: req.params.id },
        data: { lastMessageAt: message.createdAt },
      });
      res.json({ message });
    } catch (err) {
      next(err);
    }
  },
);

// ----- DELETE MESSAGE -------------------------------------------------------
router.delete(
  "/:id/messages/:msgId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      await assertChatAccess(prisma, req.params.id, userId);
      const msg = await prisma.chatMessage.findUnique({
        where: { id: req.params.msgId },
      });
      if (!msg || msg.chatId !== req.params.id) {
        return res.status(404).json({ error: "Message not found" });
      }
      if (msg.senderId !== userId) {
        return res.status(403).json({ error: "Cannot delete others' messages" });
      }
      await prisma.chatMessage.update({
        where: { id: req.params.msgId },
        data: { isDeleted: true, content: null },
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// ----- MARK READ ------------------------------------------------------------
router.post(
  "/:id/mark-read",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      await assertChatAccess(prisma, req.params.id, userId);
      await prisma.chatRead.upsert({
        where: { chatId_userId: { chatId: req.params.id, userId } },
        update: { lastReadAt: new Date() },
        create: { chatId: req.params.id, userId, lastReadAt: new Date() },
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
