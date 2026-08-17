"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  FileCode2,
  Activity,
  FileText,
  Sliders,
  Sparkles,
} from "lucide-react";

import { TestDashboardTab } from "./TestDashboardTab";
import { ProjectsTab } from "./ProjectsTab";
import { TestSuitesTab } from "./TestSuitesTab";
import { TestRunsTab } from "./TestRunsTab";
import { TestReportsTab } from "./TestReportsTab";
import { EnvironmentsTab } from "./EnvironmentsTab";

export function TestAutomationView() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "projects" | "suites" | "runs" | "reports" | "environments"
  >("dashboard");

  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>(undefined);
  const [openNewProjectModal, setOpenNewProjectModal] = useState(false);

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "suites", label: "Test Suites & Cases", icon: FileCode2 },
    { id: "runs", label: "Test Runs", icon: Activity },
    { id: "reports", label: "Reports & AI Failures", icon: FileText },
    { id: "environments", label: "Environments", icon: Sliders },
  ];

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Test Automation Sub-Header / Tab Navigation Bar */}
      <div className="h-13 border-b border-border bg-card/40 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 pr-4 border-r border-border/60">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="font-extrabold text-sm text-foreground tracking-tight">AI Test Platform</div>
            <div className="text-[10px] text-muted-foreground font-mono">Playwright + Maestro</div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "projects") setOpenNewProjectModal(false);
                  setActiveTab(tab.id as any);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab View Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "dashboard" && (
          <TestDashboardTab
            onNavigateTab={(t) => setActiveTab(t as any)}
            onOpenNewProject={() => {
              setOpenNewProjectModal(true);
              setActiveTab("projects");
            }}
          />
        )}

        {activeTab === "projects" && (
          <ProjectsTab
            onSelectProject={(pid) => setSelectedProjectId(pid)}
            onNavigateTab={(t) => setActiveTab(t as any)}
            isOpenNewModalInitially={openNewProjectModal}
          />
        )}

        {activeTab === "suites" && (
          <TestSuitesTab
            selectedProjectId={selectedProjectId}
            onNavigateTab={(t) => setActiveTab(t as any)}
          />
        )}

        {activeTab === "runs" && (
          <TestRunsTab
            onSelectRunForReport={(rid) => setSelectedRunId(rid)}
            onNavigateTab={(t) => setActiveTab(t as any)}
          />
        )}

        {activeTab === "reports" && (
          <TestReportsTab
            selectedRunId={selectedRunId}
            onNavigateTab={(t) => setActiveTab(t as any)}
          />
        )}

        {activeTab === "environments" && <EnvironmentsTab />}
      </div>
    </div>
  );
}
