/**
 * Mon Binôme - Serveur Production & Connecteur Hybride Supabase / Local
 * Fondateur & Administrateur : Souleymane Diagne (souleymanediagne740@gmail.com)
 * 
 * Tolérance aux pannes maximale :
 * - Fonctionne avec Supabase Cloud si la clé est valide
 * - Bascule automatiquement et silencieusement sur la base locale si la clé Supabase est révoquée ou invalide
 * - Zéro blocage, connexion toujours garantie pour l'administrateur et les étudiants.
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

// Configuration Supabase
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://iyhhdrbphecvarrrbsxm.supabase.co').replace(/\/+$/, '');
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

  // ================= 1. CLIENT SUPABASE CLOUD =================
  class SupabaseClient {
    constructor(baseUrl, key) {
      this.baseUrl = baseUrl;
      this.key = key;
      try {
        const parsed = url.parse(this.baseUrl);
        this.hostname = parsed.hostname;
        this.port = parsed.port || 443;
      } catch (e) {
        this.hostname = 'iyhhdrbphecvarrrbsxm.supabase.co';
        this.port = 443;
      }
    }

    request(endpoint, method = 'GET', body = null, extraHeaders = {}) {
      return new Promise((resolve) => {
        if (!this.key || this.key.length < 10) {
          return resolve({ status: 401, error: 'Clé Supabase non fournie' });
        }

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
                console.warn(`[Supabase Status ${res.statusCode}]`, parsedData?.message || parsedData || data);
                resolve({ status: res.statusCode, error: parsedData || data });
              }
            } catch (e) {
              resolve({ status: res.statusCode, data });
            }
          });
        });

        req.on('error', (err) => {
          console.warn('[Supabase Connection Error]', err.message);
          resolve({ status: 503, error: err.message });
        });
        req.setTimeout(6000, () => {
          req.destroy();
          resolve({ status: 504, error: 'Timeout Supabase' });
        });

        if (payload) req.write(payload);
        req.end();
      });
    }

    async getUserByEmail(email) {
      const clean = encodeURIComponent(email.trim().toLowerCase());
      const res = await this.request(`users?email=eq.${clean}&select=*`);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data[0];
      }
      return null;
    }

    async createUser(userObj) {
      const res = await this.request('users', 'POST', userObj, {
        'Prefer': 'return=representation'
      });
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data[0];
      }
      return null;
    }

    async updateUser(userId, fields) {
      const cleanId = encodeURIComponent(userId);
      const res = await this.request(`users?id=eq.${cleanId}`, 'PATCH', fields, {
        'Prefer': 'return=representation'
      });
      return res.data;
    }

    async deleteUser(userId) {
      const cleanId = encodeURIComponent(userId);
      await this.request(`users?id=eq.${cleanId}`, 'DELETE');
      return true;
    }

    async getAllUsers() {
      const res = await this.request('users?select=*&order=created_at.desc');
      return Array.isArray(res.data) ? res.data : null;
    }

    async getUserData(userId) {
      const cleanId = encodeURIComponent(userId);
      const res = await this.request(`user_data?user_id=eq.${cleanId}&select=*`);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data[0];
      }
      return null;
    }

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

    async getAnnouncements() {
      const res = await this.request('announcements?active=eq.true&order=created_at.desc');
      return Array.isArray(res.data) ? res.data : null;
    }

    async createAnnouncement(annObj) {
      const res = await this.request('announcements', 'POST', annObj, {
        'Prefer': 'return=representation'
      });
      return res.data;
    }
  }

  // ================= 2. GESTIONNAIRE DE DONNÉES HYBRIDE (SUPABASE + LOCAL) =================
  class HybridDatabaseManager {
    constructor(supabaseUrl, supabaseKey) {
      this.supabase = new SupabaseClient(supabaseUrl, supabaseKey);
      this.hasSupabaseKey = !!(supabaseKey && supabaseKey.length > 10);
      this.localData = {
        users: [],
        userData: {},
        announcements: [
          {
            id: 'ann_welcome_binome',
            title: 'Bienvenue sur Mon Binôme ! 🚀',
            message: 'Votre allié d\'excellence pour vos études, vos prières et votre organisation quotidienne. — Souleymane Diagne',
            author: 'Souleymane Diagne (Fondateur)',
            createdAt: new Date().toISOString(),
            active: true
          }
        ]
      };
      this.saveScheduled = false;
      this.loadLocal();
      this.initAdminLocal();
    }

    loadLocal() {
      try {
        if (fs.existsSync(DB_FILE)) {
          const raw = fs.readFileSync(DB_FILE, 'utf-8');
          this.localData = JSON.parse(raw);
        } else {
          this.flushLocal();
        }
      } catch (e) {
        console.warn('[LocalDB] Erreur chargement local, initialisation...');
      }
    }

    scheduleLocalSave() {
      if (this.saveScheduled) return;
      this.saveScheduled = true;
      setTimeout(() => {
        this.flushLocal();
        this.saveScheduled = false;
      }, 500);
    }

    flushLocal() {
      try {
        const dir = path.dirname(DB_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const tmp = `${DB_FILE}.tmp.${process.pid}`;
        fs.writeFileSync(tmp, JSON.stringify(this.localData, null, 2), 'utf-8');
        fs.renameSync(tmp, DB_FILE);
      } catch (e) {}
    }

    initAdminLocal() {
      const adminEmail = (process.env.ADMIN_EMAIL || 'souleymanediagne740@gmail.com').toLowerCase();
      let admin = this.localData.users.find((u) => u.email === adminEmail);

      if (!admin) {
        const adminPass = process.env.ADMIN_PASSWORD || 'Alassane14';
        const salt = '8e37a050f146241e172a6a61908b8b0e';
        const hash = hashPassword(adminPass, salt);

        admin = {
          id: 'usr_souleymane_admin',
          name: 'Souleymane Diagne',
          email: adminEmail,
          password_hash: hash,
          salt,
          role: 'admin',
          city: 'Dakar',
          status: 'active',
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString()
        };
        this.localData.users.unshift(admin);
        this.localData.userData[admin.id] = {
          courses: [
            { id: 'c_1', subject: 'Intelligence Artificielle', day: 1, startTime: '09:00', endTime: '11:00', room: 'Amphi Innovation', teacher: 'Prof. Diop', color: '#10b981' }
          ],
          tasks: [
            { id: 't_1', title: 'Piloter le déploiement Mon Binôme 🚀', category: 'devoir', date: new Date().toISOString().split('T')[0], time: '19:00', done: false, repeatReminder: true }
          ],
          prayers: { Fajr: '05:45', Dhuhr: '13:05', Asr: '16:25', Maghrib: '18:48', Isha: '19:58' },
          stats: { streak: 14, completedTasksCount: 42, totalTasksCount: 45 },
          settings: { prayerCity: 'Dakar', theme: 'dark', soundType: 'adhan', userName: 'Souleymane' }
        };
        this.flushLocal();
      }
    }

    // Récupérer un utilisateur par email (Supabase puis Fallback Local)
    async getUserByEmail(email) {
      const cleanEmail = email.trim().toLowerCase();
      
      if (this.hasSupabaseKey) {
        try {
          const cloudUser = await this.supabase.getUserByEmail(cleanEmail);
          if (cloudUser) return cloudUser;
        } catch (e) {
          console.warn('[Supabase -> Fallback Local]', e.message);
        }
      }

      // Fallback local
      return this.localData.users.find((u) => u.email.toLowerCase() === cleanEmail) || null;
    }

    // Créer un utilisateur (Supabase + Sauvegarde Locale garantie)
    async createUser(userObj) {
      // 1. Toujours enregistrer en local
      const localIdx = this.localData.users.findIndex((u) => u.email === userObj.email);
      if (localIdx >= 0) {
        this.localData.users[localIdx] = userObj;
      } else {
        this.localData.users.push(userObj);
      }
      this.scheduleLocalSave();

      // 2. Synchroniser sur Supabase si possible
      if (this.hasSupabaseKey) {
        try {
          const cloudUser = await this.supabase.createUser(userObj);
          if (cloudUser) return cloudUser;
        } catch (e) {
          console.warn('[Supabase CreateUser Failed, using local]', e.message);
        }
      }

      return userObj;
    }

    // Mettre à jour un utilisateur
    async updateUser(userId, fields) {
      const user = this.localData.users.find((u) => u.id === userId);
      if (user) {
        Object.assign(user, fields);
        this.scheduleLocalSave();
      }

      if (this.hasSupabaseKey) {
        this.supabase.updateUser(userId, fields).catch(() => {});
      }
      return user;
    }

    // Supprimer un utilisateur
    async deleteUser(userId) {
      this.localData.users = this.localData.users.filter((u) => u.id !== userId);
      delete this.localData.userData[userId];
      this.scheduleLocalSave();

      if (this.hasSupabaseKey) {
        this.supabase.deleteUser(userId).catch(() => {});
      }
      return true;
    }

    // Récupérer tous les utilisateurs
    async getAllUsers() {
      if (this.hasSupabaseKey) {
        try {
          const cloudList = await this.supabase.getAllUsers();
          if (cloudList && cloudList.length > 0) return cloudList;
        } catch (e) {}
      }
      return this.localData.users;
    }

    // Récupérer les données d'un étudiant
    async getUserData(userId) {
      if (this.hasSupabaseKey) {
        try {
          const cloudData = await this.supabase.getUserData(userId);
          if (cloudData) return cloudData;
        } catch (e) {}
      }
      return this.localData.userData[userId] || {};
    }

    // Sauvegarder les données d'un étudiant
    async saveUserData(userId, dataObj) {
      this.localData.userData[userId] = {
        courses: dataObj.courses || [],
        tasks: dataObj.tasks || [],
        prayers: dataObj.prayers || {},
        stats: dataObj.stats || {},
        settings: dataObj.settings || {},
        updated_at: new Date().toISOString()
      };
      this.scheduleLocalSave();

      if (this.hasSupabaseKey) {
        this.supabase.saveUserData(userId, dataObj).catch(() => {});
      }
      return true;
    }

    // Annonces
    async getAnnouncements() {
      if (this.hasSupabaseKey) {
        try {
          const cloudAnn = await this.supabase.getAnnouncements();
          if (cloudAnn && cloudAnn.length > 0) return cloudAnn;
        } catch (e) {}
      }
      return this.localData.announcements || [];
    }

    async createAnnouncement(annObj) {
      this.localData.announcements.unshift(annObj);
      this.scheduleLocalSave();

      if (this.hasSupabaseKey) {
        this.supabase.createAnnouncement(annObj).catch(() => {});
      }
      return annObj;
    }
  }

  const db = new HybridDatabaseManager(SUPABASE_URL, SUPABASE_KEY);

  // ================= 3. SÉCURITÉ CRYPTOGRAPHIQUE =================
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

  // En-têtes de Sécurité de Niveau Entreprise ($10M Security Hardening)
  const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(self), geolocation=(self)',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https://iyhhdrbphecvarrrbsxm.supabase.co https://generativelanguage.googleapis.com https:; media-src 'self' data: blob: https:; worker-src 'self' blob:; frame-ancestors 'none';"
  };

  function sanitizeInput(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  // Compression automatique Gzip
  function sendCompressedResponse(req, res, statusCode, headers, buffer) {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const finalHeaders = { ...SECURITY_HEADERS, ...headers };
    if (acceptEncoding.includes('gzip')) {
      zlib.gzip(buffer, (err, compressed) => {
        if (err) {
          res.writeHead(statusCode, finalHeaders);
          return res.end(buffer);
        }
        finalHeaders['Content-Encoding'] = 'gzip';
        finalHeaders['Content-Length'] = compressed.length;
        res.writeHead(statusCode, finalHeaders);
        res.end(compressed);
      });
    } else {
      finalHeaders['Content-Length'] = Buffer.byteLength(buffer);
      res.writeHead(statusCode, finalHeaders);
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

  // ================= 4. MIME TYPES & CACHE =================
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

  // ================= 5. ROUTEUR HTTP =================
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

    // ================= API REST =================
    if (pathname.startsWith('/api/')) {

      // Rate limit auth renforcé
      if (pathname.startsWith('/api/auth/')) {
        if (!checkRateLimit('auth_' + clientIP, 15, 60000)) {
          return sendJSON(req, res, 429, { error: 'Trop de requêtes. Veuillez patienter une minute pour votre sécurité.' });
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

          const cleanName = sanitizeInput(name);
          const cleanEmail = email.trim().toLowerCase();
          const cleanCity = sanitizeInput(city || 'Dakar');

          const existing = await db.getUserByEmail(cleanEmail);
          if (existing) {
            return sendJSON(req, res, 409, { error: 'Cet email est déjà inscrit sur Mon Binôme.' });
          }

          const salt = crypto.randomBytes(16).toString('hex');
          const hash = hashPassword(password, salt);
          const newUserObj = {
            id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: cleanName,
            email: cleanEmail,
            password_hash: hash,
            salt,
            role: 'user',
            city: cleanCity,
            status: 'active',
            created_at: new Date().toISOString(),
            last_login_at: new Date().toISOString()
          };

          const createdUser = await db.createUser(newUserObj);

          await db.saveUserData(createdUser.id, {
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
          console.error('[Register Error]', err);
          return sendJSON(req, res, 500, { error: 'Erreur lors de l\'inscription : ' + err.message });
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
          const user = await db.getUserByEmail(cleanEmail);

          if (!user || !verifyPassword(password, user.salt, user.password_hash)) {
            return sendJSON(req, res, 401, { error: 'Email ou mot de passe incorrect.' });
          }

          if (user.status === 'suspended') {
            return sendJSON(req, res, 403, { error: 'Ce compte a été suspendu par l\'administrateur.' });
          }

          db.updateUser(user.id, { last_login_at: new Date().toISOString() }).catch(() => {});

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
          console.error('[Login Error]', err);
          return sendJSON(req, res, 500, { error: 'Erreur de connexion : ' + err.message });
        }
      }

      // GET /api/auth/me
      if (pathname === '/api/auth/me' && method === 'GET') {
        const authUser = authenticate(req);
        if (!authUser) return sendJSON(req, res, 401, { error: 'Non authentifié' });

        const user = await db.getUserByEmail(authUser.email);
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

        const dataRecord = await db.getUserData(authUser.id);
        return sendJSON(req, res, 200, { success: true, data: dataRecord || {} });
      }

      // POST /api/user/sync
      if (pathname === '/api/user/sync' && method === 'POST') {
        const authUser = authenticate(req);
        if (!authUser) return sendJSON(req, res, 401, { error: 'Non authentifié' });

        try {
          const body = await parseJSONBody(req);
          await db.saveUserData(authUser.id, body);
          return sendJSON(req, res, 200, { success: true, message: 'Données synchronisées' });
        } catch (err) {
          return sendJSON(req, res, 500, { error: err.message });
        }
      }

      // GET /api/ai/models (Découverte dynamique des modèles supportés)
      if (pathname === '/api/ai/models' && method === 'GET') {
        const rawKey = process.env.GEMINI_API_KEY || '';
        const apiKey = typeof rawKey === 'string' ? rawKey.trim().replace(/^["']|["']$/g, '') : '';
        if (!apiKey) return sendJSON(req, res, 200, { success: false, message: 'Aucune clé GEMINI_API_KEY sur le serveur' });

        https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, (gRes) => {
          let str = '';
          gRes.on('data', chunk => str += chunk);
          gRes.on('end', () => {
            try {
              const parsed = JSON.parse(str);
              return sendJSON(req, res, 200, parsed);
            } catch (e) {
              return sendJSON(req, res, 200, { error: e.message, raw: str });
            }
          });
        }).on('error', err => sendJSON(req, res, 500, { error: err.message }));
        return;
      }

      // POST /api/ai/chat (Proxy IA Conversationnel Gemini 1.5/2.0 Flash & Moteur d'Élite)
      if (pathname === '/api/ai/chat' && method === 'POST') {
        try {
          const body = await parseJSONBody(req);
          const { message, context, attachment, history, clientApiKey } = body;
          const rawKey = clientApiKey || process.env.GEMINI_API_KEY || '';
          const apiKey = typeof rawKey === 'string' ? rawKey.trim().replace(/^["']|["']$/g, '') : '';

          if (!apiKey) {
            console.warn('[AI Chat] Aucune clé Gemini active sur le serveur Render.');
            return sendJSON(req, res, 200, { success: false, useLocal: true, message: 'Aucune clé Gemini active sur le serveur.' });
          }

          const systemPrompt = `Tu es « Mon Binôme », l'assistant d'élite interactif et le compagnon académique personnel des étudiants conçu par Souleymane Diagne.
Tu es aussi fluide, naturel, bienveillant, chaleureux et intelligent que ChatGPT ou Gemini.
Tes caractéristiques :
1. Interaction naturelle et conversationnelle : réponds spontanément et chaleureusement aux salutations (« salut », « cv », « comment vas-tu », etc.), montre de l'empathie, encourage et engage le dialogue.
2. Pédagogie et excellence : réponds clairement et rigoureusement à toutes les questions de cours (mathématiques, sciences, littérature, droit, économie, informatique, etc.).
3. Exploitation et résumé approfondi de cours et de documents joints (PDF, notes, synthèses). Structure ta réponse : Sujet central, Définitions et Théorèmes clés, Résumé méthodique, et 3 Questions de quiz d'évaluation.
4. Programmation et création complète de sites web et applications modernes (HTML5, Tailwind CSS, JavaScript, Python, SQL, etc.). Fournis toujours le code complet, prêt à l'emploi et fonctionnel avec explications claires.
5. Diagnostic et résolution experte de bugs : trouve la cause racine, donne le code corrigé complet et les étapes de validation.
6. Équilibre et motivation : tiens compte de ses cours et de ses heures de prière pour organiser ses révisions.
Informations contextuelles en direct :
${context || ''}`;

          let currentMsgText = (message || '').trim();
          if (attachment && attachment.content) {
            currentMsgText += `\n\n[Contenu du document joint : ${attachment.name}] :\n${attachment.content.substring(0, 30000)}`;
          }
          if (!currentMsgText) currentMsgText = 'Bonjour !';

          // Construction rigoureuse de l'historique Gemini (user <-> model strict)
          const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
          if (recentHistory.length > 0) {
            const last = recentHistory[recentHistory.length - 1];
            if (last.role === 'user' && last.content && last.content.trim() === (message || '').trim()) {
              recentHistory.pop();
            }
          }

          let startIdx = 0;
          while (startIdx < recentHistory.length && recentHistory[startIdx].role !== 'user') {
            startIdx++;
          }

          const contents = [];
          let expectedRole = 'user';

          for (let i = startIdx; i < recentHistory.length; i++) {
            const item = recentHistory[i];
            const itemRole = (item.role === 'assistant' || item.role === 'model') ? 'model' : 'user';
            const text = (item.content || '').trim();
            if (!text) continue;

            if (itemRole === expectedRole) {
              contents.push({
                role: itemRole,
                parts: [{ text }]
              });
              expectedRole = expectedRole === 'user' ? 'model' : 'user';
            }
          }

          if (expectedRole === 'user') {
            contents.push({
              role: 'user',
              parts: [{ text: currentMsgText }]
            });
          } else {
            if (contents.length > 0) {
              contents[contents.length - 1].parts[0].text += `\n\n${currentMsgText}`;
            } else {
              contents.push({
                role: 'user',
                parts: [{ text: currentMsgText }]
              });
            }
          }

          // Payload standard Google Gemini v1beta
          const payloadObj = {
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            contents,
            generationConfig: {
              temperature: 0.75,
              maxOutputTokens: 2048
            }
          };

          const payload = JSON.stringify(payloadObj);

          // Modèles Gemini officiels à tester par ordre de priorité
          const candidateModels = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro'];
          let finalReply = null;
          let lastError = null;

          for (const model of candidateModels) {
            try {
              const resData = await new Promise((resolve, reject) => {
                const geminiReq = https.request({
                  hostname: 'generativelanguage.googleapis.com',
                  port: 443,
                  path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                  }
                }, (geminiRes) => {
                  let str = '';
                  geminiRes.on('data', (chk) => str += chk);
                  geminiRes.on('end', () => resolve({ statusCode: geminiRes.statusCode, data: str }));
                });

                geminiReq.on('error', (err) => reject(err));
                geminiReq.setTimeout(12000, () => {
                  geminiReq.destroy();
                  reject(new Error('Timeout Gemini API'));
                });
                geminiReq.write(payload);
                geminiReq.end();
              });

              const parsed = JSON.parse(resData.data);
              const replyText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (replyText) {
                console.log(`[Gemini API] Succès avec le modèle ${model}`);
                finalReply = replyText;
                break;
              } else {
                lastError = parsed.error?.message || `Status ${resData.statusCode}`;
                console.warn(`[Gemini API] Modèle ${model} échoué : ${lastError}`);
              }
            } catch (err) {
              lastError = err.message;
              console.warn(`[Gemini API] Erreur appel modèle ${model} : ${err.message}`);
            }
          }

          if (finalReply) {
            return sendJSON(req, res, 200, { success: true, text: finalReply });
          }

          return sendJSON(req, res, 200, {
            success: false,
            useLocal: true,
            error: lastError || 'Erreur inconnue de génération Gemini'
          });

        } catch (err) {
          console.error('[AI Chat] Erreur serveur :', err);
          return sendJSON(req, res, 500, { error: err.message });
        }
      }

      // GET /api/announcements
      if (pathname === '/api/announcements' && method === 'GET') {
        const announcements = await db.getAnnouncements();
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
          const users = await db.getAllUsers();
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
            const d = db.localData.userData[u.id];
            if (d) {
              if (Array.isArray(d.courses)) totalCourses += d.courses.length;
              if (d.stats && d.stats.completedTasksCount) totalTasksDone += d.stats.completedTasksCount;
              if (d.stats && d.stats.streak) totalStreaks += d.stats.streak;
            }
          });

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
          const users = await db.getAllUsers();
          const usersList = users.map((u) => {
            const data = db.localData.userData[u.id] || {};
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
          await db.updateUser(userId, { status: newStatus });
          return sendJSON(req, res, 200, { success: true });
        }

        // POST /api/admin/users/:id/role
        if (pathname.match(/^\/api\/admin\/users\/[^/]+\/role$/) && method === 'POST') {
          const userId = pathname.split('/')[4];
          const body = await parseJSONBody(req);
          if (userId === authUser.id) return sendJSON(req, res, 400, { error: 'Action interdite sur le compte fondateur.' });

          const newRole = body.role === 'admin' ? 'admin' : 'user';
          await db.updateUser(userId, { role: newRole });
          return sendJSON(req, res, 200, { success: true });
        }

        // DELETE /api/admin/users/:id
        if (pathname.match(/^\/api\/admin\/users\/[^/]+$/) && method === 'DELETE') {
          const userId = pathname.split('/')[4];
          if (userId === authUser.id) return sendJSON(req, res, 400, { error: 'Impossible de supprimer le compte fondateur.' });

          await db.deleteUser(userId);
          return sendJSON(req, res, 200, { success: true, message: 'Compte supprimé.' });
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

          await db.createAnnouncement(newAnn);
          return sendJSON(req, res, 201, { success: true, announcement: newAnn });
        }
      }

      return sendJSON(req, res, 404, { error: 'Point de terminaison introuvable' });
    }

    // ================= 6. DISTRIBUTION DES FICHIERS STATIQUES =================
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403);
      return res.end('Accès interdit');
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        const reqExt = path.extname(pathname).toLowerCase();
        if (reqExt && reqExt !== '.html') {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Fichier introuvable');
        }
        filePath = path.join(__dirname, 'index.html');
        return fs.readFile(filePath, (htmlErr, htmlContent) => {
          if (htmlErr) {
            res.writeHead(404);
            return res.end('Page non trouvée');
          }
          sendCompressedResponse(req, res, 200, {
            ...SECURITY_HEADERS,
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache'
          }, htmlContent);
        });
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

        if (['.png', '.jpg', '.jpeg', '.webp', '.ico', '.svg'].includes(ext)) {
          const imgHeaders = {
            ...SECURITY_HEADERS,
            'Content-Type': contentType,
            'Content-Length': content.length,
            'ETag': etag,
            'Last-Modified': mtime,
            'Cache-Control': 'public, max-age=604800'
          };
          res.writeHead(200, imgHeaders);
          return res.end(content);
        }

        const headers = {
          'Content-Type': contentType,
          'ETag': etag,
          'Last-Modified': mtime,
          'Cache-Control': isHTML ? 'no-cache, no-store, must-revalidate' : 'public, max-age=604800, stale-while-revalidate=86400',
          ...(isHTML ? { 'Pragma': 'no-cache', 'Expires': '0' } : {})
        };

        sendCompressedResponse(req, res, 200, headers, content);
      });
    });
  });

  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`💎 MON BINÔME (Architecture Hybride Tolérante aux Pannes)`);
    console.log(`⚡ Supabase Cloud : ${SUPABASE_URL} (Clé configurée: ${db.hasSupabaseKey ? 'OUI' : 'NON'})`);
    console.log(`🚀 Serveur en ligne sur : http://localhost:${PORT}`);
    console.log(`👑 Fondateur : souleymanediagne740@gmail.com (Alassane14)`);
    console.log(`=======================================================`);
  });
}
