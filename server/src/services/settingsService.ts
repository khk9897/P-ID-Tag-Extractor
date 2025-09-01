import { getDatabase } from '../database/connection.js';
import { User } from '../types/index.js';

export interface UserSetting {
  id: number;
  user_id: number;
  setting_key: string;
  setting_value: any;
  created_at: string;
  updated_at: string;
}

export interface SharedSetting {
  id: number;
  department: string | null;
  setting_key: string;
  setting_value: any;
  description: string | null;
  is_default: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export class SettingsService {
  // Get user-specific setting
  async getUserSetting(userId: number, settingKey: string): Promise<any> {
    const db = await getDatabase();
    
    const setting = await db.get<UserSetting>(`
      SELECT setting_value FROM user_settings 
      WHERE user_id = ? AND setting_key = ?
    `, [userId, settingKey]);

    return setting ? JSON.parse(setting.setting_value) : null;
  }

  // Set user-specific setting
  async setUserSetting(userId: number, settingKey: string, settingValue: any): Promise<void> {
    const db = await getDatabase();
    
    await db.run(`
      INSERT OR REPLACE INTO user_settings (user_id, setting_key, setting_value, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `, [userId, settingKey, JSON.stringify(settingValue)]);
  }

  // Get shared setting for department or default
  async getSharedSetting(settingKey: string, department?: string): Promise<any> {
    const db = await getDatabase();
    
    let setting;
    
    // Try department-specific setting first
    if (department) {
      setting = await db.get<SharedSetting>(`
        SELECT setting_value FROM shared_settings 
        WHERE setting_key = ? AND department = ?
        ORDER BY created_at DESC LIMIT 1
      `, [settingKey, department]);
    }

    // Fall back to default setting if no department-specific setting found
    if (!setting) {
      setting = await db.get<SharedSetting>(`
        SELECT setting_value FROM shared_settings 
        WHERE setting_key = ? AND (department IS NULL OR is_default = 1)
        ORDER BY is_default DESC, created_at DESC LIMIT 1
      `, [settingKey]);
    }

    return setting ? JSON.parse(setting.setting_value) : null;
  }

  // Set shared setting
  async setSharedSetting(
    settingKey: string, 
    settingValue: any, 
    createdBy: number,
    department?: string,
    description?: string,
    isDefault: boolean = false
  ): Promise<void> {
    const db = await getDatabase();
    
    await db.run(`
      INSERT OR REPLACE INTO shared_settings 
      (setting_key, setting_value, department, description, is_default, created_by, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [settingKey, JSON.stringify(settingValue), department || null, description, isDefault, createdBy]);
  }

  // Get setting with inheritance (user -> department -> default)
  async getEffectiveSetting(userId: number, settingKey: string, department?: string): Promise<any> {
    // 1. Try user-specific setting first
    let setting = await this.getUserSetting(userId, settingKey);
    if (setting !== null) {
      return setting;
    }

    // 2. Try department setting
    if (department) {
      setting = await this.getSharedSetting(settingKey, department);
      if (setting !== null) {
        return setting;
      }
    }

    // 3. Fall back to default setting
    return await this.getSharedSetting(settingKey);
  }

  // Get all user settings
  async getAllUserSettings(userId: number): Promise<Record<string, any>> {
    const db = await getDatabase();
    
    const settings = await db.all<UserSetting[]>(`
      SELECT setting_key, setting_value FROM user_settings 
      WHERE user_id = ?
    `, [userId]);

    const result: Record<string, any> = {};
    for (const setting of settings) {
      result[setting.setting_key] = JSON.parse(setting.setting_value);
    }
    
    return result;
  }

  // Get all effective settings for user (with inheritance)
  async getAllEffectiveSettings(userId: number, department?: string): Promise<Record<string, any>> {
    const db = await getDatabase();
    
    // Get all possible setting keys
    const allKeys = await db.all<{setting_key: string}[]>(`
      SELECT DISTINCT setting_key FROM (
        SELECT setting_key FROM user_settings WHERE user_id = ?
        UNION
        SELECT setting_key FROM shared_settings WHERE department = ? OR department IS NULL
      )
    `, [userId, department || null]);

    const result: Record<string, any> = {};
    
    // Get effective value for each key
    for (const { setting_key } of allKeys) {
      const value = await this.getEffectiveSetting(userId, setting_key, department);
      if (value !== null) {
        result[setting_key] = value;
      }
    }

    return result;
  }

  // Delete user setting
  async deleteUserSetting(userId: number, settingKey: string): Promise<boolean> {
    const db = await getDatabase();
    
    const result = await db.run(`
      DELETE FROM user_settings WHERE user_id = ? AND setting_key = ?
    `, [userId, settingKey]);

    return result.changes > 0;
  }

  // Get shared settings by department
  async getDepartmentSettings(department: string): Promise<SharedSetting[]> {
    const db = await getDatabase();
    
    const settings = await db.all<SharedSetting[]>(`
      SELECT * FROM shared_settings 
      WHERE department = ?
      ORDER BY setting_key, created_at DESC
    `, [department]);

    return settings.map(setting => ({
      ...setting,
      setting_value: JSON.parse(setting.setting_value)
    }));
  }

  // Get default settings
  async getDefaultSettings(): Promise<SharedSetting[]> {
    const db = await getDatabase();
    
    const settings = await db.all<SharedSetting[]>(`
      SELECT * FROM shared_settings 
      WHERE is_default = 1 OR department IS NULL
      ORDER BY setting_key, created_at DESC
    `);

    return settings.map(setting => ({
      ...setting,
      setting_value: JSON.parse(setting.setting_value)
    }));
  }

  // Export user settings (for backup/migration)
  async exportUserSettings(userId: number): Promise<Record<string, any>> {
    return await this.getAllUserSettings(userId);
  }

  // Import user settings (for backup/migration)
  async importUserSettings(userId: number, settings: Record<string, any>): Promise<void> {
    const db = await getDatabase();
    
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Clear existing settings
      await db.run('DELETE FROM user_settings WHERE user_id = ?', [userId]);
      
      // Insert new settings
      for (const [key, value] of Object.entries(settings)) {
        await db.run(`
          INSERT INTO user_settings (user_id, setting_key, setting_value)
          VALUES (?, ?, ?)
        `, [userId, key, JSON.stringify(value)]);
      }
      
      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }

  // Get settings statistics
  async getSettingsStats(): Promise<{
    totalUserSettings: number;
    totalSharedSettings: number;
    settingsByDepartment: Record<string, number>;
    mostUsedSettings: Array<{key: string, count: number}>;
  }> {
    const db = await getDatabase();
    
    const totalUserSettings = await db.get<{count: number}>(`
      SELECT COUNT(*) as count FROM user_settings
    `);
    
    const totalSharedSettings = await db.get<{count: number}>(`
      SELECT COUNT(*) as count FROM shared_settings
    `);
    
    const departmentStats = await db.all<{department: string, count: number}[]>(`
      SELECT department, COUNT(*) as count 
      FROM shared_settings 
      WHERE department IS NOT NULL 
      GROUP BY department
    `);
    
    const mostUsedSettings = await db.all<{key: string, count: number}[]>(`
      SELECT setting_key as key, COUNT(*) as count 
      FROM user_settings 
      GROUP BY setting_key 
      ORDER BY count DESC 
      LIMIT 10
    `);
    
    const settingsByDepartment: Record<string, number> = {};
    for (const stat of departmentStats) {
      settingsByDepartment[stat.department] = stat.count;
    }
    
    return {
      totalUserSettings: totalUserSettings?.count || 0,
      totalSharedSettings: totalSharedSettings?.count || 0,
      settingsByDepartment,
      mostUsedSettings
    };
  }
}