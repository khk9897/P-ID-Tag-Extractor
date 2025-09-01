import { AuthService } from './authService.js';
import { PermissionService } from './permissionService.js';
import { getDatabase } from '../database/connection.js';

export class SeedService {
  private authService: AuthService;
  private permissionService: PermissionService;

  constructor() {
    this.authService = new AuthService();
    this.permissionService = new PermissionService();
  }

  async createDefaultAdmin(): Promise<void> {
    try {
      const db = await getDatabase();
      
      // Check if any admin user exists
      const adminExists = await db.get(`
        SELECT id FROM users WHERE role = 'admin' AND is_active = 1
      `);

      if (adminExists) {
        console.log('✅ Admin user already exists');
        return;
      }

      // Create default admin user
      const adminUser = await this.authService.createUser(
        'admin',
        'admin@company.com',
        'admin123',
        'IT',
        'admin'
      );

      console.log('✅ Default admin user created:');
      console.log(`   Username: admin`);
      console.log(`   Email: admin@company.com`);
      console.log(`   Password: admin123`);
      console.log(`   ⚠️  Please change the default password after first login!`);

    } catch (error) {
      console.error('❌ Failed to create default admin user:', error);
    }
  }

  async createSampleUsers(): Promise<void> {
    try {
      const db = await getDatabase();
      
      // Check if sample users already exist
      const userCount = await db.get<{ count: number }>(`
        SELECT COUNT(*) as count FROM users WHERE role = 'user'
      `);

      if (userCount && userCount.count > 0) {
        console.log('✅ Sample users already exist');
        return;
      }

      // Create sample users
      const sampleUsers = [
        {
          username: 'engineer1',
          email: 'engineer1@company.com',
          password: 'password123',
          department: 'Engineering',
          role: 'user' as const
        },
        {
          username: 'engineer2',
          email: 'engineer2@company.com',
          password: 'password123',
          department: 'Engineering',
          role: 'user' as const
        },
        {
          username: 'operator1',
          email: 'operator1@company.com',
          password: 'password123',
          department: 'Operations',
          role: 'user' as const
        }
      ];

      for (const userData of sampleUsers) {
        await this.authService.createUser(
          userData.username,
          userData.email,
          userData.password,
          userData.department,
          userData.role
        );
      }

      console.log('✅ Sample users created:');
      sampleUsers.forEach(user => {
        console.log(`   ${user.username} (${user.department})`);
      });
      console.log(`   Default password for all: password123`);

    } catch (error) {
      console.error('❌ Failed to create sample users:', error);
    }
  }

  async seedDefaultSettings(): Promise<void> {
    try {
      const db = await getDatabase();
      
      // Check if default settings exist
      const settingsExist = await db.get(`
        SELECT id FROM shared_settings WHERE is_default = 1
      `);

      if (settingsExist) {
        console.log('✅ Default settings already exist');
        return;
      }

      // Create default settings
      const defaultSettings = [
        {
          key: 'default_patterns',
          value: {
            Equipment: "[A-Z]{1,3}-[A-Z]{1,2}-\\d{4,5}[A-Z]?",
            Line: "\\d{1,2}[\"\"]?-[A-Z]{2,4}-\\d{3,5}",
            Instrument: {
              func: "[A-Z]{1,4}",
              num: "\\d{3,5}[A-Z]?"
            },
            NotesAndHolds: "(?:NOTE|HOLD)\\s+\\d+",
            DrawingNumber: "[A-Z]{1,3}-\\d{3,5}-[A-Z]{1,3}"
          },
          description: 'Default regex patterns for tag extraction'
        },
        {
          key: 'default_tolerances',
          value: {
            Equipment: { horizontal: 50, vertical: 20 },
            Line: { horizontal: 50, vertical: 20 },
            Instrument: { horizontal: 30, vertical: 40, autoLinkDistance: 100 },
            NotesAndHolds: { horizontal: 50, vertical: 20 },
            DrawingNumber: { horizontal: 50, vertical: 20 }
          },
          description: 'Default tolerance settings for tag combination'
        },
        {
          key: 'default_app_settings',
          value: {
            autoGenerateLoops: true,
            showAdvancedFeatures: false
          },
          description: 'Default application settings'
        }
      ];

      for (const setting of defaultSettings) {
        await db.run(`
          INSERT INTO shared_settings (department, setting_key, setting_value, description, is_default)
          VALUES (?, ?, ?, ?, 1)
        `, [null, setting.key, JSON.stringify(setting.value), setting.description]);
      }

      console.log('✅ Default settings created');

    } catch (error) {
      console.error('❌ Failed to create default settings:', error);
    }
  }

  async runAllSeeds(): Promise<void> {
    console.log('🌱 Running database seeds...');
    
    // Initialize permissions first
    await this.permissionService.initializePermissions();
    
    await this.createDefaultAdmin();
    
    // Only create sample data in development
    if (process.env['NODE_ENV'] === 'development') {
      await this.createSampleUsers();
    }
    
    await this.seedDefaultSettings();
    
    console.log('✅ Database seeding completed');
  }
}