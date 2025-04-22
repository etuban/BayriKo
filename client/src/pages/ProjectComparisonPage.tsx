import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Project, Task } from '@shared/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Loader2, BarChart3, Calendar, DollarSign, Clock, CheckSquare, AlertCircle } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell  
} from 'recharts';

// Interface for project comparison metrics
interface ProjectMetrics {
  projectId: number;
  projectName: string;
  taskCount: number;
  completedTaskCount: number;
  totalHours: number;
  totalBudget: number;
  averageCompletionTime: number;
  tasksPerStatus: Record<string, number>;
  earningsPerTask: { taskName: string; earnings: number }[];
  hoursPerTask: { taskName: string; hours: number }[];
}

// Interface for selected projects with color
interface SelectedProject extends Project {
  color: string;
}

// Project comparison colors
const PROJECT_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', 
  '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57'
];

export default function ProjectComparisonPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<SelectedProject[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [projectMetrics, setProjectMetrics] = useState<ProjectMetrics[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Fetch projects
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: !!user,
  });

  // Fetch tasks for selected projects
  const { data: tasks = [], isLoading: isLoadingTasks, refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ['/api/tasks', { projectIds: selectedProjectIds }],
    queryFn: async () => {
      if (selectedProjectIds.length === 0) return [];
      
      const queryParams = new URLSearchParams();
      selectedProjectIds.forEach(id => queryParams.append('projectIds', id.toString()));
      
      const res = await apiRequest('GET', `/api/tasks/comparison?${queryParams.toString()}`);
      return res.json();
    },
    enabled: selectedProjectIds.length > 0,
  });

  // Convert projects to options for multi-select
  const projectOptions = projects.map(project => ({
    value: project.id.toString(),
    label: project.name
  }));

  // Handle project selection
  const handleProjectSelection = (values: string[]) => {
    const ids = values.map(v => parseInt(v));
    setSelectedProjectIds(ids);
    
    // Assign colors to selected projects
    const projectsWithColors = ids.map((id, index) => {
      const project = projects.find(p => p.id === id);
      if (!project) return null;
      
      return {
        ...project,
        color: PROJECT_COLORS[index % PROJECT_COLORS.length]
      };
    }).filter(Boolean) as SelectedProject[];
    
    setSelectedProjects(projectsWithColors);
  };

  // Calculate project metrics when tasks or selected projects change
  useEffect(() => {
    if (!tasks.length || !selectedProjects.length) {
      setProjectMetrics([]);
      return;
    }
    
    setIsCalculating(true);
    
    try {
      const metrics = selectedProjects.map(project => {
        const projectTasks = tasks.filter(task => task.projectId === project.id);
        
        // Calculate basic metrics
        const completedTasks = projectTasks.filter(task => task.status === 'completed');
        const totalHours = projectTasks.reduce((sum, task) => sum + (task.timeSpent || 0), 0);
        const totalBudget = projectTasks.reduce((sum, task) => {
          // Calculate task budget based on rate and time spent
          const taskBudget = (task.timeSpent || 0) * (task.hourlyRate || 0);
          return sum + (task.billingType === 'fixed' ? (task.fixedPrice || 0) : taskBudget);
        }, 0);
        
        // Calculate average completion time (for completed tasks)
        let averageCompletionTime = 0;
        if (completedTasks.length > 0) {
          const totalCompletionTime = completedTasks.reduce((sum, task) => {
            const startDate = task.startDate ? new Date(task.startDate) : null;
            const completionDate = task.completedAt ? new Date(task.completedAt) : null;
            
            if (startDate && completionDate) {
              const diffTime = Math.abs(completionDate.getTime() - startDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return sum + diffDays;
            }
            
            return sum;
          }, 0);
          
          averageCompletionTime = totalCompletionTime / completedTasks.length;
        }
        
        // Count tasks per status
        const tasksPerStatus: Record<string, number> = {};
        projectTasks.forEach(task => {
          tasksPerStatus[task.status] = (tasksPerStatus[task.status] || 0) + 1;
        });
        
        // Calculate earnings per task
        const earningsPerTask = projectTasks.map(task => {
          const earnings = task.billingType === 'fixed' 
            ? (task.fixedPrice || 0) 
            : (task.timeSpent || 0) * (task.hourlyRate || 0);
          
          return {
            taskName: task.title,
            earnings
          };
        });
        
        // Calculate hours per task
        const hoursPerTask = projectTasks.map(task => ({
          taskName: task.title,
          hours: task.timeSpent || 0
        }));
        
        return {
          projectId: project.id,
          projectName: project.name,
          taskCount: projectTasks.length,
          completedTaskCount: completedTasks.length,
          totalHours,
          totalBudget,
          averageCompletionTime,
          tasksPerStatus,
          earningsPerTask,
          hoursPerTask
        };
      });
      
      setProjectMetrics(metrics);
    } catch (error) {
      console.error('Error calculating project metrics:', error);
      toast({
        title: 'Error',
        description: 'Failed to calculate project metrics',
        variant: 'destructive'
      });
    } finally {
      setIsCalculating(false);
    }
  }, [tasks, selectedProjects, toast]);

  // Prepare data for the overview bar chart
  const overviewChartData = [
    {
      name: 'Tasks',
      ...Object.fromEntries(projectMetrics.map(m => [m.projectName, m.taskCount]))
    },
    {
      name: 'Completed',
      ...Object.fromEntries(projectMetrics.map(m => [m.projectName, m.completedTaskCount]))
    },
    {
      name: 'Hours',
      ...Object.fromEntries(projectMetrics.map(m => [m.projectName, m.totalHours]))
    },
    {
      name: 'Budget ($)',
      ...Object.fromEntries(projectMetrics.map(m => [m.projectName, m.totalBudget / 100])) // Convert to dollars for display
    }
  ];

  // Prepare data for the status pie charts
  const getStatusPieData = (metrics: ProjectMetrics) => {
    return Object.entries(metrics.tasksPerStatus).map(([status, count]) => ({
      name: status,
      value: count
    }));
  };

  // Status colors for pie charts
  const STATUS_COLORS = {
    'todo': '#8884d8',
    'in_progress': '#82ca9d',
    'in_review': '#ffc658',
    'completed': '#00C49F',
    'cancelled': '#ff8042'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
        <h1 className="text-2xl font-semibold mb-4 md:mb-0">Project Comparison</h1>
      </div>

      <Card className="bg-dark-surface border border-dark-border">
        <CardHeader>
          <CardTitle>Select Projects to Compare</CardTitle>
          <CardDescription>
            Choose up to 5 projects to analyze and compare their performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            {isLoadingProjects ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Loading projects...</span>
              </div>
            ) : (
              <MultiSelect
                options={projectOptions}
                value={selectedProjectIds.map(String)}
                onChange={handleProjectSelection}
                placeholder="Select projects to compare..."
                maxItems={5}
                className="w-full"
              />
            )}
          </div>
          
          {selectedProjectIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedProjects.map(project => (
                <div 
                  key={project.id} 
                  className="px-3 py-1 rounded-full text-sm flex items-center"
                  style={{ backgroundColor: `${project.color}30`, color: project.color }}
                >
                  {project.name}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProjectIds.length > 0 && (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview">
                <BarChart3 className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <Calendar className="w-4 h-4 mr-2" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="budget">
                <DollarSign className="w-4 h-4 mr-2" />
                Budget
              </TabsTrigger>
              <TabsTrigger value="efficiency">
                <Clock className="w-4 h-4 mr-2" />
                Efficiency
              </TabsTrigger>
              <TabsTrigger value="status">
                <CheckSquare className="w-4 h-4 mr-2" />
                Status
              </TabsTrigger>
            </TabsList>

            {isLoadingTasks || isCalculating ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <span className="text-lg">Loading project data...</span>
              </div>
            ) : projectMetrics.length === 0 ? (
              <div className="flex items-center justify-center p-12 text-center">
                <div>
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No data available</h3>
                  <p className="text-gray-400">
                    Select projects with tasks to view comparison metrics
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {projectMetrics.map(metrics => (
                      <Card key={metrics.projectId} className="bg-dark-surface border border-dark-border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg" style={{ color: selectedProjects.find(p => p.id === metrics.projectId)?.color }}>
                            {metrics.projectName}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <dl className="space-y-2">
                            <div className="flex justify-between">
                              <dt className="text-gray-400">Tasks:</dt>
                              <dd>{metrics.taskCount}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-400">Completed:</dt>
                              <dd>{metrics.completedTaskCount}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-400">Total Hours:</dt>
                              <dd>{metrics.totalHours.toFixed(1)}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-400">Budget:</dt>
                              <dd>{formatCurrency(metrics.totalBudget)}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-400">Avg. Completion:</dt>
                              <dd>{metrics.averageCompletionTime.toFixed(1)} days</dd>
                            </div>
                          </dl>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card className="bg-dark-surface border border-dark-border">
                    <CardHeader>
                      <CardTitle>Comparison Chart</CardTitle>
                      <CardDescription>
                        Key metrics across all selected projects
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={overviewChartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {selectedProjects.map(project => (
                              <Bar 
                                key={project.id}
                                dataKey={project.name} 
                                fill={project.color} 
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Status Tab */}
                <TabsContent value="status" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projectMetrics.map(metrics => (
                      <Card key={metrics.projectId} className="bg-dark-surface border border-dark-border">
                        <CardHeader>
                          <CardTitle className="text-lg" style={{ color: selectedProjects.find(p => p.id === metrics.projectId)?.color }}>
                            {metrics.projectName}
                          </CardTitle>
                          <CardDescription>
                            Task status distribution
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={getStatusPieData(metrics)}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {getStatusPieData(metrics).map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || '#777777'} 
                                    />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Status Breakdown</h4>
                            <dl className="space-y-1">
                              {Object.entries(metrics.tasksPerStatus).map(([status, count]) => (
                                <div key={status} className="flex justify-between">
                                  <dt className="flex items-center">
                                    <span 
                                      className="w-3 h-3 rounded-full mr-2"
                                      style={{ backgroundColor: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#777777' }}
                                    ></span>
                                    <span className="capitalize">{status.replace('_', ' ')}</span>
                                  </dt>
                                  <dd>{count} task{count !== 1 ? 's' : ''}</dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Budget Tab */}
                <TabsContent value="budget" className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    {projectMetrics.map(metrics => (
                      <Card key={metrics.projectId} className="bg-dark-surface border border-dark-border">
                        <CardHeader>
                          <CardTitle className="text-lg" style={{ color: selectedProjects.find(p => p.id === metrics.projectId)?.color }}>
                            {metrics.projectName} - Earnings per Task
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={metrics.earningsPerTask}
                                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="taskName" 
                                  angle={-45} 
                                  textAnchor="end"
                                  height={70}
                                  interval={0}
                                />
                                <YAxis />
                                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                <Bar 
                                  dataKey="earnings" 
                                  fill={selectedProjects.find(p => p.id === metrics.projectId)?.color || '#8884d8'} 
                                  name="Earnings"
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Efficiency Tab */}
                <TabsContent value="efficiency" className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    {projectMetrics.map(metrics => (
                      <Card key={metrics.projectId} className="bg-dark-surface border border-dark-border">
                        <CardHeader>
                          <CardTitle className="text-lg" style={{ color: selectedProjects.find(p => p.id === metrics.projectId)?.color }}>
                            {metrics.projectName} - Hours per Task
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={metrics.hoursPerTask}
                                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="taskName" 
                                  angle={-45} 
                                  textAnchor="end"
                                  height={70}
                                  interval={0}
                                />
                                <YAxis />
                                <Tooltip formatter={(value) => `${value} hours`} />
                                <Bar 
                                  dataKey="hours" 
                                  fill={selectedProjects.find(p => p.id === metrics.projectId)?.color || '#8884d8'} 
                                  name="Hours"
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Timeline Tab */}
                <TabsContent value="timeline" className="space-y-6">
                  <Card className="bg-dark-surface border border-dark-border">
                    <CardHeader>
                      <CardTitle>Average Completion Time</CardTitle>
                      <CardDescription>
                        Average days to complete tasks for each project
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={projectMetrics.map(metrics => ({
                              name: metrics.projectName,
                              days: metrics.averageCompletionTime
                            }))}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                            <Tooltip formatter={(value) => `${Number(value).toFixed(1)} days`} />
                            <Bar 
                              dataKey="days" 
                              name="Average Completion Time"
                            >
                              {projectMetrics.map((metrics, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={selectedProjects.find(p => p.id === metrics.projectId)?.color || '#8884d8'} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}
          </Tabs>
        </>
      )}
    </div>
  );
}