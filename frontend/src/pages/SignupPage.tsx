import { Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
<<<<<<< HEAD
=======
import { useAuth } from "@/hooks/use-auth";
import { getDefaultAuthenticatedPath, getSafeRedirectTarget } from "@/lib/auth-navigation";
import { getSignupErrorMessage } from "@/lib/auth-errors";
import { getSignupValidationError } from "@/lib/signup-validation";
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
<<<<<<< HEAD
import { useAuth } from "@/hooks/use-auth";
import { getDefaultAuthenticatedPath, getSafeRedirectTarget } from "@/lib/auth-navigation";
import { ApiError, signUpUser } from "@/services/api";
=======
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786

export function SignupPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
<<<<<<< HEAD
=======
  const [error, setError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786

  useEffect(() => {
    if (!authLoading && user && typeof window !== "undefined") {
      window.location.replace(getDefaultAuthenticatedPath(isAdmin));
    }
  }, [authLoading, isAdmin, user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
<<<<<<< HEAD

    if (!normalizedEmail) {
      toast.error("Email is required");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
=======
    const validationError = getSignupValidationError(normalizedEmail, password, confirmPassword);

    setError(null);
    setConfirmPasswordError(null);

    if (validationError) {
      if (validationError.field === "confirmPassword") {
        setConfirmPasswordError(validationError.message);
      } else {
        setError(validationError.message);
      }
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
      return;
    }

    setLoading(true);
<<<<<<< HEAD
    try {
      await signUpUser(normalizedEmail, password);
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Account created! Redirecting...");
      window.location.assign(getSafeRedirectTarget("/dashboard"));
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Unable to create account right now");
      return;
    } finally {
      setLoading(false);
    }
=======

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setLoading(false);
      setError(getSignupErrorMessage(error));
      return;
    }

    setLoading(false);
    if (data.session) {
      await supabase.auth.signOut();
    }
    toast.success("Account created. Please log in to continue.");
    window.location.assign("/login");
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4 py-12">
      <Card className="w-full max-w-md border-border/60 bg-card/80 p-8 shadow-card backdrop-blur">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          PhishGuard
        </Link>
        <h1 className="text-center text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Start scanning URLs in seconds.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
<<<<<<< HEAD
              onChange={(e) => setEmail(e.target.value)}
=======
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
<<<<<<< HEAD
              onChange={(e) => setPassword(e.target.value)}
=======
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
                setConfirmPasswordError(null);
              }}
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-muted-foreground">At least 6 characters.</p>
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
<<<<<<< HEAD
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1.5"
            />
          </div>
=======
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setConfirmPasswordError(null);
              }}
              aria-invalid={Boolean(confirmPasswordError)}
              className="mt-1.5"
            />
            {confirmPasswordError ? (
              <p className="mt-1 text-xs text-destructive">{confirmPasswordError}</p>
            ) : null}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
          <Button type="submit" disabled={loading} className="w-full shadow-glow">
            {loading ? "Creating..." : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
