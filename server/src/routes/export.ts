import express from 'express';
import { ExcelExportService } from '../services/excelExportService.js';
import { ProjectService } from '../services/projectService.js';
import { PermissionService } from '../services/permissionService.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiResponse } from '../types/index.js';

const router = express.Router();
const excelExportService = new ExcelExportService();
const projectService = new ProjectService();
const permissionService = new PermissionService();

// Get current user ID from authenticated request
const getCurrentUserId = (req: express.Request): number => {
  return req.user!.id;
};

// Export project to Excel
router.post('/excel/:projectId', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const projectId = parseInt(req.params.projectId);
    const userId = getCurrentUserId(req);
    const options = req.body || {};

    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' } as ApiResponse);
    }

    // Check permission to access this project
    const canAccess = await permissionService.canAccessProject(user, projectId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Insufficient permissions to export this project' } as ApiResponse);
    }

    // Get project data
    const projectData = await projectService.getProjectWithData(projectId, userId);
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' } as ApiResponse);
    }

    const { project, tags, relationships, descriptions, equipmentShortSpecs, loops } = projectData;

    // Validate export data
    const validation = excelExportService.validateExportData(tags || []);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid export data', 
        details: validation.errors 
      } as ApiResponse);
    }

    // Generate Excel file
    const excelBuffer = excelExportService.generateExcel(
      tags || [],
      relationships || [],
      descriptions || [],
      equipmentShortSpecs || [],
      loops || [],
      options
    );

    // Generate filename
    const filename = excelExportService.generateFilename(project.name);

    // Log the export action
    await permissionService.logAction(
      userId,
      'export',
      'project',
      projectId,
      { 
        format: 'excel', 
        filename,
        options,
        dataStats: {
          tags: tags?.length || 0,
          relationships: relationships?.length || 0,
          descriptions: descriptions?.length || 0
        }
      },
      req.ip,
      req.get('User-Agent')
    );

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);

    // Send the Excel file
    res.send(excelBuffer);

  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Failed to export Excel file' } as ApiResponse);
  }
});

// Export project data as JSON (for backup/migration)
router.post('/json/:projectId', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const projectId = parseInt(req.params.projectId);
    const userId = getCurrentUserId(req);

    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' } as ApiResponse);
    }

    // Check permission to access this project
    const canAccess = await permissionService.canAccessProject(user, projectId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Insufficient permissions to export this project' } as ApiResponse);
    }

    // Get project data
    const projectData = await projectService.getProjectWithData(projectId, userId);
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' } as ApiResponse);
    }

    const { project } = projectData;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `${project.name}_backup_${timestamp}.json`;

    // Log the export action
    await permissionService.logAction(
      userId,
      'export',
      'project',
      projectId,
      { format: 'json', filename },
      req.ip,
      req.get('User-Agent')
    );

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send the JSON data
    res.json({
      exportInfo: {
        projectId: project.id,
        projectName: project.name,
        exportedAt: new Date().toISOString(),
        exportedBy: user.username
      },
      projectData
    });

  } catch (error) {
    console.error('JSON export error:', error);
    res.status(500).json({ error: 'Failed to export JSON file' } as ApiResponse);
  }
});

