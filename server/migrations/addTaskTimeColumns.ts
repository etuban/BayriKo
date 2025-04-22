import { pool } from "../db";

/**
 * This migration adds timeSpent and completedAt columns to the tasks table
 */
export async function addTaskTimeColumns() {
  console.log("Adding timeSpent and completedAt columns to tasks table...");
  
  try {
    // Check if timeSpent column exists
    const timeSpentExists = await checkColumnExists('tasks', 'time_spent');
    if (!timeSpentExists) {
      await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN time_spent INTEGER DEFAULT 0
      `);
      console.log("Added time_spent column to tasks table");
    } else {
      console.log("time_spent column already exists");
    }
    
    // Check if completedAt column exists
    const completedAtExists = await checkColumnExists('tasks', 'completed_at');
    if (!completedAtExists) {
      await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN completed_at TIMESTAMP
      `);
      console.log("Added completed_at column to tasks table");
    } else {
      console.log("completed_at column already exists");
    }
    
    console.log("Task time columns migration completed successfully");
  } catch (error) {
    console.error("Error during task time columns migration:", error);
    throw error;
  }
}

async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = $1
      AND column_name = $2
    )
  `, [tableName, columnName]);
  
  return result.rows[0].exists;
}