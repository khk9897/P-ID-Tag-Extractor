import { apiClient } from '../utils/apiClient.js';
import { authManager } from './AuthManager.js';

export class ProjectManager {
  constructor() {
    this.projects = [];
    this.currentProject = null;
    this.isLoaded = false;
    this.projectCallbacks = new Set();
    this.wsConnection = null;
    
    // Subscribe to auth changes
    authManager.onAuthChange((user, isAuthenticated) => {
      if (isAuthenticated) {
        this.loadProjects();
        this.initWebSocket();
      } else {
        this.clearProjects();
        this.closeWebSocket();
      }
    });

    // Initialize if already authenticated
    if (authManager.isAuthenticated()) {
      this.init();
    }
  }

  async init() {
    await this.loadProjects();
    this.initWebSocket();
  }

  // Project loading methods
  async loadProjects() {
    if (!authManager.isAuthenticated()) {
      console.warn('Cannot load projects: not authenticated');
      return false;
    }

    try {
      const response = await apiClient.getProjects();
      this.projects = response.data.projects || [];
      this.isLoaded = true;
      this.notifyProjectsChange();
      
      console.log(`Loaded ${this.projects.length} projects`);
      return true;

    } catch (error) {
      console.error('Failed to load projects:', error);
      
      if (authManager.handleAuthError(error)) {
        return false;
      }
      
      throw error;
    }
  }

  async loadProject(projectId) {
    if (!authManager.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await apiClient.getProject(projectId);
      this.currentProject = response.data;
      this.notifyProjectChange();
      
      console.log('Project loaded:', this.currentProject.project.name);
      return this.currentProject;

    } catch (error) {
      console.error('Failed to load project:', error);
      
      if (authManager.handleAuthError(error)) {
        return null;
      }
      
      throw error;
    }
  }

  // Project CRUD methods
  async createProject(name, pdfFilename, fileId) {
    if (!authManager.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const projectData = {
        name,
        pdf_filename: pdfFilename,
        file_id: fileId
      };

      const response = await apiClient.createProject(projectData);
      
      // Reload projects list
      await this.loadProjects();
      
      console.log('Project created:', response.data);
      return response.data;

    } catch (error) {
      console.error('Failed to create project:', error);
      
      if (authManager.handleAuthError(error)) {
        return null;
      }
      
      throw error;
    }
  }

  async updateProject(projectId, updates) {
    if (!authManager.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      await apiClient.updateProject(projectId, updates);
      
      // Update local project if it's the current one
      if (this.currentProject && this.currentProject.project.id === projectId) {
        Object.assign(this.currentProject.project, updates);
        this.notifyProjectChange();
      }
      
      // Update in projects list
      const projectIndex = this.projects.findIndex(p => p.id === projectId);
      if (projectIndex !== -1) {
        Object.assign(this.projects[projectIndex], updates);
        this.notifyProjectsChange();
      }
      
      console.log('Project updated successfully');
      return true;

    } catch (error) {
      console.error('Failed to update project:', error);
      
      if (authManager.handleAuthError(error)) {
        return false;
      }
      
      throw error;
    }
  }

  async deleteProject(projectId) {
    if (!authManager.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      await apiClient.deleteProject(projectId);
      
      // Remove from local projects list
      this.projects = this.projects.filter(p => p.id !== projectId);
      
      // Clear current project if it was deleted
      if (this.currentProject && this.currentProject.project.id === projectId) {
        this.currentProject = null;
        this.notifyProjectChange();
      }
      
      this.notifyProjectsChange();
      
      console.log('Project deleted successfully');
      return true;

    } catch (error) {
      console.error('Failed to delete project:', error);
      
      if (authManager.handleAuthError(error)) {
        return false;
      }
      
      throw error;
    }
  }

  // Project processing methods
  async processProject(projectId, processingOptions = {}) {
    if (!authManager.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await apiClient.processProject(projectId, processingOptions);
      
      // Update project status locally
      const project = this.projects.find(p => p.id === projectId);
      if (project) {
        project.status = 'processing';
        this.notifyProjectsChange();
      }
      
      if (this.currentProject && this.currentProject.project.id === projectId) {
        this.currentProject.project.status = 'processing';
        this.notifyProjectChange();
      }
      
      console.log('Project processing started');
      return response;

    } catch (error) {
      console.error('Failed to start project processing:', error);
      
      if (authManager.handleAuthError(error)) {
        return null;
      }
      
      throw error;
    }
  }

