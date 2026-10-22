"use client";

import { useState } from "react";
import { PackageSearch } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { MESSAGES } from "@/lib/messages";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const { login, authError, clearAuthError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const schoolName = process.env.NEXT_PUBLIC_SCHOOL_NAME;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    clearAuthError();

    if (!email.trim() || !password) {
      setFormError("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      setFormError(err.message || MESSAGES.auth.signInSubtitle);
    } finally {
      setSubmitting(false);
    }
  };

  const displayedError = formError || authError;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-slate-50">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-white shadow-card mb-2">
            <PackageSearch className="w-8 h-8" aria-hidden="true" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {MESSAGES.appName}
          </h1>
          {schoolName && (
            <p className="text-sm font-medium text-slate-600">{schoolName}</p>
          )}
          <p className="text-sm text-slate-500">
            {MESSAGES.auth.signInSubtitle}
          </p>
        </div>

        <Card className="shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {displayedError && (
              <Alert variant="error" className="mb-4">
                {displayedError}
              </Alert>
            )}

            <Input
              id="login-email"
              label={MESSAGES.auth.emailLabel}
              type="email"
              name="email"
              autoComplete="email"
              required
              placeholder={MESSAGES.auth.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />

            <Input
              id="login-password"
              label={MESSAGES.auth.passwordLabel}
              type="password"
              name="password"
              autoComplete="current-password"
              required
              placeholder={MESSAGES.auth.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />

            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              className="w-full mt-2"
            >
              {submitting ? MESSAGES.auth.signingIn : MESSAGES.auth.signInButton}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              {MESSAGES.auth.forgotPasswordText}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
