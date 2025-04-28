import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useParams, Link } from 'wouter';
import { 
  ChevronLeft, 
  Calendar, 
  Clock, 
  User, 
  Edit, 
  Trash2, 
  FolderKanban,
  MessageSquare
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Task } from '@/types';
import { formatDate, formatStatus, getStatusColor, formatHours, getInitials, formatPricing } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTask } from '@/context/TaskContext';
import { TaskComments } from '@/components/TaskComments';
import { TaskHistory } from '@/components/TaskHistory';

export default function TaskDetailsPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const taskId = parseInt(params.id);
  const { user } = useAuth();
  const { openDrawer, confirmDelete } = useTask();

  // Fetch task details
  const { data: task, isLoading, error } = useQuery<Task>({
    queryKey: [`/api/tasks/${taskId}`],
    enabled: !isNaN(taskId),
  });

  // Check if user can edit/delete based on role and ownership
  const canEdit = (task?: Task) => {
    if (!user || !task) return false;
    if (user.role === "super_admin" || user.role === "supervisor" || user.role === "team_lead") return true;
    return user.role === "staff" && task.assignedToId === user.id;
  };

  const canDelete = (task?: Task) => {
    if (!user || !task) return false;
    if (user.role === "super_admin" || user.role === "supervisor") return true;
    if (user.role === "team_lead" && task.createdById === user.id) return true;
    return user.role === "staff" && task.assignedToId === user.id;
  };

  // Handle navigation
  const goBack = () => {
    navigate('/tasks');
  };

  if (isLoading) {
    return <TaskDetailsSkeleton />;
  }

  if (error || !task) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-dark-surface border border-dark-border rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Error Loading Task</h2>
          <p className="text-gray-400 mb-6">We couldn't find the task you're looking for. It may have been deleted or you don't have permission to view it.</p>
          <Button onClick={goBack}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  const statusColor = getStatusColor(task.status);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={goBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Tasks
        </Button>
        
        <div className="flex gap-2">
          {canEdit(task) && (
            <Button 
              variant="outline" 
              className="text-primary hover:text-primary-foreground hover:bg-primary"
              onClick={() => openDrawer("edit", task.id)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Task
            </Button>
          )}
          
          {canDelete(task) && (
            <Button 
              variant="outline" 
              className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
              onClick={() => {
                confirmDelete(task.id);
                // Navigate back to tasks after confirmation
                navigate('/tasks');
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>
      
      <div className="bg-dark-surface border border-dark-border rounded-lg overflow-hidden">
        {/* Task Header */}
        <div className="p-6 border-b border-dark-border">
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-semibold mb-2">{task.title}</h1>
            <Badge 
              className={`${statusColor} text-white px-3 py-1 text-sm`}
            >
              {formatStatus(task.status)}
            </Badge>
          </div>
          
          {task.project && (
            <div className="flex items-center text-sm text-gray-400 mb-4">
              <FolderKanban className="mr-2 h-4 w-4" />
              {task.project.name}
            </div>
          )}
          
          {task.description && (
            <p className="text-gray-300 whitespace-pre-line mt-4">{task.description}</p>
          )}
        </div>
        
        {/* Task Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border-b border-dark-border">
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Assignment Details</h3>
            
            <div className="space-y-4">
              {/* Assignee */}
              <div className="flex items-start">
                <User className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Assigned To</div>
                  {task.assignedTo ? (
                    <div className="flex items-center mt-1">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage
                          src={task.assignedTo.avatarUrl}
                          alt={task.assignedTo.fullName}
                        />
                        <AvatarFallback className="text-xs">
                          {getInitials(task.assignedTo.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-sm">{task.assignedTo.fullName}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">Unassigned</div>
                  )}
                </div>
              </div>
              
              {/* Creator */}
              {task.createdBy && (
                <div className="flex items-start">
                  <User className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Created By</div>
                    <div className="flex items-center mt-1">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage
                          src={task.createdBy.avatarUrl}
                          alt={task.createdBy.fullName}
                        />
                        <AvatarFallback className="text-xs">
                          {getInitials(task.createdBy.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-sm">{task.createdBy.fullName}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Schedule & Tracking</h3>
            
            <div className="space-y-4">
              {/* Due Date */}
              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Due Date</div>
                  <div className="text-sm">{formatDate(task.dueDate)}</div>
                </div>
              </div>
              
              {/* Time tracking */}
              <div className="flex items-start">
                <Clock className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Time</div>
                  <div className="text-sm">{formatHours(task)}</div>
                </div>
              </div>
              
              {/* Pricing */}
              {task.pricingType && (
                <div className="flex items-start">
                  <div className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex items-center justify-center font-bold">$</div>
                  <div>
                    <div className="text-sm font-medium">Pricing</div>
                    <div className="text-sm">{formatPricing(task)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Comments Section */}
        <div className="p-6">
          <div className="flex items-center mb-4">
            <MessageSquare className="h-5 w-5 mr-2" />
            <h3 className="text-lg font-medium">Comments & Activity</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-400">Comments</h4>
              <TaskComments taskId={task.id} />
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-400">History</h4>
              <TaskHistory taskId={task.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton loader for task details
function TaskDetailsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-10 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      
      <div className="bg-dark-surface border border-dark-border rounded-lg overflow-hidden">
        <div className="p-6 border-b border-dark-border">
          <div className="flex justify-between items-start">
            <Skeleton className="h-8 w-96 mb-2" />
            <Skeleton className="h-6 w-24" />
          </div>
          
          <Skeleton className="h-5 w-48 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border-b border-dark-border">
          <div>
            <Skeleton className="h-5 w-36 mb-4" />
            
            <div className="space-y-6">
              <div className="flex">
                <Skeleton className="h-10 w-10 rounded-full mr-3" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
              
              <div className="flex">
                <Skeleton className="h-10 w-10 rounded-full mr-3" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <Skeleton className="h-5 w-36 mb-4" />
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
              
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
              
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <Skeleton className="h-6 w-48 mb-6" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-24 w-full" />
            </div>
            
            <div className="space-y-4">
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}