  // WebSocket methods for real-time updates
  initWebSocket() {
    if (!authManager.isAuthenticated()) {
      return;
    }

    try {
      const wsUrl = `ws://localhost:3000/ws`;
      this.wsConnection = new WebSocket(wsUrl);
      
      this.wsConnection.onopen = () => {
        console.log('WebSocket connected');
      };
      
      this.wsConnection.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      this.wsConnection.onclose = () => {
        console.log('WebSocket disconnected');
        // Try to reconnect after a delay if still authenticated
        setTimeout(() => {
          if (authManager.isAuthenticated()) {
            this.initWebSocket();
          }
        }, 5000);
      };
      
      this.wsConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  closeWebSocket() {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  handleWebSocketMessage(message) {
    console.log('WebSocket message:', message);
    
    if (message.type === 'progress' && message.projectId) {
      this.handleProgressUpdate(message.projectId, message.data);
    } else if (message.type === 'complete' && message.projectId) {
      this.handleProcessingComplete(message.projectId, message.data);
    } else if (message.type === 'error' && message.projectId) {
      this.handleProcessingError(message.projectId, message.data);
    }
  }

  handleProgressUpdate(projectId, progressData) {
    // Update project status and progress
    const project = this.projects.find(p => p.id === projectId);
    if (project) {
      project.processingProgress = progressData;
      this.notifyProjectsChange();
    }
    
    if (this.currentProject && this.currentProject.project.id === projectId) {
      this.currentProject.project.processingProgress = progressData;
      this.notifyProjectChange();
    }
  }

  handleProcessingComplete(projectId, resultData) {
    console.log('Processing completed for project:', projectId);
    
    // Update project status
    const project = this.projects.find(p => p.id === projectId);
    if (project) {
      project.status = 'completed';
      project.processingProgress = null;
      this.notifyProjectsChange();
    }
    
    // Reload full project data if it's the current one
    if (this.currentProject && this.currentProject.project.id === projectId) {
      this.loadProject(projectId);
    }
  }

  handleProcessingError(projectId, errorData) {
    console.error('Processing failed for project:', projectId, errorData);
    
    // Update project status
    const project = this.projects.find(p => p.id === projectId);
    if (project) {
      project.status = 'error';
      project.errorMessage = errorData.message;
      project.processingProgress = null;
      this.notifyProjectsChange();
    }
    
    if (this.currentProject && this.currentProject.project.id === projectId) {
      this.currentProject.project.status = 'error';
      this.currentProject.project.errorMessage = errorData.message;
      this.notifyProjectChange();
    }
  }

  // Utility methods
  clearProjects() {
    this.projects = [];
    this.currentProject = null;
    this.isLoaded = false;
    this.notifyProjectsChange();
    this.notifyProjectChange();
  }

  getProjects() {
    return [...this.projects];
  }

  getCurrentProject() {
    return this.currentProject;
  }

  findProject(projectId) {
    return this.projects.find(p => p.id === projectId);
  }

  getProjectsByStatus(status) {
    return this.projects.filter(p => p.status === status);
  }

  // Event subscription methods
  onProjectsChange(callback) {
    this.projectCallbacks.add(callback);
    
    // If already loaded, call immediately
    if (this.isLoaded) {
      callback(this.projects);
    }
    
    return () => {
      this.projectCallbacks.delete(callback);
    };
  }

  onProjectChange(callback) {
    // For simplicity, use the same callback system
    this.projectCallbacks.add(callback);
    
    if (this.currentProject) {
      callback(this.projects, this.currentProject);
    }
    
    return () => {
      this.projectCallbacks.delete(callback);
    };
  }

  notifyProjectsChange() {
    this.projectCallbacks.forEach(callback => {
      try {
        callback(this.projects, this.currentProject);
      } catch (error) {
        console.error('Projects callback error:', error);
      }
    });
  }

  notifyProjectChange() {
    this.projectCallbacks.forEach(callback => {
      try {
        callback(this.projects, this.currentProject);
      } catch (error) {
        console.error('Project callback error:', error);
      }
    });
  }

  // Project export/import for compatibility with existing system
  exportProject() {
    if (!this.currentProject) {
      return null;
    }

    const { project, tags, relationships, descriptions, rawTextItems, equipmentShortSpecs, loops } = this.currentProject;
    
    return {
      projectInfo: {
        id: project.id,
        name: project.name,
        pdfFilename: project.pdfFilename,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      tags: tags || [],
      relationships: relationships || [],
      descriptions: descriptions || [],
      rawTextItems: rawTextItems || [],
      equipmentShortSpecs: equipmentShortSpecs || [],
      loops: loops || []
    };
  }

  async saveProjectData(projectData) {
    if (!this.currentProject) {
      throw new Error('No current project to save');
    }

    const updates = {
      tags_data: JSON.stringify(projectData.tags || []),
      relationships_data: JSON.stringify(projectData.relationships || []),
      descriptions_data: JSON.stringify(projectData.descriptions || []),
      raw_text_items_data: JSON.stringify(projectData.rawTextItems || []),
      equipment_short_specs_data: JSON.stringify(projectData.equipmentShortSpecs || []),
      loops_data: JSON.stringify(projectData.loops || []),
      updated_at: new Date().toISOString()
    };

    return await this.updateProject(this.currentProject.project.id, updates);
  }
}

// Create and export singleton instance
export const projectManager = new ProjectManager();