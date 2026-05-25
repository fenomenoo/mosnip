import chalk from 'chalk';
import { AsyncLocalStorage } from 'async_hooks';
import { EventEmitter } from 'events';

export const logEmitter = new AsyncLocalStorage<EventEmitter>();

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function forward(level: string, msg: string): void {
  const emitter = logEmitter.getStore();
  if (emitter) {
    emitter.emit('log', { level, message: msg, timestamp: new Date().toISOString() });
  }
}

export const log = {
  info: (msg: string): void => {
    console.log(`${chalk.gray(`[${timestamp()}]`)} ${chalk.blue('INFO')}    ${msg}`);
    forward('info', msg);
  },
  success: (msg: string): void => {
    console.log(`${chalk.gray(`[${timestamp()}]`)} ${chalk.green('SUCCESS')} ${msg}`);
    forward('success', msg);
  },
  warn: (msg: string): void => {
    console.log(`${chalk.gray(`[${timestamp()}]`)} ${chalk.yellow('WARN')}    ${msg}`);
    forward('warn', msg);
  },
  error: (msg: string): void => {
    console.log(`${chalk.gray(`[${timestamp()}]`)} ${chalk.red('ERROR')}   ${msg}`);
    forward('error', msg);
  },
  step: (msg: string): void => {
    console.log(`\n${chalk.gray(`[${timestamp()}]`)} ${chalk.magenta('STEP')}    ${chalk.bold(msg)}`);
    forward('step', msg);
  },
};
