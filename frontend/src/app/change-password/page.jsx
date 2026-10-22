"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { MESSAGES } from "@/lib/messages";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";

export default function ChangePasswordPage() {
  const { user, changePassword, logout } = useAuth();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const isMandatory = Boolean(user?.must_change_password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!currentPassword) {
      setError("Current password is required.");
      return;
    }

    if (newPassword.length < 8) {
      setError(MESSAGES.auth.passwordTooShort);
      return;
    }

    if (newPassword === currentPassword) {
      setError(MESSAGES.auth.newPasswordSameAsCurrent);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(MESSAGES.auth.passwordsDoNotMatch);
      return;
    }

    setSubmitting(true);
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
    } catch (err) {
      setError(err.message || MESSAGES.DEFAULT);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 bg-slate-50">
      <div className="w-full max-w-md lg:max-w-lg space-y-6 lg:space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-primary text-white shadow-card mb-1">
            <KeyRound className="w-6 h-6 lg:w-7 lg:h-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
            {isMandatory
              ? MESSAGES.auth.changePasswordMandatoryTitle
              : MESSAGES.auth.changePasswordTitle}
          </h1>
          <p className="text-sm lg:text-base text-slate-500">
            {isMandatory
              ? MESSAGES.auth.changePasswordMandatorySubtitle
              : "Enter your current password and choose a new secure password."}
          </p>
        </div>

        <Card className="shadow-card p-6 lg:p-8 rounded-xl lg:rounded-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="error" className="mb-4">
                {error}
              </Alert>
            )}

            <Input
              id="current-password"
              label={MESSAGES.auth.currentPasswordLabel}
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={submitting}
            />

            <Input
              id="new-password"
              label={MESSAGES.auth.newPasswordLabel}
              type="password"
              autoComplete="new-password"
              required
              helperText={MESSAGES.auth.passwordRules}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={submitting}
            />

            <Input
              id="confirm-new-password"
              label={MESSAGES.auth.confirmNewPasswordLabel}
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
            />

            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              className="w-full mt-2"
            >
              {submitting
                ? MESSAGES.auth.updatingPassword
                : MESSAGES.auth.updatePasswordButton}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            {isMandatory ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleSignOut}
                loading={signingOut}
                className="w-full text-slate-600 hover:text-danger gap-2"
              >
                <LogOut className="w-4 h-4 text-slate-500" aria-hidden="true" />
                <span>
                  {signingOut
                    ? MESSAGES.auth.signingOut
                    : MESSAGES.auth.signOutButton}
                </span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/items")}
                disabled={submitting}
                className="w-full text-slate-600 gap-2"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>{MESSAGES.noAccess.backToItems}</span>
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
