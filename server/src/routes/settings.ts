import express from 'express';
import { SettingsService } from '../services/settingsService.js';
import { PermissionService } from '../services/permissionService.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiResponse } from '../types/index.js';

const router = express.Router();
const settingsService = new SettingsService();
const permissionService = new PermissionService();

// Get current user ID from authenticated request
const getCurrentUserId = (req: express.Request): number => {
  return req.user!.id;
};

// Get all effective settings for current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const userId = getCurrentUserId(req);
    
    const settings = await settingsService.getAllEffectiveSettings(userId, user.department);
    
    res.json({
      data: { settings },
      message: 'Settings retrieved successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' } as ApiResponse);
  }
});

// Get specific setting for current user
router.get('/:key', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const userId = getCurrentUserId(req);
    const settingKey = req.params.key;
    
    const value = await settingsService.getEffectiveSetting(userId, settingKey, user.department);
    
    res.json({
      data: { key: settingKey, value },
      message: 'Setting retrieved successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ error: 'Failed to get setting' } as ApiResponse);
  }
});

// Set user setting
router.put('/:key', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const userId = getCurrentUserId(req);
    const settingKey = req.params.key;
    const { value } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ error: 'Setting value is required' } as ApiResponse);
    }
    
    await settingsService.setUserSetting(userId, settingKey, value);
    
    // Log the action
    await permissionService.logAction(
      userId,
      'update',
      'setting',
      0,
      { key: settingKey, value },
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({
      message: 'Setting updated successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Set setting error:', error);
    res.status(500).json({ error: 'Failed to set setting' } as ApiResponse);
  }
});

// Delete user setting (revert to inherited value)
router.delete('/:key', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const userId = getCurrentUserId(req);
    const settingKey = req.params.key;
    
    const deleted = await settingsService.deleteUserSetting(userId, settingKey);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Setting not found' } as ApiResponse);
    }
    
    // Log the action
    await permissionService.logAction(
      userId,
      'delete',
      'setting',
      0,
      { key: settingKey },
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({
      message: 'User setting deleted successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({ error: 'Failed to delete setting' } as ApiResponse);
  }
});

// Export user settings
router.get('/export/user', requireAuth, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    
    const settings = await settingsService.exportUserSettings(userId);
    
    res.json({
      data: { settings },
      message: 'User settings exported successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Export settings error:', error);
    res.status(500).json({ error: 'Failed to export settings' } as ApiResponse);
  }
});

// Import user settings
router.post('/import/user', requireAuth, async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { settings } = req.body;
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Valid settings object is required' } as ApiResponse);
    }
    
    await settingsService.importUserSettings(userId, settings);
    
    // Log the action
    await permissionService.logAction(
      userId,
      'import',
      'settings',
      0,
      { settingsCount: Object.keys(settings).length },
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({
      message: 'User settings imported successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Import settings error:', error);
    res.status(500).json({ error: 'Failed to import settings' } as ApiResponse);
  }
});

// Admin routes for shared settings management
router.get('/shared/department/:department', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const department = req.params.department;
    
    // Check if user can read settings for this department
    const canRead = await permissionService.hasPermission(user, 'settings', 'read');
    const canAccessDept = user.role === 'admin' || user.department === department;
    
    if (!canRead || !canAccessDept) {
      return res.status(403).json({ error: 'Insufficient permissions to read department settings' } as ApiResponse);
    }
    
    const settings = await settingsService.getDepartmentSettings(department);
    
    res.json({
      data: { department, settings },
      message: 'Department settings retrieved successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Get department settings error:', error);
    res.status(500).json({ error: 'Failed to get department settings' } as ApiResponse);
  }
});

// Set shared/department setting (admin only)
router.put('/shared/:key', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const userId = getCurrentUserId(req);
    const settingKey = req.params.key;
    const { value, department, description, isDefault } = req.body;
    
    // Check permission to update settings
    const canUpdate = await permissionService.hasPermission(user, 'settings', 'update');
    if (!canUpdate) {
      return res.status(403).json({ error: 'Insufficient permissions to update shared settings' } as ApiResponse);
    }
    
    if (value === undefined) {
      return res.status(400).json({ error: 'Setting value is required' } as ApiResponse);
    }
    
    // Only admin can set default settings or settings for other departments
    if ((isDefault || (department && department !== user.department)) && user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin privileges required for this operation' } as ApiResponse);
    }
    
    await settingsService.setSharedSetting(
      settingKey, 
      value, 
      userId,
      department,
      description,
      isDefault || false
    );
    
    // Log the action
    await permissionService.logAction(
      userId,
      'update',
      'shared_setting',
      0,
      { key: settingKey, value, department, isDefault },
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({
      message: 'Shared setting updated successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Set shared setting error:', error);
    res.status(500).json({ error: 'Failed to set shared setting' } as ApiResponse);
  }
});

// Get default settings (admin only)
router.get('/shared/defaults', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    
    // Check permission to read settings
    const canRead = await permissionService.hasPermission(user, 'settings', 'read');
    if (!canRead || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin privileges required to read default settings' } as ApiResponse);
    }
    
    const settings = await settingsService.getDefaultSettings();
    
    res.json({
      data: { settings },
      message: 'Default settings retrieved successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Get default settings error:', error);
    res.status(500).json({ error: 'Failed to get default settings' } as ApiResponse);
  }
});

// Get settings statistics (admin only)
router.get('/stats/summary', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin privileges required' } as ApiResponse);
    }
    
    const stats = await settingsService.getSettingsStats();
    
    res.json({
      data: stats,
      message: 'Settings statistics retrieved successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Get settings stats error:', error);
    res.status(500).json({ error: 'Failed to get settings statistics' } as ApiResponse);
  }
});

export default router;