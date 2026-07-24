"use client";

import React, { useState, useEffect } from "react";
import { FileJson, Mail, Lock, User, ArrowLeft, Sun, Moon, Sparkles, Database, Code, Check, Cloud, ShieldCheck, CheckCircle, ArrowRight, Terminal } from "lucide-react";
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

  const [isDark, setIsDark] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [terminalStep, setTerminalStep] = useState(0);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (typeof window === "undefined" || window.innerWidth < 1024) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTerminalStep((prev) => (prev + 1) % 5);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Slide rotation interval
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
      setIsDark(true);
    }
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
      <section className="hidden lg:flex lg:w-[55%] xl:w-[60%] bg-[#080B11] text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Natively injected CSS Animations for smooth GPU accelerated float loops */}
        <style>{`
          @keyframes float-1 {
            0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
            50% { transform: translateY(-12px) translateX(4px) rotate(1deg); }
          }
          @keyframes float-2 {
            0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
            50% { transform: translateY(-8px) translateX(-6px) rotate(-1.5deg); }
          }
          @keyframes float-3 {
            0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
            50% { transform: translateY(-15px) translateX(8px) rotate(0.5deg); }
          }
          @keyframes pulse-glow {
            0%, 100% { opacity: 0.15; transform: scale(1) translate(0px, 0px); }
            33% { opacity: 0.3; transform: scale(1.08) translate(10px, -10px); }
            66% { opacity: 0.2; transform: scale(0.95) translate(-10px, 10px); }
          }
          @keyframes dash {
            to {
              stroke-dashoffset: -40;
            }
          }
          @keyframes blink-cursor {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          @keyframes fade-loop-1 {
            0%, 100% { opacity: 0.25; transform: scale(0.95) translateY(0px) rotate(0deg); }
            20% { opacity: 0.25; transform: scale(0.97) translateY(-6px) rotate(0.5deg); }
            25%, 95% { opacity: 0; transform: scale(0.93) translateY(0px) rotate(0deg); }
          }
          @keyframes fade-loop-2 {
            0%, 20%, 100% { opacity: 0; transform: scale(0.93) translateY(0px) rotate(0deg); }
            25% { opacity: 0.25; transform: scale(0.95) translateY(0px) rotate(0deg); }
            45% { opacity: 0.25; transform: scale(0.97) translateY(-6px) rotate(-0.5deg); }
            50% { opacity: 0; transform: scale(0.93) translateY(0px) rotate(0deg); }
          }
          @keyframes fade-loop-3 {
            0%, 45%, 100% { opacity: 0; transform: scale(0.93) translateY(0px) rotate(0deg); }
            50% { opacity: 0.25; transform: scale(0.95) translateY(0px) rotate(0deg); }
            70% { opacity: 0.25; transform: scale(0.97) translateY(-6px) rotate(0.5deg); }
            75% { opacity: 0; transform: scale(0.93) translateY(0px) rotate(0deg); }
          }
          @keyframes fade-loop-4 {
            0%, 70%, 100% { opacity: 0; transform: scale(0.93) translateY(0px) rotate(0deg); }
            75% { opacity: 0.25; transform: scale(0.95) translateY(0px) rotate(0deg); }
            95% { opacity: 0.25; transform: scale(0.97) translateY(-6px) rotate(-0.5deg); }
          }
          @media (prefers-reduced-motion: reduce) {
            .animate-\\[float-1_6s_ease-in-out_infinite\\],
            .animate-\\[float-1_7s_ease-in-out_infinite_1\\.5s\\],
            .animate-\\[float-2_7s_ease-in-out_infinite_1s\\],
            .animate-\\[float-2_6s_ease-in-out_infinite_2\\.5s\\],
            .animate-\\[float-2_8s_ease-in-out_infinite_0\\.2s\\],
            .animate-\\[float-3_8s_ease-in-out_infinite_0\\.5s\\],
            .animate-\\[float-3_9s_ease-in-out_infinite_3\\.5s\\],
            .animate-\\[float-3_7s_ease-in-out_infinite_1\\.2s\\],
            .animate-\\[pulse-glow_8s_infinite\\],
            .animate-\\[pulse-glow_10s_infinite_2s\\],
            .animate-\\[pulse-glow_7s_infinite_4s\\],
            .animate-\\[dash_4s_linear_infinite\\],
            .animate-\\[dash_3s_linear_infinite_reverse\\],
            .animate-\\[fade-loop-1_16s_infinite\\],
            .animate-\\[fade-loop-2_16s_infinite\\],
            .animate-\\[fade-loop-3_16s_infinite\\],
            .animate-\\[fade-loop-4_16s_infinite\\] {
              animation: none !important;
              transform: none !important;
              opacity: 0.25 !important;
            }
          }
          @keyframes card-entry {
            from {
              opacity: 0;
              transform: translateY(40px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          @keyframes fade-slide-up {
            from {
              opacity: 0;
              transform: translateY(16px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes logo-float {
            0%, 100% {
              transform: translateY(0px) scale(1);
              box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
            }
            50% {
              transform: translateY(-4px) scale(1.03);
              box-shadow: 0 0 25px rgba(59, 130, 246, 0.35);
            }
          }
          @keyframes gradient-shimmer {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @media (prefers-reduced-motion: reduce) {
            .animate-\\[float-1_6s_ease-in-out_infinite\\],
            .animate-\\[float-1_7s_ease-in-out_infinite_1\\.5s\\],
            .animate-\\[float-2_7s_ease-in-out_infinite_1s\\],
            .animate-\\[float-2_6s_ease-in-out_infinite_2\\.5s\\],
            .animate-\\[float-2_8s_ease-in-out_infinite_0\\.2s\\],
            .animate-\\[float-3_8s_ease-in-out_infinite_0\\.5s\\],
            .animate-\\[float-3_9s_ease-in-out_infinite_3\\.5s\\],
            .animate-\\[float-3_7s_ease-in-out_infinite_1\\.2s\\],
            .animate-\\[pulse-glow_8s_infinite\\],
            .animate-\\[pulse-glow_10s_infinite_2s\\],
            .animate-\\[pulse-glow_7s_infinite_4s\\],
            .animate-\\[dash_4s_linear_infinite\\],
            .animate-\\[dash_3s_linear_infinite_reverse\\],
            .animate-\\[fade-loop-1_16s_infinite\\],
            .animate-\\[fade-loop-2_16s_infinite\\],
            .animate-\\[fade-loop-3_16s_infinite\\],
            .animate-\\[fade-loop-4_16s_infinite\\],
            .animate-\\[card-entry_0\\.8s_ease-out_forwards\\],
            .animate-\\[fade-slide-up_0\\.6s_ease-out_both\\],
            .animate-\\[logo-float_4s_ease-in-out_infinite\\],
            .animate-\\[gradient-shimmer_2s_linear_infinite\\] {
              animation: none !important;
              transform: none !important;
              opacity: 1 !important;
            }
            .animate-\\[fade-loop-1_16s_infinite\\],
            .animate-\\[fade-loop-2_16s_infinite\\],
            .animate-\\[fade-loop-3_16s_infinite\\],
            .animate-\\[fade-loop-4_16s_infinite\\] {
              opacity: 0.25 !important;
            }
          }
        `}</style>

        {/* Animated Developer Illustration Canvas */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {/* Subtle Grid Pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* OpenAI Developer illustration background assets running in a smooth crossfade slideshow */}
          <div
            className="absolute inset-0 bg-contain bg-center opacity-0 mix-blend-screen pointer-events-none animate-[fade-loop-1_16s_infinite]"
            style={{ backgroundImage: "url('https://images.openai.com/static-rsc-4/O-d_uIpvQQr-L6tx1fasnDmcrL1OGPqE_bZbU2o5eiuEOCgcpVeeqpNEexsD94XdgJywXAzginTbL9x_zWbrqd85P_cvgo5CJXWKonlgeRdn7bvmy187aM94Dwty33KUYyIM8GKxBJBJnGZfp_20fMMNDDPxGkfJIm42WSUZ3_0?purpose=inline')" }}
          />
          <div
            className="absolute inset-0 bg-contain bg-center opacity-0 mix-blend-screen pointer-events-none animate-[fade-loop-2_16s_infinite]"
            style={{ backgroundImage: "url('https://images.openai.com/static-rsc-4/gvGF6t6oJSR7Gj467mWZShSvqhIK6xEI43Uz4gXiqNu4v-NlwpRSHDhaiTm2PsQrhPxV2W-8Ynijquv1HXnHqztAaDhL7RrxmCrHOgEJzMSBe2JvuReLmTHcvQssRMpgj0BDvJfYdXI4IZVAuHUTv9IAlscKcZ2v82wdHkGC5kQ?purpose=inline')" }}
          />
          <div
            className="absolute inset-0 bg-contain bg-center opacity-0 mix-blend-screen pointer-events-none animate-[fade-loop-3_16s_infinite]"
            style={{ backgroundImage: "url('https://images.openai.com/static-rsc-4/WZpMefuUD2b7ZvcdR2bdTJ5T2FJHmKGXVKj0lg2imksC-cCg-Ci7gCoZqlWZSvxKeudRM4QyemZqU-2yhlM3bwyEWfGjTDOgB2OHOg1Zj-yO_RbjPI-629lOfwelCvwcD4vqju-Ny8sg4Ts_JlDRbX8VzEgXjXLxhU10Dzh7tgM?purpose=inline')" }}
          />
          <div
            className="absolute inset-0 bg-contain bg-center opacity-0 mix-blend-screen pointer-events-none animate-[fade-loop-4_16s_infinite]"
            style={{ backgroundImage: "url('https://images.openai.com/static-rsc-4/YFbYfPDpdzOlV7oNIkGUCYIYsvsdNbaHpHQS9vNAjYB-S1EaMMt0NRU7Q71YJI64VbM-NQj-1TQekHMcX2wh-Ekf2ixaLjWn66V69Rby3o9rlzHBVskl0HTKneoBsICOKiLWz11gYN2BigDi7ONGANTOIyNwY0wlt9lMCIxPE7U?purpose=inline')" }}
          />

          {/* Pulsing Gradient Aura Glows */}
          <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] rounded-full bg-blue-600/10 blur-[80px] animate-[pulse-glow_8s_infinite]" />
          <div className="absolute bottom-[20%] right-[10%] w-[350px] h-[350px] rounded-full bg-purple-600/10 blur-[90px] animate-[pulse-glow_10s_infinite_2s]" />
          <div className="absolute top-[40%] right-[30%] w-[250px] h-[250px] rounded-full bg-cyan-600/10 blur-[75px] animate-[pulse-glow_7s_infinite_4s]" />

          {/* SVG Animated Glowing Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="glow-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="glow-grad-2" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            {/* Database to Terminal Connection */}
            <path
              d="M 450,180 Q 320,240 280,330"
              fill="none"
              stroke="url(#glow-grad-1)"
              strokeWidth="1.5"
              strokeDasharray="6, 12"
              className="animate-[dash_4s_linear_infinite]"
            />
            {/* Terminal to JSON Blob Connection */}
            <path
              d="M 280,480 Q 350,560 480,460"
              fill="none"
              stroke="url(#glow-grad-2)"
              strokeWidth="1.5"
              strokeDasharray="8, 16"
              className="animate-[dash_3s_linear_infinite_reverse]"
            />
          </svg>

          {/* 1. Floating SQL Database Table Card */}
          <div className="absolute top-[12%] right-[8%] w-[240px] bg-slate-950/75 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 shadow-2xl animate-[float-1_6s_ease-in-out_infinite] z-10 select-none">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] font-bold text-slate-300 font-mono">TABLE: users</span>
              </div>
              <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.25 rounded font-mono">D1 DB</span>
            </div>
            <div className="space-y-1 text-[9px] font-mono">
              <div className="grid grid-cols-4 text-slate-500 font-bold border-b border-slate-900 pb-1">
                <span>id</span>
                <span>email</span>
                <span>role</span>
                <span className="text-right">status</span>
              </div>
              <div className="grid grid-cols-4 text-slate-300 py-0.5">
                <span>01</span>
                <span className="truncate">jane@cf.com</span>
                <span>admin</span>
                <span className="text-right text-emerald-400">active</span>
              </div>
              <div className="grid grid-cols-4 text-slate-300 py-0.5 bg-slate-900/60 rounded px-0.5">
                <span>02</span>
                <span className="truncate">john@d1.org</span>
                <span>user</span>
                <span className="text-right text-emerald-400">active</span>
              </div>
              <div className="grid grid-cols-4 text-slate-300 py-0.5">
                <span>03</span>
                <span className="truncate">bob@db.io</span>
                <span>user</span>
                <span className="text-right text-amber-400">pending</span>
              </div>
            </div>
          </div>

          {/* 2. Floating JSON Card */}
          <div className="absolute top-[48%] right-[5%] w-[220px] bg-slate-950/70 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 shadow-2xl animate-[float-2_7s_ease-in-out_infinite_1s] z-10 select-none">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <FileJson className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-bold text-slate-300 font-mono">data_blob.json</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>
            <pre className="text-[9px] font-mono text-cyan-300 leading-normal">
{`{
  "id": "blob_912a",
  "title": "Production Config",
  "meta": {
    "sync": true,
    "uptime": "99.99%",
    "region": "EE"
  }
}`}
            </pre>
          </div>

          {/* 3. Floating Animated Terminal Card */}
          <div className="absolute top-[32%] left-[6%] w-[290px] bg-slate-950/85 backdrop-blur-md border border-slate-900/80 rounded-xl shadow-2xl overflow-hidden animate-[float-3_8s_ease-in-out_infinite_0.5s] z-10 select-none">
            {/* Terminal Header */}
            <div className="bg-slate-900 px-3 py-2 flex items-center justify-between border-b border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500/80" />
                <span className="w-2 h-2 rounded-full bg-yellow-500/80" />
                <span className="w-2 h-2 rounded-full bg-green-500/80" />
              </div>
              <span className="text-[10px] font-mono text-slate-500">zsh - studio</span>
              <Terminal className="w-3 h-3 text-slate-600" />
            </div>
            {/* Terminal Body */}
            <div className="p-3 font-mono text-[9px] leading-relaxed min-h-[145px] text-slate-300 flex flex-col justify-start">
              {terminalStep >= 0 && (
                <div>
                  <span className="text-cyan-400">$</span> npm install @jsonblob/sdk
                </div>
              )}
              {terminalStep >= 1 && (
                <div className="text-emerald-400">
                  ✔ Installed @jsonblob/sdk v1.4.2 [0.4s]
                </div>
              )}
              {terminalStep >= 2 && (
                <div>
                  <span className="text-cyan-400">$</span> SELECT * FROM users;
                </div>
              )}
              {terminalStep >= 3 && (
                <div className="text-slate-400">
                  ┌───┬──────────────┬────────┐<br />
                  │id │email         │status  │<br />
                  ├───┼──────────────┼────────┤<br />
                  │01 │jane@cf.com   │active  │<br />
                  └───┴──────────────┴────────┘<br />
                  <span className="text-emerald-400">✔ 1 row returned in 2ms</span>
                </div>
              )}
              {terminalStep >= 4 && (
                <div className="text-slate-300">
                  <span className="text-cyan-400">$</span> format --json response.json<br />
                  <span className="text-violet-400">✔ Output formatted & beautified!</span>
                </div>
              )}
              {/* Blinking Cursor */}
              <span className="inline-block w-1 h-3 bg-slate-400 ml-0.5 animate-[blink-cursor_1s_step-end_infinite] align-middle" />
            </div>
          </div>

          {/* Floating Stats Badges */}
          {/* Badge 1: 2ms Query */}
          <div className="absolute top-[8%] left-[24%] bg-slate-950/60 backdrop-blur-md border border-slate-800/50 rounded-full px-3 py-1 text-[10px] font-bold text-emerald-400 flex items-center gap-1 shadow-lg animate-[float-1_7s_ease-in-out_infinite_1.5s] z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>2ms Query Time</span>
          </div>

          {/* Badge 2: Uptime */}
          <div className="absolute bottom-[24%] right-[32%] bg-slate-950/60 backdrop-blur-md border border-slate-800/50 rounded-full px-3 py-1 text-[10px] font-bold text-blue-400 flex items-center gap-1 shadow-lg animate-[float-2_6s_ease-in-out_infinite_2.5s] z-10">
            <Cloud className="w-3 h-3 text-blue-400 shrink-0" />
            <span>99.99% Uptime</span>
          </div>

          {/* Badge 3: REST API Ready */}
          <div className="absolute top-[40%] right-[38%] bg-slate-950/60 backdrop-blur-md border border-slate-800/50 rounded-full px-3 py-1 text-[10px] font-bold text-violet-400 flex items-center gap-1 shadow-lg animate-[float-3_9s_ease-in-out_infinite_3.5s] z-10">
            <Code className="w-3 h-3 text-violet-400 shrink-0" />
            <span>REST API Ready</span>
          </div>

          {/* Floating Dev Icons */}
          {/* Git */}
          <div className="absolute top-[30%] right-[24%] text-slate-600/40 hover:text-slate-500 transition-colors animate-[float-2_8s_ease-in-out_infinite_0.2s]">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 10a3 3 0 11-3-3 3 3 0 013 3zm0 0a3 3 0 11-3 3 3 0 013-3zM6 10a3 3 0 11-3-3 3 3 0 013 3zm0 0a3 3 0 11-3 3 3 0 013-3zM9 10.5a3 3 0 116 0 3 3 0 01-6 0z" />
            </svg>
          </div>
          {/* Cloud */}
          <div className="absolute bottom-[35%] left-[22%] text-slate-600/30 animate-[float-1_10s_ease-in-out_infinite_0.8s]">
            <Cloud className="w-7 h-7" />
          </div>
          {/* Lightning */}
          <div className="absolute top-[22%] left-[10%] text-slate-600/30 animate-[float-3_7s_ease-in-out_infinite_1.2s]">
            <Sparkles className="w-5 h-5 text-amber-500/20" />
          </div>
        </div>

        {/* Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080B11] via-transparent to-[#080B11]/90 pointer-events-none z-0" />

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
      <section
        className="flex-1 flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden bg-background/95 dark:bg-[#080B11]/95 text-foreground transition-colors duration-300 min-h-screen"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Subtle Grid Pattern for the Right Side */}
        <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-right" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-right)" />
          </svg>
        </div>

        {/* Soft Animated Glow Blobs on the Right to match the left */}
        <div className="absolute top-[20%] right-[-10%] w-[300px] h-[300px] rounded-full bg-indigo-500/10 dark:bg-indigo-650/10 blur-[100px] pointer-events-none animate-[pulse-glow_8s_infinite]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[250px] h-[250px] rounded-full bg-primary/10 dark:bg-primary/15 blur-[80px] pointer-events-none animate-[pulse-glow_10s_infinite_2s]" />

        {/* Center Divider Blend Glow to remove harsh separation */}
        <div className="absolute top-0 bottom-0 left-0 w-24 bg-gradient-to-r from-[#080B11]/30 dark:from-[#080B11]/80 to-transparent blur-md pointer-events-none hidden lg:block" />

        {/* Floating Actions bar */}
        <header className="flex items-center justify-between w-full relative z-10">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group relative after:absolute after:bottom-[-2px] after:left-0 after:h-[1px] after:w-0 hover:after:w-full after:bg-muted-foreground hover:after:bg-foreground after:transition-all after:duration-300"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Editor</span>
          </Link>

          <button
            onClick={toggleTheme}
            className="p-2 border border-border/85 dark:border-white/10 hover:bg-accent dark:hover:bg-white/5 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>
        </header>

        {/* Centered Auth Card Container */}
        <div className="w-full max-w-md mx-auto my-auto py-8 relative z-10">
          <div
            className="bg-white/40 dark:bg-[#0c1017]/35 backdrop-blur-xl border border-black/5 dark:border-white/[0.06] rounded-[24px] shadow-2xl p-6 sm:p-8 overflow-hidden transition-all duration-300 ease-out hover:shadow-primary/5 hover:border-primary/20 dark:hover:border-primary/20 animate-[card-entry_0.8s_ease-out_forwards]"
            style={{
              transform: `perspective(1000px) rotateX(${mousePos.y * -4}deg) rotateY(${mousePos.x * 4}deg) translate3d(${mousePos.x * 5}px, ${mousePos.y * 5}px, 0px)`,
            }}
          >
            
            {/* CLOUDFLARE D1 SECURE OAUTH CARD (NO MANUAL FIELD INPUTS) */}
            {isCloudflareFlow ? (
              <div className="space-y-6 text-center">
                <div
                  className="w-16 h-16 rounded-[22px] bg-gradient-to-tr from-violet-500 to-indigo-650 text-white flex items-center justify-center mx-auto shadow-xl shadow-violet-500/20 animate-[logo-float_4s_ease-in-out_infinite] animate-[fade-slide-up_0.6s_ease-out_both]"
                  style={{ animationDelay: '100ms' }}
                >
                  <Cloud className="w-8 h-8" />
                </div>

                <div
                  className="space-y-2 animate-[fade-slide-up_0.6s_ease-out_both]"
                  style={{ animationDelay: '200ms' }}
                >
                  <h2 className="text-xl font-bold tracking-tight">Connect Cloudflare D1</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    Connect your Cloudflare account to securely access your D1 databases directly from the SQL Editor.
                  </p>
                </div>

                {message && (
                  <div
                    className={`p-3 rounded-xl text-xs text-center border font-semibold transition-all animate-[fade-slide-up_0.6s_ease-out_both] ${
                      message.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                <div
                  className="text-left space-y-3 p-4 rounded-2xl bg-black/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/[0.05] text-xs text-muted-foreground animate-[fade-slide-up_0.6s_ease-out_both]"
                  style={{ animationDelay: '300ms' }}
                >
                  <div className="flex items-center gap-2.5 font-semibold text-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Browse D1 databases</span>
                  </div>
                  <div className="flex items-center gap-2.5 font-semibold text-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>View tables & schema</span>
                  </div>
                  <div className="flex items-center gap-2.5 font-semibold text-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Execute SQL queries</span>
                  </div>
                  <div className="flex items-center gap-2.5 font-semibold text-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>AI-powered SQL assistance</span>
                  </div>
                  <div className="flex items-center gap-2.5 font-semibold text-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Secure OAuth authentication</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleCloudflareOAuthRedirect}
                  className={`w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] animate-[fade-slide-up_0.6s_ease-out_both] ${
                    loading ? "bg-gradient-to-r from-violet-650 via-indigo-600 to-violet-650 bg-[length:200%_auto] animate-[gradient-shimmer_2s_linear_infinite]" : ""
                  }`}
                  style={{ animationDelay: '400ms' }}
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
                <div
                  className="flex flex-col items-center gap-2 mb-6 animate-[fade-slide-up_0.6s_ease-out_both]"
                  style={{ animationDelay: '100ms' }}
                >
                  <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-indigo-650 shadow-lg shadow-primary/25 text-primary-foreground font-extrabold text-2xl tracking-tighter animate-[logo-float_4s_ease-in-out_infinite]">
                    {"{"}
                    <span className="text-[10px] text-primary-foreground/90 absolute mt-0.5 font-bold">DEV</span>
                    {"}"}
                  </div>
                  <h2 className="text-xl font-bold tracking-tight mt-3">
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
                    className={`p-3 rounded-xl text-xs mb-4 text-center border font-semibold transition-all animate-[fade-slide-up_0.6s_ease-out_both] ${
                      message.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400"
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
                      <div
                        className="space-y-1.5 animate-[fade-slide-up_0.6s_ease-out_both]"
                        style={{ animationDelay: '200ms' }}
                      >
                        <label className="text-xs font-bold text-muted-foreground">Email Address</label>
                        <div className="relative flex items-center group">
                          <Mail className="w-4 h-4 absolute left-3 text-muted-foreground group-focus-within:text-primary group-focus-within:scale-105 transition-all duration-300" />
                          <input
                            type="email"
                            required
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-background/50 dark:bg-[#0c1017]/50 border border-border rounded-xl text-sm outline-none transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] placeholder:text-muted-foreground/60 placeholder:transition-opacity focus:placeholder:opacity-40"
                          />
                        </div>
                      </div>

                      <div
                        className="space-y-1.5 animate-[fade-slide-up_0.6s_ease-out_both]"
                        style={{ animationDelay: '300ms' }}
                      >
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-muted-foreground">Password</label>
                          <button
                            type="button"
                            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 hover:after:w-full after:bg-muted-foreground hover:after:bg-foreground after:transition-all after:duration-300"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative flex items-center group">
                          <Lock className="w-4 h-4 absolute left-3 text-muted-foreground group-focus-within:text-primary group-focus-within:scale-105 transition-all duration-300" />
                          <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-background/50 dark:bg-[#0c1017]/50 border border-border rounded-xl text-sm outline-none transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] placeholder:text-muted-foreground/60 placeholder:transition-opacity focus:placeholder:opacity-40"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm transition-all duration-300 shadow-md shadow-primary/20 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden animate-[fade-slide-up_0.6s_ease-out_both] ${
                          loading ? "bg-gradient-to-r from-primary via-indigo-500 to-primary bg-[length:200%_auto] animate-[gradient-shimmer_2s_linear_infinite]" : ""
                        }`}
                        style={{ animationDelay: '400ms' }}
                      >
                        {loading && <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
                        <span>Sign In</span>
                      </button>
                    </form>

                    {/* Form 2: Register */}
                    <form onSubmit={handleSubmit} className="w-1/2 pl-3 space-y-4 flex flex-col justify-start">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground">Full Name</label>
                        <div className="relative flex items-center group">
                          <User className="w-4 h-4 absolute left-3 text-muted-foreground group-focus-within:text-primary group-focus-within:scale-105 transition-all duration-300" />
                          <input
                            type="text"
                            required={!isLogin}
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-background/50 dark:bg-[#0c1017]/50 border border-border rounded-xl text-sm outline-none transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] placeholder:text-muted-foreground/60 placeholder:transition-opacity focus:placeholder:opacity-40"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground">Email Address</label>
                        <div className="relative flex items-center group">
                          <Mail className="w-4 h-4 absolute left-3 text-muted-foreground group-focus-within:text-primary group-focus-within:scale-105 transition-all duration-300" />
                          <input
                            type="email"
                            required={!isLogin}
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-background/50 dark:bg-[#0c1017]/50 border border-border rounded-xl text-sm outline-none transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] placeholder:text-muted-foreground/60 placeholder:transition-opacity focus:placeholder:opacity-40"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground">Password</label>
                        <div className="relative flex items-center group">
                          <Lock className="w-4 h-4 absolute left-3 text-muted-foreground group-focus-within:text-primary group-focus-within:scale-105 transition-all duration-300" />
                          <input
                            type="password"
                            required={!isLogin}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-background/50 dark:bg-[#0c1017]/50 border border-border rounded-xl text-sm outline-none transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] placeholder:text-muted-foreground/60 placeholder:transition-opacity focus:placeholder:opacity-40"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm transition-all duration-300 shadow-md shadow-primary/20 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden ${
                          loading ? "bg-gradient-to-r from-primary via-indigo-500 to-primary bg-[length:200%_auto] animate-[gradient-shimmer_2s_linear_infinite]" : ""
                        }`}
                      >
                        {loading && <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
                        <span>Register</span>
                      </button>
                    </form>
                  </div>
                </div>

                {/* Toggle Footer Link */}
                <div
                  className="mt-6 pt-5 border-t border-border/80 dark:border-white/5 text-center animate-[fade-slide-up_0.6s_ease-out_both]"
                  style={{ animationDelay: '500ms' }}
                >
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
