import { Request, Response, NextFunction } from 'express';

// Extend Express.User interface to include our user properties
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      fullName: string;
      role: "super_admin" | "supervisor" | "team_lead" | "staff";
      avatarUrl?: string | null;
      position?: string | null;
      isApproved: boolean;
      isSuperAdmin?: boolean;
      createdAt: Date;
      currentOrganizationId?: number;
    }
  }
}

export const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Check if user is approved (supervisors and super_admins are auto-approved)
  if (req.user && !req.user.isApproved && 
      req.user.role !== 'supervisor' && 
      req.user.role !== 'super_admin' && 
      !req.user.isSuperAdmin) {
    return res.status(403).json({ message: 'Account pending approval. Please contact an administrator.' });
  }
  
  next();
};

export const authorizeRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Super admin can access all routes regardless of role requirements
    if (req.user.role === 'super_admin' || req.user.isSuperAdmin) {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};

export const canManageTask = (req: Request, res: Response, next: NextFunction) => {
  const { user } = req;
  const taskId = parseInt(req.params.id);
  
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Super admin can manage all tasks
  if (user.role === 'super_admin' || user.isSuperAdmin) {
    return next();
  }

  // Supervisors and Team Leads can manage any task
  if (user.role === 'supervisor' || user.role === 'team_lead') {
    return next();
  }

  // Staff can only manage their own tasks
  if (user.role === 'staff') {
    // Get the task from storage and check if user is the assignee or creator
    // This logic will be implemented in taskController.ts
    return next();
  }
  
  return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
};
