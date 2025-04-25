import React, { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTask } from "@/context/TaskContext";
import { Task } from "@/types";
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
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface TaskTableProps {
  tasks: Task[];
}

export function TaskTable({ tasks }: TaskTableProps) {
  const { user } = useAuth();
  const { openDrawer, confirmDelete } = useTask();
  
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

  // Render a single task row
  const renderTaskRow = (task: Task) => {
    const statusColor = getStatusColor(task.status);
    return (
      <tr
        key={task.id}
        className="task-row hover:bg-primary/10 hover:shadow-md transition-all duration-150 cursor-pointer border-b border-dark-border last:border-b-0"
        onClick={() => openDrawer("view", task.id)}
      >
        <td className="px-6 py-4 whitespace-nowrap" colSpan={2}>
          <div className="flex items-center">
            <div className="ml-4">
              <div className="text-sm font-medium">{task.title}</div>
              {task.description && (
                <div className="text-xs text-gray-400 w-[33%]" title={task.description}>
                  {task.description.length > 50 ? `${task.description.substring(0, 50)}...` : task.description}
                </div>
              )}
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
          {canEdit(task) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary/80 mr-2"
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
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                    >
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Hours
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
