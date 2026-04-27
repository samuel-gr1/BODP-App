# Chat Backend Bundle

This folder contains a complete reference implementation of the chat backend
that powers the mobile app. It is **standalone** — drop it into the existing
`bodp` API and wire it up.

## Stack assumed
- Node.js + Express (or any framework that accepts the route handlers)
- Prisma ORM (PostgreSQL)
- `multer` for multipart uploads
- `nanoid` (or `cuid`) for IDs
- Static file hosting under `/uploads/` (or replace with S3 / object storage)

## Files
| File | Purpose |
|------|---------|
| `schema.prisma`     | Prisma models for `Chat`, `ChatMember`, `ChatMessage`, `ChatAttachment`, `ChatRead` |
| `routes/chats.ts`   | Express router with all chat endpoints (TypeScript) |
| `middleware/upload.ts` | `multer` configuration writing to `uploads/chat/` |
| `lib/permissions.ts` | Tiny helper to verify the current user is a member of a chat |

## How to install

1. **Add the Prisma models** at the bottom of your `prisma/schema.prisma`,
   then run `npx prisma migrate dev --name chat`.
2. **Copy** `routes/chats.ts`, `middleware/upload.ts` and `lib/permissions.ts`
   into your project, fixing the import paths to your `prisma` client and
   `requireAuth` middleware.
3. **Mount the router** in your main app file:
   ```ts
   import chatRouter from "./routes/chats";
   app.use("/api/chats", requireAuth, chatRouter);
   app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
   ```
4. Make sure `req.user` (or your equivalent) is set by your auth middleware
   and exposes at least `{ id: string }`. The route file uses `req.user!.id`.
5. Allow the upload directory to be created by the process:
   ```bash
   mkdir -p uploads/chat
   ```

## Endpoints

All routes require an authenticated user (`Authorization: Bearer <token>`).
The base path is whatever you mount the router under (the mobile app uses
`/bodp/api/chats`).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/?type=INDIVIDUAL\|GROUP` | List the user's chats (with last message + unread count) |
| `GET` | `/global` | Get / lazily-create the global chat |
| `GET` | `/unread-count` | Total unread messages across all chats |
| `POST` | `/` | Create a chat: `{ type, name?, memberIds }` |
| `GET` | `/:id` | Chat details (members, type) |
| `GET` | `/:id/messages?limit=100&before=<msgId>` | Paginated messages (oldest → newest) |
| `POST` | `/:id/messages` | Send text message: `{ content, replyToId? }` |
| `POST` | `/:id/attachments` | Multipart upload — field `file`; optional `replyToId`, `durationMs`, `content` |
| `DELETE` | `/:id/messages/:msgId` | Soft delete (own messages only) |
| `POST` | `/:id/mark-read` | Mark all messages in chat as read up to now |

### Response shapes

#### `GET /` and `GET /global`
```jsonc
{
  "chats": [
    {
      "id": "ckxx…",
      "type": "INDIVIDUAL",
      "name": null,
      "lastMessageAt": "2026-04-27T10:11:00.000Z",
      "unreadCount": 3,
      "members": [
        { "id": "…", "userId": "u1", "user": { "id": "u1", "name": "Abel", "email": "a@x" } }
      ],
      "messages": [
        {
          "id": "m1",
          "content": "Hi",
          "createdAt": "…",
          "sender": { "id": "u1", "name": "Abel" },
          "attachments": []
        }
      ],
      "_count": { "members": 2, "messages": 18 }
    }
  ]
}
```

#### `GET /:id/messages`
```jsonc
{
  "messages": [
    {
      "id": "m1",
      "content": "Hi",
      "createdAt": "…",
      "isDeleted": false,
      "parentId": null,
      "parent": null,
      "sender": { "id": "u1", "name": "Abel" },
      "attachments": [
        {
          "id": "att1",
          "url": "https://api.example/uploads/chat/abc.jpg",
          "fileType": "image/jpeg",
          "fileName": "photo.jpg",
          "fileSize": 184320,
          "durationMs": null
        }
      ]
    }
  ]
}
```

#### Attachment upload (`POST /:id/attachments`)
- Content-Type: `multipart/form-data`
- Field `file`: binary file
- Optional `replyToId`, `durationMs`, `content`
- Returns the created `ChatMessage` with its attachment.

The mobile app handles three media kinds:
- `image/*` → rendered inline as a tappable preview
- `audio/*` → rendered as a voice bubble (duration shown if `durationMs` set)
- everything else → rendered as a downloadable file card

## Notes
- Soft delete is used so message history is preserved.
- The unread badge uses the `ChatRead` table that records each user's last-read
  timestamp per chat. The mobile app calls `POST /:id/mark-read` when a chat is
  opened.
- The "global chat" is a singleton row of type `GLOBAL` automatically created on
  first read. Every authenticated user is implicitly a member; permissions check
  treats GLOBAL specially.
- For production, swap local disk storage in `middleware/upload.ts` for S3,
  Cloudflare R2 or whatever object storage you use, and return a public URL.
