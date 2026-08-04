"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, Printer } from "lucide-react";

export default function LoginPage() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // If already logged in, redirect
  if (user) {
    router.push("/account");
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/account");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Invalid email or password. Please try again.");
      } else {
        setError(err.message || "Failed to log in.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(circle at top left, hsl(var(--primary-hsl) / 0.1), transparent), radial-gradient(circle at bottom right, hsl(var(--accent-hsl) / 0.05), transparent)",
      padding: "1.5rem"
    }}>
      <div className="glass-panel" style={{
        width: "100%",
        maxWidth: "420px",
        padding: "2.5rem 2rem",
        boxShadow: "var(--shadow-lg)"
      }}>
        {/* Logo / Branding */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "hsl(var(--accent-hsl))",
            marginBottom: "0.75rem"
          }}>
            <Printer size={28} />
            <span style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.5rem",
              letterSpacing: "-0.03em",
              color: "hsl(var(--foreground-hsl))"
            }}>
              APEX<span style={{ color: "hsl(var(--accent-hsl))" }}>WORKWEAR</span>
            </span>
          </div>
          <p style={{
            fontSize: "0.9rem",
            color: "hsl(var(--foreground-hsl) / 0.6)",
            fontWeight: 500
          }}>
            Sign in to manage print configurations & orders
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: "hsl(var(--destructive-hsl) / 0.1)",
            border: "1px solid hsl(var(--destructive-hsl) / 0.2)",
            color: "hsl(var(--destructive-hsl))",
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.85rem",
            marginBottom: "1.5rem",
            fontWeight: 500
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label className="label" htmlFor="email">Email Address</label>
            <div style={{ position: "relative" }}>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ paddingLeft: "2.5rem" }}
              />
              <Mail size={18} style={{
                position: "absolute",
                left: "0.85rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "hsl(var(--foreground-hsl) / 0.4)"
              }} />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="label" htmlFor="password">Password</label>
              <Link href="/account/forgot" style={{
                fontSize: "0.8rem",
                color: "hsl(var(--accent-hsl))",
                fontWeight: 600,
                marginBottom: "0.5rem"
              }}>
                Forgot Password?
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: "2.5rem" }}
              />
              <Lock size={18} style={{
                position: "absolute",
                left: "0.85rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "hsl(var(--foreground-hsl) / 0.4)"
              }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", marginTop: "0.5rem" }}
          >
            {loading ? "Signing in..." : "Sign In"}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={{
          textAlign: "center",
          marginTop: "1.75rem",
          fontSize: "0.85rem",
          color: "hsl(var(--foreground-hsl) / 0.6)"
        }}>
          Don't have an account?{" "}
          <Link href="/account/register" style={{
            color: "hsl(var(--accent-hsl))",
            fontWeight: 700,
            textDecoration: "underline"
          }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
