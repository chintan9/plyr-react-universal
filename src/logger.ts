export const createLogger = (prefix: string, debug: boolean = false) => ({
  log: (...args: unknown[]) => debug && console.log(`[${prefix}]`, ...args),
  error: (...args: unknown[]) => debug && console.error(`[${prefix}]`, ...args),
});