import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TaskHistory as TaskHistoryType } from '@/types';
import { timeAgo } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

interface TaskHistoryProps {
  taskId: number;
}

export function TaskHistory({ taskId }: TaskHistoryProps) {
  // Fetch task history
  const { data: history = [], isLoading } = useQuery<TaskHistoryType[]>({
    queryKey: [`/api/tasks/${taskId}/history`],
    enabled: !!taskId,
  });
  
  // Format history entry for display
  const formatHistoryEntry = (entry: TaskHistoryType) => {
    const { action, details } = entry;
    
    switch (action) {
      case 'created':
        return 'created this task';
      case 'updated':
        if (details?.changes) {
          const changes = [];
          
          if (details.changes.status) {
            changes.push(`changed status from <span class="text-gray-400">${formatStatus(details.changes.status.from)}</span> to <span class="text-primary">${formatStatus(details.changes.status.to)}</span>`);
          }
          
          if (details.changes.assignedToId) {
            changes.push('updated the assigned user');
          }
          
          if (details.changes.dueDate) {
            changes.push('changed the due date');
          }
          
          if (changes.length > 0) {
            return changes.join(', ');
          }
          
          return 'updated this task';
        }
        return 'updated this task';
      case 'commented':
        return 'commented on this task';
      default:
        return action;
    }
  };
  
  // Format status for display
  const formatStatus = (status: string) => {
    switch (status) {
      case 'todo': return 'To Do';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-medium mb-3">Task History</h3>
      
      {isLoading ? (
        <div className="text-center py-4 border border-dark-border rounded-md">
          <span className="text-gray-400">Loading history...</span>
        </div>
      ) : history.length > 0 ? (
        <div className="border border-dark-border rounded-md divide-y divide-dark-border">
          {history.map((entry) => (
            <div key={entry.id} className="p-3">
              <div className="flex items-start">
                <Avatar className="h-8 w-8 mr-3">
                  <AvatarImage src={entry.user?.avatarUrl} alt={entry.user?.fullName} />
                  <AvatarFallback>{getInitials(entry.user?.fullName || '')}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm">
                    <span className="font-medium">{entry.user?.fullName}</span>
                    {' '}
                    <span dangerouslySetInnerHTML={{ __html: formatHistoryEntry(entry) }} />
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(entry.createdAt)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 border border-dark-border rounded-md">
          <span className="text-gray-400">No history available</span>
        </div>
      )}
    </div>
  );
}
