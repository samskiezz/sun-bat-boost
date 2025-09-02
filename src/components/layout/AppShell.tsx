import { PropsWithChildren, useState } from "react";
import AESTClock from "@/components/layout/AESTClock";
import AppModeSwitch from "@/components/layout/AppModeSwitch";
import { featureFlags, type AppMode } from "@/config/featureFlags";

export default function AppShell({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<AppMode>(() => (localStorage.getItem("appMode") as AppMode) || "lite");
  const f = featureFlags(mode);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,.7),transparent)]">
      <header className="sticky top-0 z-40 border-b bg-white/60 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <div className="font-semibold tracking-tight">Sun-Bat Boost</div>
          <div className="ml-auto flex items-center gap-2">
            <AppModeSwitch value={mode} onChange={setMode} />
            <AESTClock />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-12 gap-5">
        <aside className="col-span-12 md:col-span-3 lg:col-span-2">
          <nav className="space-y-2">
            <div className="text-sm font-medium opacity-80">Navigation</div>
            <div className="text-xs opacity-60">Wizard steps will appear here</div>
          </nav>
        </aside>

        <section className="col-span-12 md:col-span-9 lg:col-span-7">
          {children}
        </section>

        <aside className="hidden lg:block lg:col-span-3">
          {f.explainability && (
            <div className="space-y-3">
              <div className="text-sm font-medium opacity-80">Insights</div>
              <div className="text-xs opacity-60">KPI cards and explainability will appear here</div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}