import React, { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTask } from "@/context/TaskContext";
import { Task } from "@/types";
import { useLocation } from "wouter";
import {
  formatDate,
  formatStatus,
  getStatusColor,
  formatPricing,
  formatHours,
  calculateHours,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  Trash2,
  FolderKanban,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ArrowUpDown,
  ExternalLink,
  Calendar,
  Clock,
  User
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

interface TaskTableProps {
  tasks: Task[];
}

export function TaskTable({ tasks }: TaskTableProps) {
  const { user } = useAuth();
  const { openDrawer, confirmDelete } = useTask();
  const [, navigate] = useLocation();
  
  // Sorting state
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Check if user can edit/delete based on role and ownership
  const canEdit = (task: Task) => {
    if (!user) return false;
    if (user.role === "super_admin" || user.role === "supervisor" || user.role === "team_lead") return true;
    return user.role === "staff" && task.assignedToId === user.id;
  };

  const canDelete = (task: Task) => {
    if (!user) return false;
    if (user.role === "super_admin" || user.role === "supervisor") return true;
    if (user.role === "team_lead" && task.createdById === user.id) return true;
    return user.role === "staff" && task.assignedToId === user.id;
  };

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field is clicked
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field and reset direction to asc
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Get sort icon for column headers
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1" />;
    }
    
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 ml-1" />
      : <ChevronDown className="w-4 h-4 ml-1" />;
  };
  
  // Sort tasks based on current sort field and direction
  const sortTasks = (tasksToSort: Task[]) => {
    if (!sortField) return tasksToSort;
    
    return [...tasksToSort].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'assignedTo':
          aValue = a.assignedTo?.fullName?.toLowerCase() || '';
          bValue = b.assignedTo?.fullName?.toLowerCase() || '';
          break;
        case 'dueDate':
          aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'hours':
          // For hours, we need to handle fixed price differently
          if (a.pricingType === 'fixed' && b.pricingType === 'fixed') {
            aValue = 0;
            bValue = 0;
          } else if (a.pricingType === 'fixed') {
            aValue = 0;
            bValue = b.timeSpent || calculateHours(b.startDate, b.endDate, b.startTime, b.endTime) || 0;
          } else if (b.pricingType === 'fixed') {
            aValue = a.timeSpent || calculateHours(a.startDate, a.endDate, a.startTime, a.endTime) || 0;
            bValue = 0;
          } else {
            aValue = a.timeSpent || calculateHours(a.startDate, a.endDate, a.startTime, a.endTime) || 0;
            bValue = b.timeSpent || calculateHours(b.startDate, b.endDate, b.startTime, b.endTime) || 0;
          }
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }
      
      // Apply sort direction
      const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Group tasks by project
  const tasksByProject = useMemo(() => {
    const groupedTasks: {
      [key: string]: {
        projectId: number | null;
        projectName: string;
        tasks: Task[];
      };
    } = {};

    tasks.forEach((task) => {
      const projectId = task.projectId || 0;
      const projectName = task.project?.name || "No Project";

      if (!groupedTasks[projectId]) {
        groupedTasks[projectId] = {
          projectId: projectId || null,
          projectName,
          tasks: [],
        };
      }

      groupedTasks[projectId].tasks.push(task);
    });
    
    // Sort tasks in each project group
    Object.values(groupedTasks).forEach(group => {
      group.tasks = sortTasks(group.tasks);
    });

    // Convert to array and sort by project name
    return Object.values(groupedTasks).sort((a, b) =>
      a.projectName.localeCompare(b.projectName),
    );
  }, [tasks, sortField, sortDirection]);

  // Generate tooltip content for a task
  const getTaskTooltipContent = (task: Task) => {
    return (
      <div className="w-full">
        {/* Header with task title and status */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-white">{task.title}</h3>
            
            {task.project && (
              <div className="flex items-center text-xs text-gray-400 mt-1">
                <FolderKanban className="w-3.5 h-3.5 mr-1.5 text-primary" />
                {task.project.name}
              </div>
            )}
          </div>
          <span 
            className={`px-2 py-1 rounded text-xs ${getStatusColor(task.status)} text-white inline-block mt-1`}
          >
            {formatStatus(task.status)}
          </span>
        </div>
        
        {/* Description section with background */}
        {task.description && (
          <div className="bg-dark-border/30 p-3 rounded-md mb-4">
            <div className="text-sm text-gray-300 whitespace-pre-line">
              {task.description.length > 200 ? `${task.description.substring(0, 200)}...` : task.description}
            </div>
          </div>
        )}
        
        {/* Details in a grid */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mb-3 bg-dark-border/20 p-3 rounded-md">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
            <div>
              <span className="text-gray-400 text-xs block">Due Date</span>
              <span className="font-medium">{formatDate(task.dueDate)}</span>
            </div>
          </div>
          
          <div className="flex items-center">
            <Clock className="w-4 h-4 text-gray-400 mr-2" />
            <div>
              <span className="text-gray-400 text-xs block">Time</span>
              <span className="font-medium">{formatHours(task)}</span>
            </div>
          </div>
          
          <div className="flex items-center col-span-2">
            <User className="w-4 h-4 text-gray-400 mr-2" />
            <div>
              <span className="text-gray-400 text-xs block">Assigned To</span>
              <div className="flex items-center font-medium">
                {task.assignedTo ? (
                  <>
                    <Avatar className="h-5 w-5 mr-1.5">
                      <AvatarImage
                        src={task.assignedTo.avatarUrl}
                        alt={task.assignedTo.fullName}
                      />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(task.assignedTo.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    {task.assignedTo.fullName}
                  </>
                ) : (
                  "Unassigned"
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer with action prompt */}
        <div className="mt-4 pt-3 border-t border-gray-700 text-xs text-primary flex items-center justify-center">
          <ExternalLink className="w-4 h-4 mr-1.5" />
          Click to view detailed task page
        </div>
      </div>
    );
  };

  // Render a single task row
  const renderTaskRow = (task: Task) => {
    const statusColor = getStatusColor(task.status);
    return (
      <tr
        key={task.id}
        className="task-row hover:bg-primary/10 hover:shadow-md transition-all duration-150 cursor-pointer border-b border-dark-border last:border-b-0"
        onClick={() => navigate(`/tasks/${task.id}`)}
      >
        <td className="px-6 py-4 whitespace-nowrap" colSpan={2}>
          <div className="flex items-center">
            <div className="ml-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <div className="text-sm font-medium">{task.title}</div>
                    {task.description && (
                      <div className="text-xs text-gray-400 w-[33%]">
                        {task.description.length > 50 ? `${task.description.substring(0, 50)}...` : task.description}
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent 
                  side="right" 
                  className="task-tooltip-content" 
                  sideOffset={12}
                  align="start"
                >
                  {getTaskTooltipContent(task)}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {task.assignedTo ? (
            <div className="flex items-center">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={task.assignedTo.avatarUrl}
                  alt={task.assignedTo.fullName}
                />
                <AvatarFallback>
                  {getInitials(task.assignedTo.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <div className="text-sm font-medium">
                  {task.assignedTo.fullName}
                </div>
                <div className="text-xs text-gray-400">
                  {task.assignedTo.position || task.assignedTo.role}
                </div>
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
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${statusColor}`}
          >
            {formatStatus(task.status)}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          {formatHours(task)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <div className="flex justify-end space-x-2">
            {canEdit(task) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary/80"
                onClick={(e) => {
                  e.stopPropagation();
                  openDrawer("edit", task.id);
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
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-500 hover:text-blue-400"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/tasks/${task.id}`);
              }}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  // Render a project group with its tasks
  const renderProjectGroup = (
    projectGroup: {
      projectId: number | null;
      projectName: string;
      tasks: Task[];
    },
    index: number,
  ) => {
    return (
      <Accordion
        type="multiple"
        defaultValue={["item-0"]}
        className="w-full border-b border-dark-border last:border-b-0 bg-dark-surface/50"
        key={index}
      >
        <AccordionItem value={`item-${index}`} className="border-b-0">
          <AccordionTrigger className="px-4 py-3 hover:bg-dark-border/30 no-underline">
            <div className="flex items-center">
              <FolderKanban className="mr-2 h-5 w-5 text-primary" />
              <span className="text-sm font-medium">
                {projectGroup.projectName}
              </span>
              <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                {projectGroup.tasks.length}{" "}
                {projectGroup.tasks.length === 1 ? "task" : "tasks"}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-0 pb-0">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-t border-b border-dark-border bg-dark-surface/80">
                    <th
                      colSpan={2}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors duration-150"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center">
                        Task
                        {getSortIcon('title')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors duration-150"
                      onClick={() => handleSort('assignedTo')}
                    >
                      <div className="flex items-center">
                        Assigned To
                        {getSortIcon('assignedTo')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors duration-150"
                      onClick={() => handleSort('dueDate')}
                    >
                      <div className="flex items-center">
                        Due Date
                        {getSortIcon('dueDate')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors duration-150"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        {getSortIcon('status')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors duration-150"
                      onClick={() => handleSort('hours')}
                    >
                      <div className="flex items-center">
                        Hours
                        {getSortIcon('hours')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>{projectGroup.tasks.map(renderTaskRow)}</tbody>
              </table>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  };

  return (
    <div className="bg-dark-surface border border-dark-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        {tasksByProject.map(renderProjectGroup)}
      </div>

      {/* Pagination - We'll implement a simple version for now */}
      <div className="px-6 py-4 border-t border-dark-border flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Showing{" "}
          <span className="font-medium">{Math.min(1, tasks.length)}</span> to{" "}
          <span className="font-medium">{tasks.length}</span> of{" "}
          <span className="font-medium">{tasks.length}</span> results
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-primary text-white"
            disabled
          >
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
