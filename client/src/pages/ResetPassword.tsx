import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/utils";
import { Logo } from "@/components/brand";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

function makeResetPasswordSchema(t: TFunction<"auth">) {
  return z
    .object({
      password: z.string().min(8, t("validation.passwordMin")),
      confirmPassword: z.string().min(1, t("validation.confirmRequired")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("validation.passwordsMismatch"),
      path: ["confirmPassword"],
    });
}

type ResetPasswordForm = z.infer<ReturnType<typeof makeResetPasswordSchema>>;

export default function ResetPassword() {
  const { t } = useTranslation("auth");
  const resetPasswordSchema = useMemo(() => makeResetPasswordSchema(t), [t]);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  // "/login" only exists as a route for logged-out users
  const loginPath = isAuthenticated ? "/" : "/login";
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token") || "");

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const resetMutation = useMutation({
    mutationFn: (data: ResetPasswordForm) =>
      apiRequest("POST", "/api/auth/reset-password", { token, password: data.password }),
    onSuccess: () => {
      toast({
        title: t("toast.passwordUpdated.title"),
        description: t("toast.passwordUpdated.description"),
      });
      navigate(loginPath);
    },
    onError: (error) => {
      toast({
        title: t("toast.resetFailed.title"),
        description: getApiErrorMessage(error, t("status.tryAgainLater", { ns: "common" })),
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-2">
      <div className="hidden md:flex hero-surface flex-col items-center justify-center gap-8 p-12">
        <Logo layout="vertical" tone="reversed" className="h-36" />
        <p className="font-display text-lg text-white/85 text-center max-w-xs leading-relaxed">
          {t("reset.tagline")}
        </p>
      </div>
      <div className="relative flex min-h-screen md:min-h-0 flex-col items-center justify-center bg-card px-4 py-10 sm:px-8">
        <LanguageSwitcher className="absolute right-4 top-4 sm:right-8" />
        <Logo layout="compact" className="h-8 mb-8 md:hidden" />
      <Card className="w-full max-w-md border-0 shadow-none md:border md:shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-medium">{t("reset.title")}</CardTitle>
          <CardDescription>
            {token
              ? t("reset.description")
              : t("reset.incomplete")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {token ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => resetMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("reset.newPassword")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" autoComplete="new-password" data-testid="input-new-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("reset.confirmPassword")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" autoComplete="new-password" data-testid="input-confirm-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={resetMutation.isPending}
                  data-testid="button-reset-password"
                >
                  {resetMutation.isPending ? t("reset.submitting") : t("reset.submit")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(loginPath)}
                  data-testid="button-back-to-login"
                >
                  {t("reset.back")}
                </Button>
              </form>
            </Form>
          ) : (
            <Button className="w-full" onClick={() => navigate(loginPath)} data-testid="button-back-to-login">
              {t("reset.back")}
            </Button>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
