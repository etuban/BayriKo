import { db } from './db';
import { storage } from './storage';
import { eq } from 'drizzle-orm';
import { organizations, users, projects } from '@shared/schema';

// This function will be called to migrate the database to the new schema
export async function migrateToOrganizationStructure() {
  try {
    console.log('Starting migration to organization-based structure...');
    
    // 1. Check if columns exist (to avoid errors)
    const hasOrganizationsTable = await checkTableExists('organizations');
    const hasOrgUsersTable = await checkTableExists('organization_users');
    const hasIsSuperAdminColumn = await checkColumnExists('users', 'is_super_admin');
    const hasOrgIdInProjects = await checkColumnExists('projects', 'organization_id');
    
    // Exit if all migrations are already applied
    if (hasOrganizationsTable && hasOrgUsersTable && hasIsSuperAdminColumn && hasOrgIdInProjects) {
      console.log('Migration already applied. Skipping.');
      return;
    }
    
    // 2. Create a default organization for existing projects
    console.log('Creating default organization...');
    const defaultOrganization = await createDefaultOrganization();
    console.log(`Default organization created with ID: ${defaultOrganization.id}`);
    
    // 3. Migrate existing projects to the default organization
    if (hasOrgIdInProjects) {
      console.log('Updating existing projects to belong to the default organization...');
      await updateProjectsWithOrgId(defaultOrganization.id);
    }
    
    // 4. Make pawnmedia.ph@gmail.com a super admin
    if (hasIsSuperAdminColumn) {
      console.log('Setting up super admin...');
      await setupSuperAdmin();
    }
    
    // 5. Add users to the default organization
    if (hasOrgUsersTable) {
      console.log('Adding users to default organization...');
      await addUsersToOrganization(defaultOrganization.id);
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Create default organization for existing projects
async function createDefaultOrganization() {
  // Check if default organization already exists
  const [existingOrg] = await db.select().from(organizations).where(eq(organizations.name, 'Default Organization'));
  
  if (existingOrg) {
    console.log('Default organization already exists.');
    return existingOrg;
  }
  
  // Get first user to be creator
  const [firstUser] = await db.select().from(users);
  const creatorId = firstUser?.id || null;
  
  // Create default organization
  const [newOrg] = await db.insert(organizations).values({
    name: 'Default Organization',
    description: 'Default organization for existing projects',
    createdById: creatorId,
    updatedAt: new Date()
  }).returning();
  
  return newOrg;
}

// Update existing projects to belong to the default organization
async function updateProjectsWithOrgId(organizationId: number) {
  // Check if any projects don't have an organization_id
  const projects = await db.execute(`
    SELECT * FROM projects 
    WHERE organization_id IS NULL OR organization_id = 0
  `);
  
  if (projects.rows.length === 0) {
    console.log('No projects need updating.');
    return;
  }
  
  // Update projects
  await db.execute(`
    UPDATE projects 
    SET organization_id = ${organizationId}
    WHERE organization_id IS NULL OR organization_id = 0
  `);
  
  console.log(`Updated ${projects.rows.length} projects to organization ${organizationId}`);
}

// Setup super admin account
async function setupSuperAdmin() {
  const superAdminEmail = 'pawnmedia.ph@gmail.com';
  const user = await storage.getUserByEmail(superAdminEmail);
  
  if (!user) {
    console.log(`Super admin email ${superAdminEmail} not found. Skipping.`);
    return;
  }
  
  // Update user to be super admin
  try {
    // First check if the column exists
    await db.execute(`
      UPDATE users 
      SET is_super_admin = TRUE, 
          role = 'super_admin'
      WHERE email = '${superAdminEmail}'
    `);
    console.log(`Set ${superAdminEmail} as super_admin`);
  } catch (error) {
    console.error('Error setting super admin:', error);
  }
}

// Add existing users to the default organization
async function addUsersToOrganization(organizationId: number) {
  const allUsers = await storage.getAllUsers();
  
  for (const user of allUsers) {
    try {
      // We'll use raw SQL here to avoid issues with schema validation
      await db.execute(`
        INSERT INTO organization_users (organization_id, user_id, role)
        VALUES (${organizationId}, ${user.id}, '${user.role}')
        ON CONFLICT (organization_id, user_id) DO NOTHING
      `);
    } catch (error) {
      console.error(`Error adding user ${user.id} to organization:`, error);
    }
  }
  
  console.log(`Added ${allUsers.length} users to organization ${organizationId}`);
}

// Helper to check if a table exists
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = '${tableName}'
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
    const result = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = '${tableName}'
        AND column_name = '${columnName}'
      );
    `);
    return result.rows[0]?.exists === true;
  } catch (error) {
    console.error(`Error checking if column ${columnName} in table ${tableName} exists:`, error);
    return false;
  }
}