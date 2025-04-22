import { storage } from '../storage';
import { generateRandomBarangayOrgName } from './barangayNames';

/**
 * Creates a random organization for a new supervisor user
 * This is used when a user registers with supervisor role without an invitation
 * 
 * @param userId The ID of the user to create the organization for
 * @returns The ID of the newly created organization
 */
export async function createRandomOrganizationForUser(userId: number): Promise<number> {
  try {
    // Get user details
    const user = await storage.getUserById(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Generate a random organization name based on Philippine barangay naming
    const orgName = generateRandomBarangayOrgName();
    
    // Generate a random address for the organization in the Philippines
    const cities = ['Manila', 'Quezon City', 'Cebu', 'Davao', 'Makati', 'Taguig', 'Pasig', 'Cagayan de Oro', 'Iloilo', 'Baguio'];
    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    
    const address = `${Math.floor(Math.random() * 1000) + 1} ${orgName.split(' ')[1]} Street, ${randomCity}`;
    
    // Generate a random phone number with Philippine format
    const phoneNumber = `+63${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
    
    // Create organization with the random name and details
    const organization = await storage.createOrganization({
      name: orgName,
      description: `Auto-generated organization for supervisor ${user.fullName || user.username}`,
      address,
      phone: phoneNumber,
      email: user.email,
      logoUrl: null
    });
    
    // Add the user as a supervisor in the organization
    await storage.addUserToOrganization(userId, organization.id, 'supervisor');
    
    // Get the super admin email and add them to the organization as well
    const superAdminEmail = await storage.getSuperAdminEmail();
    const superAdmin = await storage.getUserByEmail(superAdminEmail);
    
    if (superAdmin) {
      await storage.addUserToOrganization(superAdmin.id, organization.id, 'super_admin');
    }
    
    // Return the organization ID
    return organization.id;
  } catch (error) {
    console.error('Error creating random organization for user:', error);
    throw error;
  }
}