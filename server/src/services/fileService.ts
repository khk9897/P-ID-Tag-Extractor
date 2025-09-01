import { getDatabase } from '../database/connection.js';
import { FileUpload } from '../types/index.js';
import fs from 'fs/promises';
import path from 'path';

export class FileService {
  async createFileRecord(
    userId: number,
    originalFilename: string,
    storedFilename: string,
    filePath: string,
    fileSize: number,
    mimeType: string
  ): Promise<FileUpload> {
    const db = await getDatabase();
    
    const result = await db.run(`
      INSERT INTO file_uploads (user_id, original_filename, stored_filename, file_path, file_size, mime_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, originalFilename, storedFilename, filePath, fileSize, mimeType]);

    const fileUpload = await db.get<FileUpload>(`
      SELECT * FROM file_uploads WHERE id = ?
    `, [result.lastID]);

    if (!fileUpload) {
      throw new Error('Failed to create file record');
    }

    return fileUpload;
  }

  async getFileById(fileId: number, userId?: number): Promise<FileUpload | null> {
    const db = await getDatabase();
    
    let query = 'SELECT * FROM file_uploads WHERE id = ?';
    const params: any[] = [fileId];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    const file = await db.get<FileUpload>(query, params);
    return file || null;
  }

  async getUserFiles(userId: number, limit = 50, offset = 0): Promise<FileUpload[]> {
    const db = await getDatabase();
    
    const files = await db.all<FileUpload[]>(`
      SELECT * FROM file_uploads 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    return files;
  }

  async updateFileStatus(fileId: number, status: FileUpload['upload_status']): Promise<void> {
    const db = await getDatabase();
    
    await db.run(`
      UPDATE file_uploads 
      SET upload_status = ? 
      WHERE id = ?
    `, [status, fileId]);
  }

  async deleteFile(fileId: number, userId?: number): Promise<boolean> {
    const db = await getDatabase();
    
    // Get file info first
    const file = await this.getFileById(fileId, userId);
    if (!file) {
      return false;
    }

    try {
      // Delete physical file
      await fs.unlink(file.file_path);
    } catch (error) {
      console.warn('Failed to delete physical file:', error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    let query = 'DELETE FROM file_uploads WHERE id = ?';
    const params: any[] = [fileId];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    const result = await db.run(query, params);
    return (result.changes || 0) > 0;
  }

  async getFileStats(userId?: number): Promise<{
    totalFiles: number;
    totalSize: number;
    statusCounts: Record<string, number>;
  }> {
    const db = await getDatabase();
    
    let whereClause = '';
    const params: any[] = [];
    
    if (userId) {
      whereClause = 'WHERE user_id = ?';
      params.push(userId);
    }

    // Get total files and size
    const totalStats = await db.get<{ count: number; size: number }>(`
      SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as size
      FROM file_uploads ${whereClause}
    `, params);

    // Get status counts
    const statusStats = await db.all<{ status: string; count: number }[]>(`
      SELECT upload_status as status, COUNT(*) as count
      FROM file_uploads ${whereClause}
      GROUP BY upload_status
    `, params);

    const statusCounts: Record<string, number> = {};
    statusStats.forEach(stat => {
      statusCounts[stat.status] = stat.count;
    });

    return {
      totalFiles: totalStats?.count || 0,
      totalSize: totalStats?.size || 0,
      statusCounts
    };
  }

  async checkFileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileBuffer(filePath: string): Promise<Buffer> {
    return await fs.readFile(filePath);
  }
}