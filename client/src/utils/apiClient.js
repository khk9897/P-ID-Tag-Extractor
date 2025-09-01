// API Client for P&ID Smart Digitizer Server
class ApiClient {
  constructor(baseURL = 'http://localhost:3000/api') {
    this.baseURL = baseURL;
    this.authToken = null;
  }

  // Helper method to make HTTP requests
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      credentials: 'include', // Include cookies for session management
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    if (this.authToken) {
      config.headers.Authorization = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(url, config);
      
      // Handle different response types
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new ApiError(response.status, data?.error || data || 'Request failed', data);
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Network error', { originalError: error.message });
    }
  }

  // Authentication methods
  async login(username, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    if (data.data?.user) {
      localStorage.setItem('currentUser', JSON.stringify(data.data.user));
    }
    
    return data;
  }

  async logout() {
    try {
      const data = await this.request('/auth/logout', {
        method: 'POST',
      });
      localStorage.removeItem('currentUser');
      return data;
    } catch (error) {
      // Clean up local storage even if logout request fails
      localStorage.removeItem('currentUser');
      throw error;
    }
  }

  async getCurrentUser() {
    return await this.request('/auth/me');
  }

  async register(userData) {
    return await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // File management methods
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    return await this.request('/files/upload', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  }

  async getFiles(params = {}) {
    const queryParams = new URLSearchParams(params);
    return await this.request(`/files?${queryParams}`);
  }

  async getFile(fileId) {
    return await this.request(`/files/${fileId}`);
  }

  async downloadFile(fileId) {
    const response = await fetch(`${this.baseURL}/files/${fileId}/download`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new ApiError(response.status, 'Download failed');
    }
    
    return response.blob();
  }

  async deleteFile(fileId) {
    return await this.request(`/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  // Project management methods
  async getProjects(params = {}) {
    const queryParams = new URLSearchParams(params);
    return await this.request(`/projects?${queryParams}`);
  }

  async getProject(projectId) {
    return await this.request(`/projects/${projectId}`);
  }

  async createProject(projectData) {
    return await this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  async updateProject(projectId, updates) {
    return await this.request(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteProject(projectId) {
    return await this.request(`/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  async processProject(projectId, processingOptions) {
    return await this.request(`/projects/${projectId}/process`, {
      method: 'POST',
      body: JSON.stringify(processingOptions),
    });
  }

  async getProjectStats() {
    return await this.request('/projects/stats/summary');
  }

  // Settings management methods
  async getSettings() {
    return await this.request('/settings');
  }

  async getSetting(key) {
    return await this.request(`/settings/${key}`);
  }

  async setSetting(key, value) {
    return await this.request(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  }

  async deleteSetting(key) {
    return await this.request(`/settings/${key}`, {
      method: 'DELETE',
    });
  }

  async exportSettings() {
    return await this.request('/settings/export/user');
  }

  async importSettings(settings) {
    return await this.request('/settings/import/user', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    });
  }

  // Pattern management methods
  async getPatterns() {
    return await this.request('/patterns');
  }

  async updatePatterns(patterns) {
    return await this.request('/patterns', {
      method: 'PUT',
      body: JSON.stringify({ patterns }),
    });
  }

  async resetPatterns() {
    return await this.request('/patterns', {
      method: 'DELETE',
    });
  }

  async getPatternPresets() {
    return await this.request('/patterns/presets');
  }

  // Tolerance management methods
  async getTolerances() {
    return await this.request('/tolerances');
  }

  async updateTolerances(tolerances) {
    return await this.request('/tolerances', {
      method: 'PUT',
      body: JSON.stringify({ tolerances }),
    });
  }

  async resetTolerances() {
    return await this.request('/tolerances', {
      method: 'DELETE',
    });
  }

  async getTolerancePresets() {
    return await this.request('/tolerances/presets');
  }

  // Export methods
  async exportProjectExcel(projectId, options = {}) {
    const response = await fetch(`${this.baseURL}/export/excel/${projectId}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiError(response.status, errorData.error || 'Export failed');
    }

    return response.blob();
  }

  async exportProjectJson(projectId) {
    const response = await fetch(`${this.baseURL}/export/json/${projectId}`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiError(response.status, errorData.error || 'Export failed');
    }

    return response.blob();
  }

  async getExportPreview(projectId) {
    return await this.request(`/export/preview/${projectId}`);
  }

  async getExportOptions() {
    return await this.request('/export/options');
  }

  // Health check
  async healthCheck() {
    return await this.request('/health', {
      method: 'GET',
    });
  }

  // Utility methods
  getCurrentUserFromStorage() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated() {
    return !!this.getCurrentUserFromStorage();
  }
}

// Custom error class for API errors
class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }

  isNetworkError() {
    return this.status === 0;
  }

  isAuthError() {
    return this.status === 401;
  }

  isForbiddenError() {
    return this.status === 403;
  }

  isNotFoundError() {
    return this.status === 404;
  }

  isServerError() {
    return this.status >= 500;
  }

  isRateLimitError() {
    return this.status === 429;
  }
}

// Create singleton instance
const apiClient = new ApiClient();

// Make available globally
window.ApiClient = ApiClient;
window.ApiError = ApiError;
window.apiClient = apiClient;

export { ApiClient, ApiError, apiClient };