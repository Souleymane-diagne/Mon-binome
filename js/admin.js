/**
 * Sama Kharite - Panneau d'Administration
 * Réservé exclusivement au propriétaire du site (rôle 'admin')
 */

class AdminManager {
  constructor() {
    this.overviewData = null;
    this.users = [];
    this.searchQuery = '';
    this.roleFilter = 'all';
  }

  async loadOverview() {
    if (!window.authManager || !window.authManager.isAdmin()) return;

    try {
      const res = await fetch('/api/admin/overview', {
        headers: window.authManager.getAuthHeaders()
      });
      if (res.ok) {
        this.overviewData = await res.json();
        this.renderOverview();
      }
    } catch (err) {
      console.error('[Admin] Erreur chargement vue d\'ensemble:', err);
    }
  }

  async loadUsers() {
    if (!window.authManager || !window.authManager.isAdmin()) return;

    try {
      const res = await fetch('/api/admin/users', {
        headers: window.authManager.getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        this.users = data.users || [];
        this.renderUsers();
      }
    } catch (err) {
      console.error('[Admin] Erreur chargement utilisateurs:', err);
    }
  }

  renderOverview() {
    const data = this.overviewData;
    if (!data) return;

    // KPI Cards
    const kpiEl = document.getElementById('admin-kpi-container');
    if (kpiEl) {
      kpiEl.innerHTML = `
        <div class="grid grid-cols-2 gap-3">
          <!-- Total Utilisateurs -->
          <div class="glass-card p-4">
            <div class="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Étudiants Inscrits</span>
              <span class="text-emerald-400 text-sm">👥</span>
            </div>
            <div class="text-3xl font-black text-white mt-1.5">${data.totalUsers}</div>
            <div class="text-[11px] text-emerald-400 font-semibold mt-1">
              ⚡ ${data.activeToday} actif(s) aujourd'hui
            </div>
          </div>

          <!-- Total Tâches faites -->
          <div class="glass-card p-4">
            <div class="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Tâches Validées</span>
              <span class="text-amber-400 text-sm">🎉</span>
            </div>
            <div class="text-3xl font-black text-white mt-1.5">${data.totalTasksDone}</div>
            <div class="text-[11px] text-amber-400 font-semibold mt-1">
              🔥 Moyenne série : ${data.avgStreak} j
            </div>
          </div>

          <!-- Total Cours enregistrés -->
          <div class="glass-card p-4">
            <div class="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Cours Planifiés</span>
              <span class="text-cyan-400 text-sm">📚</span>
            </div>
            <div class="text-3xl font-black text-white mt-1.5">${data.totalCourses}</div>
            <div class="text-[11px] text-slate-400 mt-1">Modules suivis</div>
          </div>

          <!-- État du Serveur -->
          <div class="glass-card p-4">
            <div class="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Infrastructure</span>
              <span class="text-emerald-400 text-xs font-bold">🟢 En ligne</span>
            </div>
            <div class="text-xl font-black text-white mt-1.5">${data.memoryUsageMB} Mo RAM</div>
            <div class="text-[11px] text-slate-400 mt-1">Node ${data.nodeVersion} • Uptime ${Math.floor(data.uptimeSeconds / 60)} min</div>
          </div>
        </div>

        <!-- Répartition par ville -->
        <div class="mt-3 glass-card p-4">
          <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">🌍 Répartition géographique des étudiants</div>
          <div class="flex flex-wrap gap-2">
            ${Object.entries(data.cityDistribution || {}).map(([city, count]) => `
              <span class="px-3 py-1.5 rounded-xl bg-slate-800/80 text-xs font-semibold text-slate-200 border border-slate-700/60 shadow-sm flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>${city}</span> : <b class="text-white">${count}</b>
              </span>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  renderUsers() {
    const container = document.getElementById('admin-users-table-body');
    if (!container) return;

    let filtered = this.users.filter((u) => {
      const matchSearch = u.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                          u.city.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchRole = this.roleFilter === 'all' || u.role === this.roleFilter;
      return matchSearch && matchRole;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-slate-400 text-sm">
          Aucun utilisateur ne correspond à votre recherche.
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map((u) => {
      const isSelf = window.authManager.getUser()?.id === u.id;
      const isAdminRole = u.role === 'admin';
      const isSuspended = u.status === 'suspended';

      return `
        <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-tr ${isAdminRole ? 'from-amber-500 to-yellow-400 text-amber-950 font-black' : 'from-emerald-600 to-teal-500 text-white font-bold'} flex items-center justify-center text-sm shadow">
                ${isAdminRole ? '👑' : u.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  ${u.name}
                  ${isAdminRole ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-extrabold uppercase">Admin</span>' : ''}
                  ${isSuspended ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-500 font-bold uppercase">Suspendu</span>' : ''}
                </div>
                <div class="text-xs text-slate-500 dark:text-slate-400">${u.email}</div>
              </div>
            </div>

            <div class="text-right text-[11px] text-slate-400">
              <div>📍 ${u.city}</div>
              <div>Inscrit le ${new Date(u.createdAt).toLocaleDateString('fr-FR')}</div>
            </div>
          </div>

          <!-- Métriques utilisateur -->
          <div class="grid grid-cols-3 gap-1 py-1.5 px-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center text-xs">
            <div>
              <span class="text-slate-400 block text-[10px]">Cours</span>
              <span class="font-bold text-slate-800 dark:text-slate-100">${u.coursesCount} 📚</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px]">Tâches faites</span>
              <span class="font-bold text-emerald-500">${u.tasksDone} ✅</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px]">Série</span>
              <span class="font-bold text-amber-500">${u.streak} j 🔥</span>
            </div>
          </div>

          <!-- Actions administrateur -->
          ${!isSelf ? `
            <div class="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <!-- Activer / Suspendre -->
              <button onclick="window.adminManager.toggleUserStatus('${u.id}', '${isSuspended ? 'active' : 'suspended'}')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition touch-btn ${isSuspended ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white' : 'bg-amber-500/15 text-amber-500 hover:bg-amber-500 hover:text-white'}">
                ${isSuspended ? 'Réactiver' : 'Suspendre'}
              </button>

              <!-- Changer rôle -->
              <button onclick="window.adminManager.toggleUserRole('${u.id}', '${isAdminRole ? 'user' : 'admin'}')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 touch-btn">
                ${isAdminRole ? 'Rétrograder Étudiant' : 'Nommer Admin 👑'}
              </button>

              <!-- Supprimer -->
              <button onclick="window.adminManager.deleteUser('${u.id}', '${u.name.replace(/'/g, "\\'")}')" class="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg touch-btn" title="Supprimer">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          ` : `
            <div class="text-[11px] text-right text-emerald-500 font-semibold pt-1">
              ✨ C'est votre compte administrateur actuel
            </div>
          `}
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  async toggleUserStatus(userId, newStatus) {
    if (!confirm(`Confirmer la modification du statut en : ${newStatus} ?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: window.authManager.getAuthHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        await this.loadUsers();
        await this.loadOverview();
      }
    } catch (e) {
      alert('Erreur modification statut : ' + e.message);
    }
  }

  async toggleUserRole(userId, newRole) {
    if (!confirm(`Confirmer le changement de rôle vers : ${newRole} ?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: window.authManager.getAuthHeaders(),
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        await this.loadUsers();
      }
    } catch (e) {
      alert('Erreur modification rôle : ' + e.message);
    }
  }

  async deleteUser(userId, userName) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de ${userName} ? Cette action est irréversible.`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: window.authManager.getAuthHeaders()
      });
      if (res.ok) {
        await this.loadUsers();
        await this.loadOverview();
      }
    } catch (e) {
      alert('Erreur suppression : ' + e.message);
    }
  }

  async sendBroadcast() {
    const titleInput = document.getElementById('admin-broadcast-title');
    const msgInput = document.getElementById('admin-broadcast-msg');
    if (!titleInput || !msgInput) return;

    const title = titleInput.value.trim();
    const message = msgInput.value.trim();
    if (!title || !message) {
      alert('Veuillez remplir le titre et le message de l\'annonce.');
      return;
    }

    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: window.authManager.getAuthHeaders(),
        body: JSON.stringify({ title, message })
      });
      if (res.ok) {
        alert('🎉 Annonce diffusée avec succès à tous les utilisateurs !');
        titleInput.value = '';
        msgInput.value = '';
      }
    } catch (e) {
      alert('Erreur diffusion annonce : ' + e.message);
    }
  }
}

window.adminManager = new AdminManager();
