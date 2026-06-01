import "@/App.css";
import "@/index.css";
import React, { useEffect } from "react";
import { CigsProvider, useCigs } from "@/context/CigsContext";
import { Sidebar } from "@/components/Sidebar";
import { Titlebar } from "@/components/Titlebar";
import { StatusBar } from "@/components/StatusBar";
import { Inspector } from "@/components/Inspector";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import MainScreen from "@/screens/MainScreen";
import QueueScreen from "@/screens/QueueScreen";
import ProgressScreen from "@/screens/ProgressScreen";
import ResultScreen from "@/screens/ResultScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import LogsScreen from "@/screens/LogsScreen";

const SCREENS = {
  main: MainScreen,
  queue: QueueScreen,
  progress: ProgressScreen,
  result: ResultScreen,
  settings: SettingsScreen,
  logs: LogsScreen,
};

const Shell = () => {
  const { screen, startJob, addToQueue } = useCigs();
  const Screen = SCREENS[screen] || MainScreen;

  // Global keyboard shortcuts. Cmd+Enter starts a job from the builder,
  // Cmd+Shift+Enter adds it to the queue (cosmetic — validation lives in context).
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) addToQueue();
        else startJob();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startJob, addToQueue]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-void text-foreground">
      <Titlebar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <ResizablePanelGroup direction="horizontal" className="min-w-0 flex-1">
          <ResizablePanel defaultSize={68} minSize={50} className="min-w-0">
            <main className="h-full min-w-0 bg-background">
              <Screen />
            </main>
          </ResizablePanel>
          <ResizableHandle className="bg-border/70 transition-colors hover:bg-primary/40" />
          <ResizablePanel defaultSize={32} minSize={22} maxSize={42} className="min-w-0">
            <Inspector />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <StatusBar />
      <Toaster theme="dark" position="bottom-right" richColors closeButton />
    </div>
  );
};

export default function App() {
  return (
    <CigsProvider>
      <TooltipProvider delayDuration={200}>
        <Shell />
      </TooltipProvider>
    </CigsProvider>
  );
}
