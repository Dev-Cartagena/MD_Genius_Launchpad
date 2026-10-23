import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
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
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { currentLocale } from "@/i18n";

/** Split layout: brand gradient panel on the left (md and up), white form panel on the right. */
function AuthShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("auth");
  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-2">
      <div className="hidden md:flex hero-surface flex-col items-center justify-center gap-8 p-12">
        <Logo layout="vertical" tone="reversed" className="h-36" />
        <p className="font-display text-lg text-white/85 text-center max-w-xs leading-relaxed">
          {t("shell.tagline")}
        </p>
      </div>
      <div className="relative flex min-h-screen md:min-h-0 flex-col items-center justify-center bg-card px-4 py-10 sm:px-8">
        <LanguageSwitcher className="absolute right-4 top-4 sm:right-8" />
        <Logo layout="compact" className="h-8 mb-8 md:hidden" />
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

// Validation schemas (built with the translator so messages follow the language)
function makeSchemas(t: TFunction<"auth">) {
  const email = z.string().email(t("validation.invalidEmail"));
  return {
    login: z.object({
      email,
      password: z.string().min(1, t("validation.passwordRequired")),
    }),
    register: z.object({
      email,
      password: z.string().min(8, t("validation.passwordMin")),
      firstName: z.string().min(1, t("validation.firstNameRequired")),
      lastName: z.string().optional(),
    }),
    forgotPassword: z.object({
      email,
    }),
  };
}

type Schemas = ReturnType<typeof makeSchemas>;
type LoginForm = z.infer<Schemas["login"]>;
type RegisterForm = z.infer<Schemas["register"]>;
type ForgotPasswordForm = z.infer<Schemas["forgotPassword"]>;

export default function Auth() {
  const { t } = useTranslation("auth");
  const schemas = useMemo(() => makeSchemas(t), [t]);
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
    resolver: zodResolver(schemas.login),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(schemas.register),
    defaultValues: { email: "", password: "", firstName: "", lastName: "" },
  });

  const forgotPasswordForm = useForm<ForgotPasswordForm>({
    resolver: zodResolver(schemas.forgotPassword),
    defaultValues: { email: "" },
  });

  // Mutations
  const loginMutation = useMutation({
    mutationFn: (data: LoginForm) => apiRequest("POST", "/api/auth/login", data),
    onSuccess: () => {
      toast({ title: t("toast.signedIn.title"), description: t("toast.signedIn.description") });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate(afterAuthPath);
    },
    onError: (error: any) => {
      toast({
        title: t("toast.signInFailed.title"),
        description: error.message || t("toast.signInFailed.description"),
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterForm) => apiRequest("POST", "/api/auth/register", { ...data, locale: currentLocale() }),
    onSuccess: () => {
      toast({ title: t("toast.accountCreated.title"), description: t("toast.accountCreated.description") });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate(afterAuthPath);
    },
    onError: (error: any) => {
      toast({
        title: t("toast.registerFailed.title"),
        description: error.message || t("toast.registerFailed.description"),
        variant: "destructive",
      });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (data: ForgotPasswordForm) => apiRequest("POST", "/api/auth/forgot-password", data),
    onSuccess: () => {
      toast({
        title: t("toast.resetRequested.title"),
        description: t("toast.resetRequested.description"),
      });
      setShowForgotPassword(false);
    },
    onError: (error: any) => {
      toast({
        title: t("toast.resetEmailFailed.title"),
        description: error.message || t("toast.resetEmailFailed.description"),
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
            <CardTitle className="text-2xl font-medium">{t("forgot.title")}</CardTitle>
            <CardDescription>
              {t("forgot.description")}
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
                      <FormLabel>{t("fields.email")}</FormLabel>
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
                  {forgotPasswordMutation.isPending ? t("forgot.submitting") : t("forgot.submit")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowForgotPassword(false)}
                  data-testid="button-back-to-login"
                >
                  {t("forgot.back")}
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
          <CardTitle className="text-2xl font-medium">{t("welcome.title")}</CardTitle>
          <CardDescription>
            {t("welcome.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">{t("tabs.signIn")}</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">{t("tabs.register")}</TabsTrigger>
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
                          <FormLabel>{t("fields.email")}</FormLabel>
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
                          <FormLabel>{t("fields.password")}</FormLabel>
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
                      {loginMutation.isPending ? t("login.submitting") : t("login.submit")}
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
                    {t("login.forgot")}
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
                          <FormLabel>{t("fields.firstName")}</FormLabel>
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
                          <FormLabel>{t("fields.lastNameOptional")}</FormLabel>
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
                          <FormLabel>{t("fields.email")}</FormLabel>
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
                          <FormLabel>{t("fields.password")}</FormLabel>
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
                      {registerMutation.isPending ? t("register.submitting") : t("register.submit")}
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