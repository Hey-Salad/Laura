"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case "invalid_link":
        return "Invalid or malformed magic link. Please request a new one.";
      case "invalid_token":
        return "This link has already been used or is invalid. Please request a new magic link.";
      case "expired_token":
        return "This link has expired. Please request a new one.";
      case "server_error":
        return "Server error occurred. Please try again.";
      case "invalid_callback":
        return "Invalid callback parameters. Please request a new link.";
      case "verification_failed":
        return "Failed to verify your link. Please request a new one.";
      case "create_user_failed":
        return "Failed to create your account. Please contact support.";
      case "session_failed":
        return "Failed to create session. Please try again.";
      default:
        return "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setEmail("");
      } else {
        setErrorMessage(data.error || "Failed to send magic link. Please try again.");
      }
    } catch (err) {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const urlError = getErrorMessage(error);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="mb-6">
            <Image
              src="/heysalad_white_logo.svg"
              alt="HeySalad"
              width={240}
              height={72}
              className="mx-auto"
              priority
            />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-3">
            Laura Logistics Command Center
          </h1>
          <p className="text-zinc-400 text-base">
            Sign in with your email to access the dashboard
          </p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-8 border border-zinc-800/50 shadow-2xl">
          {urlError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm leading-relaxed">{urlError}</p>
            </div>
          )}

          {success ? (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                <svg
                  className="w-10 h-10 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-3">
                Check your email
              </h2>
              <p className="text-zinc-400 mb-8 leading-relaxed">
                We've sent a magic link to your email address. Click the link to sign in.
              </p>
              <button
                onClick={() => setSuccess(false)}
                className="text-brand-cherry text-sm font-medium hover:text-brand-peach transition-colors"
              >
                Send another link
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-zinc-200 mb-3"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-3.5 bg-black/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-cherry/50 focus:border-brand-cherry transition-all"
                  disabled={isLoading}
                />
              </div>

              {errorMessage && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-red-400 text-sm leading-relaxed">{errorMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-3.5 bg-brand-cherry hover:bg-brand-cherry/90 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-cherry/20 hover:shadow-brand-cherry/30"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Sending magic link...
                  </span>
                ) : (
                  "Send magic link"
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-zinc-500 text-sm mt-8">
          Only authorized HeySalad team members can access this system.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-cherry mx-auto"></div>
          <p className="text-zinc-400 mt-4">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
