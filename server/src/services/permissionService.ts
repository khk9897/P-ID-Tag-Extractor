import { getDatabase } from '../database/connection.js';
import { User } from '../types/index.js';

export interface Permission {
  id: number;
  name: string;
  description: string;
  resource: string; // e.g., 'projects', 'files', 'users'
  action: string;   // e.g., 'create', 'read', 'update', 'delete'
  created_at: string;
}

export interface RolePermission {
  id: number;
  role: 'user' | 'admin';
  permission_id: number;
  granted: boolean;
  created_at: string;
}

export class PermissionService {
  // Check if user has specific permission
  async hasPermission(
    user: User,
    resource: string,
    action: string,
    targetUserId?: number
  ): Promise<boolean> {
    // Admin has all permissions
    if (user.role === 'admin') {
      return true;
    }

    // Resource owners have full access to their own resources
    if (targetUserId && user.id === targetUserId) {
      return true;
    }

    // Check role-based permissions
    return this.checkRolePermission(user.role, resource, action);
  }

  // Check role-based permission
  private async checkRolePermission(
    role: 'user' | 'admin',
    resource: string,
    action: string
  ): Promise<boolean> {
    const db = await getDatabase();

    const permission = await db.get<{ granted: boolean }>(`
      SELECT rp.granted
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role = ? AND p.resource = ? AND p.action = ? AND rp.granted = 1
    `, [role, resource, action]);

    return Boolean(permission?.granted);
  }

  // Check project access
  async canAccessProject(user: User, projectId: number): Promise<boolean> {
    // Admin can access all projects
    if (user.role === 'admin') {
      return true;
    }

    // Check if user owns the project
    const db = await getDatabase();
    const project = await db.get<{ user_id: number }>(`
      SELECT user_id FROM projects WHERE id = ?
    `, [projectId]);

    if (!project) {
      return false;
    }

    return project.user_id === user.id;
  }

  // Check file access
  async canAccessFile(user: User, fileId: number): Promise<boolean> {
    // Admin can access all files
    if (user.role === 'admin') {
      return true;
    }

    // Check if user owns the file
    const db = await getDatabase();
    const file = await db.get<{ user_id: number }>(`
      SELECT user_id FROM file_uploads WHERE id = ?
    `, [fileId]);

    if (!file) {
      return false;
    }

    return file.user_id === user.id;
  }

  // Department-based access control
  async canAccessUserData(user: User, targetUserId: number): Promise<boolean> {
    // Admin can access all user data
    if (user.role === 'admin') {
      return true;
    }

    // Users can access their own data
    if (user.id === targetUserId) {
      return true;
    }

    // Department-based access (if implemented)
    if (user.department) {
      const db = await getDatabase();
      const targetUser = await db.get<{ department: string }>(`
        SELECT department FROM users WHERE id = ?
      `, [targetUserId]);

      // Same department access (optional feature)
      return targetUser?.department === user.department;
    }

    return false;
  }

