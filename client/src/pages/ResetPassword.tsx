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
        title: "Password reset successful",
        description: "You can now sign in with your new password.",
      });
      navigate(loginPath);
    },
    onError: (error) => {
      toast({
        title: "Password reset failed",
        description: getApiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            {token
              ? "Enter your new password below"
              : "This reset link is missing its token. Please request a new password reset email."}
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
                      <FormLabel>New Password</FormLabel>
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
                      <FormLabel>Confirm New Password</FormLabel>
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
                  {resetMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(loginPath)}
                  data-testid="button-back-to-login"
                >
                  Back to Login
                </Button>
              </form>
            </Form>
          ) : (
            <Button className="w-full" onClick={() => navigate(loginPath)} data-testid="button-back-to-login">
              Back to Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