// Get export preview/summary
router.get('/preview/:projectId', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const projectId = parseInt(req.params.projectId);
    const userId = getCurrentUserId(req);

    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' } as ApiResponse);
    }

    // Check permission to access this project
    const canAccess = await permissionService.canAccessProject(user, projectId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Insufficient permissions to preview this project' } as ApiResponse);
    }

    // Get project data
    const projectData = await projectService.getProjectWithData(projectId, userId);
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' } as ApiResponse);
    }

    const { project, tags, relationships, descriptions, equipmentShortSpecs, loops } = projectData;

    // Calculate statistics
    const categoryStats: Record<string, number> = {};
    (tags || []).forEach(tag => {
      categoryStats[tag.category] = (categoryStats[tag.category] || 0) + 1;
    });

    const reviewStats = {
      reviewedTags: (tags || []).filter(t => t.isReviewed).length,
      unreviewedTags: (tags || []).filter(t => !t.isReviewed).length,
      reviewedDescriptions: (descriptions || []).filter(d => d.isReviewed).length,
      unreviewedDescriptions: (descriptions || []).filter(d => !d.isReviewed).length
    };

    const pageStats: Record<number, number> = {};
    (tags || []).forEach(tag => {
      pageStats[tag.page] = (pageStats[tag.page] || 0) + 1;
    });

    const exportPreview = {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      },
      statistics: {
        totalTags: tags?.length || 0,
        totalRelationships: relationships?.length || 0,
        totalDescriptions: descriptions?.length || 0,
        totalEquipmentSpecs: equipmentShortSpecs?.length || 0,
        totalLoops: loops?.length || 0,
        categoryStats,
        reviewStats,
        pageStats
      },
      availableFormats: ['excel', 'json'],
      estimatedFileSize: {
        excel: `${Math.ceil(((tags?.length || 0) * 0.1) + 50)}KB`,
        json: `${Math.ceil(JSON.stringify(projectData).length / 1024)}KB`
      }
    };

    res.json({
      data: exportPreview,
      message: 'Export preview generated successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Export preview error:', error);
    res.status(500).json({ error: 'Failed to generate export preview' } as ApiResponse);
  }
});

// Get export options/templates
router.get('/options', requireAuth, async (req, res) => {
  try {
    const exportOptions = {
      filterOptions: {
        includeReviewedOnly: {
          description: 'Export only reviewed items',
          type: 'boolean',
          default: false
        },
        includeUnreviewedOnly: {
          description: 'Export only unreviewed items',
          type: 'boolean',
          default: false
        }
      },
      contentOptions: {
        includeDescriptions: {
          description: 'Include descriptions sheet',
          type: 'boolean',
          default: true
        },
        includeRelationships: {
          description: 'Include relationships sheet',
          type: 'boolean',
          default: true
        },
        includeEquipmentSpecs: {
          description: 'Include equipment specifications sheet',
          type: 'boolean',
          default: true
        },
        includeLoops: {
          description: 'Include loops sheet',
          type: 'boolean',
          default: true
        }
      },
      formats: [
        {
          name: 'excel',
          description: 'Microsoft Excel (.xlsx)',
          extension: '.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        },
        {
          name: 'json',
          description: 'JSON Backup (.json)',
          extension: '.json',
          mimeType: 'application/json'
        }
      ]
    };

    res.json({
      data: exportOptions,
      message: 'Export options retrieved successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Export options error:', error);
    res.status(500).json({ error: 'Failed to get export options' } as ApiResponse);
  }
});

// Bulk export multiple projects (admin only)
router.post('/bulk/excel', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const userId = getCurrentUserId(req);
    const { projectIds, options = {} } = req.body;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin privileges required for bulk export' } as ApiResponse);
    }

    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      return res.status(400).json({ error: 'Project IDs array is required' } as ApiResponse);
    }

    const results = [];
    const errors = [];

    for (const projectId of projectIds) {
      try {
        const projectData = await projectService.getProjectWithData(projectId, userId);
        if (projectData) {
          const { project, tags, relationships, descriptions, equipmentShortSpecs, loops } = projectData;
          
          const excelBuffer = excelExportService.generateExcel(
            tags || [],
            relationships || [],
            descriptions || [],
            equipmentShortSpecs || [],
            loops || [],
            options
          );

          results.push({
            projectId: project.id,
            projectName: project.name,
            filename: excelExportService.generateFilename(project.name),
            size: excelBuffer.length,
            status: 'success'
          });
        }
      } catch (error) {
        errors.push({
          projectId,
          error: String(error) || 'Unknown error'
        });
      }
    }

    // Log the bulk export action
    await permissionService.logAction(
      userId,
      'bulk_export',
      'projects',
      0,
      { 
        projectIds, 
        successCount: results.length,
        errorCount: errors.length,
        format: 'excel'
      },
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      data: {
        results,
        errors,
        summary: {
          total: projectIds.length,
          successful: results.length,
          failed: errors.length
        }
      },
      message: `Bulk export completed: ${results.length}/${projectIds.length} successful`
    } as ApiResponse);

  } catch (error) {
    console.error('Bulk export error:', error);
    res.status(500).json({ error: 'Failed to perform bulk export' } as ApiResponse);
  }
});

export default router;