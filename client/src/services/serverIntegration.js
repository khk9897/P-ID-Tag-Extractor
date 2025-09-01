import { authManager, createUserInfoComponent, showLoginModal } from '../components/AuthManager.js';
import { settingsManager } from '../components/SettingsManager.js';
import { projectManager } from '../components/ProjectManager.js';
import { apiClient } from '../utils/apiClient.js';

export class ServerIntegration {
  constructor() {
    this.isInitialized = false;
    this.onlineStatusCallbacks = new Set();
    this.initPromise = null;
  }

  async initialize() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  async _doInitialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🔧 Initializing server integration...');

      // Initialize auth manager first
      await authManager.init();
      
      // Initialize settings manager
      await settingsManager.init();
      
      // Initialize project manager if authenticated
      if (authManager.isAuthenticated()) {
        await projectManager.init();
      }

      // Set up online/offline monitoring
      this.setupOnlineStatusMonitoring();

      // Integrate with existing UI
      this.integrateWithExistingUI();

      this.isInitialized = true;
      console.log('✅ Server integration initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize server integration:', error);
      throw error;
    }
  }

  setupOnlineStatusMonitoring() {
    // Monitor authentication changes
    authManager.onAuthChange((user, isAuthenticated) => {
      console.log(`Auth status changed: ${isAuthenticated ? 'logged in' : 'logged out'}`, user);
      this.notifyOnlineStatusChange(isAuthenticated);
    });

    // Monitor network connectivity
    window.addEventListener('online', () => {
      console.log('Network: online');
      this.handleNetworkStatusChange(true);
    });

    window.addEventListener('offline', () => {
      console.log('Network: offline');
      this.handleNetworkStatusChange(false);
    });
  }

  integrateWithExistingUI() {
    try {
      // Add user info component to header
      const headerElement = document.querySelector('header') || document.querySelector('.header');
      if (headerElement) {
        const userInfoContainer = document.createElement('div');
        userInfoContainer.className = 'server-integration-user-info';
        userInfoContainer.appendChild(createUserInfoComponent(authManager));
        headerElement.appendChild(userInfoContainer);
      }

      // Add connection status indicator
      this.addConnectionStatusIndicator();

      // Override existing pattern/tolerance loading with server integration
      this.integrateSettingsOverride();

      // Add project sync indicators
      this.addProjectSyncIndicators();

    } catch (error) {
      console.warn('Failed to integrate with existing UI:', error);
    }
  }

  addConnectionStatusIndicator() {
    const statusIndicator = document.createElement('div');
    statusIndicator.id = 'connection-status';
    statusIndicator.className = 'fixed top-4 right-4 z-50 px-3 py-1 rounded-full text-sm font-medium transition-all duration-300';
    
    const updateStatus = () => {
      const isOnline = authManager.isAuthenticated() && navigator.onLine;
      statusIndicator.textContent = isOnline ? '🌐 온라인' : '💾 오프라인';
      statusIndicator.className = statusIndicator.className.replace(/bg-\w+-\d+/g, '');
      statusIndicator.classList.add(isOnline ? 'bg-green-600' : 'bg-orange-600', 'text-white');
    };

    // Subscribe to status changes
    this.onOnlineStatusChange(updateStatus);
    updateStatus();

    document.body.appendChild(statusIndicator);
  }

  addProjectSyncIndicators() {
    // Add sync status to project display areas
    projectManager.onProjectsChange((projects) => {
      console.log(`Projects updated: ${projects.length} projects`);
      
      // Update any existing project UI elements
      const projectElements = document.querySelectorAll('[data-project-id]');
      projectElements.forEach(element => {
        const projectId = parseInt(element.getAttribute('data-project-id'));
        const project = projects.find(p => p.id === projectId);
        
        if (project) {
          // Add processing status indicators
          let statusElement = element.querySelector('.sync-status');
          if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.className = 'sync-status text-xs px-2 py-1 rounded';
            element.appendChild(statusElement);
          }
          
          switch (project.status) {
            case 'processing':
              statusElement.textContent = '⚙️ 처리중';
              statusElement.className = 'sync-status text-xs px-2 py-1 rounded bg-blue-100 text-blue-800';
              break;
            case 'completed':
              statusElement.textContent = '✅ 완료';
              statusElement.className = 'sync-status text-xs px-2 py-1 rounded bg-green-100 text-green-800';
              break;
            case 'error':
              statusElement.textContent = '❌ 오류';
              statusElement.className = 'sync-status text-xs px-2 py-1 rounded bg-red-100 text-red-800';
              break;
            default:
              statusElement.textContent = '⏸️ 대기';
              statusElement.className = 'sync-status text-xs px-2 py-1 rounded bg-gray-100 text-gray-800';
          }
        }
      });
    });
  }

  integrateSettingsOverride() {
    // Override global pattern/tolerance access with server integration
    if (window.getPatterns) {
      window._originalGetPatterns = window.getPatterns;
    }
    
    window.getPatterns = () => {
      return settingsManager.getPatterns();
    };

    if (window.getTolerances) {
      window._originalGetTolerances = window.getTolerances;
    }
    
    window.getTolerances = () => {
      return settingsManager.getTolerances();
    };

    if (window.getAppSettings) {
      window._originalGetAppSettings = window.getAppSettings;
    }
    
    window.getAppSettings = () => {
      return settingsManager.getAppSettings();
    };

    // Provide update methods
    window.updatePatterns = (patterns) => {
      return settingsManager.updatePatterns(patterns);
    };

    window.updateTolerances = (tolerances) => {
      return settingsManager.updateTolerances(tolerances);
    };

    window.updateAppSettings = (settings) => {
      return settingsManager.updateAppSettings(settings);
    };
  }

  // Network status handling
  handleNetworkStatusChange(isOnline) {
    if (isOnline && authManager.isAuthenticated()) {
      // Try to sync when coming back online
      this.syncWhenOnline();
    }
    
    this.notifyOnlineStatusChange(isOnline && authManager.isAuthenticated());
  }

  async syncWhenOnline() {
    try {
      console.log('🔄 Syncing data after coming online...');
      
      // Reload settings from server
      await settingsManager.loadFromServer();
      
      // Reload projects
      await projectManager.loadProjects();
      
      console.log('✅ Sync completed');
    } catch (error) {
      console.error('❌ Sync failed:', error);
    }
  }

  // Public API methods for integration with existing code
  async saveProject(projectData) {
    if (authManager.isAuthenticated() && projectManager.getCurrentProject()) {
      try {
        await projectManager.saveProjectData(projectData);
        console.log('Project saved to server');
        return true;
      } catch (error) {
        console.error('Failed to save project to server:', error);
        return false;
      }
    }
    return false;
  }

  async loadProject(projectId) {
    if (authManager.isAuthenticated()) {
      try {
        const projectData = await projectManager.loadProject(projectId);
        console.log('Project loaded from server');
        return projectData;
      } catch (error) {
        console.error('Failed to load project from server:', error);
        return null;
      }
    }
    return null;
  }

  async createProject(name, pdfFilename, fileId) {
    if (authManager.isAuthenticated()) {
      try {
        const project = await projectManager.createProject(name, pdfFilename, fileId);
        console.log('Project created on server');
        return project;
      } catch (error) {
        console.error('Failed to create project on server:', error);
        throw error;
      }
    } else {
      throw new Error('Authentication required');
    }
  }

  async uploadFile(file) {
    if (authManager.isAuthenticated()) {
      try {
        const response = await apiClient.uploadFile(file);
        console.log('File uploaded to server');
        return response.data;
      } catch (error) {
        console.error('Failed to upload file to server:', error);
        throw error;
      }
    } else {
      throw new Error('Authentication required');
    }
  }

  // Status checking methods
  isOnline() {
    return authManager.isAuthenticated() && navigator.onLine;
  }

  isAuthenticated() {
    return authManager.isAuthenticated();
  }

  getCurrentUser() {
    return authManager.getCurrentUser();
  }

  getConnectionStatus() {
    return {
      isAuthenticated: authManager.isAuthenticated(),
      isOnline: navigator.onLine,
      user: authManager.getCurrentUser(),
      hasProjects: projectManager.projects.length > 0,
      settingsLoaded: settingsManager.isLoaded
    };
  }

  // Event subscription
  onOnlineStatusChange(callback) {
    this.onlineStatusCallbacks.add(callback);
    return () => {
      this.onlineStatusCallbacks.delete(callback);
    };
  }

  notifyOnlineStatusChange(isOnline) {
    this.onlineStatusCallbacks.forEach(callback => {
      try {
        callback(isOnline);
      } catch (error) {
        console.error('Online status callback error:', error);
      }
    });
  }

  // Helper methods for showing login modal
  showLogin() {
    showLoginModal(authManager);
  }

  // Methods to help with migration from localStorage to server
  async migrateLocalDataToServer() {
    if (!authManager.isAuthenticated()) {
      throw new Error('Must be authenticated to migrate data');
    }

    try {
      console.log('🔄 Migrating local data to server...');

      // Migrate settings
      const localPatterns = localStorage.getItem('patterns');
      const localTolerances = localStorage.getItem('tolerances');
      const localAppSettings = localStorage.getItem('appSettings');

      if (localPatterns) {
        const patterns = JSON.parse(localPatterns);
        await settingsManager.updatePatterns(patterns);
        console.log('✅ Patterns migrated');
      }

      if (localTolerances) {
        const tolerances = JSON.parse(localTolerances);
        await settingsManager.updateTolerances(tolerances);
        console.log('✅ Tolerances migrated');
      }

      if (localAppSettings) {
        const appSettings = JSON.parse(localAppSettings);
        await settingsManager.updateAppSettings(appSettings);
        console.log('✅ App settings migrated');
      }

      console.log('✅ Local data migration completed');
      return true;

    } catch (error) {
      console.error('❌ Failed to migrate local data:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const serverIntegration = new ServerIntegration();

// Initialize on import
serverIntegration.initialize().catch(error => {
  console.error('Failed to initialize server integration:', error);
});

// Make available globally for existing code
window.serverIntegration = serverIntegration;