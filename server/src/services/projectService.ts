import { getDatabase } from '../database/connection.js';
import { Project, ProcessingProgress, CreateProjectRequest } from '../types/index.js';

export class ProjectService {
  async createProject(
    userId: number,
    name: string,
    pdfFilename: string,
    pdfFilePath: string,
    pdfFileSize?: number
  ): Promise<Project> {
    const db = await getDatabase();
    
    const result = await db.run(`
      INSERT INTO projects (user_id, name, pdf_filename, pdf_file_path, pdf_file_size, status)
      VALUES (?, ?, ?, ?, ?, 'created')
    `, [userId, name, pdfFilename, pdfFilePath, pdfFileSize || null]);

    const project = await db.get<Project>(`
      SELECT * FROM projects WHERE id = ?
    `, [result.lastID]);

    if (!project) {
      throw new Error('Failed to create project');
    }

    return project;
  }

  async getProjectById(projectId: number, userId?: number): Promise<Project | null> {
    const db = await getDatabase();
    
    let query = 'SELECT * FROM projects WHERE id = ?';
    const params: any[] = [projectId];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    const project = await db.get<Project>(query, params);
    return project || null;
  }

  async getUserProjects(
    userId: number, 
    limit = 50, 
    offset = 0,
    status?: string
  ): Promise<Project[]> {
    const db = await getDatabase();
    
    let query = `
      SELECT * FROM projects 
      WHERE user_id = ?
    `;
    const params: any[] = [userId];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const projects = await db.all<Project[]>(query, params);
    return projects;
  }

  async updateProject(
    projectId: number,
    updates: Partial<Project>,
    userId?: number
  ): Promise<boolean> {
    const db = await getDatabase();
    
    const allowedFields = [
      'name', 'status', 'tags_data', 'relationships_data', 'raw_text_items_data',
      'descriptions_data', 'equipment_short_specs_data', 'loops_data',
      'processing_progress', 'error_message'
    ];
    
    const setClause = [];
    const params: any[] = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = ?`);
        params.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }
    
    if (setClause.length === 0) {
      return false;
    }
    
    // Always update the updated_at timestamp
    setClause.push('updated_at = CURRENT_TIMESTAMP');
    
    let query = `UPDATE projects SET ${setClause.join(', ')} WHERE id = ?`;
    params.push(projectId);
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    const result = await db.run(query, params);
    return (result.changes || 0) > 0;
  }

  async updateProjectStatus(
    projectId: number, 
    status: Project['status'],
    userId?: number
  ): Promise<boolean> {
    return this.updateProject(projectId, { status }, userId);
  }

  async updateProjectProgress(
    projectId: number, 
    progress: ProcessingProgress,
    userId?: number
  ): Promise<boolean> {
    return this.updateProject(projectId, { processing_progress: progress }, userId);
  }

  async updateProjectError(
    projectId: number, 
    errorMessage: string,
    userId?: number
  ): Promise<boolean> {
    return this.updateProject(projectId, { 
      status: 'error' as const, 
      error_message: errorMessage 
    }, userId);
  }

  async updateProjectData(
    projectId: number,
    data: {
      tags_data?: any;
      raw_text_items_data?: any;
      relationships_data?: any;
      descriptions_data?: any;
      equipment_short_specs_data?: any;
      loops_data?: any;
      processing_progress?: any;
    },
    userId?: number
  ): Promise<boolean> {
    return this.updateProject(projectId, data, userId);
  }

  async deleteProject(projectId: number, userId?: number): Promise<boolean> {
    const db = await getDatabase();
    
    let query = 'DELETE FROM projects WHERE id = ?';
    const params: any[] = [projectId];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    const result = await db.run(query, params);
    return (result.changes || 0) > 0;
  }

  async getProjectStats(userId?: number): Promise<{
    totalProjects: number;
    statusCounts: Record<string, number>;
    totalSizeBytes: number;
  }> {
    const db = await getDatabase();
    
    let whereClause = '';
    const params: any[] = [];
    
    if (userId) {
      whereClause = 'WHERE user_id = ?';
      params.push(userId);
    }

    // Get total projects and size
    const totalStats = await db.get<{ count: number; size: number }>(`
      SELECT COUNT(*) as count, COALESCE(SUM(pdf_file_size), 0) as size
      FROM projects ${whereClause}
    `, params);

    // Get status counts
    const statusStats = await db.all<{ status: string; count: number }[]>(`
      SELECT status, COUNT(*) as count
      FROM projects ${whereClause}
      GROUP BY status
    `, params);

    const statusCounts: Record<string, number> = {};
    statusStats.forEach(stat => {
      statusCounts[stat.status] = stat.count;
    });

    return {
      totalProjects: totalStats?.count || 0,
      statusCounts,
      totalSizeBytes: totalStats?.size || 0
    };
  }

  async searchProjects(
    userId: number,
    searchTerm: string,
    limit = 50,
    offset = 0
  ): Promise<Project[]> {
    const db = await getDatabase();
    
    const projects = await db.all<Project[]>(`
      SELECT * FROM projects 
      WHERE user_id = ? 
      AND (name LIKE ? OR pdf_filename LIKE ?)
      ORDER BY updated_at DESC 
      LIMIT ? OFFSET ?
    `, [userId, `%${searchTerm}%`, `%${searchTerm}%`, limit, offset]);

    return projects;
  }

  async getProjectWithData(projectId: number, userId?: number): Promise<{
    project: Project;
    tags: any[];
    relationships: any[];
    rawTextItems: any[];
    descriptions: any[];
    equipmentShortSpecs: any[];
    loops: any[];
  } | null> {
    const project = await this.getProjectById(projectId, userId);
    
    if (!project) {
      return null;
    }

    // Parse JSON data
    const parseJsonData = (jsonString: string | null) => {
      if (!jsonString) return [];
      try {
        return JSON.parse(jsonString);
      } catch {
        return [];
      }
    };

    return {
      project,
      tags: parseJsonData(project.tags_data),
      relationships: parseJsonData(project.relationships_data),
      rawTextItems: parseJsonData(project.raw_text_items_data),
      descriptions: parseJsonData(project.descriptions_data),
      equipmentShortSpecs: parseJsonData(project.equipment_short_specs_data),
      loops: parseJsonData(project.loops_data)
    };
  }
}