import { useEffect, useState } from "react";
import { nowAEST, fmtAEST } from "@/utils/timeAEST";

export default function AESTClock() {
  const [d, setD] = useState(nowAEST());
  
  useEffect(() => {
    const timer = setInterval(() => setD(nowAEST()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const dst = new Date().toString().includes("GMT+11");
  
  return (
    <div className="text-xs opacity-90 px-2 py-1 rounded bg-black/40 text-white">
      AEST{dst ? "/AEDT" : ""}: {fmtAEST(d)}
    </div>
  );
}