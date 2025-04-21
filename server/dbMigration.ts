import { db } from './db';
import { organizations, organizationUsers, users, projects } from '@shared/schema';
import { sql } from 'drizzle-orm';

/**
 * This function creates the necessary tables for organization-based structure
 */
export async function runDatabaseMigration() {
  console.log('Starting database migration...');
  
  try {
    // First check if organizations table exists
    const orgTableExists = await checkTableExists('organizations');
    if (!orgTableExists) {
      console.log('Creating organizations table...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "organizations" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "logo_url" TEXT,
          "website" TEXT,
          "created_by_id" INTEGER,
          "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
    } else {
      console.log('Organizations table already exists.');
    }

    // Check if is_super_admin column exists in users table
    const isSuperAdminColumnExists = await checkColumnExists('users', 'is_super_admin');
    if (!isSuperAdminColumnExists) {
      console.log('Adding is_super_admin column to users table...');
      await db.execute(sql`
        ALTER TABLE "users" 
        ADD COLUMN IF NOT EXISTS "is_super_admin" BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      
      // Update the role type to include super_admin
      await db.execute(sql`
        ALTER TABLE "users" 
        ALTER COLUMN "role" TYPE TEXT;
      `);
    } else {
      console.log('is_super_admin column already exists.');
    }

    // Check if organization_users table exists
    const orgUsersTableExists = await checkTableExists('organization_users');
    if (!orgUsersTableExists) {
      console.log('Creating organization_users table...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "organization_users" (
          "id" SERIAL PRIMARY KEY,
          "organization_id" INTEGER NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
          "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "role" TEXT NOT NULL DEFAULT 'staff',
          "joined_at" TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE("organization_id", "user_id")
        );
      `);
    } else {
      console.log('organization_users table already exists.');
    }

    // Check if organization_id column exists in projects table
    const orgIdColumnExists = await checkColumnExists('projects', 'organization_id');
    if (!orgIdColumnExists) {
      console.log('Adding organization_id column to projects table...');
      
      // First create default organization
      const [defaultOrg] = await db.insert(organizations).values({
        name: 'Default Organization',
        description: 'Default organization for existing projects',
        updatedAt: new Date()
      }).returning();
      
      console.log(`Created default organization with ID: ${defaultOrg.id}`);
      
      // Then add organization_id column with default value
      await db.execute(sql`
        ALTER TABLE "projects" 
        ADD COLUMN "organization_id" INTEGER;
      `);
      
      // Update all existing projects to use the default organization
      await db.execute(sql`
        UPDATE "projects" 
        SET "organization_id" = ${defaultOrg.id}
        WHERE "organization_id" IS NULL;
      `);
      
      // Make the column not null after setting values
      await db.execute(sql`
        ALTER TABLE "projects" 
        ALTER COLUMN "organization_id" SET NOT NULL;
      `);
      
      // Add foreign key constraint
      await db.execute(sql`
        ALTER TABLE "projects" 
        ADD CONSTRAINT "projects_organization_id_fkey"
        FOREIGN KEY ("organization_id") 
        REFERENCES "organizations"("id") 
        ON DELETE CASCADE;
      `);
      
      // Add all existing users to default organization
      const allUsers = await db.select().from(users);
      for (const user of allUsers) {
        try {
          await db.insert(organizationUsers).values({
            organizationId: defaultOrg.id,
            userId: user.id,
            role: user.role
          }).onConflictDoNothing();
        } catch (err) {
          console.error(`Error adding user ${user.id} to organization:`, err);
        }
      }
      
      // Set the admin user as super admin
      await db.execute(sql`
        UPDATE "users"
        SET "is_super_admin" = TRUE,
            "role" = 'super_admin'
        WHERE "email" = 'pawnmedia.ph@gmail.com';
      `);
      
    } else {
      console.log('organization_id column already exists in projects table.');
    }

    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Database migration failed:', error);
    throw error;
  }
}

// Helper to check if a table exists
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
      );
    `);
    return result.rows[0]?.exists === true;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

// Helper to check if a column exists
async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
        AND column_name = ${columnName}
      );
    `);
    return result.rows[0]?.exists === true;
  } catch (error) {
    console.error(`Error checking if column ${columnName} in table ${tableName} exists:`, error);
    return false;
  }
}