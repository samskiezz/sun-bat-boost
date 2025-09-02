export const AEST_TZ = "Australia/Sydney";

export const nowAEST = () => 
  new Date(new Date().toLocaleString("en-AU", { timeZone: AEST_TZ }));

export const toAEST = (d: Date | string | number) => 
  new Date(new Date(d).toLocaleString("en-AU", { timeZone: AEST_TZ }));

export const fmtAEST = (d: Date) => 
  new Intl.DateTimeFormat("en-AU", {
    timeZone: AEST_TZ,
    dateStyle: "medium",
    timeStyle: "short"
  }).format(d);