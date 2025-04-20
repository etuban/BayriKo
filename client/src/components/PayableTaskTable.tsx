import React from 'react';
import { Task } from '@/types';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface PayableTaskTableProps {
  data: {
    tasks: Task[];
    grandTotal: number;
  };
}

export function PayableTaskTable({ data }: PayableTaskTableProps) {
  const { tasks, grandTotal } = data;
  const [expandedProjects, setExpandedProjects] = React.useState<Record<number, boolean>>({});
  
  // Group tasks by project
  const tasksByProject = React.useMemo(() => {
    const grouped: Record<string, {
      projectId: number;
      projectName: string;
      tasks: Task[];
      subtotal: number;
    }> = {};
    
    tasks.forEach(task => {
      const projectId = task.projectId;
      const projectName = task.project?.name || 'Unknown Project';
      const key = `${projectId}-${projectName}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          projectId,
          projectName,
          tasks: [],
          subtotal: 0
        };
        // Set initial expanded state
        if (!(projectId in expandedProjects)) {
          setExpandedProjects(prev => ({...prev, [projectId]: true}));
        }
      }
      
      grouped[key].tasks.push(task);
      grouped[key].subtotal += (task.totalAmount || 0);
    });
    
    // Convert to array and sort by project name
    return Object.values(grouped).sort((a, b) => 
      a.projectName.localeCompare(b.projectName)
    );
  }, [tasks]);
  
  // Toggle project expansion
  const toggleProject = (projectId: number) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden print-friendly">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr>
              <th className="px-6 py-2 text-left text-xs font-medium text-foreground uppercase tracking-wider bg-primary text-white">Task</th>
              <th className="px-6 py-2 text-left text-xs font-medium text-foreground uppercase tracking-wider bg-primary text-white hidden print:table-cell">Date</th>
              <th className="px-6 py-2 text-left text-xs font-medium text-foreground uppercase tracking-wider bg-primary text-white">Hours</th>
              <th className="px-6 py-2 text-left text-xs font-medium text-foreground uppercase tracking-wider bg-primary text-white">Rate</th>
              <th className="px-6 py-2 text-right text-xs font-medium text-foreground uppercase tracking-wider bg-primary text-white">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {tasksByProject.map((group) => (
              <React.Fragment key={group.projectId.toString()}>
                {/* Project Header Row */}
                <tr 
                  className="bg-muted/90 font-semibold cursor-pointer print:cursor-default hover:bg-muted/100"
                  onClick={() => toggleProject(group.projectId)}
                >
                  <td colSpan={5} className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="print:hidden mr-2">
                        {expandedProjects[group.projectId] ? 
                          <ChevronUp className="h-4 w-4" /> : 
                          <ChevronDown className="h-4 w-4" />
                        }
                      </span>
                      <span className="text-sm font-bold">
                        {group.projectName}
                      </span>
                    </div>
                    <span className="text-sm font-bold">
                      {formatCurrency(group.subtotal, group.tasks[0]?.currency || 'PHP')}
                    </span>
                  </td>
                </tr>
                
                {/* Project Tasks - Always visible when printing */}
                {group.tasks.map((task, index) => (
                  <tr 
                    key={task.id} 
                    className={cn(
                      "task-row hover:bg-muted",
                      !expandedProjects[group.projectId] && "hidden print:table-row",
                      index % 2 === 1 ? 'bg-muted/30' : ''
                    )}
                  >
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="text-xs font-medium">{task.title}</div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap hidden print:table-cell">
                      <div className="text-xs">
                        {task.startDate ? formatDateTime(task.startDate, task.startTime).replace(/,.+$/, '') : ''}
                        {task.endDate && task.startDate !== task.endDate ? ` - ${formatDateTime(task.endDate, task.endTime).replace(/,.+$/, '')}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-xs text-center">
                      {typeof task.hours === 'number' ? task.hours.toFixed(2) : task.hours}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-xs text-center">
                      {task.pricingType === 'hourly' 
                        ? `${formatCurrency((task.hourlyRate || 0) / 100, task.currency || 'PHP')}/hr` 
                        : 'Fixed'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right text-xs font-medium">
                      {formatCurrency(task.totalAmount || 0, task.currency || 'PHP')}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
            
            {/* Grand Total Row */}
            <tr className="bg-primary/10 font-bold">
              <td colSpan={4} className="px-6 py-3 whitespace-nowrap text-right text-sm font-semibold">
                Grand Total
              </td>
              <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-bold">
                {formatCurrency(grandTotal, tasks[0]?.currency || 'PHP')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Invoice Footer - only visible when printing */}
      <div className="hidden print:block mt-8 text-xs text-gray-500 text-center border-t border-gray-200 pt-4">
        <p>Task Invoice generated via BayadMin</p>
      </div>
    </div>
  );
}
