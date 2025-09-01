import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: Database | null = null;

export async function initializeDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  try {
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    await fs.mkdir(dataDir, { recursive: true });

    // Database path from environment or default
    const dbPath = process.env['DATABASE_PATH'] || './data/app.db';
    const absoluteDbPath = path.resolve(dbPath);

    console.log(`📊 Connecting to database: ${absoluteDbPath}`);

    // Open database connection
    db = await open({
      filename: absoluteDbPath,
      driver: sqlite3.Database,
    });

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON');
    
    // Enable WAL mode for better concurrent access
    await db.exec('PRAGMA journal_mode = WAL');

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');
    await db.exec(schema);

    console.log('✅ Database initialized successfully');
    return db;

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

export async function getDatabase(): Promise<Database> {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    console.log('📊 Database connection closed');
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDatabase();
  process.exit(0);
});