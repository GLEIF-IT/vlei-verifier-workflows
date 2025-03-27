/**
 * Centralized module imports for Node.js built-in modules
 *
 * This file provides a consistent way to import Node.js built-in modules
 * across the project, using proper ES module syntax.
 */

// Import Node.js built-in modules with namespace imports
import * as fs from 'fs';
import * as path from 'path';
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

// For third-party modules, use a dynamic import approach
// This creates a wrapper that will load the module on first use
const Dockerode = require('dockerode');
const yaml = require('js-yaml');
const minimist = require('minimist');

// Export commonly used functions from modules
export const { exec, spawn, execSync } = child_process;
export const { URL, URLSearchParams } = url;
export const { promisify } = util;
export const { Readable, Writable, Transform } = stream;
export const { EventEmitter } = events;

// Re-export everything
export {
  fs,
  path,
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
  Dockerode,
  yaml,
  minimist,
};

// Type exports
export type { default as DockerodeTypes } from 'dockerode';
