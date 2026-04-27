import type { PrismaClient } from "@prisma/client";

/**
 * Throws if `userId` is not allowed to access `chatId`.
 * GLOBAL chats are accessible to everyone authenticated.
 */
export async function assertChatAccess(
  prisma: PrismaClient,
  chatId: string,
  userId: string,
) {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: {
      type: true,
      members: { where: { userId }, select: { id: true } },
    },
  });
  if (!chat) {
    const err: any = new Error("Chat not found");
    err.status = 404;
    throw err;
  }
  if (chat.type !== "GLOBAL" && chat.members.length === 0) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  return chat;
}