  // Initialize default permissions (run on server startup)
  async initializePermissions(): Promise<void> {
    const db = await getDatabase();

    try {
      // Create permissions table if it doesn't exist
      await db.exec(`
        CREATE TABLE IF NOT EXISTS permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          resource VARCHAR(50) NOT NULL,
          action VARCHAR(50) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(resource, action)
        );
      `);

      // Create role_permissions table if it doesn't exist
      await db.exec(`
        CREATE TABLE IF NOT EXISTS role_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          role VARCHAR(20) NOT NULL,
          permission_id INTEGER NOT NULL,
          granted BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE,
          UNIQUE(role, permission_id)
        );
      `);

      // Check if permissions already exist
      const existingPermissions = await db.get(`
        SELECT COUNT(*) as count FROM permissions
      `);

      if (existingPermissions?.count > 0) {
        console.log('✅ Permissions already initialized');
        return;
      }

      // Define default permissions
      const defaultPermissions = [
        // Project permissions
        { name: 'Create Projects', resource: 'projects', action: 'create', description: 'Create new projects' },
        { name: 'Read Projects', resource: 'projects', action: 'read', description: 'View project details' },
        { name: 'Update Projects', resource: 'projects', action: 'update', description: 'Modify project data' },
        { name: 'Delete Projects', resource: 'projects', action: 'delete', description: 'Delete projects' },
        { name: 'Process Projects', resource: 'projects', action: 'process', description: 'Start PDF processing' },

        // File permissions
        { name: 'Upload Files', resource: 'files', action: 'create', description: 'Upload PDF files' },
        { name: 'Read Files', resource: 'files', action: 'read', description: 'View and download files' },
        { name: 'Delete Files', resource: 'files', action: 'delete', description: 'Delete uploaded files' },

        // User management permissions
        { name: 'Read Users', resource: 'users', action: 'read', description: 'View user information' },
        { name: 'Create Users', resource: 'users', action: 'create', description: 'Register new users' },
        { name: 'Update Users', resource: 'users', action: 'update', description: 'Modify user data' },
        { name: 'Delete Users', resource: 'users', action: 'delete', description: 'Deactivate users' },

        // Settings permissions
        { name: 'Read Settings', resource: 'settings', action: 'read', description: 'View system settings' },
        { name: 'Update Settings', resource: 'settings', action: 'update', description: 'Modify settings' },

        // System permissions
        { name: 'System Admin', resource: 'system', action: 'admin', description: 'Full system administration' },
      ];

      // Insert permissions
      for (const perm of defaultPermissions) {
        await db.run(`
          INSERT OR IGNORE INTO permissions (name, resource, action, description)
          VALUES (?, ?, ?, ?)
        `, [perm.name, perm.resource, perm.action, perm.description]);
      }

      // Get inserted permission IDs
      const permissions = await db.all<Permission[]>(`
        SELECT * FROM permissions
      `);

      // Define role permissions
      const rolePermissions = [
        // User role permissions
        ...permissions
          .filter(p => 
            (p.resource === 'projects' && ['create', 'read', 'update', 'delete', 'process'].includes(p.action)) ||
            (p.resource === 'files' && ['create', 'read', 'delete'].includes(p.action)) ||
            (p.resource === 'settings' && p.action === 'read')
          )
          .map(p => ({ role: 'user' as const, permission_id: p.id })),

        // Admin role permissions (all permissions)
        ...permissions.map(p => ({ role: 'admin' as const, permission_id: p.id }))
      ];

      // Insert role permissions
      for (const rolePerm of rolePermissions) {
        await db.run(`
          INSERT OR IGNORE INTO role_permissions (role, permission_id, granted)
          VALUES (?, ?, 1)
        `, [rolePerm.role, rolePerm.permission_id]);
      }

      console.log('✅ Default permissions initialized');

    } catch (error) {
      console.error('❌ Failed to initialize permissions:', error);
    }
  }

  // Get all permissions for a role
  async getRolePermissions(role: 'user' | 'admin'): Promise<Permission[]> {
    const db = await getDatabase();

    const permissions = await db.all<Permission[]>(`
      SELECT p.*, rp.granted
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role = ? AND rp.granted = 1
      ORDER BY p.resource, p.action
    `, [role]);

    return permissions;
  }

  // Create audit log entry
  async logAction(
    userId: number,
    action: string,
    entityType: string,
    entityId: number,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const db = await getDatabase();

    try {
      await db.run(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        action,
        entityType,
        entityId,
        details ? JSON.stringify(details) : null,
        ipAddress || null,
        userAgent || null
      ]);
    } catch (error) {
      console.error('Failed to log action:', error);
      // Don't throw error - logging failure shouldn't break the main operation
    }
  }

  // Get audit logs (admin only)
  async getAuditLogs(
    limit = 100,
    offset = 0,
    userId?: number,
    action?: string
  ): Promise<any[]> {
    const db = await getDatabase();

    let query = `
      SELECT 
        al.*,
        u.username,
        u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1 = 1
    `;
    
    const params: any[] = [];

    if (userId) {
      query += ' AND al.user_id = ?';
      params.push(userId);
    }

    if (action) {
      query += ' AND al.action = ?';
      params.push(action);
    }

    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const logs = await db.all(query, params);
    return logs;
  }
}