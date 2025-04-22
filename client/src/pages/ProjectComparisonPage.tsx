import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiSelect, Option } from '../components/ui/multi-select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Project, Task } from '@shared/schema';
import { Loader2 } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

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

interface SelectedProject extends Project {
  color: string;
}

export default function ProjectComparisonPage() {
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [projectMetrics, setProjectMetrics] = useState<ProjectMetrics[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<SelectedProject[]>([]);
  
  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/projects'],
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const { data: tasks, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['/api/tasks/comparison', selectedProjectIds],
    queryFn: async () => {
      if (selectedProjectIds.length === 0) return [];
      const params = new URLSearchParams();
      selectedProjectIds.forEach(id => params.append('projectIds', id));
      const response = await fetch(`/api/tasks/comparison?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
    enabled: selectedProjectIds.length > 0,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Transform projects into options for MultiSelect
  const projectOptions: Option[] = projects 
    ? projects.map((project: Project) => ({ 
        value: project.id.toString(), 
        label: project.name 
      })) 
    : [];

  // Calculate metrics when tasks or selectedProjects change
  useEffect(() => {
    if (!tasks || !selectedProjects.length) return;

    const metrics: ProjectMetrics[] = selectedProjects.map(project => {
      const projectTasks = tasks.filter((task: Task) => task.projectId === project.id);
      const completedTasks = projectTasks.filter((task: Task) => task.status === 'completed');
      
      const totalHours = projectTasks.reduce(
        (sum: number, task: Task) => sum + (task.timeSpent || 0), 
        0
      );
      
      // Calculate total budget
      const totalBudget = projectTasks.reduce((sum: number, task: Task) => {
        if (task.pricingType === 'hourly' && task.hourlyRate) {
          return sum + (task.timeSpent || 0) * task.hourlyRate;
        } else if (task.pricingType === 'fixed' && task.fixedPrice) {
          return sum + task.fixedPrice;
        }
        return sum;
      }, 0);
      
      // Calculate average completion time in days
      const avgCompletionTime = completedTasks.length 
        ? completedTasks.reduce((sum: number, task: Task) => {
            if (task.completedAt && task.startDate) {
              const start = new Date(task.startDate);
              const end = new Date(task.completedAt);
              return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24); // days
            }
            return sum;
          }, 0) / completedTasks.length
        : 0;
      
      // Calculate tasks per status
      const tasksPerStatus: Record<string, number> = {
        todo: 0,
        in_progress: 0,
        completed: 0
      };
      
      projectTasks.forEach((task: Task) => {
        if (tasksPerStatus[task.status] !== undefined) {
          tasksPerStatus[task.status]++;
        }
      });
      
      // Calculate earnings per task
      const earningsPerTask = projectTasks.map(task => {
        let earnings = 0;
        if (task.pricingType === 'hourly' && task.hourlyRate) {
          earnings = (task.timeSpent || 0) * task.hourlyRate;
        } else if (task.pricingType === 'fixed' && task.fixedPrice) {
          earnings = task.fixedPrice;
        }
        
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
        averageCompletionTime: avgCompletionTime,
        tasksPerStatus,
        earningsPerTask,
        hoursPerTask
      };
    });
    
    setProjectMetrics(metrics);
  }, [tasks, selectedProjects]);

  // Update selected projects when selectedProjectIds change
  useEffect(() => {
    if (!projects) return;
    
    const selected = selectedProjectIds.map((id, index) => {
      const project = projects.find((p: Project) => p.id.toString() === id);
      if (project) {
        return {
          ...project,
          color: COLORS[index % COLORS.length]
        };
      }
      return null;
    }).filter(Boolean) as SelectedProject[];
    
    setSelectedProjects(selected);
  }, [selectedProjectIds, projects]);

  const getStatusPieData = (metrics: ProjectMetrics) => {
    return Object.entries(metrics.tasksPerStatus).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
      value: count
    }));
  };

  const handleProjectSelection = (selected: string[]) => {
    setSelectedProjectIds(selected);
  };

  const isLoading = isLoadingProjects || isLoadingTasks || (selectedProjectIds.length > 0 && !tasks);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Project Comparison</h1>
        <p className="text-muted-foreground mb-6">
          Compare metrics across multiple projects to identify trends and performance.
        </p>
        
        <div className="grid gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Projects to Compare</CardTitle>
              <CardDescription>Choose up to 6 projects to compare their metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <MultiSelect
                options={projectOptions}
                value={selectedProjectIds}
                onChange={handleProjectSelection}
                placeholder="Select projects..."
                maxItems={6}
                className="w-full"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading project data...</span>
        </div>
      ) : selectedProjectIds.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Select at least one project to view comparison data
        </div>
      ) : (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="hours">Hours & Budget</TabsTrigger>
            <TabsTrigger value="tasks">Task Breakdown</TabsTrigger>
            <TabsTrigger value="status">Status Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {projectMetrics.map((metrics) => (
                <Card key={metrics.projectId}>
                  <CardHeader style={{ borderBottom: `4px solid ${selectedProjects.find(p => p.id === metrics.projectId)?.color}` }}>
                    <CardTitle>{metrics.projectName}</CardTitle>
                    <CardDescription>Project Overview</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Tasks</dt>
                        <dd className="text-2xl font-bold">{metrics.taskCount}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Completed</dt>
                        <dd className="text-2xl font-bold">{metrics.completedTaskCount}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Hours</dt>
                        <dd className="text-2xl font-bold">{metrics.totalHours.toFixed(1)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Budget</dt>
                        <dd className="text-2xl font-bold">₱{metrics.totalBudget.toLocaleString()}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Avg. Completion Time</dt>
                        <dd className="text-2xl font-bold">
                          {metrics.averageCompletionTime ? 
                            `${metrics.averageCompletionTime.toFixed(1)} days` : 
                            'N/A'}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="hours">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Hours Per Project</CardTitle>
                <CardDescription>Comparing total hours logged across selected projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={projectMetrics.map(m => ({ 
                        name: m.projectName, 
                        hours: m.totalHours,
                        color: selectedProjects.find(p => p.id === m.projectId)?.color
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} hours`, 'Hours']} />
                      <Legend />
                      <Bar dataKey="hours" name="Hours" fill="#8884d8">
                        {projectMetrics.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={selectedProjects.find(p => p.id === entry.projectId)?.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Budget Per Project</CardTitle>
                <CardDescription>Comparing total budget across selected projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={projectMetrics.map(m => ({ 
                        name: m.projectName, 
                        budget: m.totalBudget,
                        color: selectedProjects.find(p => p.id === m.projectId)?.color
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₱${Number(value).toLocaleString()}`, 'Budget']} />
                      <Legend />
                      <Bar dataKey="budget" name="Budget (₱)" fill="#8884d8">
                        {projectMetrics.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={selectedProjects.find(p => p.id === entry.projectId)?.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projectMetrics.map((metrics) => (
                <Card key={metrics.projectId} className="mb-8">
                  <CardHeader style={{ borderBottom: `4px solid ${selectedProjects.find(p => p.id === metrics.projectId)?.color}` }}>
                    <CardTitle>{metrics.projectName} - Top Tasks by Hours</CardTitle>
                    <CardDescription>Tasks with highest time investment</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={metrics.hoursPerTask.sort((a, b) => b.hours - a.hours).slice(0, 5)}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="taskName" width={150} />
                          <Tooltip formatter={(value) => [`${value} hours`, 'Hours']} />
                          <Bar 
                            dataKey="hours" 
                            name="Hours" 
                            fill={selectedProjects.find(p => p.id === metrics.projectId)?.color} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projectMetrics.map((metrics) => (
                <Card key={`earnings-${metrics.projectId}`}>
                  <CardHeader style={{ borderBottom: `4px solid ${selectedProjects.find(p => p.id === metrics.projectId)?.color}` }}>
                    <CardTitle>{metrics.projectName} - Top Tasks by Earnings</CardTitle>
                    <CardDescription>Tasks with highest financial value</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={metrics.earningsPerTask.sort((a, b) => b.earnings - a.earnings).slice(0, 5)}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="taskName" width={150} />
                          <Tooltip formatter={(value) => [`₱${Number(value).toLocaleString()}`, 'Earnings']} />
                          <Bar 
                            dataKey="earnings" 
                            name="Earnings (₱)" 
                            fill={selectedProjects.find(p => p.id === metrics.projectId)?.color} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="status">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projectMetrics.map((metrics) => (
                <Card key={`status-${metrics.projectId}`}>
                  <CardHeader style={{ borderBottom: `4px solid ${selectedProjects.find(p => p.id === metrics.projectId)?.color}` }}>
                    <CardTitle>{metrics.projectName} - Task Status</CardTitle>
                    <CardDescription>Distribution of tasks by status</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getStatusPieData(metrics)}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {getStatusPieData(metrics).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} tasks`, 'Count']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}