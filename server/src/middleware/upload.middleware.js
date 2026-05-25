import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, '../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]+/gi, '-').slice(0, 80) || 'receipt';
    cb(null, `${Date.now()}-${base}${ext}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Only PNG, JPEG, and PDF receipts are allowed'));
    const suspiciousName = /(\.exe|\.bat|\.cmd|\.ps1|\.sh|\.js|\.vbs)$/i.test(file.originalname);
    if (suspiciousName) return cb(new Error('Executable uploads are not allowed'));
    cb(null, true);
  }
});
