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

// Get effective tolerances for user
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const userId = getCurrentUserId(req);
    
    const tolerances = await settingsService.getEffectiveSetting(
      userId, 
      'default_tolerances', 
      user.department
    );
    
    res.json({
      data: { tolerances: tolerances || {} },
      message: 'Tolerances retrieved successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Get tolerances error:', error);
    res.status(500).json({ error: 'Failed to get tolerances' } as ApiResponse);
  }
});

// Update user tolerances
router.put('/', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const userId = getCurrentUserId(req);
    const { tolerances } = req.body;
    
    if (!tolerances || typeof tolerances !== 'object') {
      return res.status(400).json({ error: 'Valid tolerances object is required' } as ApiResponse);
    }
    
    await settingsService.setUserSetting(userId, 'default_tolerances', tolerances);
    
    // Log the action
    await permissionService.logAction(
      userId,
      'update',
      'tolerances',
      0,
      { tolerancesCount: Object.keys(tolerances).length },
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({
      message: 'Tolerances updated successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Update tolerances error:', error);
    res.status(500).json({ error: 'Failed to update tolerances' } as ApiResponse);
  }
});

// Reset user tolerances to inherited value
router.delete('/', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const userId = getCurrentUserId(req);
    
    const deleted = await settingsService.deleteUserSetting(userId, 'default_tolerances');
    
    // Log the action
    await permissionService.logAction(
      userId,
      'reset',
      'tolerances',
      0,
      null,
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({
      message: deleted ? 'User tolerances reset to default' : 'No user tolerances to reset'
    } as ApiResponse);

  } catch (error) {
    console.error('Reset tolerances error:', error);
    res.status(500).json({ error: 'Failed to reset tolerances' } as ApiResponse);
  }
});

// Get tolerance presets (shared tolerances by department/default)
router.get('/presets', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    
    const presets = {
      user: await settingsService.getUserSetting(getCurrentUserId(req), 'default_tolerances'),
      department: user.department ? await settingsService.getSharedSetting('default_tolerances', user.department) : null,
      default: await settingsService.getSharedSetting('default_tolerances')
    };
    
    res.json({
      data: { presets },
      message: 'Tolerance presets retrieved successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Get tolerance presets error:', error);
    res.status(500).json({ error: 'Failed to get tolerance presets' } as ApiResponse);
  }
});

export default router;