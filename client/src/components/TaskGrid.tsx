import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useTask } from "@/context/TaskContext";
import { Task } from "@/types";
import {
  formatDate,
  formatStatus,
  getStatusColor,
  formatPricing,
  formatHours,
  getInitials,
  cn,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  Trash2,
  FolderKanban,
  CalendarDays,
  Clock,
  Tag,
  DollarSign,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskGridProps {
  tasks: Task[];
}

export function TaskGrid({ tasks }: TaskGridProps) {
  const { user } = useAuth();
  const { openDrawer, confirmDelete } = useTask();

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tasks.map((task) => (
        <Card key={task.id} className="overflow-hidden">
          <CardHeader className="p-4 pb-2 space-y-0 flex flex-row justify-between items-start">
            <div className="space-y-1.5">
              <h3 className="text-lg font-medium">{task.title}</h3>
              {task.project && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <FolderKanban className="w-3 h-3 mr-1" />
                  {task.project.name}
                </div>
              )}
            </div>
            
            <Badge className={cn("text-white", getStatusColor(task.status))}>
              {formatStatus(task.status)}
            </Badge>
          </CardHeader>
          
          <CardContent className="p-4 pt-2">
            <div className="text-sm text-muted-foreground mb-3">
              {task.description && task.description.length > 150
                ? `${task.description.substring(0, 150)}...`
                : task.description}
            </div>
            
            <div className="space-y-2 text-sm">
              {task.startDate && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {formatDate(task.startDate)} 
                    {task.endDate && ` to ${formatDate(task.endDate)}`}
                  </span>
                </div>
              )}
              
              {task.dueDate && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>Due: {formatDate(task.dueDate)}</span>
                </div>
              )}
              
              {formatHours(task) !== 'N/A' && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>Hours: {formatHours(task)}</span>
                </div>
              )}
              
              {task.pricingType && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span>{formatPricing(task)}</span>
                </div>
              )}
              
              {task.assignedTo && (
                <div className="flex items-center gap-2 mt-3">
                  <Avatar className="w-6 h-6">
                    {task.assignedTo.avatarUrl ? (
                      <AvatarImage
                        src={task.assignedTo.avatarUrl}
                        alt={task.assignedTo.fullName}
                      />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {getInitials(task.assignedTo.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-muted-foreground">
                    {task.assignedTo.fullName}
                  </span>
                </div>
              )}
              
              {task.tags && task.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  {task.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="p-4 pt-2 gap-2 justify-end">
            {canEdit(task) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDrawer('edit', Number(task.id))}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit Task</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {canDelete(task) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => confirmDelete(Number(task.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete Task</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}