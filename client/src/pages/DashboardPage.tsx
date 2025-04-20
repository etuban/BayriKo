import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { ListChecks, Clock, DollarSign, UserCheck, LineChart as LineChartIcon, CheckCircle, XCircle, TimerIcon } from 'lucide-react';

export default function DashboardPage() {
  // Fetch tasks for dashboard stats
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['/api/tasks'],
  });
  
  // Fetch projects for dashboard stats
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/projects'],
  });
  
  // Calculate dashboard statistics
  const stats = React.useMemo(() => {
    if (!tasks.length) return {
      totalTasks: 0,
      completedTasks: 0,
      totalHours: 0,
      totalValue: 0,
      tasksByStatus: [],
      tasksByProject: [],
      weeklyTasks: []
    };
    
    const tasksByStatus = [
      { name: 'To Do', value: 0 },
      { name: 'In Progress', value: 0 },
      { name: 'Completed', value: 0 }
    ];
    
    const projectMap = new Map();
    let totalHours = 0;
    let totalValue = 0;
    
    // Calculate tasks by status and collect data
    tasks.forEach((task: any) => {
      // Tasks by status
      if (task.status === 'todo') tasksByStatus[0].value++;
      else if (task.status === 'in_progress') tasksByStatus[1].value++;
      else if (task.status === 'completed') tasksByStatus[2].value++;
      
      // Tasks by project
      const projectId = task.projectId;
      const projectName = task.project?.name || 'Unknown';
      
      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, { name: projectName, tasks: 0 });
      }
      projectMap.get(projectId).tasks++;
      
      // Total hours and value
      if (task.pricingType === 'hourly' && task.startDate && task.endDate) {
        const start = new Date(task.startDate);
        const end = new Date(task.endDate);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
        
        if (task.hourlyRate) {
          totalValue += hours * (task.hourlyRate / 100);
        }
      } else if (task.pricingType === 'fixed' && task.fixedPrice) {
        totalValue += task.fixedPrice / 100;
      }
    });
    
    // Convert project map to array
    const tasksByProject = Array.from(projectMap.values())
      .sort((a, b) => b.tasks - a.tasks)
      .slice(0, 5); // Top 5 projects
    
    // Create weekly tasks data (simplified)
    const today = new Date();
    const weeklyTasks = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dateString = date.toISOString().split('T')[0];
      
      const tasksOnDay = tasks.filter((task: any) => 
        task.createdAt && task.createdAt.startsWith(dateString)
      ).length;
      
      weeklyTasks.push({
        name: dayName,
        tasks: tasksOnDay
      });
    }
    
    return {
      totalTasks: tasks.length,
      completedTasks: tasksByStatus[2].value,
      totalHours: Math.round(totalHours * 10) / 10,
      totalValue: Math.round(totalValue * 100) / 100,
      tasksByStatus,
      tasksByProject,
      weeklyTasks
    };
  }, [tasks, projects]);
  
  // Chart colors
  const STATUS_COLORS = ['#3b82f6', '#f59e0b', '#10b981'];
  const PROJECT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#84cc16'];
  
  // Loading states
  const isLoading = isLoadingTasks || isLoadingProjects;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Tasks */}
        <Card className="bg-dark-surface border border-dark-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ListChecks className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
            )}
          </CardContent>
        </Card>
        
        {/* Completed Tasks */}
        <Card className="bg-dark-surface border border-dark-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {stats.completedTasks}
                <span className="text-sm font-normal text-gray-400 ml-2">
                  ({stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%)
                </span>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Total Hours */}
        <Card className="bg-dark-surface border border-dark-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalHours}</div>
            )}
          </CardContent>
        </Card>
        
        {/* Total Value */}
        <Card className="bg-dark-surface border border-dark-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">${stats.totalValue.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks by Status */}
        <Card className="bg-dark-surface border border-dark-border">
          <CardHeader>
            <CardTitle className="text-lg">Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.tasksByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.tasksByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        
        {/* Weekly Tasks */}
        <Card className="bg-dark-surface border border-dark-border">
          <CardHeader>
            <CardTitle className="text-lg">Weekly Task Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.weeklyTasks}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }} 
                    labelStyle={{ color: '#E5E7EB' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="tasks" 
                    stroke="#6366F1" 
                    strokeWidth={2} 
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        
        {/* Tasks by Project */}
        <Card className="bg-dark-surface border border-dark-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Top Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.tasksByProject}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }} 
                    labelStyle={{ color: '#E5E7EB' }}
                  />
                  <Legend />
                  <Bar dataKey="tasks" fill="#6366F1" name="Tasks" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
