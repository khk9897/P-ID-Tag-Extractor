import express from 'express';
import { ProjectService } from '../services/projectService.js';
import { FileService } from '../services/fileService.js';
import { PdfProcessingService } from '../services/pdfProcessingService.js';
import { PermissionService } from '../services/permissionService.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiResponse, CreateProjectRequest, ProcessPdfRequest } from '../types/index.js';

const router = express.Router();
const projectService = new ProjectService();
const fileService = new FileService();
const pdfProcessingService = new PdfProcessingService();
const permissionService = new PermissionService();

// Get current user ID from authenticated request
const getCurrentUserId = (req: express.Request): number => {
  return req.user!.id; // User is guaranteed to exist after requireAuth middleware
};

// Create new project
router.post('/', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const userId = getCurrentUserId(req);
    const { name, pdf_filename, file_id }: CreateProjectRequest & { file_id: number } = req.body;

    if (!name || !pdf_filename || !file_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, pdf_filename, file_id' 
      } as ApiResponse);
    }

    // Check permission to create projects
    const canCreate = await permissionService.hasPermission(user, 'projects', 'create');
    if (!canCreate) {
      return res.status(403).json({ error: 'Insufficient permissions to create projects' } as ApiResponse);
    }

    // Get file information
    const file = await fileService.getFileById(file_id, userId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' } as ApiResponse);
    }

    // Create project
    const project = await projectService.createProject(
      userId,
      name,
      pdf_filename,
      file.file_path,
      file.file_size || undefined
    );

    // Log the action
    await permissionService.logAction(
      userId,
      'create',
      'project',
      project.id,
      { name, pdf_filename },
      req.ip,
      req.get('User-Agent')
    );

    res.status(201).json({
      data: {
        id: project.id,
        name: project.name,
        pdfFilename: project.pdf_filename,
        status: project.status,
        createdAt: project.created_at
      },
      message: 'Project created successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' } as ApiResponse);
  }
});

// Get project by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const projectId = parseInt(req.params.id);
    const userId = getCurrentUserId(req);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' } as ApiResponse);
    }

    // Check permission to access this project
    const canAccess = await permissionService.canAccessProject(user, projectId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Insufficient permissions to access this project' } as ApiResponse);
    }

    const projectData = await projectService.getProjectWithData(projectId, userId);
    
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' } as ApiResponse);
    }

    const { project, ...data } = projectData;

    res.json({
      data: {
        project: {
          id: project.id,
          name: project.name,
          pdfFilename: project.pdf_filename,
          status: project.status,
          createdAt: project.created_at,
          updatedAt: project.updated_at,
          processingProgress: project.processing_progress ? JSON.parse(project.processing_progress) : null,
          errorMessage: project.error_message
        },
        ...data
      }
    } as ApiResponse);

  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to get project' } as ApiResponse);
  }
});

// List user projects
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string;
    const search = req.query.search as string;

    let projects;
    if (search) {
      projects = await projectService.searchProjects(userId, search, limit, offset);
    } else {
      projects = await projectService.getUserProjects(userId, limit, offset, status);
    }

    const stats = await projectService.getProjectStats(userId);

    res.json({
      data: {
        projects: projects.map(project => ({
          id: project.id,
          name: project.name,
          pdfFilename: project.pdf_filename,
          status: project.status,
          createdAt: project.created_at,
          updatedAt: project.updated_at,
          processingProgress: project.processing_progress ? JSON.parse(project.processing_progress) : null,
          errorMessage: project.error_message
        })),
        stats,
        pagination: {
          limit,
          offset,
          total: stats.totalProjects
        }
      }
    } as ApiResponse);

  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({ error: 'Failed to list projects' } as ApiResponse);
  }
});

// Update project
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const projectId = parseInt(req.params.id);
    const userId = getCurrentUserId(req);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' } as ApiResponse);
    }

    // Check permission to access and update this project
    const canAccess = await permissionService.canAccessProject(user, projectId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Insufficient permissions to update this project' } as ApiResponse);
    }

    const updates = req.body;
    const success = await projectService.updateProject(projectId, updates, userId);
    
    if (!success) {
      return res.status(404).json({ error: 'Project not found or no changes made' } as ApiResponse);
    }

    // Log the action
    await permissionService.logAction(
      userId,
      'update',
      'project',
      projectId,
      updates,
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      message: 'Project updated successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' } as ApiResponse);
  }
});

// Delete project
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const projectId = parseInt(req.params.id);
    const userId = getCurrentUserId(req);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' } as ApiResponse);
    }

    // Check permission to access and delete this project
    const canAccess = await permissionService.canAccessProject(user, projectId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Insufficient permissions to delete this project' } as ApiResponse);
    }

    const success = await projectService.deleteProject(projectId, userId);
    
    if (!success) {
      return res.status(404).json({ error: 'Project not found' } as ApiResponse);
    }

    // Log the action
    await permissionService.logAction(
      userId,
      'delete',
      'project',
      projectId,
      null,
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      message: 'Project deleted successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' } as ApiResponse);
  }
});

// Process PDF for project
router.post('/:id/process', requireAuth, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const userId = getCurrentUserId(req);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' } as ApiResponse);
    }

    const { patterns, tolerances, app_settings }: ProcessPdfRequest = req.body;

    // Get project to verify ownership and get file path
    const project = await projectService.getProjectById(projectId, userId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' } as ApiResponse);
    }

    if (project.status === 'processing') {
      return res.status(400).json({ error: 'Project is already being processed' } as ApiResponse);
    }

    // Start processing (async)
    pdfProcessingService.processPdfFile(
      projectId,
      project.pdf_file_path,
      patterns || {},
      tolerances || {},
      app_settings || {}
    ).catch(error => {
      console.error(`Background processing failed for project ${projectId}:`, error);
    });

    res.json({
      message: 'PDF processing started. Connect to WebSocket for progress updates.',
      data: { projectId, status: 'processing' }
    } as ApiResponse);

  } catch (error) {
    console.error('Process PDF error:', error);
    res.status(500).json({ error: 'Failed to start PDF processing' } as ApiResponse);
  }
});

// Get project stats
router.get('/stats/summary', requireAuth, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const stats = await projectService.getProjectStats(userId);

    res.json({
      data: stats
    } as ApiResponse);

  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({ error: 'Failed to get project stats' } as ApiResponse);
  }
});

export default router;