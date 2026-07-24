"use client";

import React, { useState, useEffect } from "react";
import { FileJson, Mail, Lock, User, ArrowLeft, Sun, Moon, Sparkles, Database, Code, Check, Cloud, ShieldCheck, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInAction, signUpAction } from "@/actions/auth";

const SLIDES = [
  {
    icon: Database,
    title: "Cloudflare D1 Studio",
    description: "Connect to live databases, explore schemas, and execute client-sandboxed SQL queries instantly.",
    image: "/auth_illustration.png",
  },
  {
    icon: Code,
    title: "SQL & JSON Studio",
    description: "Write SQL statements, view formatted data grid results, export CSV/JSON, and run query history.",
    image: "/auth_illustration_tools.png",
  },
  {
    icon: Sparkles,
    title: "Format Converter Studio",
    description: "Seamlessly convert data schemas between CSV, YAML, and JSON, and load them into your active workspace.",
    image: "/auth_illustration_edge.png",
  },
];

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isCloudflareFlow = searchParams ? searchParams.get("provider") === "cloudflare-d1" : false;

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [isDark, setIsDark] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Slide rotation interval
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const isDarkClass = document.documentElement.classList.contains("dark");
    setIsDark(isDarkClass);
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
      setIsDark(true);
    }
  };

  const handleCloudflareOAuthRedirect = () => {
    setLoading(true);
    window.location.href = "/api/auth/cloudflare?redirect=" + encodeURIComponent("/?view=sql&provider=cloudflare-d1");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) {
      setMessage({ type: "error", text: "Please fill in all fields" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        const res = await signInAction(email, password);
        if (res.success && res.user) {
          localStorage.setItem("user_name", res.user.name);
          localStorage.setItem("user_email", res.user.email);
          
          setMessage({
            type: "success",
            text: `Welcome back, ${res.user.name}! Redirecting...`,
          });
          setTimeout(() => {
            router.push("/");
          }, 1200);
        } else {
          setMessage({ type: "error", text: res.error || "Failed to sign in" });
        }
      } else {
        const res = await signUpAction(name, email, password);
        if (res.success && res.user) {
          localStorage.setItem("user_name", res.user.name);
          localStorage.setItem("user_email", res.user.email);

          setMessage({
            type: "success",
            text: "Account created successfully! Redirecting...",
          });
          setTimeout(() => {
            router.push("/");
          }, 1200);
        } else {
          setMessage({ type: "error", text: res.error || "Failed to register" });
        }
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-150 relative overflow-hidden">
      {/* Dynamic Background Blur Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[35%] h-[35%] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />

      {/* ================= LEFT SIDE SHOWCASE PANEL ================= */}
      <section className="hidden lg:flex lg:w-[55%] xl:w-[60%] bg-[#080B11] text-white flex-col justify-between p-12 relative overflow-hidden border-r border-border">
        {SLIDES.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out mix-blend-screen pointer-events-none ${
              idx === activeSlide ? "opacity-45 scale-105" : "opacity-0 scale-100"
            } transform duration-[4000ms]`}
            style={{ backgroundImage: `url('${slide.image}')` }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080B11] via-transparent to-[#080B11]/90 pointer-events-none" />

        {/* Top Header with Brand Logo */}
        <div className="relative z-10 flex items-center gap-2 select-none">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-md shadow-cyan-500/20 text-white font-extrabold text-lg tracking-tighter">
            {"{"}
            <span className="text-[10px] text-cyan-200 absolute mt-0.5 font-semibold">DEV</span>
            {"}"}
          </div>
          <span className="font-bold text-base tracking-tight text-white/95">
            Developer<span className="text-cyan-400">Workspace</span>
            <span className="text-[9px] font-semibold text-cyan-300 ml-1.5 border border-cyan-500/35 px-1.5 py-0.5 rounded bg-cyan-500/10">IDE</span>
          </span>
        </div>

        {/* Feature Presentation Slider */}
        <div className="relative z-10 max-w-xl my-auto space-y-8">
          <div className="h-48 flex flex-col justify-end">
            {SLIDES.map((slide, idx) => {
              const SlideIcon = slide.icon;
              const isActive = idx === activeSlide;
              return (
                <div
                  key={idx}
                  className={`transition-all duration-700 ease-in-out transform absolute space-y-4 ${
                    isActive
                      ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                      : "opacity-0 translate-y-4 scale-95 pointer-events-none"
                  }`}
                >
                  <div className="inline-flex p-3 bg-primary/20 text-primary border border-primary/30 rounded-xl mb-2">
                    <SlideIcon className="w-6 h-6" />
                  </div>
                  <h3 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                    {slide.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
                    {slide.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Dots Indicator */}
          <div className="flex gap-2 pt-4">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === activeSlide ? "w-8 bg-primary" : "w-2 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Bottom Footer Quote */}
        <div className="relative z-10 flex items-center gap-2.5 text-xs text-slate-400">
          <div className="flex -space-x-2">
            <div className="w-6 h-6 rounded-full bg-slate-700 border-2 border-[#080B11] flex items-center justify-center text-[8px] font-bold">JD</div>
            <div className="w-6 h-6 rounded-full bg-slate-600 border-2 border-[#080B11] flex items-center justify-center text-[8px] font-bold">AS</div>
            <div className="w-6 h-6 rounded-full bg-slate-500 border-2 border-[#080B11] flex items-center justify-center text-[8px] font-bold">KM</div>
          </div>
          <span>Trusted by over 10,000+ developers globally</span>
        </div>
      </section>

      {/* ================= RIGHT SIDE FORM PANEL ================= */}
      <section className="flex-1 flex flex-col justify-between p-6 sm:p-12 relative z-10">
        {/* Floating Actions bar */}
        <header className="flex items-center justify-between w-full">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Editor</span>
          </Link>

          <button
            onClick={toggleTheme}
            className="p-2 border border-border hover:bg-accent rounded-md transition-colors cursor-pointer"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        {/* Centered Auth Card Container */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="bg-card/70 backdrop-blur-md border border-border rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden">
            
            {/* CLOUDFLARE D1 SECURE OAUTH CARD (NO MANUAL FIELD INPUTS) */}
            {isCloudflareFlow ? (
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 rounded-3xl bg-violet-600/10 border border-violet-500/30 text-violet-500 flex items-center justify-center mx-auto shadow-xl shadow-violet-500/10">
                  <Cloud className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-bold tracking-tight">Connect Cloudflare D1</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    Connect your Cloudflare account to securely access your D1 databases directly from the SQL Editor.
                  </p>
                </div>

                {message && (
                  <div
                    className={`p-3 rounded-lg text-xs text-center border font-medium transition-all ${
                      message.type === "success"
                        ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30 text-green-600 dark:text-green-400"
                        : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                <div className="text-left space-y-2.5 p-4 rounded-xl bg-accent/40 border border-border text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Browse D1 databases</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>View tables & schema</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Execute SQL queries</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>AI-powered SQL assistance</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Secure OAuth authentication</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleCloudflareOAuthRedirect}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>Continue with Cloudflare</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            ) : (
              /* STANDARD AUTH FORM */
              <>
                <div className="flex flex-col items-center gap-2 mb-6">
                  <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-indigo-650 shadow-lg shadow-primary/25 text-primary-foreground font-extrabold text-2xl tracking-tighter">
                    {"{"}
                    <span className="text-xs text-primary-foreground/90 absolute mt-0.5 font-semibold">DEV</span>
                    {"}"}
                  </div>
                  <h2 className="text-xl font-bold tracking-tight mt-2">
                    {isLogin ? "Sign In to Developer Workspace" : "Create your Account"}
                  </h2>
                  <p className="text-xs text-muted-foreground text-center max-w-[280px]">
                    {isLogin
                      ? "Access your database playground and developers workspace"
                      : "Register to manage databases, write SQL, and convert datasets"}
                  </p>
                </div>

                {message && (
                  <div
                    className={`p-3 rounded-lg text-xs mb-4 text-center border font-medium transition-all ${
                      message.type === "success"
                        ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30 text-green-600 dark:text-green-400"
                        : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                <div className="relative overflow-hidden w-full">
                  <div
                    className="flex transition-transform duration-500 ease-out"
                    style={{
                      width: "200%",
                      transform: isLogin ? "translateX(0%)" : "translateX(-50%)",
                    }}
                  >
                    {/* Form 1: Sign In */}
                    <form onSubmit={handleSubmit} className="w-1/2 pr-3 space-y-4 flex flex-col justify-start">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                        <div className="relative flex items-center">
                          <Mail className="w-4 h-4 absolute left-3 text-muted-foreground" />
                          <input
                            type="email"
                            required
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md text-sm outline-none focus:border-muted-foreground transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-semibold text-muted-foreground">Password</label>
                          <button
                            type="button"
                            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative flex items-center">
                          <Lock className="w-4 h-4 absolute left-3 text-muted-foreground" />
                          <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md text-sm outline-none focus:border-muted-foreground transition-colors"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 rounded-md font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
                      >
                        {loading && <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
                        <span>Sign In</span>
                      </button>
                    </form>

                    {/* Form 2: Register */}
                    <form onSubmit={handleSubmit} className="w-1/2 pl-3 space-y-4 flex flex-col justify-start">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                        <div className="relative flex items-center">
                          <User className="w-4 h-4 absolute left-3 text-muted-foreground" />
                          <input
                            type="text"
                            required={!isLogin}
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md text-sm outline-none focus:border-muted-foreground transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                        <div className="relative flex items-center">
                          <Mail className="w-4 h-4 absolute left-3 text-muted-foreground" />
                          <input
                            type="email"
                            required={!isLogin}
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md text-sm outline-none focus:border-muted-foreground transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Password</label>
                        <div className="relative flex items-center">
                          <Lock className="w-4 h-4 absolute left-3 text-muted-foreground" />
                          <input
                            type="password"
                            required={!isLogin}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md text-sm outline-none focus:border-muted-foreground transition-colors"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 rounded-md font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
                      >
                        {loading && <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
                        <span>Register</span>
                      </button>
                    </form>
                  </div>
                </div>

                {/* Toggle Footer Link */}
                <div className="mt-6 pt-5 border-t border-border text-center">
                  <p className="text-xs text-muted-foreground">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                    <button
                      onClick={() => {
                        setIsLogin(!isLogin);
                        setMessage(null);
                      }}
                      className="font-bold text-foreground hover:underline transition-all cursor-pointer"
                    >
                      {isLogin ? "Sign Up" : "Sign In"}
                    </button>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Developer Workspace IDE. All rights reserved.
        </footer>
      </section>
    </div>
  );
}
