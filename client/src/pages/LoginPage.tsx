import React, { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { GiReceiveMoney } from "react-icons/gi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Form validation schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Registration form validation schema
const registerSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z
      .string()
      .min(6, "Password must be at least 6 characters"),
    role: z.enum(["supervisor", "team_lead", "staff"], {
      errorMap: () => ({ message: "Please select a valid role" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("login");

  // Initialize login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Initialize registration form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "staff",
    },
  });

  // Handle login form submission
  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      setAuthError(null);
      await login(data.email, data.password);

      // Use setLocation for client-side navigation without page refresh
      setLocation("/dashboard");
    } catch (error: any) {
      setAuthError(
        error.message || "Failed to login. Please check your credentials.",
      );
    }
  };

  // Handle registration form submission
  const onRegisterSubmit = async (data: RegisterFormValues) => {
    try {
      setRegisterError(null);
      setRegistering(true);

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          password: data.password,
          role: data.role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Registration failed");
      }

      // Auto-login after registration
      await login(data.email, data.password);

      // Use setLocation for client-side navigation without page refresh
      setLocation("/dashboard");
    } catch (error: any) {
      setRegisterError(
        error.message || "Failed to register. Please try again.",
      );
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-xl bg-background border-border">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-[498px] h-[280px] flex items-center justify-center mb-4 overflow-hidden">
            <img
              src="https://pawn.media/money.gif"
              alt="Money GIF"
              width="498"
              height="280"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            BayadMin
          </CardTitle>
          <CardDescription className="text-center">
            Your Task to Invoice tool
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="login"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form
                onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your.email@example.com"
                    {...loginForm.register("email")}
                    className="w-full"
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-red-500">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Password</Label>
                    <a
                      href="#"
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    {...loginForm.register("password")}
                    className="w-full"
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-red-500">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {authError && (
                  <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 p-2 rounded">
                    {authError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setActiveTab("register")}
                  >
                    Register
                  </button>
                </p>
              </div>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <form
                onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="register-username">Username</Label>
                  <Input
                    id="register-username"
                    type="text"
                    placeholder="johndoe"
                    {...registerForm.register("username")}
                    className="w-full"
                  />
                  {registerForm.formState.errors.username && (
                    <p className="text-sm text-red-500">
                      {registerForm.formState.errors.username.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="your.email@example.com"
                    {...registerForm.register("email")}
                    className="w-full"
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-red-500">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    {...registerForm.register("password")}
                    className="w-full"
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-red-500">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password">
                    Confirm Password
                  </Label>
                  <Input
                    id="register-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    {...registerForm.register("confirmPassword")}
                    className="w-full"
                  />
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-500">
                      {registerForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-role">Role</Label>
                  <select
                    id="register-role"
                    {...registerForm.register("role")}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="staff">Staff</option>
                    <option value="team_lead">Team Lead</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                  {registerForm.formState.errors.role && (
                    <p className="text-sm text-red-500">
                      {registerForm.formState.errors.role.message}
                    </p>
                  )}
                </div>

                {registerError && (
                  <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 p-2 rounded">
                    {registerError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={registering}
                >
                  {registering ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setActiveTab("login")}
                  >
                    Login
                  </button>
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-center text-muted-foreground">
            BayadMin &copy; {new Date().getFullYear()}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
