import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * This function adds the firebase_uid column to the users table
 */
export async function addFirebaseUidColumn() {
  console.log('Checking for firebase_uid column in users table...');
  
  try {
    // Check if the column already exists
    const columnExists = await checkColumnExists('users', 'firebase_uid');
    
    if (!columnExists) {
      console.log('Adding firebase_uid column to users table...');
      
      // Add the firebase_uid column
      await db.execute(sql`
        ALTER TABLE "users" 
        ADD COLUMN IF NOT EXISTS "firebase_uid" TEXT;
      `);
      
      console.log('firebase_uid column added successfully');
    } else {
      console.log('firebase_uid column already exists');
    }
    
    return true;
  } catch (error) {
    console.error('Error adding firebase_uid column:', error);
    throw error;
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