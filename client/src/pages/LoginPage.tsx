import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
    role: z.enum(["supervisor", "team_lead", "staff"]).default("staff"),
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    position: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

// Define slider images and captions
const sliderItems = [
  {
    image: "https://pawn.media/bayriko/kyawil.jpg",
    caption: '"Magbabayad ka ba o ipapapulis kita?"',
  },
  {
    image: "https://pawn.media/bayriko/money.jpg",
    caption: '"Make it rain with BayriKo!"',
  },
  {
    image: "https://pawn.media/bayriko/kyawil.jpg",
    caption: '"Magbabayad ka ba o ipapapulis kita?"',
  },
];

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("login");
  const { toast } = useToast();

  // Setup carousel with autoplay
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false }),
  ]);

  // For dots navigation
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", onSelect);
    // Initial call to set selectedIndex correctly
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // Invitation state
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationInfo, setInvitationInfo] = useState<{
    organizationName: string;
    role: string;
    valid: boolean;
  } | null>(null);
  const [validatingInvitation, setValidatingInvitation] = useState(false);

  // Check for invitation token in URL on component mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token");

    if (token) {
      setInvitationToken(token);
      validateInvitationToken(token);
      // Switch to register tab
      setActiveTab("register");
    }
  }, []);

  // Function to validate invitation token
  const validateInvitationToken = async (token: string) => {
    try {
      setValidatingInvitation(true);

      const response = await fetch(`/api/invitations/validate/${token}`);
      const data = await response.json();

      if (response.ok && data.valid) {
        setInvitationInfo({
          organizationName: data.organization.name,
          role: data.role,
          valid: true,
        });

        // Pre-set the role in the form
        registerForm.setValue("role", data.role);
      } else {
        // Invalid token
        setInvitationInfo(null);
        toast({
          title: "Invalid Invitation",
          description:
            data.message || "The invitation link is invalid or has expired.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error validating invitation token:", error);
      toast({
        title: "Error",
        description: "Failed to validate invitation token. Please try again.",
        variant: "destructive",
      });
    } finally {
      setValidatingInvitation(false);
    }
  };

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
      fullName: "",
      role: "staff",
      position: "",
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

      // Prepare registration data
      const registrationData = {
        username: data.username,
        email: data.email,
        password: data.password,
        fullName: data.fullName || data.username,
        role: data.role,
        position: data.position,
        // If there's a valid invitation token, include it
        ...(invitationToken ? { invitationToken } : { isApproved: false }),
      };

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Registration failed");
      }

      // If using an invitation token, mark it as used
      if (invitationToken) {
        await fetch(`/api/invitations/use/${invitationToken}`, {
          method: "POST",
        });
      }

      // Show appropriate success message based on invitation status
      if (invitationInfo?.valid) {
        toast({
          title: "Registration Successful",
          description: `You have been registered as a ${invitationInfo.role} in ${invitationInfo.organizationName}. You can now login.`,
          duration: 6000,
        });
      } else {
        toast({
          title: "Registration Successful",
          description:
            "Please wait for supervisor approval. You'll be notified when your account is approved.",
          duration: 6000,
        });
      }

      // Change to login tab
      setActiveTab("login");

      // Clear URL params to remove token
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error: any) {
      setRegisterError(
        error.message || "Failed to register. Please try again.",
      );
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen login-screen bg-background">
      <div className="flex min-h-screen">
        <div className="w-full mx-auto flex flex-col md:flex-row">
          {/* Left side - Brand/Marketing Panel with background color (sticky) */}
          <div className="w-full md:w-1/2 bg-primary hidden md:block">
            <div className="sticky top-0 h-screen flex flex-col justify-between p-12">
              {/* Top Logo */}
              <div className="text-white">
                <svg
                  viewBox="0 0 24 24"
                  width="40"
                  height="40"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>

              {/* Main Content */}
              <div className="my-auto">
                <h1 className="text-5xl font-bold text-white mb-6 font-Kanit">
                  Hello
                  <br />
                  BAYRIKO!<span className="ml-2">👋</span>
                </h1>
                <p className="text-white/80 text-lg max-w-md">
                  Skip repetitive and manual task management. Get highly
                  productive through automation and save tons of time!
                </p>
              </div>

              {/* Footer Copyright */}
              <div className="text-white/60 text-sm">
                © {new Date().getFullYear()} BAYRIKO. All rights reserved.
              </div>
            </div>
          </div>

          {/* Right side - Login Form (scrollable) */}
          <div className="w-full md:w-1/2 overflow-y-auto max-h-screen p-8">
            <div className="w-full max-w-md mx-auto my-8">
              {/* Brand */}
              <div className="mb-10">
                <h2 className="text-2xl font-bold">BAYRIKO</h2>
              </div>

              <div>
                {activeTab === "login" ? (
                  <>
                    <h2 className="text-3xl font-bold mb-2">Welcome Back!</h2>
                    <p className="text-muted-foreground mb-8">
                      Don't have an account?{" "}
                      <button
                        type="button"
                        className="text-primary hover:underline font-medium"
                        onClick={() => setActiveTab("register")}
                      >
                        Create a new account now
                      </button>
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl font-bold mb-2">Create Account</h2>
                    <p className="text-muted-foreground mb-8">
                      Already have an account?{" "}
                      <button
                        type="button"
                        className="text-primary hover:underline font-medium"
                        onClick={() => setActiveTab("login")}
                      >
                        Sign in instead
                      </button>
                    </p>
                  </>
                )}

                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="hidden">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="space-y-6">
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
                        className="w-full py-6 text-lg bg-black hover:bg-black/90 text-white"
                        disabled={isLoading}
                      >
                        {isLoading ? "Signing in..." : "Login Now"}
                      </Button>
                    </form>

                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full py-6 relative">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        className="absolute left-4"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Login with Google
                    </Button>
                  </TabsContent>

                  <TabsContent value="register" className="space-y-6">
                    {/* Show invitation info if available */}
                    {invitationInfo?.valid && (
                      <Alert className="mb-4 bg-primary/10 border-primary/20">
                        <AlertTitle className="text-primary">
                          Organization Invitation
                        </AlertTitle>
                        <AlertDescription>
                          You've been invited to join{" "}
                          <strong>{invitationInfo.organizationName}</strong> as
                          a <strong>{invitationInfo.role}</strong>. Complete
                          registration to accept.
                        </AlertDescription>
                      </Alert>
                    )}

                    {validatingInvitation && (
                      <div className="text-sm text-muted-foreground p-3 border border-muted rounded bg-muted/20 mb-4">
                        <p className="text-center">Validating invitation...</p>
                      </div>
                    )}

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
                            {
                              registerForm.formState.errors.confirmPassword
                                .message
                            }
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-fullname">Full Name</Label>
                        <Input
                          id="register-fullname"
                          type="text"
                          placeholder="John Doe"
                          {...registerForm.register("fullName")}
                          className="w-full"
                        />
                        {registerForm.formState.errors.fullName && (
                          <p className="text-sm text-red-500">
                            {registerForm.formState.errors.fullName.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-position">
                          Position (Optional)
                        </Label>
                        <Input
                          id="register-position"
                          type="text"
                          placeholder="e.g. Developer, Designer, etc."
                          {...registerForm.register("position")}
                          className="w-full"
                        />
                        {registerForm.formState.errors.position && (
                          <p className="text-sm text-red-500">
                            {registerForm.formState.errors.position.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-role">Role</Label>
                        <Select
                          defaultValue="staff"
                          onValueChange={(value) =>
                            registerForm.setValue(
                              "role",
                              value as "supervisor" | "team_lead" | "staff",
                            )
                          }
                        >
                          <SelectTrigger id="register-role">
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="supervisor">
                              Supervisor
                            </SelectItem>
                            <SelectItem value="team_lead">Team Lead</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                        {registerForm.formState.errors.role && (
                          <p className="text-sm text-red-500">
                            {registerForm.formState.errors.role.message}
                          </p>
                        )}
                      </div>

                      {/* Registration complete notice - shown after successful registration */}
                      {registering && (
                        <div className="text-sm text-muted-foreground p-3 border border-muted rounded bg-muted/20">
                          <p className="mb-1 font-medium text-center">
                            Creating your account...
                          </p>
                          <p className="text-center">
                            Please wait while we process your registration.
                          </p>
                        </div>
                      )}

                      {registerError && (
                        <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 p-2 rounded">
                          {registerError}
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="w-full py-6 text-lg bg-black hover:bg-black/90 text-white"
                        disabled={registering}
                      >
                        {registering ? "Creating Account..." : "Create Account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="mt-8 text-center text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} BAYRIKO. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
