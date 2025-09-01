import bcrypt from 'bcryptjs';
import { getDatabase } from '../database/connection.js';
import { User, LoginRequest, LoginResponse, ApiResponse } from '../types/index.js';

export class AuthService {
  private saltRounds = 10;

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  async createUser(
    username: string,
    email: string,
    password: string,
    department?: string,
    role: 'user' | 'admin' = 'user'
  ): Promise<User> {
    const db = await getDatabase();
    
    // Check if username or email already exists
    const existingUser = await db.get(`
      SELECT id FROM users WHERE username = ? OR email = ?
    `, [username, email]);

    if (existingUser) {
      throw new Error('Username or email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const result = await db.run(`
      INSERT INTO users (username, email, password_hash, department, role, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [username, email, passwordHash, department || null, role]);

    const user = await db.get<User>(`
      SELECT id, username, email, department, role, created_at, updated_at, last_login, is_active
      FROM users WHERE id = ?
    `, [result.lastID]);

    if (!user) {
      throw new Error('Failed to create user');
    }

    return user;
  }

  async authenticateUser(username: string, password: string): Promise<User | null> {
    const db = await getDatabase();
    
    // Get user with password hash
    const userWithPassword = await db.get<User & { password_hash: string }>(`
      SELECT id, username, email, password_hash, department, role, created_at, updated_at, last_login, is_active
      FROM users 
      WHERE (username = ? OR email = ?) AND is_active = 1
    `, [username, username]);

    if (!userWithPassword) {
      return null;
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, userWithPassword.password_hash);
    if (!isValidPassword) {
      return null;
    }

    // Update last login
    await db.run(`
      UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
    `, [userWithPassword.id]);

    // Return user without password hash
    const { password_hash, ...user } = userWithPassword;
    user.last_login = new Date().toISOString();

    return user;
  }

  async getUserById(userId: number): Promise<User | null> {
    const db = await getDatabase();
    
    const user = await db.get<User>(`
      SELECT id, username, email, department, role, created_at, updated_at, last_login, is_active
      FROM users 
      WHERE id = ? AND is_active = 1
    `, [userId]);

    return user || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const db = await getDatabase();
    
    const user = await db.get<User>(`
      SELECT id, username, email, department, role, created_at, updated_at, last_login, is_active
      FROM users 
      WHERE username = ? AND is_active = 1
    `, [username]);

    return user || null;
  }

  async updateUser(
    userId: number,
    updates: {
      email?: string;
      department?: string;
      role?: 'user' | 'admin';
      is_active?: boolean;
    }
  ): Promise<boolean> {
    const db = await getDatabase();
    
    const setClause = [];
    const params: any[] = [];
    
    if (updates.email !== undefined) {
      setClause.push('email = ?');
      params.push(updates.email);
    }
    
    if (updates.department !== undefined) {
      setClause.push('department = ?');
      params.push(updates.department);
    }
    
    if (updates.role !== undefined) {
      setClause.push('role = ?');
      params.push(updates.role);
    }
    
    if (updates.is_active !== undefined) {
      setClause.push('is_active = ?');
      params.push(updates.is_active ? 1 : 0);
    }

    if (setClause.length === 0) {
      return false;
    }

    setClause.push('updated_at = CURRENT_TIMESTAMP');
    params.push(userId);

    const result = await db.run(`
      UPDATE users SET ${setClause.join(', ')} WHERE id = ?
    `, params);

    return (result.changes || 0) > 0;
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<boolean> {
    const db = await getDatabase();
    
    // Get current password hash
    const user = await db.get<{ password_hash: string }>(`
      SELECT password_hash FROM users WHERE id = ? AND is_active = 1
    `, [userId]);

    if (!user) {
      return false;
    }

    // Verify old password
    const isValidOldPassword = await this.verifyPassword(oldPassword, user.password_hash);
    if (!isValidOldPassword) {
      return false;
    }

    // Hash new password
    const newPasswordHash = await this.hashPassword(newPassword);

    // Update password
    const result = await db.run(`
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [newPasswordHash, userId]);

    return (result.changes || 0) > 0;
  }

  async getAllUsers(limit = 50, offset = 0): Promise<User[]> {
    const db = await getDatabase();
    
    const users = await db.all<User[]>(`
      SELECT id, username, email, department, role, created_at, updated_at, last_login, is_active
      FROM users 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    return users;
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    adminUsers: number;
    departmentCounts: Record<string, number>;
  }> {
    const db = await getDatabase();
    
    // Get total and active users
    const totalStats = await db.get<{ total: number; active: number; admins: number }>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN role = 'admin' AND is_active = 1 THEN 1 ELSE 0 END) as admins
      FROM users
    `);

    // Get department counts
    const deptStats = await db.all<{ department: string; count: number }[]>(`
      SELECT department, COUNT(*) as count
      FROM users 
      WHERE is_active = 1 AND department IS NOT NULL
      GROUP BY department
    `);

    const departmentCounts: Record<string, number> = {};
    deptStats.forEach(stat => {
      departmentCounts[stat.department] = stat.count;
    });

    return {
      totalUsers: totalStats?.total || 0,
      activeUsers: totalStats?.active || 0,
      adminUsers: totalStats?.admins || 0,
      departmentCounts
    };
  }

  async deactivateUser(userId: number): Promise<boolean> {
    return this.updateUser(userId, { is_active: false });
  }

  async reactivateUser(userId: number): Promise<boolean> {
    return this.updateUser(userId, { is_active: true });
  }
}