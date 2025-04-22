import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import * as userController from './controllers/userController';
import * as taskController from './controllers/taskController';
import * as projectController from './controllers/projectController';
import * as notificationController from './controllers/notificationController';
import * as organizationController from './controllers/organizationController';
import * as invitationController from './controllers/invitationController';
import { authenticateUser, authorizeRole } from './middleware/auth';
import { runDatabaseMigration } from './dbMigration';
import MemoryStore from 'memorystore';

// Create memory store for sessions
const MemoryStoreSession = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Session setup
  app.use(session({
    cookie: { maxAge: 86400000 }, // 24 hours
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || 'mybyd-secret'
  }));

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    userController.authenticateUser
  ));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Authentication routes
  app.post('/api/auth/login', passport.authenticate('local'), userController.login);
  app.post('/api/auth/register', userController.register);
  app.post('/api/auth/logout', userController.logout);
  app.get('/api/auth/session', userController.getSession);

  // User routes
  app.get('/api/users', authenticateUser, authorizeRole(['super_admin', 'supervisor', 'team_lead']), userController.getAllUsers);
  app.get('/api/users/:id', authenticateUser, userController.getUserById);
  app.post('/api/users', authenticateUser, authorizeRole(['super_admin', 'supervisor']), userController.createUser);
  app.put('/api/users/:id', authenticateUser, userController.updateUser);
  app.delete('/api/users/:id', authenticateUser, authorizeRole(['super_admin', 'supervisor']), userController.deleteUser);
  
  // User-Project routes
  app.get('/api/users/:id/projects', authenticateUser, userController.getUserProjects);
  app.post('/api/users/:id/projects', authenticateUser, authorizeRole(['super_admin', 'supervisor']), userController.assignProjectsToUser);
  
  // User-Organization routes
  app.get('/api/users/:id/organizations', authenticateUser, userController.getUserOrganizations);
  app.get('/api/users/organizations/current', authenticateUser, userController.getCurrentUserOrganizations);

  // Task routes
  app.get('/api/tasks', authenticateUser, taskController.getAllTasks);
  app.get('/api/tasks/:id', authenticateUser, taskController.getTaskById);
  app.post('/api/tasks', authenticateUser, taskController.createTask);
  app.put('/api/tasks/:id', authenticateUser, taskController.updateTask);
  app.delete('/api/tasks/:id', authenticateUser, taskController.deleteTask);
  
  // Task comments
  app.get('/api/tasks/:id/comments', authenticateUser, taskController.getTaskComments);
  app.post('/api/tasks/:id/comments', authenticateUser, taskController.addTaskComment);
  
  // Task history
  app.get('/api/tasks/:id/history', authenticateUser, taskController.getTaskHistory);
  
  // Project routes
  app.get('/api/projects', authenticateUser, projectController.getAllProjects);
  app.get('/api/projects/:id', authenticateUser, projectController.getProjectById);
  app.post('/api/projects', authenticateUser, authorizeRole(['super_admin', 'supervisor', 'team_lead']), projectController.createProject);
  app.put('/api/projects/:id', authenticateUser, authorizeRole(['super_admin', 'supervisor', 'team_lead']), projectController.updateProject);
  app.delete('/api/projects/:id', authenticateUser, authorizeRole(['super_admin', 'supervisor']), projectController.deleteProject);

  // Notification routes
  app.get('/api/notifications', authenticateUser, notificationController.getUserNotifications);
  app.put('/api/notifications/:id/read', authenticateUser, notificationController.markNotificationAsRead);
  app.put('/api/notifications/read-all', authenticateUser, notificationController.markAllNotificationsAsRead);

  // Task payable route
  app.get('/api/tasks/payable/report', authenticateUser, taskController.getTaskPayableReport);
  
  // Organization routes
  app.get('/api/organizations', authenticateUser, organizationController.getAllOrganizations);
  app.get('/api/organizations/:id', authenticateUser, organizationController.getOrganizationById);
  app.post('/api/organizations', authenticateUser, authorizeRole(['super_admin', 'supervisor']), organizationController.createOrganization);
  app.put('/api/organizations/:id', authenticateUser, authorizeRole(['super_admin', 'supervisor']), organizationController.updateOrganization);
  app.delete('/api/organizations/:id', authenticateUser, authorizeRole(['super_admin']), organizationController.deleteOrganization);
  
  // Invitation link routes
  app.post('/api/invitations', authenticateUser, authorizeRole(['super_admin', 'supervisor']), invitationController.createInvitationLink);
  app.get('/api/organizations/:id/invitations', authenticateUser, invitationController.getOrganizationInvitationLinks);
  app.delete('/api/invitations/:id', authenticateUser, invitationController.deleteInvitationLink);
  
  // Public invitation validation routes (no auth required)
  app.get('/api/invitations/validate/:token', invitationController.validateInvitationToken);
  app.post('/api/invitations/use/:token', invitationController.useInvitationLink);

  // Run database migrations
  try {
    await runDatabaseMigration();
  } catch (error) {
    console.error('Database migration error:', error);
  }

  // Seed admin user
  await userController.seedAdminUser();

  const httpServer = createServer(app);
  return httpServer;
}
