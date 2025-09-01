import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { Request } from 'express';

// Ensure uploads directory exists
async function ensureUploadDir(uploadPath: string) {
  try {
    await fs.mkdir(uploadPath, { recursive: true });
  } catch (error) {
    console.error('Failed to create upload directory:', error);
  }
}

// Custom filename generator
const generateFilename = (req: Request, file: Express.Multer.File, cb: any) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const ext = path.extname(file.originalname);
  const filename = `${timestamp}-${randomString}${ext}`;
  cb(null, filename);
};

// File filter - only allow PDF files
const fileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = process.env['UPLOAD_DIR'] || './uploads';
    await ensureUploadDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: generateFilename
});

// File size limit (50MB default)
const maxFileSize = parseInt(process.env['MAX_FILE_SIZE'] || '50') * 1024 * 1024;

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSize,
    files: 1 // Only allow single file upload
  }
});

// Error handler for multer
export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({ 
          error: `File too large. Maximum size is ${maxFileSize / (1024 * 1024)}MB` 
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({ error: 'Too many files. Only one file allowed' });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({ error: 'Unexpected field name' });
      default:
        return res.status(400).json({ error: `Upload error: ${error.message}` });
    }
  }
  
  if (error.message === 'Only PDF files are allowed') {
    return res.status(400).json({ error: 'Only PDF files are allowed' });
  }
  
  next(error);
};