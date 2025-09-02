import { beforeAll } from "vitest";

// Setup global test environment
beforeAll(() => {
  // Mock environment variables
  Object.defineProperty(import.meta, "env", {
    value: {
      DEV: true,
      VITE_API_BASE: "/api",
    },
    writable: true,
  });

  // Mock localStorage
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: (key: string) => null,
      setItem: (key: string, value: string) => {},
      removeItem: (key: string) => {},
      clear: () => {},
    },
    writable: true,
  });
});