/**
 * Sama Kharite - Gestion de l'Authentification & Rôles
 */

const AUTH_KEYS = {
  TOKEN: 'sk_auth_token_v1',
  USER: 'sk_auth_user_v1'
};

class AuthManager {
  constructor() {
    this.token = localStorage.getItem(AUTH_KEYS.TOKEN) || null;
    this.user = null;
    const cachedUser = localStorage.getItem(AUTH_KEYS.USER);
    if (cachedUser) {
      try {
        this.user = JSON.parse(cachedUser);
      } catch (e) {}
    }
  }

  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  isAdmin() {
    return this.isAuthenticated() && this.user.role === 'admin';
  }

  getUser() {
    return this.user;
  }

  getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async login(email, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Identifiants invalides');

      this.token = data.token;
      this.user = data.user;
      localStorage.setItem(AUTH_KEYS.TOKEN, this.token);
      localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(this.user));

      // Synchroniser les données depuis le serveur
      await this.pullCloudData();

      return { success: true, user: this.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async register(name, email, password, city = 'Dakar') {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, city })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'inscription');

      this.token = data.token;
      this.user = data.user;
      localStorage.setItem(AUTH_KEYS.TOKEN, this.token);
      localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(this.user));

      // Envoyer les données locales initiales vers le Cloud
      await this.pushCloudData();

      return { success: true, user: this.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem(AUTH_KEYS.TOKEN);
    localStorage.removeItem(AUTH_KEYS.USER);
    window.location.reload();
  }

  // Télécharger les données de l'utilisateur depuis le Cloud
  async pullCloudData() {
    if (!this.isAuthenticated()) return;
    try {
      const res = await fetch('/api/user/sync', {
        headers: this.getAuthHeaders()
      });
      if (res.ok) {
        const result = await res.json();
        if (result.data) {
          const { courses, tasks, prayers, stats, settings } = result.data;
          if (courses && courses.length > 0) window.appStorage.saveCourses(courses);
          if (tasks && tasks.length > 0) window.appStorage.saveTasks(tasks);
          if (prayers && prayers.Fajr) window.appStorage.savePrayers(prayers);
          if (stats && stats.streak) window.appStorage.saveStats(stats);
          if (settings) window.appStorage.saveSettings({ ...window.appStorage.getSettings(), ...settings });
        }
      }
    } catch (err) {
      console.warn('[Sync] Impossible de récupérer les données cloud:', err);
    }
  }

  // Sauvegarder les données locales de l'utilisateur vers le Cloud
  async pushCloudData() {
    if (!this.isAuthenticated()) return;
    try {
      const payload = {
        courses: window.appStorage.getCourses(),
        tasks: window.appStorage.getTasks(),
        prayers: window.appStorage.getPrayers(),
        stats: window.appStorage.getStats(),
        settings: window.appStorage.getSettings()
      };
      await fetch('/api/user/sync', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('[Sync] Impossible d\'envoyer vers le Cloud:', err);
    }
  }
}

window.authManager = new AuthManager();
