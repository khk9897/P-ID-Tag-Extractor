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

// Get effective patterns for user
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const userId = getCurrentUserId(req);
    
    const patterns = await settingsService.getEffectiveSetting(
      userId, 
      'default_patterns', 
      user.department
    );
    
    res.json({
      data: { patterns: patterns || {} },
      message: 'Patterns retrieved successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Get patterns error:', error);
    res.status(500).json({ error: 'Failed to get patterns' } as ApiResponse);
  }
});

// Update user patterns
router.put('/', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const userId = getCurrentUserId(req);
    const { patterns } = req.body;
    
    if (!patterns || typeof patterns !== 'object') {
      return res.status(400).json({ error: 'Valid patterns object is required' } as ApiResponse);
    }
    
    await settingsService.setUserSetting(userId, 'default_patterns', patterns);
    
    // Log the action
    await permissionService.logAction(
      userId,
      'update',
      'patterns',
      0,
      { patternsCount: Object.keys(patterns).length },
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({
      message: 'Patterns updated successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Update patterns error:', error);
    res.status(500).json({ error: 'Failed to update patterns' } as ApiResponse);
  }
});

// Reset user patterns to inherited value
router.delete('/', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const userId = getCurrentUserId(req);
    
    const deleted = await settingsService.deleteUserSetting(userId, 'default_patterns');
    
    // Log the action
    await permissionService.logAction(
      userId,
      'reset',
      'patterns',
      0,
      null,
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({
      message: deleted ? 'User patterns reset to default' : 'No user patterns to reset'
    } as ApiResponse);

  } catch (error) {
    console.error('Reset patterns error:', error);
    res.status(500).json({ error: 'Failed to reset patterns' } as ApiResponse);
  }
});

// Get pattern presets (shared patterns by department/default)
router.get('/presets', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    
    const presets = {
      user: await settingsService.getUserSetting(getCurrentUserId(req), 'default_patterns'),
      department: user.department ? await settingsService.getSharedSetting('default_patterns', user.department) : null,
      default: await settingsService.getSharedSetting('default_patterns')
    };
    
    res.json({
      data: { presets },
      message: 'Pattern presets retrieved successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Get pattern presets error:', error);
    res.status(500).json({ error: 'Failed to get pattern presets' } as ApiResponse);
  }
});

export default router;