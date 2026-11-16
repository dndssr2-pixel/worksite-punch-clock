/**
 * Production Web App & Sync API Server
 * Serves the mobile web app for employees/boss and syncs attendance data.
 * Run with: npm run server
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, '..', 'dist');

const PORT = process.env.PORT || 4000;

// Attendance Data Store
let punches = [];
let employees = [
  {
    id: 'boss_master',
    companyCode: 'CORP100',
    name: 'Marcus Vance (Boss)',
    email: 'boss@company.com',
    pin: '9999',
    role: 'BOSS',
    department: 'Executive Management',
    active: true
  },
  {
    id: 'emp_1',
    companyCode: 'CORP100',
    name: 'Alice Johnson',
    email: 'alice@company.com',
    pin: '1001',
    role: 'EMPLOYEE',
    department: 'Site Engineering',
    active: true
  },
  {
    id: 'emp_2',
    companyCode: 'CORP100',
    name: 'Bob Martinez',
    email: 'bob@company.com',
    pin: '1002',
    role: 'EMPLOYEE',
    department: 'Heavy Equipment',
    active: true
  },
  {
    id: 'emp_3',
    companyCode: 'CORP100',
    name: 'Carlos Diaz',
    email: 'carlos@company.com',
    pin: '1003',
    role: 'EMPLOYEE',
    department: 'Safety & Logistics',
    active: true
  }
];

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // API: Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }

  // API: GET /api/employees
  if (req.method === 'GET' && url.pathname === '/api/employees') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(employees));
    return;
  }

  // API: GET /api/punches
  if (req.method === 'GET' && url.pathname === '/api/punches') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(punches));
    return;
  }

  // API: POST /api/punches
  if (req.method === 'POST' && url.pathname === '/api/punches') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const punch = JSON.parse(body);
        punches.push(punch);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, punch }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // Serve Static Frontend (dist/)
  let reqPath = url.pathname === '/' ? '/index.html' : url.pathname;
  let filePath = path.join(DIST_DIR, reqPath);

  // Security check: ensure filePath is within DIST_DIR
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA client-side routing
      const indexPath = path.join(DIST_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
        }
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Punch Clock Web App & API Server is LIVE!`);
  console.log(`👉 Local:   http://localhost:${PORT}`);
  console.log(`👉 Network: Open http://<YOUR-IP-ADDRESS>:${PORT} on any phone`);
  console.log(`======================================================\n`);
});
