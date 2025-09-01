import express from 'express';
import { upload, handleUploadError } from '../middleware/upload.js';
import { requireAuth } from '../middleware/auth.js';
import { FileService } from '../services/fileService.js';
import { PermissionService } from '../services/permissionService.js';
import { ApiResponse } from '../types/index.js';

const router = express.Router();
const fileService = new FileService();
const permissionService = new PermissionService();

// Get current user ID from authenticated request
const getCurrentUserId = (req: express.Request): number => {
  return req.user!.id; // User is guaranteed to exist after requireAuth middleware
};

// Upload PDF file
router.post('/upload', requireAuth, upload.single('file'), handleUploadError, async (req, res) => {
  try {
    const user = req.user!;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' } as ApiResponse);
    }

    // Check permission to upload files
    const canUpload = await permissionService.hasPermission(user, 'files', 'create');
    if (!canUpload) {
      return res.status(403).json({ error: 'Insufficient permissions to upload files' } as ApiResponse);
    }

    const userId = getCurrentUserId(req);
    const file = req.file;

    // Create file record in database
    const fileRecord = await fileService.createFileRecord(
      userId,
      file.originalname,
      file.filename,
      file.path,
      file.size,
      file.mimetype
    );

    // Log the action
    await permissionService.logAction(
      userId,
      'create',
      'file',
      fileRecord.id,
      { original_filename: file.originalname, file_size: file.size },
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      data: {
        id: fileRecord.id,
        originalName: fileRecord.original_filename,
        size: fileRecord.file_size,
        uploadedAt: fileRecord.created_at
      },
      message: 'File uploaded successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload file' 
    } as ApiResponse);
  }
});

// Get file by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const userId = getCurrentUserId(req);
    
    if (isNaN(fileId)) {
      return res.status(400).json({ error: 'Invalid file ID' } as ApiResponse);
    }

    const file = await fileService.getFileById(fileId, userId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' } as ApiResponse);
    }

    // Check if physical file exists
    const exists = await fileService.checkFileExists(file.file_path);
    if (!exists) {
      return res.status(404).json({ error: 'Physical file not found' } as ApiResponse);
    }

    res.json({
      data: {
        id: file.id,
        originalName: file.original_filename,
        size: file.file_size,
        status: file.upload_status,
        uploadedAt: file.created_at
      }
    } as ApiResponse);

  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to get file' } as ApiResponse);
  }
});

// Download file
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const userId = getCurrentUserId(req);
    
    if (isNaN(fileId)) {
      return res.status(400).json({ error: 'Invalid file ID' } as ApiResponse);
    }

    const file = await fileService.getFileById(fileId, userId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' } as ApiResponse);
    }

    // Check if physical file exists
    const exists = await fileService.checkFileExists(file.file_path);
    if (!exists) {
      return res.status(404).json({ error: 'Physical file not found' } as ApiResponse);
    }

    // Set appropriate headers
    res.setHeader('Content-Type', file.mime_type || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_filename}"`);
    
    // Stream the file
    res.sendFile(file.file_path, { root: '/' });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' } as ApiResponse);
  }
});

// List user files
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const files = await fileService.getUserFiles(userId, limit, offset);
    const stats = await fileService.getFileStats(userId);

    res.json({
      data: {
        files: files.map(file => ({
          id: file.id,
          originalName: file.original_filename,
          size: file.file_size,
          status: file.upload_status,
          uploadedAt: file.created_at
        })),
        stats,
        pagination: {
          limit,
          offset,
          total: stats.totalFiles
        }
      }
    } as ApiResponse);

  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Failed to list files' } as ApiResponse);
  }
});

// Delete file
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const userId = getCurrentUserId(req);
    
    if (isNaN(fileId)) {
      return res.status(400).json({ error: 'Invalid file ID' } as ApiResponse);
    }

    const deleted = await fileService.deleteFile(fileId, userId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'File not found' } as ApiResponse);
    }

    res.json({
      message: 'File deleted successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' } as ApiResponse);
  }
});

// Get file stats
router.get('/stats/summary', requireAuth, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const stats = await fileService.getFileStats(userId);

    res.json({
      data: stats
    } as ApiResponse);

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get file stats' } as ApiResponse);
  }
});

export default router;