import { pgTable, text, serial, integer, boolean, timestamp, jsonb, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model with role enum
export const userRoles = ["supervisor", "team_lead", "staff"] as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role", { enum: userRoles }).notNull().default("staff"),
  avatarUrl: text("avatar_url"),
  position: text("position"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  projectId: integer("project_id").notNull().references(() => projects.id),
  assignedToId: integer("assigned_to_id").references(() => users.id),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  tags: text("tags").array(),
  startDate: timestamp("start_date"),
  startTime: text("start_time"),
  endDate: timestamp("end_date"),
  endTime: text("end_time"),
  dueDate: timestamp("due_date"),
  pricingType: text("pricing_type", { enum: ["hourly", "fixed"] }).notNull(),
  hourlyRate: integer("hourly_rate"),
  fixedPrice: integer("fixed_price"),
  status: text("status", { enum: ["todo", "in_progress", "completed"] }).notNull().default("todo"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const taskComments = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  attachments: text("attachments").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const taskHistory = pgTable("task_history", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  taskId: integer("task_id").references(() => tasks.id),
  type: text("type").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Define relations
export const usersRelations = {
  tasks: {
    assignedTasks: tasks,
    createdTasks: tasks,
  },
  taskComments: taskComments,
  taskHistory: taskHistory,
  notifications: notifications,
};

export const projectsRelations = {
  tasks: tasks,
};

export const tasksRelations = {
  project: projects,
  assignedTo: users,
  createdBy: users,
  comments: taskComments,
  history: taskHistory,
  notifications: notifications,
};

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });

// Create a custom schema for tasks with proper date handling
export const baseTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskSchema = baseTaskSchema.extend({
  // Make dates optional and properly handle date conversions
  startDate: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
  endDate: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
  dueDate: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
});

export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({ id: true, createdAt: true });
export const insertTaskHistorySchema = createInsertSchema(taskHistory).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type TaskComment = typeof taskComments.$inferSelect;
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;

export type TaskHistory = typeof taskHistory.$inferSelect;
export type InsertTaskHistory = z.infer<typeof insertTaskHistorySchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
