import React, { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTask } from "@/context/TaskContext";
import { Task } from "@/types";
import {
  formatDate,
  formatStatus,
  getStatusColor,
  formatHours,
  getInitials,
  cn
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Plus
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

interface TaskCalendarProps {
  tasks: Task[];
}

export function TaskCalendar({ tasks }: TaskCalendarProps) {
  const { user } = useAuth();
  const { openDrawer, confirmDelete } = useTask();
  
  // Current date state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<'month' | 'week'>('month');
  
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
  
  // Navigation functions
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Format functions
  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  
  // Define an interface for a calendar day
  interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    tasks: Task[];
  }

  // Calendar data
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Day of week for the first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDay.getDay();
    
    // Calculate days from previous month to show
    const daysFromPrevMonth = firstDayOfWeek;
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    // Days array
    const days: CalendarDay[] = [];
    
    // Add days from previous month
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        tasks: []
      });
    }
    
    // Add days from current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      const today = new Date();
      const isToday = 
        date.getDate() === today.getDate() && 
        date.getMonth() === today.getMonth() && 
        date.getFullYear() === today.getFullYear();
      
      days.push({
        date,
        isCurrentMonth: true,
        isToday,
        tasks: []
      });
    }
    
    // Calculate how many days from next month to add to complete the grid
    const totalDaysInGrid = Math.ceil((firstDayOfWeek + lastDay.getDate()) / 7) * 7;
    const daysFromNextMonth = totalDaysInGrid - days.length;
    
    // Add days from next month
    for (let i = 1; i <= daysFromNextMonth; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        tasks: []
      });
    }
    
    // Assign tasks to days
    tasks.forEach(task => {
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const dayIndex = days.findIndex(
          day => 
            day.date.getDate() === dueDate.getDate() && 
            day.date.getMonth() === dueDate.getMonth() && 
            day.date.getFullYear() === dueDate.getFullYear()
        );
        
        if (dayIndex !== -1) {
          days[dayIndex].tasks.push(task);
        }
      }
    });
    
    return days;
  }, [currentDate, tasks]);
  
  // Week days
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Render a task item
  const renderTaskItem = (task: Task) => {
    return (
      <div 
        key={task.id}
        className={cn(
          "text-xs p-1 mb-1 rounded cursor-pointer transition-colors",
          "hover:bg-primary/10 border-l-2",
          { "border-blue-500": task.status === "todo" },
          { "border-yellow-500": task.status === "in_progress" },
          { "border-green-500": task.status === "completed" }
        )}
        onClick={() => openDrawer("view", task.id)}
      >
        <div className="font-medium truncate">{task.title}</div>
        {task.assignedTo && (
          <div className="flex items-center text-gray-400 mt-1">
            <Avatar className="h-4 w-4 mr-1">
              <AvatarFallback className="text-[8px]">
                {getInitials(task.assignedTo.fullName)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{task.assignedTo.fullName}</span>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="bg-dark-surface border border-dark-border rounded-lg overflow-hidden">
      {/* Calendar Header */}
      <div className="p-4 flex items-center justify-between border-b border-dark-border">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h3 className="text-lg font-medium">
            {formatMonthYear(currentDate)}
          </h3>
          
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            size="sm" 
            variant="outline" 
            className={cn(
              "border-primary text-primary", 
              currentView === 'month' && "bg-primary/10"
            )}
            onClick={() => setCurrentView('month')}
          >
            Month
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className={cn(
              "border-primary text-primary",
              currentView === 'week' && "bg-primary/10"
            )}
            onClick={() => setCurrentView('week')}
          >
            Week
          </Button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="overflow-auto">
        {/* Week Day Headers */}
        <div className="grid grid-cols-7 border-b border-dark-border bg-dark-surface/80">
          {weekDays.map((day) => (
            <div 
              key={day} 
              className="px-2 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div className="grid grid-cols-7 auto-rows-fr">
          {calendarDays.map((day, index) => (
            <div 
              key={index}
              className={cn(
                "min-h-[120px] p-2 border-r border-b border-dark-border relative group",
                !day.isCurrentMonth && "bg-dark-bg/50 text-gray-500",
                day.isToday && "bg-primary/5"
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={cn(
                  "text-sm font-medium",
                  day.isToday && "bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center"
                )}>
                  {day.date.getDate()}
                </span>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:opacity-100"
                        onClick={() => openDrawer('new')}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add task on this day</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <div className="overflow-y-auto max-h-[80px]">
                {day.tasks.map(task => renderTaskItem(task))}
              </div>
              
              {day.tasks.length > 3 && (
                <div className="text-xs text-primary mt-1 text-center cursor-pointer">
                  +{day.tasks.length - 3} more
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}