import express from 'express';
import { AuthService } from '../services/authService.js';
import { loginRateLimit, requireAuth, requireAdmin } from '../middleware/auth.js';
import { ApiResponse, LoginRequest, LoginResponse } from '../types/index.js';

const router = express.Router();
const authService = new AuthService();

// Register new user (admin only for now)
router.post('/register', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, department, role } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: 'Username, email, and password are required' 
      } as ApiResponse);
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      } as ApiResponse);
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      } as ApiResponse);
    }

    // Create user
    const user = await authService.createUser(
      username.trim(),
      email.trim().toLowerCase(),
      password,
      department?.trim(),
      role === 'admin' ? 'admin' : 'user'
    );

    res.status(201).json({
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        department: user.department,
        role: user.role,
        createdAt: user.created_at
      },
      message: 'User created successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Register error:', error);
    
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({ 
        error: error.message 
      } as ApiResponse);
    }
    
    res.status(500).json({ 
      error: 'Failed to create user' 
    } as ApiResponse);
  }
});

// Login
router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const { username, password }: LoginRequest = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      } as ApiResponse);
    }

    // Authenticate user
    const user = await authService.authenticateUser(username.trim(), password);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid username or password' 
      } as ApiResponse);
    }

    // Create session
    (req.session as any).userId = user.id;
    (req.session as any).username = user.username;

    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ 
          error: 'Failed to create session' 
        } as ApiResponse);
      }

      res.json({
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            department: user.department,
            role: user.role,
            created_at: user.created_at,
            updated_at: user.updated_at,
            last_login: user.last_login,
            is_active: user.is_active
          },
          message: 'Login successful'
        }
      } as ApiResponse<LoginResponse>);
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed' 
    } as ApiResponse);
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ 
        error: 'Failed to logout' 
      } as ApiResponse);
    }

    res.clearCookie('connect.sid'); // Clear session cookie
    res.json({ 
      message: 'Logout successful' 
    } as ApiResponse);
  });
});

// Get current user info
router.get('/me', requireAuth, async (req, res) => {
  try {
    res.json({
      data: {
        user: {
          id: req.user!.id,
          username: req.user!.username,
          email: req.user!.email,
          department: req.user!.department,
          role: req.user!.role,
          lastLogin: req.user!.last_login
        }
      }
    } as ApiResponse);

  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ 
      error: 'Failed to get user information' 
    } as ApiResponse);
  }
});

// Change password
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Validation
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Old password and new password are required' 
      } as ApiResponse);
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'New password must be at least 6 characters long' 
      } as ApiResponse);
    }

    // Change password
    const success = await authService.changePassword(req.user!.id, oldPassword, newPassword);
    
    if (!success) {
      return res.status(400).json({ 
        error: 'Invalid old password' 
      } as ApiResponse);
    }

    res.json({ 
      message: 'Password changed successfully' 
    } as ApiResponse);

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      error: 'Failed to change password' 
    } as ApiResponse);
  }
});

// Update user profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { email, department } = req.body;
    const updates: any = {};

    // Validation and prepare updates
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          error: 'Invalid email format' 
        } as ApiResponse);
      }
      updates.email = email.trim().toLowerCase();
    }

    if (department !== undefined) {
      updates.department = department.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ 
        error: 'No valid fields to update' 
      } as ApiResponse);
    }

    // Update user
    const success = await authService.updateUser(req.user!.id, updates);
    
    if (!success) {
      return res.status(404).json({ 
        error: 'User not found or no changes made' 
      } as ApiResponse);
    }

    res.json({ 
      message: 'Profile updated successfully' 
    } as ApiResponse);

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({ 
        error: 'Email already in use by another user' 
      } as ApiResponse);
    }
    
    res.status(500).json({ 
      error: 'Failed to update profile' 
    } as ApiResponse);
  }
});

// Get all users (admin only)
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const users = await authService.getAllUsers(limit, offset);
    const stats = await authService.getUserStats();

    res.json({
      data: {
        users: users.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          department: user.department,
          role: user.role,
          isActive: user.is_active,
          createdAt: user.created_at,
          lastLogin: user.last_login
        })),
        stats,
        pagination: {
          limit,
          offset,
          total: stats.totalUsers
        }
      }
    } as ApiResponse);

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      error: 'Failed to get users' 
    } as ApiResponse);
  }
});

// Update user (admin only)
router.put('/users/:userId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { email, department, role, is_active } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ 
        error: 'Invalid user ID' 
      } as ApiResponse);
    }

    const updates: any = {};

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          error: 'Invalid email format' 
        } as ApiResponse);
      }
      updates.email = email.trim().toLowerCase();
    }

    if (department !== undefined) {
      updates.department = department.trim() || null;
    }

    if (role !== undefined) {
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ 
          error: 'Role must be either "user" or "admin"' 
        } as ApiResponse);
      }
      updates.role = role;
    }

    if (is_active !== undefined) {
      updates.is_active = Boolean(is_active);
    }

    // Update user
    const success = await authService.updateUser(userId, updates);
    
    if (!success) {
      return res.status(404).json({ 
        error: 'User not found or no changes made' 
      } as ApiResponse);
    }

    res.json({ 
      message: 'User updated successfully' 
    } as ApiResponse);

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      error: 'Failed to update user' 
    } as ApiResponse);
  }
});

// Check authentication status
router.get('/status', async (req, res) => {
  const userId = (req.session as any)?.userId;
  
  if (!userId) {
    return res.json({
      data: { isAuthenticated: false, user: null }
    } as ApiResponse);
  }

  try {
    const user = await authService.getUserById(userId);
    
    if (!user) {
      // Clear invalid session
      req.session.destroy(() => {});
      return res.json({
        data: { isAuthenticated: false, user: null }
      } as ApiResponse);
    }

    res.json({
      data: {
        isAuthenticated: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          department: user.department,
          role: user.role,
          lastLogin: user.last_login
        }
      }
    } as ApiResponse);

  } catch (error) {
    console.error('Auth status error:', error);
    res.json({
      data: { isAuthenticated: false, user: null }
    } as ApiResponse);
  }
});

export default router;