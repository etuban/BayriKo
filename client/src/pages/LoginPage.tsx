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
    caption: "\"Magbabayad ka ba o ipapapulis kita?\"",
  },
  {
    image: "https://pawn.media/bayriko/money.jpg",
    caption: "\"Make it rain with BayriKo!\"",
  },
  {
    image: "https://pawn.media/bayriko/pay.jpg",
    caption: "\"Your tasks, your payments, your way.\"",
  }
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
    Autoplay({ delay: 5000, stopOnInteraction: false })
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
    <div className="min-h-screen login-screen content-center justify-center bg-background p-4">
      <div className="flex items-center justify-center bg-background p-4 h-full min-h-screen">
        <div className="w-full max-w-6xl flex flex-col md:flex-row gap-8 border-border h-full">
          {/* Form Section - Left Column */}
          <div className="w-full md:w-1/2 h-full">
            <Card className="w-full h-full bg-background flex flex-col">
              <CardHeader className="space-y-2 mt-4">
                <CardTitle className="text-4xl font-bold text-center font-specialGothic tracking-widest">
                  BAYRIKO
                </CardTitle>
                <CardDescription className="text-center text-lg font-specialGothic">
                  Your Bay That Pays
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-grow">
                <Tabs
                  defaultValue="login"
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 mt-8 mb-4">
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
                        className="p-6 w-full text-xl bg-primary hover:bg-primary/90"
                        disabled={isLoading}
                      >
                        {isLoading ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                    <div className="text-center mt-16">
                      <p className="text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <button
                          type="button"
                          className="font-bold text-primary hover:underline"
                          onClick={() => setActiveTab("register")}
                        >
                          Register
                        </button>
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="register" className="space-y-4">
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

                      {/* Registration complete notice - will be shown after successful registration */}
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
                        className="w-full text-xl bg-primary hover:bg-primary/90"
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
            </Card>
          </div>

          {/* Content Section - Right Column (only visible on md and larger screens) */}
          <div className="w-full md:w-1/2 hidden md:block align-top h-full">
            <Card className="w-full h-full bg-background overflow-hidden flex flex-col align-top">
              <CardContent className="p-8 flex-grow flex flex-col items-center justify-center">
                <div className="relative w-full max-w-md overflow-hidden rounded-xl mb-4">
                  <div className="overflow-hidden" ref={emblaRef}>
                    <div className="flex">
                      {sliderItems.map((item, index) => (
                        <div 
                          key={index} 
                          className="relative flex-[0_0_100%] min-w-0"
                        >
                          <div className="flex flex-col items-center justify-center">
                            <img
                              src={item.image}
                              alt={`Slide ${index + 1}`}
                              className="w-full rounded-lg shadow-md object-cover h-64"
                            />
                            <p className="text-center text-md italic font-specialGothic mt-4">
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
                        className={`w-3 h-3 rounded-full mx-1 transition-all duration-300 ${
                          index === selectedIndex 
                            ? "bg-primary scale-125" 
                            : "bg-muted hover:bg-muted-foreground/50"
                        }`}
                        type="button"
                        onClick={() => emblaApi?.scrollTo(index)}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <CardFooter className="block justify-center">
        <p className="text-sm text-center text-muted-foreground mt-8">
          BayriKo &copy; {new Date().getFullYear()}. A{" "}
          <a
            href="https://pawn.media"
            className="font-bold text-primary hover:underline"
          >
            Pawn.Media
          </a>{" "}
          project
        </p>
      </CardFooter>
    </div>
  );
}
