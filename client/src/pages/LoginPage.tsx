import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { signInWithGoogle } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GiReceiveMoney } from "react-icons/gi";
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
    image: "https://pawn.media/bayriko/steps/Bayriko-Task-Page.gif",
    caption: "Assign tasks conveniently to your team.",
  },
  {
    image: "https://pawn.media/bayriko/steps/Bayriko-PDF-Invoice.gif",
    caption: "Easy PDF invoice generation of your tasks.",
  },
  {
    image: "https://pawn.media/bayriko/steps/Bayriko-Users.gif",
    caption: "Supervisor can manage users and their roles.",
  },
  {
    image: "https://pawn.media/bayriko/steps/Bayriko-Users.gif",
    caption: "Create and manage projects for your team.",
  },
  {
    image: "https://pawn.media/bayriko/steps/Bayriko-Dashboard.gif",
    caption: "Measure your productivity using key metrics.",
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
    Autoplay({ delay: 15000, stopOnInteraction: true }),
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

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null);
      // Call the Firebase Google Sign-In
      const result = await signInWithGoogle();

      if (!result || !result.user) {
        throw new Error("Google sign-in failed");
      }

      // Get user data from the Firebase response
      const { user } = result;

      // Send the user data to our backend
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          displayName:
            user.displayName || user.email?.split("@")[0] || "Unknown User",
          uid: user.uid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to authenticate with Google");
      }

      // Refresh the session
      await login(user.email as string, "firebase-auth", true);

      // Check user role and navigate accordingly
      try {
        // Get the updated session to determine correct navigation
        const sessionResponse = await fetch('/api/auth/session');
        const sessionData = await sessionResponse.json();
        
        console.log('Firebase login session data:', sessionData);
        
        if (sessionData.authenticated && sessionData.user) {
          const role = sessionData.user.role;
          console.log(`Redirecting Firebase user with role: ${role}`);
          
          // Staff users redirect to tasks, others to dashboard
          if (role === 'staff') {
            setLocation("/tasks");
          } else {
            setLocation("/dashboard");
          }
        } else {
          // Fallback to dashboard if can't determine role
          setLocation("/dashboard");
        }
      } catch (error) {
        console.error('Error checking session after Firebase login:', error);
        // Fallback to dashboard if there's an error
        setLocation("/dashboard");
      }
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      setAuthError(
        error.message || "Failed to login with Google. Please try again.",
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
      <div className="flex flex-col md:flex-row lg:min-h-screen">
        {/* Left side - Fixed brand panel */}
        <div className="hidden md:block fixed left-0 top-0 w-3/5 bg-[#033902] h-screen">
          <div className="h-full flex flex-col justify-between p-4">
            {/* Top Logo */}
            <div className="top-logo flex items-center justify-center">
              <div className="flex items-center">
                <div className="border border-white-8 w-24 h-24 bg-white rounded-full mt-2">
                  <GiReceiveMoney className="w-12 h-12 text-primary mt-6 ml-6" />
                </div>
                <div className="ml-4">
                  <h1 className="text-7xl font-bold text-white mb-1 font-Kanit">
                    BAYRIKO
                  </h1>
                  <p className="text-white/80 text-lg max-w-md">
                    Task to Invoice Management System
                  </p>
                </div>
              </div>
            </div>

            {/* Main Content with Carousel */}
            <div className="my-auto">
              {/* Image Carousel */}
              <div className="mb-4 mt-2">
                <div className="overflow-hidden rounded-lg" ref={emblaRef}>
                  <div className="flex">
                    {sliderItems.map((item, index) => (
                      <div
                        key={index}
                        className="relative flex-[0_0_100%] min-w-0"
                      >
                        <div className="flex flex-col items-center justify-center ml-14 mr-14">
                          <img
                            src={item.image}
                            alt={`Slide ${index + 1}`}
                            className="w-full rounded-lg shadow-md object-cover h-96"
                          />
                          <p className="text-center text-xl text-white/120 mt-4">
                            {item.caption}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dot indicators */}
                <div className="flex justify-center mt-4">
                  {sliderItems.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full mx-1 transition-all duration-300 ${
                        index === selectedIndex
                          ? "bg-white scale-125"
                          : "bg-white/40 hover:bg-white/60"
                      }`}
                      type="button"
                      onClick={() => emblaApi?.scrollTo(index)}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Copyright */}
            <div className="text-white/60 text-[9px] text-center">
              © {new Date().getFullYear()} BAYRIKO.{" "}
              <a href="https://pawn.media" className="font-bold underline">
                Pawn Media
              </a>
              .
            </div>
          </div>
        </div>

        {/* Right side - Login Form (scrollable) */}
        <div className="w-full md:w-2/5 md:ml-auto p-4 login-form-panel">
          <div className="w-full max-w-md mx-auto my-4">
            {/* Brand */}
            {/* Top Logo */}
            <div className="flex items-center justify-center mobile-only mb-8">
              <div className="flex items-center">
                <div className="border border-white-8 w-20 h-20 bg-white rounded-full mt-2">
                  <GiReceiveMoney className="w-12 h-12 text-primary mt-4 ml-4" />
                </div>
                <div className="ml-4">
                  <h1 className="text-6xl font-bold text-white mb-1 font-Kanit">
                    BAYRIKO
                  </h1>
                  <p className="text-white/80 text-sm max-w-md">
                    Task to Invoice Management System
                  </p>
                </div>
              </div>
            </div>
            <div>
              {activeTab === "login" ? (
                <>
                  <h2 className="text-2xl font-bold mb-2 lg:mt-24">Login</h2>
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
                  <h2 className="text-2xl font-bold mb-2">Create Account</h2>
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
                        placeholder="email@example.com"
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
                      className="w-full py-6 text-lg bg-primary text-white"
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

                  <Button
                    variant="outline"
                    className="w-full py-6 relative"
                    onClick={handleGoogleSignIn}
                    type="button"
                    disabled={isLoading}
                  >
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
                    <span className="ml-2">
                      {isLoading ? "Signing in..." : "Login with Google"}
                    </span>
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
                        <strong>{invitationInfo.organizationName}</strong> as a{" "}
                        <strong>{invitationInfo.role}</strong>. Complete
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
                        placeholder="email@example.com"
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
                        placeholder="Developer, Designer, etc."
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
                        value={registerForm.watch("role")}
                        onValueChange={(value) =>
                          registerForm.setValue("role", value as any)
                        }
                        disabled={invitationInfo?.valid}
                      >
                        <SelectTrigger
                          id="register-role"
                          className="w-full capitalize"
                        >
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="staff" className="capitalize">
                            Staff
                          </SelectItem>
                          <SelectItem value="team_lead" className="capitalize">
                            Team Lead
                          </SelectItem>
                          <SelectItem value="supervisor" className="capitalize">
                            Supervisor
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {registerForm.formState.errors.role && (
                        <p className="text-sm text-red-500">
                          {registerForm.formState.errors.role.message}
                        </p>
                      )}
                    </div>

                    {registering && (
                      <div className="text-sm p-3 border border-muted rounded bg-muted/20">
                        <p className="text-center font-medium">
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
                      className="w-full py-6 text-lg bg-primary text-white"
                      disabled={registering}
                    >
                      {registering ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row mobile-only">
        {/* Mobile Only */}
        <div className="md:block left-0 top-0 bg-[#033902]">
          <div className="h-full flex flex-col justify-between p-4 pt-8">
            <div className="my-auto">
              {/* Image Carousel */}
              <div className="mb-4 mt-2">
                <div className="overflow-hidden rounded-lg" ref={emblaRef}>
                  <div className="flex">
                    {sliderItems.map((item, index) => (
                      <div
                        key={index}
                        className="relative flex-[0_0_100%] min-w-0"
                      >
                        <div className="flex flex-col items-center justify-center ml-2 mr-2">
                          <img
                            src={item.image}
                            alt={`Slide ${index + 1}`}
                            className="w-full rounded-lg shadow-md object-cover h-48"
                          />
                          <p className="text-center text-md text-white/120 mt-4">
                            {item.caption}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dot indicators */}
                <div className="flex justify-center mt-4">
                  {sliderItems.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full mx-1 transition-all duration-300 ${
                        index === selectedIndex
                          ? "bg-white scale-125"
                          : "bg-white/40 hover:bg-white/60"
                      }`}
                      type="button"
                      onClick={() => emblaApi?.scrollTo(index)}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Copyright */}
            <div className="text-white/60 text-[9px] text-center">
              © {new Date().getFullYear()} BAYRIKO.{" "}
              <a href="https://pawn.media" className="font-bold underline">
                Pawn Media
              </a>
              .
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
