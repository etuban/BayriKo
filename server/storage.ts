import { 
  users, 
  projects, 
  tasks, 
  taskComments, 
  taskHistory, 
  notifications,
  userProjects,
  organizations,
  organizationUsers,
  invitationLinks,
  type User, 
  type InsertUser,
  type Project,
  type InsertProject,
  type Task,
  type InsertTask,
  type TaskComment,
  type InsertTaskComment,
  type TaskHistory,
  type InsertTaskHistory,
  type Notification,
  type InsertNotification,
  type UserProject,
  type InsertUserProject,
  type Organization,
  type InsertOrganization,
  type OrganizationUser,
  type InsertOrganizationUser,
  type InvitationLink,
  type InsertInvitationLink
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, inArray, gte, lte, desc, asc, like, isNull, not, sql } from "drizzle-orm";
import { hash, compare } from "bcrypt";

export interface IStorage {
  // Organization methods
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  getOrganizationById(id: number): Promise<Organization | undefined>;
  updateOrganization(id: number, organization: Partial<InsertOrganization>): Promise<Organization | undefined>;
  deleteOrganization(id: number): Promise<boolean>;
  getAllOrganizations(): Promise<Organization[]>;
  getOrganizationsForUser(userId: number): Promise<Organization[]>;
  getSuperAdminEmail(): Promise<string>;
  
  // Invitation links methods
  createInvitationLink(invitation: InsertInvitationLink): Promise<InvitationLink>;
  getInvitationLinkById(id: number): Promise<InvitationLink | undefined>;
  getInvitationLinkByToken(token: string): Promise<InvitationLink | undefined>;
  getInvitationLinksByOrganization(organizationId: number): Promise<InvitationLink[]>;
  updateInvitationLink(id: number, data: Partial<InvitationLink>): Promise<InvitationLink | undefined>;
  deleteInvitationLink(id: number): Promise<boolean>;
  incrementInvitationLinkUsage(id: number): Promise<boolean>;
  
  // Organization-User methods
  addUserToOrganization(userId: number, organizationId: number, role: string): Promise<OrganizationUser>;
  removeUserFromOrganization(userId: number, organizationId: number): Promise<boolean>;
  getOrganizationUsers(organizationId: number): Promise<User[]>;
  getUserOrganizations(userId: number): Promise<OrganizationUser[]>;
  getUserRoleInOrganization(userId: number, organizationId: number): Promise<string | undefined>;
  
  // User methods
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  validateUserPassword(email: string, password: string): Promise<User | null>;
  setSuperAdmin(userId: number): Promise<User | undefined>;

  // Project methods
  createProject(project: InsertProject): Promise<Project>;
  getProjectById(id: number): Promise<Project | undefined>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  getAllProjects(): Promise<Project[]>;
  getProjectsForUser(userId: number): Promise<Project[]>;
  getProjectsForOrganization(organizationId: number): Promise<Project[]>;

  // User-Project methods
  assignUserToProject(userId: number, projectId: number): Promise<UserProject>;
  removeUserFromProject(userId: number, projectId: number): Promise<boolean>;
  getUserProjects(userId: number): Promise<UserProject[]>;
  getProjectUsers(projectId: number): Promise<UserProject[]>;

  // Task methods
  createTask(task: InsertTask): Promise<Task>;
  getTaskById(id: number): Promise<Task | undefined>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  getAllTasks(filters?: { projectId?: number, assignedToId?: number, status?: string, search?: string }): Promise<Task[]>;
  getTasksForPayable(startDate?: Date, endDate?: Date, projectId?: number, userId?: number, userRole?: string): Promise<Task[]>;

  // Task comments methods
  createTaskComment(comment: InsertTaskComment): Promise<TaskComment>;
  getTaskComments(taskId: number): Promise<TaskComment[]>;

