/**
 * Centralized module imports for Node.js built-in modules
 *
 * This file provides a consistent way to import Node.js built-in modules
 * across the project, using proper ES module syntax.
 */

// Import Node.js built-in modules with namespace imports
import * as fs from 'fs';
import * as pathModule from 'path';
import * as os from 'os';
import * as child_process from 'child_process';
import * as url from 'url';
import * as util from 'util';
import * as crypto from 'crypto';
import * as stream from 'stream';
import * as events from 'events';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';

// Type exports
export type { default as DockerodeTypes } from 'dockerode';

// Export yaml - unchanged
import * as yaml from 'js-yaml';
export { yaml };

// For minimist, we need to handle it specially
// Import it directly and then create a simple wrapper function
import minimistPkg from 'minimist';

// Create a simple wrapper function that just calls the imported function
export function minimist(args: string[], opts?: any): any {
  return minimistPkg(args, opts);
}

// Export commonly used functions from modules
export const { exec, spawn, execSync } = child_process;
export const { URL, URLSearchParams } = url;
export const { promisify } = util;
export const { Readable, Writable, Transform } = stream;
export const { EventEmitter } = events;

// Re-export everything
export {
  fs,
  pathModule,
  os,
  child_process,
  url,
  util,
  crypto,
  stream,
  events,
  http,
  https,
  net,
};

// Export path with a specific name to avoid transformation issues
export const path = pathModule;
