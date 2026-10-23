import { useState } from "react";
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

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
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
        title: "Password updated",
        description: "You can now sign in with your new password.",
      });
      navigate(loginPath);
    },
    onError: (error) => {
      toast({
        title: "Could not reset password",
        description: getApiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-2">
      <div className="hidden md:flex bg-brand-gradient flex-col items-center justify-center gap-8 p-12">
        <Logo layout="vertical" tone="reversed" className="h-36" />
        <p className="font-display text-lg text-mist text-center max-w-xs leading-relaxed">
          Choose a new password and you will be back in your account in a moment.
        </p>
      </div>
      <div className="flex min-h-screen md:min-h-0 flex-col items-center justify-center bg-card px-4 py-10 sm:px-8">
        <Logo layout="compact" className="h-8 mb-8 md:hidden" />
      <Card className="w-full max-w-md border-0 shadow-none md:border md:shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-medium">Set a new password</CardTitle>
          <CardDescription>
            {token
              ? "Enter your new password below."
              : "This reset link is incomplete. Please request a new password reset email."}
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
                      <FormLabel>New password</FormLabel>
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
                      <FormLabel>Confirm new password</FormLabel>
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
                  {resetMutation.isPending ? "Saving..." : "Save new password"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(loginPath)}
                  data-testid="button-back-to-login"
                >
                  Back to sign in
                </Button>
              </form>
            </Form>
          ) : (
            <Button className="w-full" onClick={() => navigate(loginPath)} data-testid="button-back-to-login">
              Back to sign in
            </Button>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
