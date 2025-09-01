import { apiClient } from '../utils/apiClient.js';

export class AuthManager {
  constructor() {
    this.currentUser = null;
    this.isInitialized = false;
    this.authCallbacks = new Set();
    this.init();
  }

  async init() {
    // Try to get user from localStorage first
    this.currentUser = apiClient.getCurrentUserFromStorage();
    
    // Verify with server if user exists in storage
    if (this.currentUser) {
      try {
        const response = await apiClient.getCurrentUser();
        this.currentUser = response.data.user;
        this.notifyAuthChange();
      } catch (error) {
        console.warn('Failed to verify current user, clearing session:', error.message);
        this.currentUser = null;
        localStorage.removeItem('currentUser');
      }
    }
    
    this.isInitialized = true;
    this.notifyAuthChange();
  }

  // Authentication methods
  async login(username, password) {
    try {
      const response = await apiClient.login(username, password);
      this.currentUser = response.data.user;
      this.notifyAuthChange();
      return { success: true, user: this.currentUser };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.message,
        status: error.status,
        isRateLimit: error.isRateLimitError(),
        retryAfter: error.data?.retryAfter
      };
    }
  }

  async logout() {
    try {
      await apiClient.logout();
    } catch (error) {
      console.warn('Logout request failed:', error.message);
    } finally {
      this.currentUser = null;
      this.notifyAuthChange();
    }
  }

  async register(userData) {
    try {
      const response = await apiClient.register(userData);
      return { success: true, data: response };
    } catch (error) {
      console.error('Registration failed:', error);
      return { 
        success: false, 
        error: error.message,
        status: error.status 
      };
    }
  }

  // User state methods
  isAuthenticated() {
    return !!this.currentUser;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  hasRole(role) {
    return this.currentUser && this.currentUser.role === role;
  }

  isAdmin() {
    return this.hasRole('admin');
  }

  getDepartment() {
    return this.currentUser?.department;
  }

  // Event subscription methods
  onAuthChange(callback) {
    this.authCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.authCallbacks.delete(callback);
    };
  }

  notifyAuthChange() {
    this.authCallbacks.forEach(callback => {
      try {
        callback(this.currentUser, this.isAuthenticated());
      } catch (error) {
        console.error('Auth callback error:', error);
      }
    });
  }

  // Utility methods for UI
  getDisplayName() {
    if (!this.currentUser) return 'Guest';
    return this.currentUser.username || this.currentUser.email;
  }

  getRoleDisplayName() {
    if (!this.currentUser) return '';
    return this.currentUser.role === 'admin' ? '관리자' : '사용자';
  }

  getDepartmentDisplayName() {
    return this.currentUser?.department || '부서 미지정';
  }

  // Handle authentication errors globally
  handleAuthError(error) {
    if (error.isAuthError()) {
      console.warn('Authentication required, logging out');
      this.logout();
      return true;
    }
    return false;
  }
}

// Create login modal component
export function createLoginModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white p-6 rounded-lg shadow-lg w-96 max-w-full mx-4">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold">로그인</h2>
        <button id="closeLogin" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <form id="loginForm" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">사용자명 또는 이메일</label>
          <input type="text" id="username" required 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
          <input type="password" id="password" required
                 class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        
        <div id="errorMessage" class="text-red-600 text-sm hidden"></div>
        <div id="rateLimitMessage" class="text-orange-600 text-sm hidden"></div>
        
        <button type="submit" id="loginButton" 
                class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
          로그인
        </button>
      </form>
      
      <div class="mt-4 pt-4 border-t border-gray-200 text-center">
        <p class="text-sm text-gray-600">테스트 계정: engineer1 / password123</p>
      </div>
    </div>
  `;

  return modal;
}

// Create user info component
export function createUserInfoComponent(authManager) {
  const userInfo = document.createElement('div');
  userInfo.className = 'flex items-center space-x-4';
  
  function updateUserInfo() {
    if (authManager.isAuthenticated()) {
      const user = authManager.getCurrentUser();
      userInfo.innerHTML = `
        <div class="text-right">
          <div class="font-medium">${authManager.getDisplayName()}</div>
          <div class="text-sm text-gray-500">${authManager.getDepartmentDisplayName()} (${authManager.getRoleDisplayName()})</div>
        </div>
        <button id="logoutButton" class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
          로그아웃
        </button>
      `;
      
      const logoutButton = userInfo.querySelector('#logoutButton');
      if (logoutButton) {
        logoutButton.addEventListener('click', () => {
          authManager.logout();
        });
      }
    } else {
      userInfo.innerHTML = `
        <button id="loginTrigger" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          로그인
        </button>
      `;
      
      const loginTrigger = userInfo.querySelector('#loginTrigger');
      if (loginTrigger) {
        loginTrigger.addEventListener('click', () => {
          showLoginModal(authManager);
        });
      }
    }
  }

  // Subscribe to auth changes
  authManager.onAuthChange(updateUserInfo);
  
  // Initial update
  updateUserInfo();
  
  return userInfo;
}

// Show login modal
export function showLoginModal(authManager) {
  const modal = createLoginModal();
  document.body.appendChild(modal);
  
  const closeButton = modal.querySelector('#closeLogin');
  const loginForm = modal.querySelector('#loginForm');
  const usernameInput = modal.querySelector('#username');
  const passwordInput = modal.querySelector('#password');
  const errorMessage = modal.querySelector('#errorMessage');
  const rateLimitMessage = modal.querySelector('#rateLimitMessage');
  const loginButton = modal.querySelector('#loginButton');

  function closeModal() {
    document.body.removeChild(modal);
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    rateLimitMessage.classList.add('hidden');
  }

  function showRateLimit(retryAfter) {
    rateLimitMessage.textContent = `너무 많은 요청입니다. ${retryAfter}초 후 다시 시도해주세요.`;
    rateLimitMessage.classList.remove('hidden');
    errorMessage.classList.add('hidden');
  }

  function hideErrors() {
    errorMessage.classList.add('hidden');
    rateLimitMessage.classList.add('hidden');
  }

  closeButton.addEventListener('click', closeModal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    hideErrors();
    loginButton.disabled = true;
    loginButton.textContent = '로그인 중...';

    try {
      const result = await authManager.login(
        usernameInput.value.trim(),
        passwordInput.value
      );

      if (result.success) {
        closeModal();
      } else {
        if (result.isRateLimit) {
          showRateLimit(result.retryAfter || 60);
        } else {
          showError(result.error || '로그인에 실패했습니다.');
        }
      }
    } catch (error) {
      showError('네트워크 오류가 발생했습니다.');
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = '로그인';
    }
  });

  // Focus on username input
  setTimeout(() => usernameInput.focus(), 100);
}

// Create and export singleton instance
export const authManager = new AuthManager();