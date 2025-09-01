const ENV = (import.meta as any).env || {};

export function url(path: string) {
  const base = ENV.VITE_API_BASE as string | undefined;
  return base ? `${base.replace(/\/$/, "")}${path}` : path;
}