import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTask } from '@/context/TaskContext';
import { Task } from '@/types';
import { formatDate, formatStatus, getStatusColor, formatPricing } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

interface TaskTableProps {
  tasks: Task[];
}

export function TaskTable({ tasks }: TaskTableProps) {
  const { user } = useAuth();
  const { openDrawer, confirmDelete } = useTask();
  
  // Check if user can edit/delete based on role and ownership
  const canEdit = (task: Task) => {
    if (user?.role === 'supervisor' || user?.role === 'team_lead') return true;
    return user?.role === 'staff' && task.assignedToId === user?.id;
  };
  
  const canDelete = (task: Task) => {
    if (user?.role === 'supervisor') return true;
    return user?.role === 'staff' && task.assignedToId === user?.id;
  };

  return (
    <div className="bg-dark-surface border border-dark-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-dark-border">
          <thead>
            <tr className="bg-dark-surface">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Task</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Project</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Assigned To</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {tasks.map((task) => {
              const statusColors = getStatusColor(task.status);
              return (
                <tr 
                  key={task.id} 
                  className="task-row hover:bg-dark-border/30 cursor-pointer"
                  onClick={() => openDrawer('view', task.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-gray-400 max-w-md truncate">{task.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{task.project?.name || 'Unknown Project'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {task.assignedTo ? (
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={task.assignedTo.avatarUrl} alt={task.assignedTo.fullName} />
                          <AvatarFallback>{getInitials(task.assignedTo.fullName)}</AvatarFallback>
                        </Avatar>
                        <div className="ml-3">
                          <div className="text-sm font-medium">{task.assignedTo.fullName}</div>
                          <div className="text-xs text-gray-400">{task.assignedTo.position || task.assignedTo.role}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">Unassigned</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{formatDate(task.dueDate)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors.bg} ${statusColors.text}`}>
                      {formatStatus(task.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {formatPricing(task)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {canEdit(task) && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-primary hover:text-primary/80 mr-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDrawer('edit', task.id);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                    {canDelete(task) && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(task.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Pagination - We'll implement a simple version for now */}
      <div className="px-6 py-4 border-t border-dark-border flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Showing <span className="font-medium">{Math.min(1, tasks.length)}</span> to <span className="font-medium">{tasks.length}</span> of <span className="font-medium">{tasks.length}</span> results
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm" className="bg-primary text-white" disabled>
            1
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
