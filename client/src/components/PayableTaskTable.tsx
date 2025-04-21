import React from 'react';
import { Task, InvoiceDetails } from '@/types';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface PayableTaskTableProps {
  data: {
    tasks: Task[];
    grandTotal: number;
  };
  invoiceDetails?: InvoiceDetails;
}

export function PayableTaskTable({ data, invoiceDetails }: PayableTaskTableProps) {
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
        {/* Header Row - table format for printing, flex for display */}
        <div className="hidden print:table w-full">
          <div className="print:table-row">
            <div className="print:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-primary text-white">Task</div>
            <div className="print:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-primary text-white">Date</div>
            <div className="print:table-cell px-4 sm:px-6 py-3 text-center text-xs font-medium uppercase tracking-wider bg-primary text-white w-16 sm:w-20">Hours</div>
            <div className="print:table-cell px-4 sm:px-6 py-3 text-center text-xs font-medium uppercase tracking-wider bg-primary text-white w-16 sm:w-24">Rate</div>
            <div className="print:table-cell px-4 sm:px-6 py-3 text-right text-xs font-medium uppercase tracking-wider bg-primary text-white w-20 sm:w-24">Total</div>
          </div>
        </div>
        
        {/* Header Row for display */}
        <div className="flex items-center bg-primary text-white print:hidden">
          <div className="flex-1 px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Task</div>
          <div className="w-16 sm:w-20 px-4 sm:px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Hours</div>
          <div className="w-16 sm:w-24 px-4 sm:px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Rate</div>
          <div className="w-20 sm:w-24 px-4 sm:px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Total</div>
        </div>

        <div className="divide-y divide-border bg-card">
          {tasksByProject.map((group) => (
            <div key={group.projectId.toString()}>
              {/* Project Header Row */}
              <div 
                className="bg-muted/90 font-semibold cursor-pointer print:cursor-default hover:bg-muted/100 print:table-row"
                onClick={() => toggleProject(group.projectId)}
              >
                <div className="px-4 sm:px-6 py-3 flex items-center justify-between print:table-cell print:colspan-5">
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
                </div>
              </div>
              
              {/* Project Tasks - Always visible when printing */}
              <div className={cn(
                !expandedProjects[group.projectId] && "hidden print:block"
              )}>
                {group.tasks.map((task, index) => (
                  <div 
                    key={task.id} 
                    className={cn(
                      "hover:bg-muted print:table-row",
                      index % 2 === 1 ? 'bg-muted/30' : ''
                    )}
                  >
                    {/* Task info for mobile/desktop view */}
                    <div className="flex items-center px-4 sm:px-6 py-3 print:hidden">
                      <div className="flex-1">
                        <div className="text-xs font-medium">{task.title}</div>
                      </div>
                      <div className="w-16 sm:w-20 text-xs text-center">
                        {typeof task.hours === 'number' ? task.hours.toFixed(2) : task.hours}
                      </div>
                      <div className="w-16 sm:w-24 text-xs text-center">
                        {task.pricingType === 'hourly' 
                          ? `${formatCurrency((task.hourlyRate || 0) / 100, task.currency || 'PHP')}/hr` 
                          : 'Fixed'}
                      </div>
                      <div className="w-20 sm:w-24 text-xs text-right font-medium">
                        {formatCurrency(task.totalAmount || 0, task.currency || 'PHP')}
                      </div>
                    </div>

                    {/* Print view cells */}
                    <div className="hidden print:table-cell px-4 sm:px-6 py-3">
                      <div className="text-xs font-medium">{task.title}</div>
                    </div>
                    <div className="hidden print:table-cell px-4 sm:px-6 py-3">
                      <div className="text-xs">
                        {task.startDate ? formatDateTime(task.startDate, task.startTime).replace(/,.+$/, '') : ''}
                        {task.endDate && task.startDate !== task.endDate ? ` - ${formatDateTime(task.endDate, task.endTime).replace(/,.+$/, '')}` : ''}
                      </div>
                    </div>
                    <div className="hidden print:table-cell px-4 sm:px-6 py-3 text-xs text-center">
                      {typeof task.hours === 'number' ? task.hours.toFixed(2) : task.hours}
                    </div>
                    <div className="hidden print:table-cell px-4 sm:px-6 py-3 text-xs text-center">
                      {task.pricingType === 'hourly' 
                        ? `${formatCurrency((task.hourlyRate || 0) / 100, task.currency || 'PHP')}/hr` 
                        : 'Fixed'}
                    </div>
                    <div className="hidden print:table-cell px-4 sm:px-6 py-3 text-right text-xs font-medium">
                      {formatCurrency(task.totalAmount || 0, task.currency || 'PHP')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Grand Total Row */}
          <div className="bg-primary/10 font-bold flex items-center print:table-row">
            <div className="flex-1 text-right px-4 sm:px-6 py-3 text-sm font-semibold print:table-cell print:colspan-4">
              Grand Total
            </div>
            <div className="w-20 sm:w-24 px-4 sm:px-6 py-3 text-right text-sm font-bold print:table-cell">
              {formatCurrency(grandTotal, tasks[0]?.currency || 'PHP')}
            </div>
          </div>
        </div>
      </div>
      
      {/* Invoice Footer - only visible when printing */}
      <div className="hidden print:block mt-8 text-xs text-gray-500 text-center border-t border-gray-200 pt-4">
        <p>This PDF Invoice is generated through <a href="https://bayadmn.pawn.media" style={{color: 'blue', textDecoration: 'underline'}}>BayadMn</a></p>
        <div style={{marginTop: '5px'}}>
          <a href="https://bayadmn.pawn.media">
            <div style={{
              backgroundColor: '#008000', 
              color: 'white', 
              width: '100px', 
              height: '30px', 
              margin: '0 auto', 
              borderRadius: '4px', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              fontWeight: 'bold'
            }}>
              BayadMn
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
