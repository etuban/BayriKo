import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "../context/AuthContext";
import { UserProfileCard } from "./UserProfileCard";
import { GiReceiveMoney } from "react-icons/gi";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  ChartPieIcon,
  ListTodo,
  FileSpreadsheetIcon,
  SquareKanbanIcon,
  Users,
  Settings,
  ChevronRight,
  ChevronLeft,
  LogOut,
  X,
  Building,
  Building2,
  BarChart2,
  Bug,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobile = false, onClose }: SidebarProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  // Check localStorage for saved sidebar state (desktop mode only)
  useEffect(() => {
    if (!mobile) {
      const savedState = localStorage.getItem("sidebarCollapsed");
      if (savedState !== null) {
        setCollapsed(savedState === "true");
      }
    }
  }, [mobile]);

  // Toggle sidebar and save state (desktop mode only)
  const toggleSidebar = () => {
    if (mobile) return;

    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", String(newState));

    // Dispatch custom event for Layout to listen
    document.dispatchEvent(new CustomEvent("sidebarToggle"));
  };

  const navItems = [
    {
      title: "Dashboard",
      icon: <ChartPieIcon className="w-5 h-5 mr-3" />,
      path: "/dashboard",
      display: user?.role !== "staff", // Hide Dashboard for staff users
    },
    {
      title: "Tasks",
      icon: <ListTodo className="w-5 h-5 mr-3" />,
      path: "/tasks",
      display: true,
    },
    {
      title: "PDF Invoice",
      icon: <FileSpreadsheetIcon className="w-5 h-5 mr-3" />,
      path: "/payable",
      display: true,
    },
    {
      title: "Projects",
      icon: <SquareKanbanIcon className="w-5 h-5 mr-3" />,
      path: "/projects",
      display: true, // Allow all users including staff to access Projects
    },
    {
      title: "Project Comparison",
      icon: <BarChart2 className="w-5 h-5 mr-3" />,
      path: "/project-comparison",
      display: user?.role === "super_admin",
    },
    {
      title: "Organizations",
      icon: <Building2 className="w-5 h-5 mr-3" />,
      path: "/organizations",
      display: user?.role === "super_admin",
    },
    {
      title: "Organization Settings",
      icon: <Building className="w-5 h-5 mr-3" />,
      path: "/organization-settings",
      display: user?.role === "super_admin" || user?.role === "supervisor",
    },
    {
      title: "Users",
      icon: <Users className="w-5 h-5 mr-3" />,
      path: "/users",
      display: user?.role !== "staff",
    },
    {
      title: "Settings",
      icon: <Settings className="w-5 h-5 mr-3" />,
      path: "/settings",
      display: true,
    },
  ];

  // Handle navigation click on mobile view
  const handleNavClick = () => {
    if (mobile && onClose) {
      // Close mobile sidebar when navigation item is clicked
      onClose();
    }
  };

  return (
    <aside
      className={cn(
        "bg-background border-r border-border flex-shrink-0 transition-all duration-300 overflow-hidden relative h-full",
        mobile ? "w-64" : collapsed ? "w-20" : "w-64",
        !mobile && "hidden sm:block", // Hide on mobile for desktop sidebar
      )}
    >
      {/* Mobile Close Button */}
      {mobile && onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 z-20"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      )}

      {/* Logo and App Name */}
      <div className="flex items-center p-4 border-b border-border">
        <div className="bg-primary p-2 rounded-full">
          <GiReceiveMoney className="w-6 h-6 text-white" />
        </div>
        {(!collapsed || mobile) && (
          <h1 className="ml-3 text-xl font-semibold">BayriKo</h1>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="p-4">
        {(!collapsed || mobile) && (
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Main Menu
          </h2>
        )}
        <TooltipProvider delayDuration={300}>
          <ul>
            {navItems
              .filter((item) => item.display)
              .map((item, index) => (
                <li key={index} className="mb-1">
                  {collapsed && !mobile ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={item.path}>
                          <div
                            className={cn(
                              "flex items-center text-sm px-2 py-1 rounded-md w-full text-left transition-colors cursor-pointer",
                              location === item.path
                                ? "bg-primary text-white"
                                : "hover:bg-muted",
                            )}
                            onClick={handleNavClick}
                          >
                            {React.cloneElement(item.icon, {
                              className: "w-5 h-5 mx-auto"
                            })}
                          </div>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.title}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Link href={item.path}>
                      <div
                        className={cn(
                          "flex items-center text-sm px-2 py-1 rounded-md w-full text-left transition-colors cursor-pointer",
                          location === item.path
                            ? "bg-primary text-white"
                            : "hover:bg-muted",
                        )}
                        onClick={handleNavClick}
                      >
                        {React.cloneElement(item.icon, {
                          className: "w-5 h-5 mr-3"
                        })}
                        <span>{item.title}</span>
                      </div>
                    </Link>
                  )}
                </li>
              ))}
          </ul>
        </TooltipProvider>
      </nav>

      {/* User Profile Section */}
      {(!collapsed || mobile) && <UserProfileCard user={user} />}

      {/* "Found a bug?" link for all users */}
      <div className={cn("px-4", collapsed && !mobile ? "text-center" : "")}>
        {collapsed && !mobile ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/bug-report">
                <div
                  className={cn(
                    "flex items-center px-4 py-2 rounded-md w-full text-left transition-colors hover:bg-muted text-amber-500 hover:text-amber-600 justify-center",
                  )}
                  onClick={handleNavClick}
                >
                  <Bug className="w-5 h-5 mx-auto" />
                </div>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Report a Bug</TooltipContent>
          </Tooltip>
        ) : (
          <Link href="/bug-report">
            <div
              className={cn(
                "flex items-center px-4 py-2 rounded-md w-full text-left transition-colors hover:bg-muted text-amber-500 hover:text-amber-600",
              )}
              onClick={handleNavClick}
            >
              <Bug className="w-5 h-5 mr-3" />
              <span>Report a Bug</span>
            </div>
          </Link>
        )}
      </div>

      {/* Sign Out Button */}
      <div
        className={cn("p-4 mt-2", collapsed && !mobile ? "text-center" : "")}
      >
        {collapsed && !mobile ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => logout()}
                className={cn(
                  "flex items-center px-4 py-2 rounded-md w-full text-left transition-colors hover:bg-muted text-red-500 hover:text-red-600 justify-center",
                )}
              >
                <LogOut className="w-5 h-5 mx-auto" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign Out</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={() => logout()}
            className={cn(
              "flex items-center px-4 py-2 rounded-md w-full text-left transition-colors hover:bg-muted text-red-500 hover:text-red-600",
            )}
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span>Sign Out</span>
          </button>
        )}
      </div>

      {/* Toggle Button - Desktop only */}
      {!mobile && (
        <button
          onClick={toggleSidebar}
          className="absolute top-1/2 -right-3 bg-primary text-white rounded-full p-2 shadow-md hover:bg-primary/90 transition-colors z-999"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      )}
    </aside>
  );
}
