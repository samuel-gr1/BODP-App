import crypto from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "chat");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const id = crypto.randomBytes(12).toString("hex");
    cb(null, `${Date.now()}-${id}${ext}`);
  },
});

export const chatUpload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
});

/** Build the public URL the mobile app should use to fetch the file. */
export function publicUrlFor(filename: string, req: { protocol: string; get: (h: string) => string | undefined }) {
  const host = req.get("host");
  return `${req.protocol}://${host}/uploads/chat/${filename}`;
}
