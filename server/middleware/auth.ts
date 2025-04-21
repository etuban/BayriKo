import { Request, Response, NextFunction } from 'express';

// Extend Express.User interface to include our user properties
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      fullName: string;
      role: "supervisor" | "team_lead" | "staff";
      avatarUrl?: string | null;
      position?: string | null;
      isApproved: boolean;
      createdAt: Date;
    }
  }
}

export const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Check if user is approved (supervisors are auto-approved)
  if (req.user && !req.user.isApproved && req.user.role !== 'supervisor') {
    return res.status(403).json({ message: 'Account pending approval. Please contact an administrator.' });
  }
  
  next();
};

export const authorizeRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
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
