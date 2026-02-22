const LEVEL = (process.env.LOG_LEVEL || "debug").toLowerCase();

export function debug(...args: unknown[]) {
  if (LEVEL === "debug") console.debug(...args);
}
export function info(...args: unknown[]) {
  if (["debug", "info"].includes(LEVEL)) console.info(...args);
}
export function warn(...args: unknown[]) {
  if (["debug", "info", "warn"].includes(LEVEL)) console.warn(...args);
}
export function error(...args: unknown[]) {
  console.error(...args);
}

const logger = { debug, info, warn, error };

export default logger;
