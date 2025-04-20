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
    <div className="bg-dark-surface border border-dark-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-dark-border">
          <thead>
            <tr className="bg-dark-surface">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Task</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Project</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Start Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">End Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Hours</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rate</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {tasks.map((task) => (
              <tr key={task.id} className="task-row hover:bg-dark-border/30">
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
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {typeof task.hours === 'number' ? task.hours.toFixed(2) : task.hours}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {task.pricingType === 'hourly' 
                    ? `${formatCurrency((task.hourlyRate || 0) / 100)}/hr` 
                    : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {formatCurrency(task.totalAmount || 0)}
                </td>
              </tr>
            ))}
            {/* Total Row */}
            <tr className="bg-dark-border">
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
    </div>
  );
}
