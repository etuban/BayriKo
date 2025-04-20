import { Request, Response } from 'express';
import { storage } from '../storage';

export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const notifications = await storage.getUserNotifications(userId);
    
    // Get related task information
    const notificationsWithTask = await Promise.all(notifications.map(async (notification) => {
      if (notification.taskId) {
        const task = await storage.getTaskById(notification.taskId);
        return {
          ...notification,
          task
        };
      }
      return notification;
    }));
    
    res.status(200).json(notificationsWithTask);
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);
    
    // TODO: Verify that the notification belongs to the current user
    
    await storage.markNotificationAsRead(notificationId);
    
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    await storage.markAllUserNotificationsAsRead(userId);
    
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
