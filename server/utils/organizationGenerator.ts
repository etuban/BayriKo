import { storage } from '../storage';
import { generateRandomBarangayOrgName } from './barangayNames';

/**
 * Creates a random organization for a new supervisor user
 * @param userId The ID of the user to assign as creator
 * @returns The ID of the created organization
 */
export async function createRandomOrganizationForUser(userId: number): Promise<number> {
  try {
    // Generate a random organization name
    const orgName = generateRandomBarangayOrgName();
    
    // Create the organization
    const newOrg = await storage.createOrganization({
      name: orgName,
      description: `Auto-generated organization for new supervisor account`,
      createdById: userId
    });
    
    // Add the user to the organization as a supervisor
    await storage.addUserToOrganization(userId, newOrg.id, 'supervisor');
    
    return newOrg.id;
  } catch (error) {
    console.error('Error creating random organization:', error);
    throw error;
  }
}