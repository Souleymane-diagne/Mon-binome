/**
 * Mon Assistant - Contrôleur Principal & Interface Utilisateur
 */

class AppController {
  constructor() {
    this.currentTab = 'home'; // 'home' | 'schedule' | 'tasks' | 'ai' | 'settings'
    this.scheduleSubTab = 'today'; // 'today' | 'week'
    this.selectedWeekDay = new Date().getDay(); // Jour affiché dans le planning semaine
    this.taskFilter = 'pending'; // 'pending' | 'all' | 'done'
    this.currentAttachment = null;
  }

  init() {
    this.applyTheme();
    this.bindEvents();
    this.checkAuthUI();
    this.renderCurrentTab();
    this.checkOnboarding();
    this.initPrayerTimes();
    this.fetchAnnouncements();

    // Actualisation de l'affichage toutes les 30 secondes pour les comptes à rebours
    setInterval(() => {
      if (this.currentTab === 'home') {
        this.renderHomeUpcoming();
      }
    }, 30000);

    // Initialiser les icônes Lucide
    if (window.lucide) window.lucide.createIcons();
  }

  applyTheme() {
    const settings = window.appStorage.getSettings();
    if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('bg-slate-950', 'text-slate-100');
      document.body.classList.add('bg-slate-50', 'text-slate-800');
    } else {
      document.documentElement.classList.add('dark');
      document.body.classList.add('bg-slate-950', 'text-slate-100');
      document.body.classList.remove('bg-slate-50', 'text-slate-800');
    }
  }

  toggleTheme() {
    const settings = window.appStorage.getSettings();
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    window.appStorage.saveSettings(settings);
    this.applyTheme();
    this.renderCurrentTab();
  }

  async initPrayerTimes() {
    const settings = window.appStorage.getSettings();
    if (settings.prayerAutoMode) {
      await window.prayerService.fetchPrayerTimes(settings.prayerCity || 'Dakar', settings.prayerCountry || 'Senegal');
      if (this.currentTab === 'home') this.renderHomeUpcoming();
    }
  }

  switchTab(tabId) {
    this.currentTab = tabId;
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      const active = btn.dataset.tab === tabId;
      btn.classList.toggle('text-emerald-500', active);
      btn.classList.toggle('text-slate-400', !active);
      btn.classList.toggle('font-bold', active);
    });

    // Mettre à jour les sections
    document.querySelectorAll('.app-page').forEach((page) => {
      page.classList.add('hidden');
    });
    const targetPage = document.getElementById(`page-${tabId}`);
    if (targetPage) targetPage.classList.remove('hidden');

    this.renderCurrentTab();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderCurrentTab() {
    if (this.currentTab === 'home') this.renderHome();
    else if (this.currentTab === 'schedule') this.renderSchedule();
    else if (this.currentTab === 'tasks') this.renderTasks();
    else if (this.currentTab === 'ai') this.renderAI();
    else if (this.currentTab === 'settings') this.renderSettings();
    else if (this.currentTab === 'admin') this.renderAdmin();

    if (window.lucide) window.lucide.createIcons();
  }

  renderAdmin() {
    if (!window.authManager || !window.authManager.isAdmin()) {
      this.switchTab('home');
      return;
    }
    if (window.adminManager) {
      window.adminManager.loadOverview();
      window.adminManager.loadUsers();
    }
  }

  /* ---------------- 1. PAGE ACCUEIL ---------------- */
  renderHome() {
    const settings = window.appStorage.getSettings();
    const stats = window.taskManager.getStatsSummary();

    const greetingEl = document.getElementById('home-greeting');
    if (greetingEl) {
      const hours = new Date().getHours();
      const timeGreet = hours < 12 ? 'Bonjour' : (hours < 18 ? 'Bon après-midi' : 'Bonsoir');
      greetingEl.textContent = `${timeGreet}, ${settings.userName || 'Étudiant'} 👋`;
    }

    const dateEl = document.getElementById('home-date');
    if (dateEl) {
      const options = { weekday: 'long', day: 'numeric', month: 'long' };
      dateEl.textContent = new Date().toLocaleDateString('fr-FR', options);
    }

    const streakEl = document.getElementById('home-streak-badge');
    if (streakEl) {
      streakEl.textContent = `${stats.streak} j 🔥`;
    }

    this.renderHomeUpcoming();
    this.renderHomeTasks();
  }

  renderHomeUpcoming() {
    // Prochain cours
    const nextCourseInfo = window.courseManager.getNextCourse();
    const courseCard = document.getElementById('home-next-course-card');
    if (courseCard) {
      if (nextCourseInfo) {
        const c = nextCourseInfo.course;
        courseCard.innerHTML = `
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md" style="background: linear-gradient(135deg, ${c.color}, #06b6d4)">
                📚
              </div>
              <div>
                <h3 class="font-extrabold text-base text-white leading-tight">${c.subject}</h3>
                <p class="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span>⏰ ${c.startTime} - ${c.endTime}</span>
                  <span>•</span>
                  <span>📍 Salle ${c.room || 'N/A'}</span>
                </p>
              </div>
            </div>
            <span class="text-[11px] px-3 py-1 rounded-full font-black tracking-wide ${nextCourseInfo.status === 'ongoing' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}">
              ${nextCourseInfo.label}
            </span>
          </div>
          ${c.teacher ? `
            <div class="text-xs text-slate-400 mt-3 pt-2.5 border-t border-white/5 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">👨‍🏫</span>
              <span>Professeur : <b class="text-slate-200">${c.teacher}</b></span>
            </div>
          ` : ''}
        `;
      } else {
        courseCard.innerHTML = `
          <div class="text-center py-4 text-slate-400 text-xs">
            ✨ Aucun cours restant aujourd'hui. Profitez-en pour réviser ou vous reposer !
          </div>
        `;
      }
    }

    // Prochaine prière (Design d'élite avec visuel architecture)
    const prayers = window.appStorage.getPrayers();
    const nextPrayer = window.prayerService.getNextPrayer(prayers);
    const prayerCard = document.getElementById('home-next-prayer-card');
    const settings = window.appStorage.getSettings();
    const stats = window.appStorage.getStats();

    if (prayerCard) {
      const prayerNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
      const prayerDots = prayerNames.map((p) => {
        const isDone = stats.prayersToday && stats.prayersToday[p];
        const isCurrent = nextPrayer.name === p;
        return `
          <button onclick="window.appController.togglePrayerDone('${p}')" class="flex flex-col items-center py-2 px-1 rounded-2xl transition touch-btn ${isDone ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : (isCurrent ? 'bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/40 glow-gold' : 'bg-slate-900/60 text-slate-400 border border-white/5 hover:border-white/20')}">
            <span class="text-[11px] font-bold tracking-tight">${p}</span>
            <span class="text-[10px] opacity-80 mt-0.5">${prayers[p] || '--:--'}</span>
            <span class="text-sm mt-1">${isDone ? '✅' : (isCurrent ? '🕌' : '⚪')}</span>
          </button>
        `;
      }).join('');

      prayerCard.innerHTML = `
        <div class="flex items-center justify-between pb-3 border-b border-white/10">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-xl shadow-lg shadow-amber-500/20">
              🕌
            </div>
            <div>
              <div class="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1">
                <span>Horaires de Prière</span> • <span>${settings.prayerCity || 'Dakar'}</span>
              </div>
              <div class="font-black text-white text-base leading-tight mt-0.5">
                ${nextPrayer.name} à <span class="text-amber-300">${nextPrayer.time}</span>
              </div>
            </div>
          </div>
          <div class="text-right">
            <span class="text-[11px] px-3 py-1 rounded-full font-black bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30">
              ${nextPrayer.remainingStr}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-5 gap-1.5 pt-1">
          ${prayerDots}
        </div>
      `;
    }

    if (window.lucide) window.lucide.createIcons();
  }

  togglePrayerDone(prayerName) {
    window.prayerService.togglePrayerDone(prayerName);
    this.renderHomeUpcoming();
  }

  renderHomeTasks() {
    const listEl = document.getElementById('home-tasks-list');
    if (!listEl) return;

    const todayTasks = window.taskManager.getTodayTasks().filter((t) => !t.done);
    if (todayTasks.length === 0) {
      listEl.innerHTML = `
        <div class="p-5 text-center rounded-2xl glass-card text-slate-400 text-xs">
          🎉 Toutes vos tâches du jour sont accomplies avec succès !
        </div>
      `;
      return;
    }

    listEl.innerHTML = todayTasks.slice(0, 3).map((t) => `
      <div class="p-3.5 rounded-2xl glass-card flex items-center justify-between gap-3 shadow-md">
        <div class="flex-1 min-w-0">
          <div class="font-bold text-sm text-white truncate">${t.title}</div>
          <div class="text-xs text-slate-400 flex items-center gap-2 mt-1">
            <span class="text-amber-400 font-semibold">⏰ ${t.time || '18:00'}</span>
            <span>•</span>
            <span class="px-2 py-0.5 rounded-md text-[10px] uppercase font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">${t.category}</span>
          </div>
        </div>
        <button onclick="window.appController.checkTask('${t.id}')" class="touch-btn px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md shadow-emerald-500/20">
          Fait ✅
        </button>
      </div>
    `).join('');
  }

  /* ---------------- 2. PAGE PLANNING (COURS) ---------------- */
  renderSchedule() {
    const todayBtn = document.getElementById('sched-tab-today');
    const weekBtn = document.getElementById('sched-tab-week');
    const isToday = this.scheduleSubTab === 'today';

    if (todayBtn && weekBtn) {
      todayBtn.classList.toggle('bg-emerald-500', isToday);
      todayBtn.classList.toggle('text-white', isToday);
      todayBtn.classList.toggle('text-slate-600', !isToday);
      todayBtn.classList.toggle('dark:text-slate-400', !isToday);

      weekBtn.classList.toggle('bg-emerald-500', !isToday);
      weekBtn.classList.toggle('text-white', !isToday);
      weekBtn.classList.toggle('text-slate-600', isToday);
      weekBtn.classList.toggle('dark:text-slate-400', isToday);
    }

    const container = document.getElementById('schedule-courses-container');
    if (!container) return;

    if (isToday) {
      this.renderScheduleToday(container);
    } else {
      this.renderScheduleWeek(container);
    }

    if (window.lucide) window.lucide.createIcons();
  }

  setScheduleSubTab(tab) {
    this.scheduleSubTab = tab;
    this.renderSchedule();
  }

  renderScheduleToday(container) {
    const currentDay = new Date().getDay();
    const dayName = DAYS_FR[currentDay];
    const courses = window.courseManager.getTodayCourses();
    const settings = window.appStorage.getSettings();

    let html = `
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-xl font-black text-slate-900 dark:text-white">${dayName}</h2>
          <p class="text-xs text-slate-500">${courses.length} cours prévu(s) aujourd'hui • Rappel ${settings.courseReminderMinutes}m avant</p>
        </div>
      </div>
    `;

    if (courses.length === 0) {
      html += `
        <div class="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500">
          <div class="text-4xl mb-2">🏖️</div>
          <div class="font-bold text-base text-slate-800 dark:text-white">Aucun cours aujourd'hui !</div>
          <p class="text-xs text-slate-400 mt-1">Profitez de votre journée libre ou ajoutez un cours avec le bouton ci-dessous.</p>
        </div>
      `;
    } else {
      html += `<div class="space-y-3">`;
      courses.forEach((c) => {
        html += `
          <div class="p-4 rounded-2xl glass-card flex items-start justify-between gap-3 relative overflow-hidden">
            <div class="absolute left-0 top-0 bottom-0 w-2" style="background-color: ${c.color}"></div>
            <div class="pl-2 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-black px-2.5 py-0.5 rounded-full text-slate-950" style="background-color: ${c.color}">
                  ${c.startTime} - ${c.endTime}
                </span>
                <span class="text-xs text-slate-300 font-bold">📍 Salle ${c.room || 'Non définie'}</span>
              </div>
              <h3 class="font-extrabold text-base text-white mt-2 leading-snug">${c.subject}</h3>
              ${c.teacher ? `<p class="text-xs text-slate-400 mt-1 flex items-center gap-1.5"><span class="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">👨‍🏫</span> ${c.teacher}</p>` : ''}
            </div>
            <div class="flex items-center gap-1">
              <button onclick="window.appController.openEditCourseModal('${c.id}')" class="p-2 text-slate-400 hover:text-emerald-400 touch-btn">
                <i data-lucide="pencil" class="w-4 h-4"></i>
              </button>
              <button onclick="window.appController.deleteCourse('${c.id}')" class="p-2 text-slate-400 hover:text-rose-400 touch-btn">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    container.innerHTML = html;
  }

  renderScheduleWeek(container) {
    const daysSelector = DAYS_SHORT_FR.map((dShort, idx) => {
      // Masquer le dimanche si aucun cours le dimanche
      const count = window.courseManager.getCoursesForDay(idx).length;
      const isSelected = this.selectedWeekDay === idx;
      return `
        <button onclick="window.appController.selectWeekDay(${idx})" class="flex-1 py-2 px-1 rounded-xl text-center transition touch-btn ${isSelected ? 'bg-emerald-500 text-white font-bold shadow' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}">
          <div class="text-xs">${dShort}</div>
          <div class="text-[10px] opacity-75 mt-0.5">${count} cours</div>
        </button>
      `;
    }).join('');

    const currentDayCourses = window.courseManager.getCoursesForDay(this.selectedWeekDay);
    const dayName = DAYS_FR[this.selectedWeekDay];

    let html = `
      <div class="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        ${daysSelector}
      </div>
      <div class="mb-3 flex items-center justify-between">
        <h3 class="font-bold text-slate-800 dark:text-white text-base">${dayName} (${currentDayCourses.length} cours)</h3>
      </div>
    `;

    if (currentDayCourses.length === 0) {
      html += `
        <div class="p-6 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500 text-sm">
          Aucun cours enregistré pour le ${dayName}.
        </div>
      `;
    } else {
      html += `<div class="space-y-3">`;
      currentDayCourses.forEach((c) => {
        html += `
          <div class="p-4 rounded-2xl glass-card flex items-start justify-between gap-3 relative overflow-hidden">
            <div class="absolute left-0 top-0 bottom-0 w-2" style="background-color: ${c.color}"></div>
            <div class="pl-2 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-black px-2.5 py-0.5 rounded-full text-slate-950" style="background-color: ${c.color}">
                  ${c.startTime} - ${c.endTime}
                </span>
                <span class="text-xs text-slate-300 font-bold">📍 Salle ${c.room || 'N/A'}</span>
              </div>
              <h4 class="font-extrabold text-base text-white mt-2">${c.subject}</h4>
              ${c.teacher ? `<p class="text-xs text-slate-400 mt-1 flex items-center gap-1.5"><span class="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">👨‍🏫</span> ${c.teacher}</p>` : ''}
            </div>
            <div class="flex items-center gap-1">
              <button onclick="window.appController.openEditCourseModal('${c.id}')" class="p-2 text-slate-400 hover:text-emerald-400 touch-btn">
                <i data-lucide="pencil" class="w-4 h-4"></i>
              </button>
              <button onclick="window.appController.deleteCourse('${c.id}')" class="p-2 text-slate-400 hover:text-rose-400 touch-btn">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    container.innerHTML = html;
  }

  selectWeekDay(dayIdx) {
    this.selectedWeekDay = dayIdx;
    this.renderSchedule();
  }

  deleteCourse(id) {
    if (confirm('Voulez-vous vraiment supprimer ce cours ?')) {
      window.courseManager.deleteCourse(id);
      this.renderSchedule();
      if (this.currentTab === 'home') this.renderHome();
    }
  }

  /* ---------------- 3. PAGE TÂCHES & HABITUDES ---------------- */
  renderTasks() {
    const stats = window.taskManager.getStatsSummary();

    // Remplissage carte statistiques
    const statsEl = document.getElementById('tasks-stats-card');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="grid grid-cols-3 gap-2.5 text-center">
          <div class="p-3 rounded-2xl bg-slate-900/80 border border-white/5">
            <div class="text-2xl font-black text-emerald-400">${stats.completionRate}%</div>
            <div class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-1">Réussite</div>
          </div>
          <div class="p-3 rounded-2xl bg-slate-900/80 border border-white/5">
            <div class="text-2xl font-black text-amber-400 flex items-center justify-center gap-1">
              ${stats.streak} <span class="text-lg">🔥</span>
            </div>
            <div class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-1">Série Jours</div>
          </div>
          <div class="p-3 rounded-2xl bg-slate-900/80 border border-white/5">
            <div class="text-2xl font-black text-cyan-400 flex items-center justify-center gap-1">
              ${stats.prayersDoneCount}/${stats.prayersTotal}
            </div>
            <div class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-1">Prières 🕌</div>
          </div>
        </div>
      `;
    }

    // Filtres
    const filters = ['pending', 'all', 'done'];
    filters.forEach((f) => {
      const btn = document.getElementById(`filter-task-${f}`);
      if (btn) {
        const active = this.taskFilter === f;
        btn.classList.toggle('bg-emerald-500', active);
        btn.classList.toggle('text-white', active);
        btn.classList.toggle('text-slate-600', !active);
        btn.classList.toggle('dark:text-slate-400', !active);
      }
    });

    const listEl = document.getElementById('tasks-list-container');
    if (!listEl) return;

    let tasks = [];
    if (this.taskFilter === 'pending') tasks = window.taskManager.getPendingTasks();
    else if (this.taskFilter === 'done') tasks = window.taskManager.getCompletedTasks();
    else tasks = window.taskManager.getAll();

    if (tasks.length === 0) {
      listEl.innerHTML = `
        <div class="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500">
          <div class="text-4xl mb-2">✨</div>
          <div class="font-bold text-base text-slate-800 dark:text-white">Aucune tâche dans cette section</div>
          <p class="text-xs text-slate-400 mt-1">Créez une nouvelle tâche avec le bouton « Ajouter une tâche ».</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = tasks.map((t) => {
      const categoryBadges = {
        devoir: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        revision: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        habitude: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        perso: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
      };

      return `
        <div class="p-4 rounded-2xl glass-card flex items-start gap-3.5 transition shadow-sm">
          <!-- Checkbox tactile géante -->
          <button onclick="window.appController.checkTask('${t.id}')" class="w-8 h-8 rounded-xl flex items-center justify-center border-2 transition touch-btn mt-0.5 ${t.done ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 border-emerald-500 text-slate-950 font-black animate-pop shadow-md shadow-emerald-500/30' : 'border-slate-700 hover:border-emerald-500 text-transparent bg-slate-900/60'}">
            ✓
          </button>
          
          <div class="flex-1 min-w-0">
            <h4 class="font-bold text-base leading-snug ${t.done ? 'line-through text-slate-500' : 'text-white'}">
              ${t.title}
            </h4>
            <div class="flex flex-wrap items-center gap-2 mt-2 text-xs">
              <span class="px-2 py-0.5 rounded-lg border font-black text-[10px] uppercase tracking-wide ${categoryBadges[t.category] || 'bg-slate-500/15 text-slate-400'}">
                ${t.category}
              </span>
              <span class="text-slate-400 flex items-center gap-1 font-semibold">
                📅 ${t.date} à <span class="text-amber-400 font-bold">${t.time || '18:00'}</span>
              </span>
              ${t.done && t.doneAt ? `<span class="text-[10px] font-bold text-emerald-400">Accompli à ${new Date(t.doneAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>` : ''}
            </div>
          </div>

          <button onclick="window.appController.deleteTask('${t.id}')" class="p-2 text-slate-500 hover:text-rose-400 touch-btn">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  setTaskFilter(filter) {
    this.taskFilter = filter;
    this.renderTasks();
  }

  checkTask(id) {
    const task = window.taskManager.toggleDone(id);
    this.renderTasks();
    if (this.currentTab === 'home') this.renderHome();
  }

  deleteTask(id) {
    window.taskManager.deleteTask(id);
    this.renderTasks();
    if (this.currentTab === 'home') this.renderHome();
  }

  /* ---------------- 4. PAGE ASSISTANT IA ---------------- */
  renderAI() {
    const history = window.appStorage.getAIChatHistory();
    const container = document.getElementById('ai-messages-container');
    if (!container) return;

    if (history.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center my-auto glass-card">
          <div class="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-[2px] shadow-2xl shadow-emerald-500/20 mx-auto mb-4">
            <div class="w-full h-full bg-[#070b14] rounded-[22px] flex items-center justify-center text-3xl">
              🤖
            </div>
          </div>
          <h3 class="font-black text-xl text-white">Bonjour ! Je suis Mon Binôme</h3>
          <p class="text-xs text-slate-400 max-w-xs mx-auto mt-2 leading-relaxed">
            Votre allié d'excellence. Posez-moi vos questions par texte, par micro vocal 🎙️ ou joignez vos PDF de cours.
          </p>
        </div>
      `;
    } else {
      container.innerHTML = history.map((msg, idx) => {
        const isUser = msg.role === 'user';
        return `
          <div class="flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}">
            ${!isUser ? `<div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 text-slate-950 flex items-center justify-center text-sm font-black flex-shrink-0 mt-1 shadow-md">🤖</div>` : ''}
            <div class="max-w-[85%] rounded-2xl p-3.5 ${isUser ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-medium rounded-br-sm shadow-lg shadow-emerald-500/15' : 'glass-card text-slate-100 rounded-bl-sm shadow-md border border-white/10'}">
              ${msg.attachmentName ? `<div class="text-xs bg-black/20 px-2.5 py-1 rounded-lg mb-2 font-mono flex items-center gap-1.5 border border-white/10">📎 ${msg.attachmentName}</div>` : ''}
              <div class="text-sm whitespace-pre-wrap leading-relaxed">${this.formatMarkdown(msg.content)}</div>
              
              <!-- Carte d'action dynamique (Ajout direct cours/tâche) -->
              ${msg.action ? this.renderActionCard(msg.action, idx) : ''}

              ${!isUser ? `
                <div class="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-end gap-2">
                  <button onclick="window.aiAssistant.speak(decodeURIComponent('${encodeURIComponent(msg.content)}'))" class="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-bold touch-btn">
                    <i data-lucide="volume-2" class="w-3.5 h-3.5 text-emerald-400"></i> Écouter
                  </button>
                </div>
              ` : ''}
            </div>
            ${isUser ? `<div class="w-8 h-8 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-200 text-xs font-bold flex-shrink-0 mt-1">👤</div>` : ''}
          </div>
        `;
      }).join('');
    }

    container.scrollTop = container.scrollHeight;
    if (window.lucide) window.lucide.createIcons();
  }

  renderActionCard(action, idx) {
    if (action.type === 'ADD_COURSE') {
      const c = action.data;
      const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      return `
        <div class="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
          <div class="font-extrabold text-emerald-400 mb-1 flex items-center gap-1.5">
            <span>📅 Proposition d'ajout au planning</span>
          </div>
          <div>Matière : <b class="text-white">${c.subject}</b></div>
          <div class="text-slate-300">Horaire : ${days[c.day]} de ${c.startTime} à ${c.endTime}</div>
          <button onclick="window.appController.executeAction(${idx})" class="mt-2 w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-lg font-black text-xs touch-btn shadow-md">
            ✅ Confirmer et intégrer au planning
          </button>
        </div>
      `;
    }
    if (action.type === 'ADD_TASK') {
      const t = action.data;
      return `
        <div class="mt-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs">
          <div class="font-extrabold text-cyan-400 mb-1 flex items-center gap-1.5">
            <span>✅ Proposition d'ajout de tâche</span>
          </div>
          <div>Tâche : <b class="text-white">${t.title}</b></div>
          <div class="text-slate-300">Horaire : ${t.time} (${t.category})</div>
          <button onclick="window.appController.executeAction(${idx})" class="mt-2 w-full py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 rounded-lg font-black text-xs touch-btn shadow-md">
            ✅ Confirmer et ajouter la tâche
          </button>
        </div>
      `;
    }
    return '';
  }

  executeAction(msgIdx) {
    const history = window.appStorage.getAIChatHistory();
    const msg = history[msgIdx];
    if (!msg || !msg.action) return;

    if (msg.action.type === 'ADD_COURSE') {
      window.courseManager.addCourse(msg.action.data);
      window.notificationManager.sendNotification({
        title: '📚 Cours ajouté !',
        body: `Le cours ${msg.action.data.subject} a été ajouté à votre planning.`,
        sound: 'success'
      });
    } else if (msg.action.type === 'ADD_TASK') {
      window.taskManager.addTask(msg.action.data);
      window.notificationManager.sendNotification({
        title: '✅ Tâche créée !',
        body: `La tâche « ${msg.action.data.title} » a été enregistrée.`,
        sound: 'success'
      });
    }

    // Supprimer l'action du message pour éviter double-clic
    delete msg.action;
    window.appStorage.saveAIChatHistory(history);
    this.renderAI();
  }

  formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/### (.*)/g, '<h4 class="font-bold text-emerald-500 text-sm mt-2 mb-1">$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>')
      .replace(/`([^`]+)`/g, '<code class="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-xs">$1</code>');
  }

  sendQuickPrompt(promptText) {
    const input = document.getElementById('ai-chat-input');
    if (input) {
      input.value = promptText;
      this.sendAIMessage();
    }
  }

  async sendAIMessage() {
    const input = document.getElementById('ai-chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text && !this.currentAttachment) return;

    input.value = '';
    const history = window.appStorage.getAIChatHistory();

    const userMessage = {
      role: 'user',
      content: text || (this.currentAttachment ? `Analyse de ${this.currentAttachment.name}` : ''),
      attachmentName: this.currentAttachment ? this.currentAttachment.name : null
    };
    history.push(userMessage);
    window.appStorage.saveAIChatHistory(history);
    this.renderAI();

    // Afficher indicateur de chargement
    const sendBtn = document.getElementById('ai-send-btn');
    if (sendBtn) sendBtn.disabled = true;

    try {
      const response = await window.aiAssistant.processMessage(text, this.currentAttachment);
      history.push({
        role: 'assistant',
        content: response.text,
        action: response.action
      });
      window.appStorage.saveAIChatHistory(history);
    } catch (err) {
      history.push({
        role: 'assistant',
        content: `Désolé, une erreur est survenue : ${err.message}`
      });
      window.appStorage.saveAIChatHistory(history);
    } finally {
      this.currentAttachment = null;
      this.updateAttachmentPreview();
      if (sendBtn) sendBtn.disabled = false;
      this.renderAI();
    }
  }

  handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    window.aiAssistant.extractTextFromFile(file).then((content) => {
      this.currentAttachment = {
        name: file.name,
        type: file.type,
        content
      };
      this.updateAttachmentPreview();
    });
  }

  updateAttachmentPreview() {
    const previewContainer = document.getElementById('ai-attachment-preview');
    if (!previewContainer) return;

    if (this.currentAttachment) {
      previewContainer.classList.remove('hidden');
      previewContainer.innerHTML = `
        <div class="flex items-center justify-between text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/20">
          <span class="truncate max-w-[200px]">📎 ${this.currentAttachment.name}</span>
          <button onclick="window.appController.removeAttachment()" class="text-rose-500 font-bold ml-2">✕</button>
        </div>
      `;
    } else {
      previewContainer.classList.add('hidden');
      previewContainer.innerHTML = '';
    }
  }

  removeAttachment() {
    this.currentAttachment = null;
    this.updateAttachmentPreview();
  }

  clearAIChat() {
    if (confirm('Effacer l\'historique de la discussion ?')) {
      window.appStorage.saveAIChatHistory([]);
      this.renderAI();
    }
  }

  /* ---------------- 5. PAGE RÉGLAGES ---------------- */
  renderSettings() {
    const settings = window.appStorage.getSettings();

    // Volume & Sound
    const soundSelect = document.getElementById('setting-sound-type');
    if (soundSelect) soundSelect.value = settings.soundType || 'doux';

    const volumeSlider = document.getElementById('setting-volume');
    if (volumeSlider) volumeSlider.value = settings.soundVolume !== undefined ? settings.soundVolume : 0.8;

    const courseReminder = document.getElementById('setting-course-reminder');
    if (courseReminder) courseReminder.value = settings.courseReminderMinutes || 15;

    // Prière
    const citySelect = document.getElementById('setting-prayer-city');
    if (citySelect) citySelect.value = settings.prayerCity || 'Dakar';

    const prayerMode = document.getElementById('setting-prayer-auto');
    if (prayerMode) prayerMode.checked = !!settings.prayerAutoMode;

    const apiKeyInput = document.getElementById('setting-gemini-key');
    if (apiKeyInput) apiKeyInput.value = settings.geminiApiKey || '';

    const userNameInput = document.getElementById('setting-user-name');
    if (userNameInput) userNameInput.value = settings.userName || '';

    // Manuel prayers inputs
    const manualContainer = document.getElementById('manual-prayer-inputs');
    if (manualContainer) {
      manualContainer.classList.toggle('hidden', !!settings.prayerAutoMode);
      const prayers = window.appStorage.getPrayers();
      ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].forEach((p) => {
        const inp = document.getElementById(`manual-prayer-${p.toLowerCase()}`);
        if (inp) inp.value = prayers[p] || '12:00';
      });
    }

    // Statut permission notification
    const notifBtn = document.getElementById('setting-request-notif-btn');
    if (notifBtn) {
      if (window.notificationManager.hasPermission()) {
        notifBtn.innerHTML = '✅ Notifications Web Activées';
        notifBtn.classList.remove('bg-emerald-500');
        notifBtn.classList.add('bg-slate-700', 'text-slate-300');
        notifBtn.disabled = true;
      } else {
        notifBtn.innerHTML = '🔔 Activer les notifications push';
        notifBtn.disabled = false;
      }
    }
  }

  saveSettingsFromForm() {
    const settings = window.appStorage.getSettings();
    settings.soundType = document.getElementById('setting-sound-type')?.value || 'doux';
    settings.soundVolume = parseFloat(document.getElementById('setting-volume')?.value || 0.8);
    settings.courseReminderMinutes = parseInt(document.getElementById('setting-course-reminder')?.value || 15, 10);
    settings.prayerCity = document.getElementById('setting-prayer-city')?.value || 'Dakar';
    settings.prayerAutoMode = document.getElementById('setting-prayer-auto')?.checked ?? true;
    settings.geminiApiKey = document.getElementById('setting-gemini-key')?.value.trim() || '';
    settings.userName = document.getElementById('setting-user-name')?.value.trim() || 'Étudiant';

    window.appStorage.saveSettings(settings);

    // Si mode manuel pour les prières
    if (!settings.prayerAutoMode) {
      const prayers = window.appStorage.getPrayers();
      ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].forEach((p) => {
        const inp = document.getElementById(`manual-prayer-${p.toLowerCase()}`);
        if (inp && inp.value) prayers[p] = inp.value;
      });
      window.appStorage.savePrayers(prayers);
    } else {
      window.prayerService.fetchPrayerTimes(settings.prayerCity, 'Senegal');
    }

    window.notificationManager.sendNotification({
      title: '⚙️ Réglages enregistrés !',
      body: 'Vos préférences ont bien été mises à jour.',
      sound: 'success'
    });
  }

  testCurrentSound() {
    const soundType = document.getElementById('setting-sound-type')?.value || 'doux';
    const volume = parseFloat(document.getElementById('setting-volume')?.value || 0.8);
    window.soundEngine.setVolume(volume);
    window.soundEngine.playPrayerAlert(soundType);
  }

  /* ---------------- MODALS (Ajout Cours & Tâche) ---------------- */
  openAddCourseModal() {
    document.getElementById('course-modal-title').textContent = 'Ajouter un cours';
    document.getElementById('course-form-id').value = '';
    document.getElementById('course-form-subject').value = '';
    document.getElementById('course-form-day').value = this.selectedWeekDay || 1;
    document.getElementById('course-form-start').value = '08:30';
    document.getElementById('course-form-end').value = '10:30';
    document.getElementById('course-form-room').value = '';
    document.getElementById('course-form-teacher').value = '';
    document.getElementById('course-modal').classList.remove('hidden');
  }

  openEditCourseModal(id) {
    const courses = window.courseManager.getAll();
    const c = courses.find((item) => item.id === id);
    if (!c) return;

    document.getElementById('course-modal-title').textContent = 'Modifier le cours';
    document.getElementById('course-form-id').value = c.id;
    document.getElementById('course-form-subject').value = c.subject;
    document.getElementById('course-form-day').value = c.day;
    document.getElementById('course-form-start').value = c.startTime;
    document.getElementById('course-form-end').value = c.endTime;
    document.getElementById('course-form-room').value = c.room || '';
    document.getElementById('course-form-teacher').value = c.teacher || '';
    document.getElementById('course-form-color').value = c.color || '#059669';
    document.getElementById('course-modal').classList.remove('hidden');
  }

  closeCourseModal() {
    document.getElementById('course-modal').classList.add('hidden');
  }

  submitCourseForm(e) {
    e.preventDefault();
    const id = document.getElementById('course-form-id').value;
    const courseData = {
      subject: document.getElementById('course-form-subject').value,
      day: parseInt(document.getElementById('course-form-day').value, 10),
      startTime: document.getElementById('course-form-start').value,
      endTime: document.getElementById('course-form-end').value,
      room: document.getElementById('course-form-room').value,
      teacher: document.getElementById('course-form-teacher').value,
      color: document.getElementById('course-form-color').value
    };

    if (id) {
      window.courseManager.updateCourse(id, courseData);
    } else {
      window.courseManager.addCourse(courseData);
    }

    this.closeCourseModal();
    this.renderSchedule();
    if (this.currentTab === 'home') this.renderHome();
  }

  openAddTaskModal() {
    document.getElementById('task-form-title').value = '';
    document.getElementById('task-form-category').value = 'devoir';
    document.getElementById('task-form-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('task-form-time').value = '18:00';
    document.getElementById('task-modal').classList.remove('hidden');
  }

  closeTaskModal() {
    document.getElementById('task-modal').classList.add('hidden');
  }

  submitTaskForm(e) {
    e.preventDefault();
    const taskData = {
      title: document.getElementById('task-form-title').value,
      category: document.getElementById('task-form-category').value,
      date: document.getElementById('task-form-date').value,
      time: document.getElementById('task-form-time').value
    };

    window.taskManager.addTask(taskData);
    this.closeTaskModal();
    this.renderTasks();
    if (this.currentTab === 'home') this.renderHome();
  }

  /* ---------------- ONBOARDING & PWA INSTALL ---------------- */
  checkOnboarding() {
    const settings = window.appStorage.getSettings();
    if (!settings.onboardingSeen) {
      const modal = document.getElementById('onboarding-modal');
      if (modal) modal.classList.remove('hidden');
    }
  }

  closeOnboarding() {
    const settings = window.appStorage.getSettings();
    settings.onboardingSeen = true;
    window.appStorage.saveSettings(settings);
    const modal = document.getElementById('onboarding-modal');
    if (modal) modal.classList.add('hidden');
  }

  async activateNotificationsFromOnboarding() {
    await window.notificationManager.requestPermission();
    this.closeOnboarding();
  }

  /* ---------------- AUTHENTIFICATION & UTILISATEURS ---------------- */
  checkAuthUI() {
    const auth = window.authManager;
    const user = auth ? auth.getUser() : null;
    const authHeaderBtn = document.getElementById('header-auth-btn');
    const adminNavBtn = document.getElementById('nav-admin-btn');
    const settingsName = document.getElementById('settings-user-display-name');
    const settingsEmail = document.getElementById('settings-user-display-email');

    if (auth && auth.isAuthenticated() && user) {
      const isFounder = user.email === 'souleymanediagne740@gmail.com' || user.role === 'admin';
      
      if (authHeaderBtn) {
        authHeaderBtn.innerHTML = `
          <div class="flex items-center gap-1.5">
            ${isFounder ? `
              <button onclick="window.appController.switchTab('admin')" class="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-400 text-[11px] font-black border border-amber-500/40 flex items-center gap-1 touch-btn shadow-sm">
                👑 Admin
              </button>
            ` : ''}
            <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center shadow">
              ${(user.name || 'SD').substring(0, 2).toUpperCase()}
            </div>
          </div>
        `;
      }

      if (adminNavBtn) {
        if (isFounder) adminNavBtn.classList.remove('hidden');
        else adminNavBtn.classList.add('hidden');
      }

      if (settingsName) settingsName.textContent = user.name + (isFounder ? ' (👑 Fondateur)' : '');
      if (settingsEmail) settingsEmail.textContent = user.email;

      const greetingEl = document.getElementById('home-greeting');
      if (greetingEl) {
        greetingEl.textContent = `Bonjour, ${user.name.split(' ')[0]} 👋`;
      }
    } else {
      if (authHeaderBtn) {
        authHeaderBtn.innerHTML = `
          <button onclick="window.appController.openAuthModal('login')" class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-black flex items-center gap-1 shadow-md touch-btn">
            <i data-lucide="log-in" class="w-3.5 h-3.5"></i> Connexion
          </button>
        `;
      }
      if (adminNavBtn) adminNavBtn.classList.add('hidden');
      if (settingsName) settingsName.textContent = 'Compte Local / Invité';
      if (settingsEmail) settingsEmail.textContent = 'Non synchronisé en ligne';
    }

    if (window.lucide) window.lucide.createIcons();
  }

  openAuthModal(mode = 'login') {
    this.authMode = mode;
    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    const tabLogin = document.getElementById('auth-tab-login');
    const tabRegister = document.getElementById('auth-tab-register');
    const formLogin = document.getElementById('auth-form-login');
    const formRegister = document.getElementById('auth-form-register');

    if (mode === 'login') {
      tabLogin.classList.add('bg-emerald-500', 'text-white');
      tabLogin.classList.remove('text-slate-400');
      tabRegister.classList.remove('bg-emerald-500', 'text-white');
      tabRegister.classList.add('text-slate-400');
      formLogin.classList.remove('hidden');
      formRegister.classList.add('hidden');
    } else {
      tabRegister.classList.add('bg-emerald-500', 'text-white');
      tabRegister.classList.remove('text-slate-400');
      tabLogin.classList.remove('bg-emerald-500', 'text-white');
      tabLogin.classList.add('text-slate-400');
      formRegister.classList.remove('hidden');
      formLogin.classList.add('hidden');
    }

    document.getElementById('auth-error-msg')?.classList.add('hidden');
    modal.classList.remove('hidden');
  }

  closeAuthModal() {
    document.getElementById('auth-modal')?.classList.add('hidden');
  }

  async submitLoginForm(e) {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value;
    const pass = document.getElementById('login-password')?.value;
    const errBox = document.getElementById('auth-error-msg');

    const res = await window.authManager.login(email, pass);
    if (res.success) {
      this.closeAuthModal();
      this.checkAuthUI();
      if (res.user.role === 'admin') {
        this.switchTab('admin');
      } else {
        this.renderCurrentTab();
      }
      window.notificationManager.sendNotification({
        title: '👋 Bon retour !',
        body: `Ravi de vous revoir, ${res.user.name} sur Sama Kharite.`,
        sound: 'success'
      });
    } else {
      if (errBox) {
        errBox.textContent = res.error;
        errBox.classList.remove('hidden');
      }
    }
  }

  async submitRegisterForm(e) {
    e.preventDefault();
    const name = document.getElementById('register-name')?.value;
    const email = document.getElementById('register-email')?.value;
    const pass = document.getElementById('register-password')?.value;
    const city = document.getElementById('register-city')?.value || 'Dakar';
    const errBox = document.getElementById('auth-error-msg');

    const res = await window.authManager.register(name, email, pass, city);
    if (res.success) {
      this.closeAuthModal();
      this.checkAuthUI();
      this.renderCurrentTab();
      window.notificationManager.sendNotification({
        title: '🌟 Bienvenue sur Sama Kharite !',
        body: `Votre compte a été créé avec succès, ${res.user.name}.`,
        sound: 'success'
      });
    } else {
      if (errBox) {
        errBox.textContent = res.error;
        errBox.classList.remove('hidden');
      }
    }
  }

  handleLogout() {
    if (confirm('Voulez-vous vraiment vous déconnecter de Sama Kharite ?')) {
      window.authManager.logout();
    }
  }

  async fetchAnnouncements() {
    try {
      const res = await fetch('/api/announcements');
      if (res.ok) {
        const data = await res.json();
        const container = document.getElementById('home-announcements-container');
        if (container && data.announcements && data.announcements.length > 0) {
          const ann = data.announcements[0];
          container.classList.remove('hidden');
          container.innerHTML = `
            <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 shadow-sm">
              <span class="text-lg">📢</span>
              <div class="flex-1">
                <div class="font-bold text-amber-600 dark:text-amber-400">${ann.title}</div>
                <div class="text-[11px] mt-0.5 opacity-90">${ann.message}</div>
              </div>
              <button onclick="this.parentElement.remove()" class="text-amber-400 hover:text-amber-600 p-0.5 text-xs font-bold">✕</button>
            </div>
          `;
        }
      }
    } catch (e) {}
  }


  bindEvents() {
    // Bottom Nav clicks
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    // PWA install banner prompt capture
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      window.deferredPrompt = e;
      const installBanners = document.querySelectorAll('.pwa-install-banner');
      installBanners.forEach((b) => b.classList.remove('hidden'));
    });
  }

  triggerPWAInstall() {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      window.deferredPrompt.userChoice.then((choice) => {
        if (choice.outcome === 'accepted') {
          console.log('PWA installée');
        }
        window.deferredPrompt = null;
      });
    } else {
      // Guide manuel
      alert("Pour installer sur votre écran d'accueil :\n- Sur iPhone (Safari) : Appuyez sur Partager ⬆️ puis « Sur l'écran d'accueil ➕ ».\n- Sur Android (Chrome) : Appuyez sur les 3 points ⋮ puis « Installer l'application ».");
    }
  }
}

window.appController = new AppController();
document.addEventListener('DOMContentLoaded', () => {
  window.appController.init();
});
