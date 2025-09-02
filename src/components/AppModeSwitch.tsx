import { useEffect, useState } from "react";
import type { AppMode } from "@/config/featureFlags";

export default function AppModeSwitch({ onChange }: { onChange: (m: AppMode) => void }) {
  const [mode, setMode] = useState<AppMode>(() => 
    (localStorage.getItem("appMode") as AppMode) || "lite"
  );

  useEffect(() => {
    localStorage.setItem("appMode", mode);
    onChange(mode);
  }, [mode, onChange]);

  return (
    <div className="fixed top-3 left-3 bg-black/40 text-white rounded-xl p-1 flex gap-1 text-xs z-50">
      {(["lite", "pro"] as AppMode[]).map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={`px-2 py-1 rounded ${
            mode === m ? "bg-white text-black" : "opacity-80"
          }`}
        >
          {m.toUpperCase()}
        </button>
      ))}
    </div>
  );
}