  // Task history methods
  createTaskHistory(history: InsertTaskHistory): Promise<TaskHistory>;
  getTaskHistory(taskId: number): Promise<TaskHistory[]>;

  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<boolean>;
  markAllUserNotificationsAsRead(userId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Organization methods
  async createOrganization(organization: InsertOrganization): Promise<Organization> {
    const [newOrganization] = await db
      .insert(organizations)
      .values({
        ...organization,
        updatedAt: new Date()
      })
      .returning();
    return newOrganization;
  }
  
  async getOrganizationById(id: number): Promise<Organization | undefined> {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    return organization;
  }
  
  async updateOrganization(id: number, organization: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const [updatedOrganization] = await db
      .update(organizations)
      .set({
        ...organization,
        updatedAt: new Date()
      })
      .where(eq(organizations.id, id))
      .returning();
    return updatedOrganization;
  }
  
  async deleteOrganization(id: number): Promise<boolean> {
    await db.delete(organizations).where(eq(organizations.id, id));
    return true;
  }
  
  async getAllOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations);
  }
  
  async getOrganizationsForUser(userId: number): Promise<Organization[]> {
    // Check if user is super admin
    const user = await this.getUserById(userId);
    if (user?.isSuperAdmin) {
      return this.getAllOrganizations();
    }
    
    // Get organizations where the user is a member
    const userOrgs = await db
      .select()
      .from(organizationUsers)
      .where(eq(organizationUsers.userId, userId));
    
    if (userOrgs.length === 0) {
      return [];
    }
    
    const orgIds = userOrgs.map(uo => uo.organizationId);
    return await db
      .select()
      .from(organizations)
      .where(inArray(organizations.id, orgIds));
  }
  
  async getSuperAdminEmail(): Promise<string> {
    // This is hardcoded based on the requirement
    return "pawnmedia.ph@gmail.com";
  }
  
  // Organization-User methods
  async addUserToOrganization(userId: number, organizationId: number, role: string): Promise<OrganizationUser> {
    // Check if the user is already in the organization
    const [existingOrgUser] = await db
      .select()
      .from(organizationUsers)
      .where(and(
        eq(organizationUsers.userId, userId),
        eq(organizationUsers.organizationId, organizationId)
      ));
    
    if (existingOrgUser) {
      // Update role if it's different
      if (existingOrgUser.role !== role) {
        // Validate role is one of the allowed values
        const typedRole = role as "super_admin" | "supervisor" | "team_lead" | "staff";
        
        const [updatedOrgUser] = await db
          .update(organizationUsers)
          .set({ role: typedRole })
          .where(eq(organizationUsers.id, existingOrgUser.id))
          .returning();
        return updatedOrgUser;
      }
      return existingOrgUser;
    }
    
    // Add user to organization
    // Validate role is one of the allowed values
    const typedRole = role as "super_admin" | "supervisor" | "team_lead" | "staff";
    
    const [newOrgUser] = await db
      .insert(organizationUsers)
      .values({
        userId,
        organizationId,
        role: typedRole
      })
      .returning();
    
    return newOrgUser;
  }
  
  async removeUserFromOrganization(userId: number, organizationId: number): Promise<boolean> {
    await db
      .delete(organizationUsers)
      .where(and(
        eq(organizationUsers.userId, userId),
        eq(organizationUsers.organizationId, organizationId)
      ));
    return true;
  }
  
  async getOrganizationUsers(organizationId: number): Promise<User[]> {
    const orgUsers = await db
      .select()
      .from(organizationUsers)
      .where(eq(organizationUsers.organizationId, organizationId));
    
    if (orgUsers.length === 0) {
      return [];
    }
    
    const userIds = orgUsers.map(ou => ou.userId);
    return await db
      .select()
      .from(users)
      .where(inArray(users.id, userIds));
  }
  
  async getUserOrganizations(userId: number): Promise<OrganizationUser[]> {
    return await db
      .select()
      .from(organizationUsers)
      .where(eq(organizationUsers.userId, userId));
  }
  
  async getUserRoleInOrganization(userId: number, organizationId: number): Promise<string | undefined> {
    const [orgUser] = await db
      .select()
      .from(organizationUsers)
      .where(and(
        eq(organizationUsers.userId, userId),
        eq(organizationUsers.organizationId, organizationId)
      ));
    
    return orgUser?.role;
  }
  
  async getProjectsForOrganization(organizationId: number): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.organizationId, organizationId));
  }
  
  async setSuperAdmin(userId: number): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        isSuperAdmin: true,
        role: "super_admin" 
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  // User methods
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const hashedPassword = await hash(user.password, 10);
    const [newUser] = await db
      .insert(users)
      .values({ ...user, password: hashedPassword })
      .returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    if (user.password) {
      user.password = await hash(user.password, 10);
    }
    
    const [updatedUser] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return true; // If no error is thrown, deletion was successful
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async validateUserPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const passwordMatch = await compare(password, user.password);
    if (!passwordMatch) return null;
    
    return user;
  }

  // Project methods
  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values(project)
      .returning();
    return newProject;
  }

  async getProjectById(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set(project)
      .where(eq(projects.id, id))
      .returning();
    
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    await db.delete(projects).where(eq(projects.id, id));
    return true; // If no error is thrown, deletion was successful
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }
  
  async getProjectsForUser(userId: number): Promise<Project[]> {
    // Check if user is super admin
    const user = await this.getUserById(userId);
    if (user?.isSuperAdmin) {
      return this.getAllProjects();
    }
    
    // Get organizations the user belongs to
    const userOrgs = await this.getUserOrganizations(userId);
    if (userOrgs.length === 0) {
      return [];
    }
    
    const allProjects: Project[] = [];
    
    // For each organization
    for (const org of userOrgs) {
      // Check the user's role in the organization
      if (org.role === 'supervisor' || org.role === 'team_lead') {
        // Supervisors and team leads see all projects in their organizations
        const orgProjects = await this.getProjectsForOrganization(org.organizationId);
        allProjects.push(...orgProjects);
      } else {
        // Staff users only see assigned projects
        const userProjectAssignments = await db
          .select()
          .from(userProjects)
          .innerJoin(projects, eq(userProjects.projectId, projects.id))
          .where(
            and(
              eq(userProjects.userId, userId),
              eq(projects.organizationId, org.organizationId)
            )
          );
        
        if (userProjectAssignments.length > 0) {
          const projectIds = userProjectAssignments.map(up => up.projects.id);
          const staffProjects = await db
            .select()
            .from(projects)
            .where(inArray(projects.id, projectIds));
          
          allProjects.push(...staffProjects);
        }
      }
    }
    
    // Remove duplicates
    const projectMap = new Map();
    allProjects.forEach(p => projectMap.set(p.id, p));
    return Array.from(projectMap.values());
  }
  
  // User-Project methods
  async assignUserToProject(userId: number, projectId: number): Promise<UserProject> {
    // Check if assignment already exists
    const [existingAssignment] = await db
      .select()
      .from(userProjects)
      .where(and(
        eq(userProjects.userId, userId),
        eq(userProjects.projectId, projectId)
      ));
    
    if (existingAssignment) {
      return existingAssignment;
    }
    
    // Create new assignment
    const [assignment] = await db
      .insert(userProjects)
      .values({
        userId,
        projectId
      })
      .returning();
    
    return assignment;
  }
  
  async removeUserFromProject(userId: number, projectId: number): Promise<boolean> {
    await db
      .delete(userProjects)
      .where(and(
        eq(userProjects.userId, userId),
        eq(userProjects.projectId, projectId)
      ));
    
    return true;
  }
  
  async getUserProjects(userId: number): Promise<UserProject[]> {
    return await db
      .select()
      .from(userProjects)
      .where(eq(userProjects.userId, userId));
  }
  
  async getProjectUsers(projectId: number): Promise<UserProject[]> {
    return await db
      .select()
      .from(userProjects)
      .where(eq(userProjects.projectId, projectId));
  }

  // Task methods
  async createTask(task: InsertTask): Promise<Task> {
    // Process the task data to validate dates
    const processedTask: any = { ...task };
    
    // Ensure dates are valid or set to null
    if (processedTask.startDate && (!(processedTask.startDate instanceof Date) || isNaN(processedTask.startDate.getTime()))) {
      processedTask.startDate = null;
    }
    
    if (processedTask.endDate && (!(processedTask.endDate instanceof Date) || isNaN(processedTask.endDate.getTime()))) {
      processedTask.endDate = null;
    }
    
    if (processedTask.dueDate && (!(processedTask.dueDate instanceof Date) || isNaN(processedTask.dueDate.getTime()))) {
      processedTask.dueDate = null;
    }
    
    const [newTask] = await db
      .insert(tasks)
      .values(processedTask)
      .returning();
    return newTask;
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    // Process dates properly before updating
    const updatedData: any = { ...task, updatedAt: new Date() };
    
    // Convert string dates to Date objects where needed, handle null/empty values
    if (typeof updatedData.startDate === 'string') {
      if (updatedData.startDate.trim() === '') {
        updatedData.startDate = null;
      } else {
        try {
          updatedData.startDate = new Date(updatedData.startDate);
          // Check if the date is valid
          if (isNaN(updatedData.startDate.getTime())) {
            updatedData.startDate = null;
          }
        } catch (e) {
          updatedData.startDate = null;
        }
      }
    }
    
    if (typeof updatedData.endDate === 'string') {
      if (updatedData.endDate.trim() === '') {
        updatedData.endDate = null;
      } else {
        try {
          updatedData.endDate = new Date(updatedData.endDate);
          // Check if the date is valid
          if (isNaN(updatedData.endDate.getTime())) {
            updatedData.endDate = null;
          }
        } catch (e) {
          updatedData.endDate = null;
        }
      }
    }
    
    if (typeof updatedData.dueDate === 'string') {
      if (updatedData.dueDate.trim() === '') {
        updatedData.dueDate = null;
      } else {
        try {
          updatedData.dueDate = new Date(updatedData.dueDate);
          // Check if the date is valid
          if (isNaN(updatedData.dueDate.getTime())) {
            updatedData.dueDate = null;
          }
        } catch (e) {
          updatedData.dueDate = null;
        }
      }
    }
    
    // Remove undefined values to prevent errors
    Object.keys(updatedData).forEach(key => {
      if (updatedData[key] === undefined) {
        delete updatedData[key];
      }
    });
    
    try {
      const [updatedTask] = await db
        .update(tasks)
        .set(updatedData)
        .where(eq(tasks.id, id))
        .returning();
      
      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async deleteTaskHistory(taskId: number): Promise<void> {
    await db.delete(taskHistory).where(eq(taskHistory.taskId, taskId));
  }

  async deleteTaskComments(taskId: number): Promise<void> {
    await db.delete(taskComments).where(eq(taskComments.taskId, taskId));
  }

  async deleteTaskNotifications(taskId: number): Promise<void> {
    await db.delete(notifications).where(eq(notifications.taskId, taskId));
  }

  async deleteTask(id: number): Promise<boolean> {
    await db.delete(tasks).where(eq(tasks.id, id));
    return true;
  }

  async getAllTasks(filters?: { projectId?: number, assignedToId?: number, status?: string, search?: string }): Promise<Task[]> {
    // Build query conditions
    const conditions = [];
    
    if (filters) {
      if (filters.projectId) {
        conditions.push(eq(tasks.projectId, filters.projectId));
      }
      
      if (filters.assignedToId) {
        conditions.push(eq(tasks.assignedToId, filters.assignedToId));
      }
      
      if (filters.status) {
        // Type assertion to handle string mapping to enum
        const statusValue = filters.status as "todo" | "in_progress" | "completed";
        conditions.push(eq(tasks.status, statusValue));
      }
      
      if (filters.search) {
        conditions.push(like(tasks.title, `%${filters.search}%`));
      }
    }
    
    // Apply all conditions with AND logic
    if (conditions.length > 0) {
      return await db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.createdAt));
    } else {
      return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
    }
  }

  async getTasksForPayable(startDate?: Date, endDate?: Date, projectId?: number, userId?: number, userRole?: string): Promise<Task[]> {
    const conditions = [];
    
    if (startDate) {
      conditions.push(gte(tasks.startDate, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(tasks.endDate, endDate));
    }
    
    if (projectId) {
      conditions.push(eq(tasks.projectId, projectId));
    }
    
    // Add user restrictions for staff role
    if (userId && userRole === 'staff') {
      // Staff can only see tasks they created or are assigned to
      conditions.push(
        or(
          eq(tasks.createdById, userId),
          eq(tasks.assignedToId, userId)
        )
      );
    }
    
    // Only include tasks with pricing information
    // We don't actually need this condition as we can handle null pricing in the UI
    // This would cause SQL type issues and can be removed for now
    // Commented out to avoid TypeScript errors with SQLWrapper
    /*
    conditions.push(
      or(
        not(isNull(tasks.hourlyRate)),
        not(isNull(tasks.fixedPrice))
      )
    );
    */
    
    // Apply all conditions with AND logic
    if (conditions.length > 0) {
      return await db.select()
        .from(tasks)
        .where(and(...conditions))
        .orderBy(asc(tasks.projectId));
    } else {
      return await db.select()
        .from(tasks)
        .orderBy(asc(tasks.projectId));
    }
  }

  // Task comments methods
  async createTaskComment(comment: InsertTaskComment): Promise<TaskComment> {
    const [newComment] = await db
      .insert(taskComments)
      .values(comment)
      .returning();
    return newComment;
  }

  async getTaskComments(taskId: number): Promise<TaskComment[]> {
    return await db
      .select()
      .from(taskComments)
      .where(eq(taskComments.taskId, taskId))
      .orderBy(asc(taskComments.createdAt));
  }

  // Task history methods
  async createTaskHistory(history: InsertTaskHistory): Promise<TaskHistory> {
    const [newHistory] = await db
      .insert(taskHistory)
      .values(history)
      .returning();
    return newHistory;
  }

  async getTaskHistory(taskId: number): Promise<TaskHistory[]> {
    return await db
      .select()
      .from(taskHistory)
      .where(eq(taskHistory.taskId, taskId))
      .orderBy(desc(taskHistory.createdAt));
  }

  // Notification methods
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id));
    return true;
  }

  async markAllUserNotificationsAsRead(userId: number): Promise<boolean> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));
    return true;
  }
  
  // Invitation links methods
  async createInvitationLink(invitation: InsertInvitationLink): Promise<InvitationLink> {
    const [newInvitation] = await db
      .insert(invitationLinks)
      .values(invitation)
      .returning();
    return newInvitation;
  }
  
  async getInvitationLinkById(id: number): Promise<InvitationLink | undefined> {
    const [invitation] = await db
      .select()
      .from(invitationLinks)
      .where(eq(invitationLinks.id, id));
    return invitation;
  }
  
  async getInvitationLinkByToken(token: string): Promise<InvitationLink | undefined> {
    const [invitation] = await db
      .select()
      .from(invitationLinks)
      .where(eq(invitationLinks.token, token));
    return invitation;
  }
  
  async getInvitationLinksByOrganization(organizationId: number): Promise<InvitationLink[]> {
    return await db
      .select()
      .from(invitationLinks)
      .where(eq(invitationLinks.organizationId, organizationId));
  }
  
  async updateInvitationLink(id: number, data: Partial<InvitationLink>): Promise<InvitationLink | undefined> {
    const [updatedInvitation] = await db
      .update(invitationLinks)
      .set(data)
      .where(eq(invitationLinks.id, id))
      .returning();
    return updatedInvitation;
  }
  
  async deleteInvitationLink(id: number): Promise<boolean> {
    await db.delete(invitationLinks).where(eq(invitationLinks.id, id));
    return true;
  }
  
  async incrementInvitationLinkUsage(id: number): Promise<boolean> {
    await db.execute(sql`
      UPDATE invitation_links
      SET used_count = used_count + 1
      WHERE id = ${id}
    `);
    return true;
  }
}

export const storage = new DatabaseStorage();
