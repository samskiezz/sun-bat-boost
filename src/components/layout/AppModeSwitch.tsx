import { useEffect, useState } from "react";
import type { AppMode } from "@/config/featureFlags";

interface AppModeSwitchProps {
  value?: AppMode;
  onChange: (mode: AppMode) => void;
}

export default function AppModeSwitch({ value, onChange }: AppModeSwitchProps) {
  const [mode, setMode] = useState<AppMode>(value ?? (localStorage.getItem("appMode") as AppMode) ?? "lite");
  
  useEffect(() => {
    localStorage.setItem("appMode", mode);
    onChange(mode);
  }, [mode, onChange]);

  return (
    <div className="bg-black/40 text-white rounded-xl p-1 flex gap-1 text-xs">
      {(["lite", "pro"] as AppMode[]).map(m => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={`px-2 py-1 rounded transition-all ${
            mode === m ? "bg-white text-black" : "opacity-80 hover:opacity-100"
          }`}
        >
          {m.toUpperCase()}
        </button>
      ))}
    </div>
  );
}