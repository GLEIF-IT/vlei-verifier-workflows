/**
 * Centralized module imports for Node.js built-in modules
 * 
 * This file provides a consistent way to import Node.js built-in modules
 * across the project, avoiding issues with TypeScript's module transformation.
 */

// Core Node.js modules
export const fs = require('fs');
export const path = require('path');
export const os = require('os');
export const child_process = require('child_process');
export const url = require('url');
export const util = require('util');
export const crypto = require('crypto');
export const stream = require('stream');
export const events = require('events');
export const http = require('http');
export const https = require('https');
export const net = require('net');

// Common third-party modules that need CommonJS require
export const Dockerode = require('dockerode');
export const minimist = require('minimist');

// Commonly used functions from modules
export const { exec, spawn, execSync } = child_process;
export const { URL, URLSearchParams } = url;
export const { promisify } = util;
export const { Readable, Writable, Transform } = stream;
export const { EventEmitter } = events;

// Type imports for TypeScript
import type * as DockerodeTypes from 'dockerode';
export type { DockerodeTypes };

// Add YAML library
export const yaml = require('js-yaml'); 