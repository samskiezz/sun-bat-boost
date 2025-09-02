import { useEffect, useState } from "react";
import { nowAEST, fmtAEST } from "@/utils/timeAEST";

export default function AESTClock() {
  const [d, setD] = useState(nowAEST());

  useEffect(() => {
    const t = setInterval(() => setD(nowAEST()), 1000);
    return () => clearInterval(t);
  }, []);

  const dst = Intl.DateTimeFormat().resolvedOptions().timeZone === "Australia/Sydney" 
    && new Date().toString().includes("GMT+11");

  return (
    <div className="fixed top-3 right-3 text-xs opacity-90 px-2 py-1 rounded bg-black/40 text-white z-50">
      AEST{dst ? "/AEDT" : ""}: {fmtAEST(d)}
    </div>
  );
}