export const log = {
  debug: (...a: any[]) => { if (import.meta.env.DEV) console.debug(...a); },
  info:  (...a: any[]) => console.info(...a),
  warn:  (...a: any[]) => console.warn(...a),
  error: (...a: any[]) => console.error(...a),
};