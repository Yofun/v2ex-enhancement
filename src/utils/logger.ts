const PREFIX = '[V2EX enhancement]';

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/**
 * 带统一前缀的日志，scope 标明来自哪个模块：`[V2EX enhancement][signin] ...`。
 * debug 在浏览器控制台默认被折叠到 Verbose 级别，用来记录正常流程里的细节。
 */
export function createLogger(scope: string): Logger {
  const tag = `${PREFIX}[${scope}]`;
  return {
    debug: (...args) => console.debug(tag, ...args),
    info: (...args) => console.info(tag, ...args),
    warn: (...args) => console.warn(tag, ...args),
    error: (...args) => console.error(tag, ...args),
  };
}
