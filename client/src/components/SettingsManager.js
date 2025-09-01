import { apiClient } from '../utils/apiClient.js';
import { authManager } from './AuthManager.js';

export class SettingsManager {
  constructor() {
    this.patterns = {};
    this.tolerances = {};
    this.appSettings = {};
    this.isLoaded = false;
    this.loadCallbacks = new Set();
    
    // Subscribe to auth changes
    authManager.onAuthChange((user, isAuthenticated) => {
      if (isAuthenticated) {
        this.loadFromServer();
      } else {
        this.loadFromLocalStorage();
      }
    });

    // Initialize
    this.init();
  }

  async init() {
    if (authManager.isAuthenticated()) {
      await this.loadFromServer();
    } else {
      this.loadFromLocalStorage();
    }
  }

  // Server synchronization methods
  async loadFromServer() {
    if (!authManager.isAuthenticated()) {
      console.warn('Cannot load settings from server: not authenticated');
      return false;
    }

    try {
      // Load patterns
      const patternsResponse = await apiClient.getPatterns();
      this.patterns = patternsResponse.data.patterns || {};

      // Load tolerances
      const tolerancesResponse = await apiClient.getTolerances();
      this.tolerances = tolerancesResponse.data.tolerances || {};

      // Load all settings to get app settings
      const settingsResponse = await apiClient.getSettings();
      this.appSettings = settingsResponse.data.settings.default_app_settings || {};

      this.isLoaded = true;
      this.notifyLoadComplete();
      
      console.log('Settings loaded from server successfully');
      return true;

    } catch (error) {
      console.error('Failed to load settings from server:', error);
      
      // Fall back to local storage
      this.loadFromLocalStorage();
      
      // Handle auth errors
      if (authManager.handleAuthError(error)) {
        return false;
      }
      
      throw error;
    }
  }

  async saveToServer() {
    if (!authManager.isAuthenticated()) {
      console.warn('Cannot save settings to server: not authenticated');
      return false;
    }

    try {
      // Save patterns
      if (Object.keys(this.patterns).length > 0) {
        await apiClient.updatePatterns(this.patterns);
      }

      // Save tolerances
      if (Object.keys(this.tolerances).length > 0) {
        await apiClient.updateTolerances(this.tolerances);
      }

      // Save app settings
      if (Object.keys(this.appSettings).length > 0) {
        await apiClient.setSetting('default_app_settings', this.appSettings);
      }

      console.log('Settings saved to server successfully');
      return true;

    } catch (error) {
      console.error('Failed to save settings to server:', error);
      
      // Handle auth errors
      if (authManager.handleAuthError(error)) {
        return false;
      }
      
      throw error;
    }
  }

  // Local storage methods (fallback)
  loadFromLocalStorage() {
    try {
      this.patterns = JSON.parse(localStorage.getItem('patterns') || '{}');
      this.tolerances = JSON.parse(localStorage.getItem('tolerances') || '{}');
      this.appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
      
      // Apply defaults if empty
      if (Object.keys(this.patterns).length === 0) {
        this.patterns = this.getDefaultPatterns();
      }
      if (Object.keys(this.tolerances).length === 0) {
        this.tolerances = this.getDefaultTolerances();
      }
      if (Object.keys(this.appSettings).length === 0) {
        this.appSettings = this.getDefaultAppSettings();
      }

      this.isLoaded = true;
      this.notifyLoadComplete();
      
      console.log('Settings loaded from localStorage');
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
      this.loadDefaults();
    }
  }

