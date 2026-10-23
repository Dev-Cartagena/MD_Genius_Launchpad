import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Logo } from "@/components/brand";

/** Split layout: brand gradient panel on the left (md and up), white form panel on the right. */
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-2">
      <div className="hidden md:flex bg-brand-gradient flex-col items-center justify-center gap-8 p-12">
        <Logo layout="vertical" tone="reversed" className="h-36" />
        <p className="font-display text-lg text-mist text-center max-w-xs leading-relaxed">
          Your work in the program is saved to your account, so you can pick up where you left off.
        </p>
      </div>
      <div className="flex min-h-screen md:min-h-0 flex-col items-center justify-center bg-card px-4 py-10 sm:px-8">
        <Logo layout="compact" className="h-8 mb-8 md:hidden" />
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;
type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function Auth() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("login");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Optional return path, e.g. /login?next=/apply. Only same-site paths are allowed.
  const nextParam = new URLSearchParams(window.location.search).get("next");
  const afterAuthPath = nextParam && /^\/(?!\/)/.test(nextParam) ? nextParam : "/";

  // Forms
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", firstName: "", lastName: "" },
  });

  const forgotPasswordForm = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  // Mutations
  const loginMutation = useMutation({
    mutationFn: (data: LoginForm) => apiRequest("POST", "/api/auth/login", data),
    onSuccess: () => {
      toast({ title: "Signed in", description: "Welcome back." });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate(afterAuthPath);
    },
    onError: (error: any) => {
      toast({
        title: "Sign-in failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterForm) => apiRequest("POST", "/api/auth/register", data),
    onSuccess: () => {
      toast({ title: "Account created", description: "Welcome to MD Genius Launchpad." });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate(afterAuthPath);
    },
    onError: (error: any) => {
      toast({
        title: "Could not create account",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (data: ForgotPasswordForm) => apiRequest("POST", "/api/auth/forgot-password", data),
    onSuccess: () => {
      toast({
        title: "Password reset requested",
        description: "If an account exists for that email, you will receive reset instructions shortly.",
      });
      setShowForgotPassword(false);
    },
    onError: (error: any) => {
      toast({
        title: "Could not send reset email",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  const onForgotPassword = (data: ForgotPasswordForm) => {
    forgotPasswordMutation.mutate(data);
  };

  if (showForgotPassword) {
    return (
      <AuthShell>
        <Card className="border-0 shadow-none md:border md:shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-medium">Reset your password</CardTitle>
            <CardDescription>
              Enter your email address and we will send you instructions to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...forgotPasswordForm}>
              <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPassword)} className="space-y-4">
                <FormField
                  control={forgotPasswordForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          data-testid="input-forgot-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={forgotPasswordMutation.isPending}
                  data-testid="button-send-reset-instructions"
                >
                  {forgotPasswordMutation.isPending ? "Sending..." : "Send reset instructions"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowForgotPassword(false)}
                  data-testid="button-back-to-login"
                >
                  Back to sign in
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card className="border-0 shadow-none md:border md:shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-medium">Welcome to MD Genius Launchpad</CardTitle>
          <CardDescription>
            Sign in or create an account with your email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">Sign in</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <div className="space-y-4">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              data-testid="input-login-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              data-testid="input-login-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                      data-testid="button-email-login"
                    >
                      {loginMutation.isPending ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>
                </Form>

                <div className="text-center space-y-2">
                  <Button
                    variant="link"
                    className="text-sm"
                    onClick={() => setShowForgotPassword(true)}
                    data-testid="link-forgot-password"
                  >
                    Forgot your password?
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <div className="space-y-4">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              data-testid="input-register-firstname"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last name (optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              data-testid="input-register-lastname"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              data-testid="input-register-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              data-testid="input-register-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                      data-testid="button-email-register"
                    >
                      {registerMutation.isPending ? "Creating account..." : "Create account"}
                    </Button>
                  </form>
                </Form>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </AuthShell>
  );
}