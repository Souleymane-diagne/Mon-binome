/**
 * Mon Assistant - Gestionnaire de Tâches, Habitudes, Statistiques & Célébration 🎉
 */

class TaskManager {
  constructor() {}

  getAll() {
    return window.appStorage.getTasks();
  }

  getTodayTasks() {
    const todayStr = new Date().toISOString().split('T')[0];
    return this.getAll()
      .filter((t) => t.date === todayStr)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }

  getPendingTasks() {
    return this.getAll()
      .filter((t) => !t.done)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }

  getCompletedTasks() {
    return this.getAll()
      .filter((t) => t.done)
      .sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
  }

  addTask(data) {
    const tasks = this.getAll();
    const newTask = {
      id: 't_' + Date.now(),
      title: data.title.trim(),
      category: data.category || 'devoir',
      date: data.date || new Date().toISOString().split('T')[0],
      time: data.time || '18:00',
      done: false,
      doneAt: null,
      repeatReminder: true,
      lastReminderTime: null
    };
    tasks.unshift(newTask);
    window.appStorage.saveTasks(tasks);

    // Mettre à jour les stats globales
    const stats = window.appStorage.getStats();
    stats.totalTasksCount = (stats.totalTasksCount || 0) + 1;
    window.appStorage.saveStats(stats);

    return newTask;
  }

  deleteTask(id) {
    let tasks = this.getAll();
    tasks = tasks.filter((t) => t.id !== id);
    window.appStorage.saveTasks(tasks);
  }

  // Coche « Je l'ai fait ✅ » avec animation confetti et son
  toggleDone(id) {
    const tasks = this.getAll();
    const task = tasks.find((t) => t.id === id);
    if (!task) return null;

    task.done = !task.done;
    const stats = window.appStorage.getStats();

    if (task.done) {
      task.doneAt = new Date().toISOString();
      stats.completedTasksCount = (stats.completedTasksCount || 0) + 1;

      // 1. Déclencher le son de victoire
      if (window.soundEngine) {
        window.soundEngine.playSuccess();
      }

      // 2. Déclencher l'animation Confetti 🎉
      this.fireConfetti();

    } else {
      task.doneAt = null;
      stats.completedTasksCount = Math.max(0, (stats.completedTasksCount || 1) - 1);
    }

    window.appStorage.saveStats(stats);
    window.appStorage.saveTasks(tasks);
    return task;
  }

  // Animation de confetti sur toute la largeur
  fireConfetti() {
    if (typeof confetti === 'function') {
      // Émission dynamique depuis les côtés
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#059669', '#10b981', '#34d399', '#fbbf24', '#38bdf8', '#a855f7']
      });

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 }
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 }
        });
      }, 200);
    }
  }

  // Calcul des statistiques globales
  getStatsSummary() {
    const tasks = this.getAll();
    const stats = window.appStorage.getStats();
    const todayStr = new Date().toISOString().split('T')[0];

    const todayTasks = tasks.filter((t) => t.date === todayStr);
    const todayDone = todayTasks.filter((t) => t.done).length;
    const todayTotal = todayTasks.length;

    const allDone = tasks.filter((t) => t.done).length;
    const allTotal = tasks.length;
    const completionRate = allTotal > 0 ? Math.round((allDone / allTotal) * 100) : 100;

    // Prières accomplies aujourd'hui
    const prayersToday = stats.prayersToday || {};
    const prayersDoneCount = Object.values(prayersToday).filter(Boolean).length;

    return {
      streak: stats.streak || 1,
      completionRate,
      todayDone,
      todayTotal,
      allDone,
      allTotal,
      prayersDoneCount,
      prayersTotal: 5
    };
  }
}

window.taskManager = new TaskManager();