  saveToLocalStorage() {
    try {
      localStorage.setItem('patterns', JSON.stringify(this.patterns));
      localStorage.setItem('tolerances', JSON.stringify(this.tolerances));
      localStorage.setItem('appSettings', JSON.stringify(this.appSettings));
      console.log('Settings saved to localStorage');
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  }

  loadDefaults() {
    this.patterns = this.getDefaultPatterns();
    this.tolerances = this.getDefaultTolerances();
    this.appSettings = this.getDefaultAppSettings();
    this.isLoaded = true;
    this.notifyLoadComplete();
    console.log('Default settings loaded');
  }

  // Settings access methods
  getPatterns() {
    return { ...this.patterns };
  }

  getTolerances() {
    return { ...this.tolerances };
  }

  getAppSettings() {
    return { ...this.appSettings };
  }

  async updatePatterns(newPatterns) {
    this.patterns = { ...this.patterns, ...newPatterns };
    
    if (authManager.isAuthenticated()) {
      try {
        await apiClient.updatePatterns(this.patterns);
        console.log('Patterns updated on server');
      } catch (error) {
        console.error('Failed to update patterns on server:', error);
        // Save to localStorage as fallback
        this.saveToLocalStorage();
      }
    } else {
      this.saveToLocalStorage();
    }
  }

  async updateTolerances(newTolerances) {
    this.tolerances = { ...this.tolerances, ...newTolerances };
    
    if (authManager.isAuthenticated()) {
      try {
        await apiClient.updateTolerances(this.tolerances);
        console.log('Tolerances updated on server');
      } catch (error) {
        console.error('Failed to update tolerances on server:', error);
        // Save to localStorage as fallback
        this.saveToLocalStorage();
      }
    } else {
      this.saveToLocalStorage();
    }
  }

  async updateAppSettings(newSettings) {
    this.appSettings = { ...this.appSettings, ...newSettings };
    
    if (authManager.isAuthenticated()) {
      try {
        await apiClient.setSetting('default_app_settings', this.appSettings);
        console.log('App settings updated on server');
      } catch (error) {
        console.error('Failed to update app settings on server:', error);
        // Save to localStorage as fallback
        this.saveToLocalStorage();
      }
    } else {
      this.saveToLocalStorage();
    }
  }

  // Reset methods
  async resetPatterns() {
    if (authManager.isAuthenticated()) {
      try {
        await apiClient.resetPatterns();
        // Reload from server to get inherited values
        const response = await apiClient.getPatterns();
        this.patterns = response.data.patterns || this.getDefaultPatterns();
        console.log('Patterns reset on server');
      } catch (error) {
        console.error('Failed to reset patterns on server:', error);
        this.patterns = this.getDefaultPatterns();
        this.saveToLocalStorage();
      }
    } else {
      this.patterns = this.getDefaultPatterns();
      this.saveToLocalStorage();
    }
  }

  async resetTolerances() {
    if (authManager.isAuthenticated()) {
      try {
        await apiClient.resetTolerances();
        // Reload from server to get inherited values
        const response = await apiClient.getTolerances();
        this.tolerances = response.data.tolerances || this.getDefaultTolerances();
        console.log('Tolerances reset on server');
      } catch (error) {
        console.error('Failed to reset tolerances on server:', error);
        this.tolerances = this.getDefaultTolerances();
        this.saveToLocalStorage();
      }
    } else {
      this.tolerances = this.getDefaultTolerances();
      this.saveToLocalStorage();
    }
  }

  // Import/Export methods
  async exportSettings() {
    if (authManager.isAuthenticated()) {
      try {
        const response = await apiClient.exportSettings();
        return response.data.settings;
      } catch (error) {
        console.error('Failed to export settings from server:', error);
        if (!authManager.handleAuthError(error)) {
          // Fall back to local export
          return {
            patterns: this.patterns,
            tolerances: this.tolerances,
            appSettings: this.appSettings
          };
        }
        return null;
      }
    } else {
      return {
        patterns: this.patterns,
        tolerances: this.tolerances,
        appSettings: this.appSettings
      };
    }
  }

  async importSettings(settings) {
    if (!settings || typeof settings !== 'object') {
      throw new Error('Invalid settings data');
    }

    // Update local settings
    if (settings.patterns) this.patterns = settings.patterns;
    if (settings.tolerances) this.tolerances = settings.tolerances;
    if (settings.appSettings) this.appSettings = settings.appSettings;

    if (authManager.isAuthenticated()) {
      try {
        await apiClient.importSettings({
          default_patterns: this.patterns,
          default_tolerances: this.tolerances,
          default_app_settings: this.appSettings
        });
        console.log('Settings imported to server');
      } catch (error) {
        console.error('Failed to import settings to server:', error);
        if (!authManager.handleAuthError(error)) {
          // Save to localStorage as fallback
          this.saveToLocalStorage();
        }
        throw error;
      }
    } else {
      this.saveToLocalStorage();
    }
  }

  // Event subscription
  onLoad(callback) {
    this.loadCallbacks.add(callback);
    
    // If already loaded, call immediately
    if (this.isLoaded) {
      callback(this.patterns, this.tolerances, this.appSettings);
    }
    
    return () => {
      this.loadCallbacks.delete(callback);
    };
  }

  notifyLoadComplete() {
    this.loadCallbacks.forEach(callback => {
      try {
        callback(this.patterns, this.tolerances, this.appSettings);
      } catch (error) {
        console.error('Settings load callback error:', error);
      }
    });
  }

  // Default values (from constants.ts equivalent)
  getDefaultPatterns() {
    return {
      Equipment: "[A-Z]{1,3}-[A-Z]{1,2}-\\d{4,5}[A-Z]?",
      Line: "\\d{1,2}[\"]?-[A-Z]{2,4}-\\d{3,5}",
      Instrument: {
        func: "[A-Z]{1,4}",
        num: "\\d{3,5}[A-Z]?"
      },
      NotesAndHolds: "(?:NOTE|HOLD)\\s+\\d+",
      DrawingNumber: "[A-Z]{1,3}-\\d{3,5}-[A-Z]{1,3}"
    };
  }

  getDefaultTolerances() {
    return {
      Equipment: { horizontal: 50, vertical: 20 },
      Line: { horizontal: 50, vertical: 20 },
      Instrument: { horizontal: 30, vertical: 40, autoLinkDistance: 100 },
      NotesAndHolds: { horizontal: 50, vertical: 20 },
      DrawingNumber: { horizontal: 50, vertical: 20 }
    };
  }

  getDefaultAppSettings() {
    return {
      autoGenerateLoops: true,
      showAdvancedFeatures: false
    };
  }

  // Utility methods
  isLoaded() {
    return this.isLoaded;
  }

  isOnline() {
    return authManager.isAuthenticated();
  }

  getStorageStatus() {
    return {
      isOnline: this.isOnline(),
      isLoaded: this.isLoaded,
      hasLocalData: Boolean(localStorage.getItem('patterns'))
    };
  }
}

// Create and export singleton instance
export const settingsManager = new SettingsManager();