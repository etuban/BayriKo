import React from 'react';
import { Task } from '@/types';
import { formatDateTime, formatCurrency } from '@/lib/utils';

interface PayableTaskTableProps {
  data: {
    tasks: Task[];
    grandTotal: number;
  };
}

export function PayableTaskTable({ data }: PayableTaskTableProps) {
  const { tasks, grandTotal } = data;

  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden print-friendly">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider bg-primary text-white">Task</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider bg-primary text-white">Project</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider bg-primary text-white">Start Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider bg-primary text-white">End Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider bg-primary text-white">Hours</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider bg-primary text-white">Rate</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider bg-primary text-white">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {tasks.map((task, index) => (
              <tr key={task.id} className={`task-row hover:bg-muted ${index % 2 === 1 ? 'bg-muted/50' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium">{task.title}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">{task.project?.name || 'Unknown Project'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">{formatDateTime(task.startDate, task.startTime)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">{formatDateTime(task.endDate, task.endTime)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  {typeof task.hours === 'number' ? task.hours.toFixed(2) : task.hours}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  {task.pricingType === 'hourly' 
                    ? `${formatCurrency((task.hourlyRate || 0) / 100)}/hr` 
                    : 'Fixed'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {formatCurrency(task.totalAmount || 0)}
                </td>
              </tr>
            ))}
            {/* Total Row */}
            <tr className="bg-primary/10 font-bold">
              <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold">
                Total Amount
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                {formatCurrency(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Invoice Footer - only visible when printing */}
      <div className="hidden print:block mt-8 text-xs text-gray-500 text-center border-t border-gray-200 pt-4">
        <p>BayadMin Invoice | Generated on {new Date().toLocaleDateString()}</p>
        <p className="mt-1">Thank you for your business!</p>
      </div>
    </div>
  );
}
