/**
 * Mon Assistant - Système de Notifications Push & Rappels
 */

class NotificationManager {
  constructor() {
    this.swRegistration = null;
    this.checkInterval = null;
    this.notifiedEvents = new Set(); // Évite les doublons à la même minute
    this.init();
  }

  async init() {
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('./service-worker.js');
        console.log('[SW] Service Worker enregistré avec succès:', this.swRegistration.scope);
      } catch (err) {
        console.warn('[SW] Erreur enregistrement SW:', err);
      }
    }

    // Démarre la boucle de vérification des rappels
    this.startScheduler();
  }

  hasPermission() {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      alert('Votre navigateur ne prend pas en charge les notifications web.');
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      this.sendNotification({
        title: '🎉 Notifications activées !',
        body: 'Vous recevrez vos rappels de cours 📚, heures de prière 🕌 et tâches ✅.',
        tag: 'welcome-notification',
        sound: 'success'
      });
      return true;
    }
    return false;
  }

  // Envoi d'une notification (Push Web / Service Worker / Toast fallback)
  async sendNotification({ title, body, tag = 'ma-notif', sound = 'doux', data = {} }) {
    // 1. Jouer le son approprié
    if (window.soundEngine) {
      const settings = window.appStorage.getSettings();
      window.soundEngine.setVolume(settings.soundVolume ?? 0.8);

      if (sound === 'prayer') {
        window.soundEngine.playPrayerAlert(settings.soundType);
      } else if (sound === 'course') {
        window.soundEngine.playCourseReminder();
      } else if (sound === 'task') {
        window.soundEngine.playTaskAlert();
      } else if (sound === 'success') {
        window.soundEngine.playSuccess();
      } else {
        window.soundEngine.playGentleChime();
      }
    }

    // 2. Notification système
    if (this.hasPermission()) {
      const options = {
        body,
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        tag,
        renotify: true,
        vibrate: [200, 100, 200, 100, 200],
        data,
        actions: [{ action: 'open', title: 'Ouvrir' }]
      };

      if (this.swRegistration && this.swRegistration.showNotification) {
        await this.swRegistration.showNotification(title, options);
      } else {
        new Notification(title, options);
      }
    } else {
      // Fallback : Toast visuel dans l'application
      this.showInAppToast(title, body);
    }
  }

  showInAppToast(title, body) {
    let toastContainer = document.getElementById('in-app-toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'in-app-toast-container';
      toastContainer.className = 'fixed top-4 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-md mx-auto';
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto bg-slate-900/95 dark:bg-slate-800/95 text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-start gap-3 transform transition-all duration-300 translate-y-[-20px] opacity-0 backdrop-blur-md';
    toast.innerHTML = `
      <div class="text-2xl mt-0.5">🔔</div>
      <div class="flex-1">
        <div class="font-bold text-sm text-emerald-400">${title}</div>
        <div class="text-xs text-slate-200 mt-0.5">${body}</div>
      </div>
      <button class="text-slate-400 hover:text-white p-1 text-sm font-bold" onclick="this.parentElement.remove()">✕</button>
    `;
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-[-20px]', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-[-10px]');
      setTimeout(() => toast.remove(), 300);
    }, 6000);
  }

  // Boucle de vérification intelligente toutes les 25 secondes
  startScheduler() {
    if (this.checkInterval) clearInterval(this.checkInterval);
    this.checkInterval = setInterval(() => this.runCheck(), 25000);
    // Vérification initiale
    setTimeout(() => this.runCheck(), 2000);
  }

  runCheck() {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Dimanche, 1 = Lundi, ...
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    const todayDateStr = now.toISOString().split('T')[0];

    const settings = window.appStorage.getSettings();
    const reminderLead = settings.courseReminderMinutes || 15;

    // --- 1. VÉRIFICATION DES COURS 📚 ---
    const courses = window.appStorage.getCourses();
    courses.forEach((course) => {
      if (course.day === currentDay) {
        // Calculer l'heure de rappel
        const [cHour, cMin] = course.startTime.split(':').map(Number);
        const courseDate = new Date(now);
        courseDate.setHours(cHour, cMin, 0, 0);

        const diffMinutes = Math.round((courseDate - now) / 60000);

        // Si on est dans la fenêtre de rappel (ex: 15 min avant)
        if (diffMinutes === reminderLead) {
          const key = `course_${course.id}_${todayDateStr}_${course.startTime}`;
          if (!this.notifiedEvents.has(key)) {
            this.notifiedEvents.add(key);
            this.sendNotification({
              title: `📚 Cours dans ${reminderLead} min : ${course.subject}`,
              body: `Salle : ${course.room || 'Non spécifiée'} | ${course.teacher ? 'Prof : ' + course.teacher : 'Début à ' + course.startTime}`,
              tag: `course-reminder-${course.id}`,
              sound: 'course'
            });
          }
        }
      }
    });

    // --- 2. VÉRIFICATION DES HEURES DE PRIÈRE 🕌 ---
    const prayers = window.appStorage.getPrayers();
    const prayerNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

    prayerNames.forEach((name) => {
      if (prayers[name] && prayers[name] === currentTimeStr) {
        const key = `prayer_${name}_${todayDateStr}_${currentTimeStr}`;
        if (!this.notifiedEvents.has(key)) {
          this.notifiedEvents.add(key);
          this.sendNotification({
            title: `🕌 C'est l'heure de la prière : ${name}`,
            body: `Il est ${currentTimeStr}. Prenez un instant pour votre prière (${settings.prayerCity || 'Dakar'}).`,
            tag: `prayer-${name}`,
            sound: 'prayer'
          });
        }
      }
    });

    // --- 3. VÉRIFICATION DES TÂCHES & RAPPELS RÉPÉTÉS ✅ ⏰ ---
    // "Si je ne l’ai pas cochée, l’application me renvoie un rappel avec son et emoji,
    // de façon répétée (toutes les 10 à 15 minutes) jusqu’à ce que je coche."
    const tasks = window.appStorage.getTasks();
    let updatedTasks = false;

    tasks.forEach((task) => {
      if (!task.done && task.date === todayDateStr && task.time) {
        const [tHour, tMin] = task.time.split(':').map(Number);
        const taskDue = new Date(now);
        taskDue.setHours(tHour, tMin, 0, 0);

        // Si la tâche est passée ou due maintenant
        const diffMs = now - taskDue;
        if (diffMs >= 0) {
          const lastNotified = task.lastReminderTime ? new Date(task.lastReminderTime) : null;
          // Intervalle de rappel répété : 12 minutes (entre 10 et 15 min)
          const REPEAT_INTERVAL_MS = 12 * 60 * 1000;

          if (!lastNotified || (now - lastNotified) >= REPEAT_INTERVAL_MS) {
            task.lastReminderTime = now.toISOString();
            updatedTasks = true;

            const overdueMins = Math.floor(diffMs / 60000);
            const timeMsg = overdueMins < 2 ? 'C\'est l\'heure !' : `En retard de ${overdueMins} min`;

            this.sendNotification({
              title: `⏰ Rappel Tâche : ${task.title}`,
              body: `N'oubliez pas de cocher « Je l'ai fait ✅ » dès que c'est terminé (${timeMsg}).`,
              tag: `task-nag-${task.id}`,
              sound: 'task'
            });
          }
        }
      }
    });

    if (updatedTasks) {
      window.appStorage.saveTasks(tasks);
    }
  }
}

window.notificationManager = new NotificationManager();
