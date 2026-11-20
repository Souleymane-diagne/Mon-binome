/**
 * Mon Binôme - Serveur Production & Connecteur Supabase Direct
 * Fondateur & Administrateur : Souleymane Diagne (souleymanediagne740@gmail.com)
 * 
 * Base de Données Cloud : Supabase PostgreSQL Direct (0€ / Haute Disponibilité)
 * URL : https://iyhhdrbphecvarrrbsxm.supabase.co
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const zlib = require('zlib');
const os = require('os');
const cluster = require('cluster');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'database.json');
const JWT_SECRET = process.env.JWT_SECRET || 'mon_binome_secret_key_luxury_10m_dakar_sn';

// Configuration Supabase (Injectée via les variables d'environnement de Render)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iyhhdrbphecvarrrbsxm.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

const USE_CLUSTER = process.env.CLUSTER === 'true' && cluster.isPrimary && os.cpus().length > 1;

if (USE_CLUSTER) {
  const cpuCount = os.cpus().length;
  console.log(`[Cluster] Démarrage sur ${cpuCount} cœurs CPU...`);
  for (let i = 0; i < cpuCount; i++) cluster.fork();
  cluster.on('exit', () => cluster.fork());
} else {
  startWorkerServer();
}

function startWorkerServer() {

  // ================= 1. CLIENT SUPABASE CLOUD (REST NATIVE) =================
  class SupabaseClient {
    constructor(baseUrl, key) {
      this.baseUrl = baseUrl.replace(/\/+$/, '');
      this.key = key;
      const parsed = url.parse(this.baseUrl);
      this.hostname = parsed.hostname;
      this.port = parsed.port || 443;
    }

    request(endpoint, method = 'GET', body = null, extraHeaders = {}) {
      return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const headers = {
          'apikey': this.key,
          'Authorization': `Bearer ${this.key}`,
          'Content-Type': 'application/json',
          ...extraHeaders
        };
        if (payload) {
          headers['Content-Length'] = Buffer.byteLength(payload);
        }

        const options = {
          hostname: this.hostname,
          port: this.port,
          path: `/rest/v1/${endpoint.replace(/^\/+/, '')}`,
          method,
          headers
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              const parsedData = data ? JSON.parse(data) : null;
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve({ status: res.statusCode, data: parsedData });
              } else {
                resolve({ status: res.statusCode, error: parsedData || data });
              }
            } catch (e) {
              resolve({ status: res.statusCode, data });
            }
          });
        });

        req.on('error', (err) => reject(err));
        req.setTimeout(8000, () => {
          req.destroy();
          reject(new Error('Timeout Supabase'));
        });

        if (payload) req.write(payload);
        req.end();
      });
    }

    // Récupérer un utilisateur par email
    async getUserByEmail(email) {
      const clean = encodeURIComponent(email.trim().toLowerCase());
      const res = await this.request(`users?email=eq.${clean}&select=*`);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data[0];
      }
      return null;
    }

    // Créer un utilisateur dans Supabase
    async createUser(userObj) {
      const res = await this.request('users', 'POST', userObj, {
        'Prefer': 'return=representation'
      });
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data[0];
      }
      return null;
    }

    // Mettre à jour un utilisateur
    async updateUser(userId, fields) {
      const cleanId = encodeURIComponent(userId);
      const res = await this.request(`users?id=eq.${cleanId}`, 'PATCH', fields, {
        'Prefer': 'return=representation'
      });
      return res.data;
    }

    // Supprimer un utilisateur
    async deleteUser(userId) {
      const cleanId = encodeURIComponent(userId);
      await this.request(`users?id=eq.${cleanId}`, 'DELETE');
      return true;
    }

    // Récupérer tous les utilisateurs
    async getAllUsers() {
      const res = await this.request('users?select=*&order=created_at.desc');
      return Array.isArray(res.data) ? res.data : [];
    }

    // Récupérer les données d'un étudiant (cours, devoirs, stats, prières)
    async getUserData(userId) {
      const cleanId = encodeURIComponent(userId);
      const res = await this.request(`user_data?user_id=eq.${cleanId}&select=*`);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data[0];
      }
      return null;
    }

    // Sauvegarder les données d'un étudiant (Upsert)
    async saveUserData(userId, dataObj) {
      const record = {
        user_id: userId,
        courses: dataObj.courses || [],
        tasks: dataObj.tasks || [],
        prayers: dataObj.prayers || {},
        stats: dataObj.stats || {},
        settings: dataObj.settings || {},
        updated_at: new Date().toISOString()
      };
      const res = await this.request('user_data', 'POST', record, {
        'Prefer': 'resolution=merge-duplicates,return=representation'
      });
      return res.data;
    }

    // Annonces
    async getAnnouncements() {
      const res = await this.request('announcements?active=eq.true&order=created_at.desc');
      return Array.isArray(res.data) ? res.data : [];
    }

    async createAnnouncement(annObj) {
      const res = await this.request('announcements', 'POST', annObj, {
        'Prefer': 'return=representation'
      });
      return res.data;
    }
  }

  const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_KEY);

  // ================= 2. SÉCURITÉ CRYPTOGRAPHIQUE =================
  function hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  }

  function verifyPassword(password, salt, hash) {
    const testHash = hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(hash, 'hex'));
  }

  function generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      exp: Date.now() + (30 * 24 * 60 * 60 * 1000)
    };
    const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${head}.${body}`).digest('base64url');
    return `${head}.${body}.${sig}`;
  }

  function verifyToken(tokenStr) {
    if (!tokenStr) return null;
    try {
      const parts = tokenStr.split('.');
      if (parts.length !== 3) return null;
      const [head, body, sig] = parts;
      const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${head}.${body}`).digest('base64url');
      if (sig !== expectedSig) return null;

      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
      if (payload.exp && Date.now() > payload.exp) return null;
      return payload;
    } catch (e) {
      return null;
    }
  }

  // Rate Limiting anti-brute force
  const rateLimitMap = new Map();
  function checkRateLimit(ip, limit = 25, windowMs = 60000) {
    const now = Date.now();
    let record = rateLimitMap.get(ip);
    if (!record || now - record.resetTime > windowMs) {
      record = { count: 1, resetTime: now };
      rateLimitMap.set(ip, record);
      return true;
    }
    record.count++;
    return record.count <= limit;
  }

  // Compression automatique Gzip
  function sendCompressedResponse(req, res, statusCode, headers, buffer) {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (acceptEncoding.includes('gzip')) {
      zlib.gzip(buffer, (err, compressed) => {
        if (err) {
          res.writeHead(statusCode, headers);
          return res.end(buffer);
        }
        headers['Content-Encoding'] = 'gzip';
        headers['Content-Length'] = compressed.length;
        res.writeHead(statusCode, headers);
        res.end(compressed);
      });
    } else {
      headers['Content-Length'] = Buffer.byteLength(buffer);
      res.writeHead(statusCode, headers);
      res.end(buffer);
    }
  }

  function sendJSON(req, res, statusCode, data) {
    const jsonStr = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    };
    sendCompressedResponse(req, res, statusCode, headers, Buffer.from(jsonStr, 'utf-8'));
  }

  function parseJSONBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 2 * 1024 * 1024) {
          req.destroy();
          reject(new Error('Payload trop volumineux'));
        }
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (err) {
          reject(err);
        }
      });
      req.on('error', reject);
    });
  }

  function authenticate(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return null;
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    return verifyToken(token);
  }

  // ================= 3. MIME TYPES & CACHE =================
  const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon'
  };

  // ================= 4. ROUTEUR HTTP =================
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      });
      return res.end();
    }

    // ================= API REST (CONNECTÉE À SUPABASE) =================
    if (pathname.startsWith('/api/')) {

      // Rate limit auth
      if (pathname.startsWith('/api/auth/')) {
        if (!checkRateLimit(clientIP, 25, 60000)) {
          return sendJSON(req, res, 429, { error: 'Trop de requêtes. Veuillez patienter une minute.' });
        }
      }

      // POST /api/auth/register
      if (pathname === '/api/auth/register' && method === 'POST') {
        try {
          const body = await parseJSONBody(req);
          const { name, email, password, city } = body;

          if (!name || !email || !password || password.length < 6) {
            return sendJSON(req, res, 400, { error: 'Nom, email valide et mot de passe (min 6 caractères) requis.' });
          }

          const cleanEmail = email.trim().toLowerCase();
          const existing = await supabase.getUserByEmail(cleanEmail);
          if (existing) {
            return sendJSON(req, res, 409, { error: 'Cet email est déjà inscrit sur Mon Binôme.' });
          }

          const salt = crypto.randomBytes(16).toString('hex');
          const hash = hashPassword(password, salt);
          const newUserObj = {
            id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: name.trim(),
            email: cleanEmail,
            password_hash: hash,
            salt,
            role: 'user',
            city: (city || 'Dakar').trim(),
            status: 'active',
            created_at: new Date().toISOString(),
            last_login_at: new Date().toISOString()
          };

          const createdUser = await supabase.createUser(newUserObj);
          if (!createdUser) {
            throw new Error('Erreur création compte sur Supabase');
          }

          // Initialiser les données de l'étudiant
          await supabase.saveUserData(createdUser.id, {
            courses: [],
            tasks: [],
            prayers: { Fajr: '05:45', Dhuhr: '13:05', Asr: '16:25', Maghrib: '18:48', Isha: '19:58' },
            stats: { streak: 1, completedTasksCount: 0, totalTasksCount: 0 },
            settings: { prayerCity: createdUser.city, theme: 'dark' }
          });

          const token = generateToken(createdUser);
          return sendJSON(req, res, 201, {
            success: true,
            token,
            user: {
              id: createdUser.id,
              name: createdUser.name,
              email: createdUser.email,
              role: createdUser.role,
              city: createdUser.city
            }
          });
        } catch (err) {
          return sendJSON(req, res, 500, { error: err.message });
        }
      }

      // POST /api/auth/login
      if (pathname === '/api/auth/login' && method === 'POST') {
        try {
          const body = await parseJSONBody(req);
          const { email, password } = body;

          if (!email || !password) {
            return sendJSON(req, res, 400, { error: 'Email et mot de passe requis.' });
          }

          const cleanEmail = email.trim().toLowerCase();
          const user = await supabase.getUserByEmail(cleanEmail);

          if (!user || !verifyPassword(password, user.salt, user.password_hash)) {
            return sendJSON(req, res, 401, { error: 'Email ou mot de passe incorrect.' });
          }

          if (user.status === 'suspended') {
            return sendJSON(req, res, 403, { error: 'Ce compte a été suspendu par l\'administrateur.' });
          }

          // Mettre à jour la date de dernière connexion sur Supabase
          supabase.updateUser(user.id, { last_login_at: new Date().toISOString() }).catch(() => {});

          const token = generateToken(user);
          return sendJSON(req, res, 200, {
            success: true,
            token,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              city: user.city
            }
          });
        } catch (err) {
          return sendJSON(req, res, 500, { error: err.message });
        }
      }

      // GET /api/auth/me
      if (pathname === '/api/auth/me' && method === 'GET') {
        const authUser = authenticate(req);
        if (!authUser) return sendJSON(req, res, 401, { error: 'Non authentifié' });

        const user = await supabase.getUserByEmail(authUser.email);
        if (!user) return sendJSON(req, res, 404, { error: 'Utilisateur introuvable' });

        return sendJSON(req, res, 200, {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            city: user.city,
            createdAt: user.created_at
          }
        });
      }

      // GET /api/user/sync
      if (pathname === '/api/user/sync' && method === 'GET') {
        const authUser = authenticate(req);
        if (!authUser) return sendJSON(req, res, 401, { error: 'Non authentifié' });

        const dataRecord = await supabase.getUserData(authUser.id);
        return sendJSON(req, res, 200, { success: true, data: dataRecord || {} });
      }

      // POST /api/user/sync
      if (pathname === '/api/user/sync' && method === 'POST') {
        const authUser = authenticate(req);
        if (!authUser) return sendJSON(req, res, 401, { error: 'Non authentifié' });

        try {
          const body = await parseJSONBody(req);
          await supabase.saveUserData(authUser.id, body);
          return sendJSON(req, res, 200, { success: true, message: 'Données synchronisées dans le Cloud' });
        } catch (err) {
          return sendJSON(req, res, 500, { error: err.message });
        }
      }

      // GET /api/announcements
      if (pathname === '/api/announcements' && method === 'GET') {
        const announcements = await supabase.getAnnouncements();
        return sendJSON(req, res, 200, { announcements });
      }

      // --- PANNEAU D'ADMINISTRATION (SOULEYMANE DIAGNE) ---
      const authUser = authenticate(req);
      if (pathname.startsWith('/api/admin')) {
        if (!authUser || authUser.role !== 'admin') {
          return sendJSON(req, res, 403, { error: 'Accès réservé au Fondateur & Administrateur (Souleymane Diagne).' });
        }

        // GET /api/admin/overview
        if (pathname === '/api/admin/overview' && method === 'GET') {
          const users = await supabase.getAllUsers();
          const totalUsers = users.length;
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const activeToday = users.filter((u) => new Date(u.last_login_at) >= oneDayAgo).length;

          let totalCourses = 0;
          let totalTasksDone = 0;
          let totalStreaks = 0;
          const cityDistribution = {};

          users.forEach((u) => {
            const uCity = u.city || 'Dakar';
            cityDistribution[uCity] = (cityDistribution[uCity] || 0) + 1;
          });

          // Récupérer les métriques depuis user_data
          const dataRes = await supabase.request('user_data?select=*');
          if (Array.isArray(dataRes.data)) {
            dataRes.data.forEach((d) => {
              if (Array.isArray(d.courses)) totalCourses += d.courses.length;
              if (d.stats && d.stats.completedTasksCount) totalTasksDone += d.stats.completedTasksCount;
              if (d.stats && d.stats.streak) totalStreaks += d.stats.streak;
            });
          }

          const avgStreak = totalUsers > 0 ? (totalStreaks / totalUsers).toFixed(1) : 0;

          return sendJSON(req, res, 200, {
            founder: 'Souleymane Diagne',
            totalUsers,
            activeToday,
            totalCourses,
            totalTasksDone,
            avgStreak,
            cityDistribution,
            uptimeSeconds: Math.floor(process.uptime()),
            nodeVersion: process.version,
            memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
          });
        }

        // GET /api/admin/users
        if (pathname === '/api/admin/users' && method === 'GET') {
          const users = await supabase.getAllUsers();
          const dataRes = await supabase.request('user_data?select=*');
          const dataMap = {};
          if (Array.isArray(dataRes.data)) {
            dataRes.data.forEach((d) => { dataMap[d.user_id] = d; });
          }

          const usersList = users.map((u) => {
            const data = dataMap[u.id] || {};
            return {
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              city: u.city || 'Dakar',
              status: u.status || 'active',
              createdAt: u.created_at,
              lastLoginAt: u.last_login_at,
              coursesCount: (data.courses || []).length,
              tasksDone: data.stats?.completedTasksCount || 0,
              streak: data.stats?.streak || 0
            };
          });

          return sendJSON(req, res, 200, { users: usersList });
        }

        // POST /api/admin/users/:id/status
        if (pathname.match(/^\/api\/admin\/users\/[^/]+\/status$/) && method === 'POST') {
          const userId = pathname.split('/')[4];
          const body = await parseJSONBody(req);
          if (userId === authUser.id) return sendJSON(req, res, 400, { error: 'Action interdite sur le compte fondateur.' });

          const newStatus = body.status === 'suspended' ? 'suspended' : 'active';
          await supabase.updateUser(userId, { status: newStatus });
          return sendJSON(req, res, 200, { success: true });
        }

        // POST /api/admin/users/:id/role
        if (pathname.match(/^\/api\/admin\/users\/[^/]+\/role$/) && method === 'POST') {
          const userId = pathname.split('/')[4];
          const body = await parseJSONBody(req);
          if (userId === authUser.id) return sendJSON(req, res, 400, { error: 'Action interdite sur le compte fondateur.' });

          const newRole = body.role === 'admin' ? 'admin' : 'user';
          await supabase.updateUser(userId, { role: newRole });
          return sendJSON(req, res, 200, { success: true });
        }

        // DELETE /api/admin/users/:id
        if (pathname.match(/^\/api\/admin\/users\/[^/]+$/) && method === 'DELETE') {
          const userId = pathname.split('/')[4];
          if (userId === authUser.id) return sendJSON(req, res, 400, { error: 'Impossible de supprimer le compte fondateur.' });

          await supabase.deleteUser(userId);
          return sendJSON(req, res, 200, { success: true, message: 'Compte supprimé de Supabase.' });
        }

        // POST /api/admin/broadcast
        if (pathname === '/api/admin/broadcast' && method === 'POST') {
          const body = await parseJSONBody(req);
          if (!body.title || !body.message) {
            return sendJSON(req, res, 400, { error: 'Titre et message requis.' });
          }

          const newAnn = {
            id: 'ann_' + Date.now(),
            title: body.title,
            message: body.message,
            author: 'Souleymane Diagne (Fondateur)',
            created_at: new Date().toISOString(),
            active: true
          };

          await supabase.createAnnouncement(newAnn);
          return sendJSON(req, res, 201, { success: true, announcement: newAnn });
        }
      }

      return sendJSON(req, res, 404, { error: 'Point de terminaison introuvable' });
    }

    // ================= 5. DISTRIBUTION DES FICHIERS STATIQUES =================
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403);
      return res.end('Accès interdit');
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        filePath = path.join(__dirname, 'index.html');
      }

      const mtime = stats ? stats.mtime.toUTCString() : '';
      const etag = stats ? `W/"${stats.size}-${stats.mtime.getTime()}"` : '';

      if (req.headers['if-none-match'] === etag || req.headers['if-modified-since'] === mtime) {
        res.writeHead(304);
        return res.end();
      }

      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(500);
          return res.end('Erreur lecture');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const isHTML = ext === '.html';

        const headers = {
          'Content-Type': contentType,
          'ETag': etag,
          'Last-Modified': mtime,
          'Cache-Control': isHTML ? 'no-cache' : 'public, max-age=604800, stale-while-revalidate=86400'
        };

        sendCompressedResponse(req, res, 200, headers, content);
      });
    });
  });

  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`💎 MON BINÔME (Connecté en Direct à Supabase Cloud 🐘)`);
    console.log(`⚡ Base de données Cloud : ${SUPABASE_URL}`);
    console.log(`🚀 Serveur en ligne sur : http://localhost:${PORT}`);
    console.log(`👑 Fondateur : souleymanediagne740@gmail.com (Alassane14)`);
    console.log(`=======================================================`);
  });
}
