import React from 'react';
import { useLocation } from 'wouter';
import { useNotification } from '@/context/NotificationContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { Notification } from '@/types';

export function NotificationDropdown() {
  const { 
    notifications, 
    unreadCount, 
    isNotificationOpen, 
    toggleNotification,
    closeNotification,
    markAsRead,
    markAllAsRead,
    isLoading
  } = useNotification();
  const [, setLocation] = useLocation();

  // Get notification color based on type
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return 'bg-primary';
      case 'task_status_changed':
        return 'bg-green-500';
      case 'task_comment':
        return 'bg-yellow-500';
      case 'task_due_soon':
        return 'bg-red-500';
      case 'new_user':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Popover open={isNotificationOpen} onOpenChange={toggleNotification}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          data-notification-toggle
          className="relative text-gray-400 hover:text-white"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-block w-2 h-2 bg-red-500 rounded-full" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 bg-background border border-border"
        align="end"
      >
        <div className="p-3 border-b border-border">
          <h3 className="font-medium">Notifications</h3>
        </div>
        
        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="p-4 text-center text-gray-400">
              Loading notifications...
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notification: Notification) => (
              <div 
                key={notification.id} 
                className="p-3 border-b border-dark-border hover:bg-dark-border cursor-pointer"
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex">
                  <div className="flex-shrink-0 mr-3">
                    <span 
                      className={`inline-block w-2 h-2 ${getNotificationColor(notification.type)} rounded-full mt-2 ${notification.read ? 'opacity-40' : ''}`} 
                    />
                  </div>
                  <div>
                    <p className="text-sm">
                      {notification.task && (
                        <span className="font-medium">{notification.task.title}: </span>
                      )}
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(notification.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-400">
              No notifications yet
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="p-3 text-center border-t border-dark-border">
            <Button
              variant="link"
              size="sm"
              className="text-primary text-sm hover:underline"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
