/**
 * Mon Assistant - Gestion du Stockage Local (localStorage)
 */

const STORAGE_KEYS = {
  COURSES: 'ma_courses_v1',
  TASKS: 'ma_tasks_v1',
  PRAYERS: 'ma_prayers_v1',
  SETTINGS: 'ma_settings_v1',
  STATS: 'ma_stats_v1',
  AI_CHAT: 'ma_ai_chat_v1'
};

const DEFAULT_SETTINGS = {
  theme: 'dark', // 'dark' | 'light'
  soundType: 'doux', // 'adhan' | 'doux' | 'zen' | 'bip'
  soundVolume: 0.8,
  courseReminderMinutes: 15, // 10, 15, 30
  prayerCity: 'Dakar',
  prayerCountry: 'Senegal',
  prayerAutoMode: true, // true = API Aladhan / calcul, false = manuel
  geminiApiKey: '',
  userName: 'Étudiant',
  onboardingSeen: false
};

const DEFAULT_COURSES = [
  {
    id: 'c_1',
    subject: 'Mathématiques - Analyse',
    day: 1, // Lundi (0=Dimanche, 1=Lundi, ..., 6=Samedi)
    startTime: '08:30',
    endTime: '10:30',
    room: 'Amphi B',
    teacher: 'Prof. Diallo',
    color: '#059669' // Emerald
  },
  {
    id: 'c_2',
    subject: 'Algorithmique & Python',
    day: 1,
    startTime: '11:00',
    endTime: '13:00',
    room: 'Labo Info 3',
    teacher: 'Mme Sarr',
    color: '#0284c7' // Sky
  },
  {
    id: 'c_3',
    subject: 'Physique - Électromagnétisme',
    day: 2, // Mardi
    startTime: '09:00',
    endTime: '11:00',
    room: 'Salle 204',
    teacher: 'Dr. Ndiaye',
    color: '#7c3aed' // Violet
  },
  {
    id: 'c_4',
    subject: 'Anglais Professionnel',
    day: 2,
    startTime: '14:30',
    endTime: '16:30',
    room: 'Salle 102',
    teacher: 'Mr. Fall',
    color: '#ea580c' // Orange
  },
  {
    id: 'c_5',
    subject: 'Bases de Données & SQL',
    day: 3, // Mercredi
    startTime: '10:00',
    endTime: '12:00',
    room: 'Labo Info 1',
    teacher: 'Prof. Diop',
    color: '#059669'
  },
  {
    id: 'c_6',
    subject: 'Architecture des Ordinateurs',
    day: 4, // Jeudi
    startTime: '08:30',
    endTime: '10:30',
    room: 'Amphi A',
    teacher: 'Dr. Sy',
    color: '#2563eb'
  },
  {
    id: 'c_7',
    subject: 'Gestion de Projet & Méthodes Agiles',
    day: 5, // Vendredi
    startTime: '09:30',
    endTime: '11:30',
    room: 'Salle 301',
    teacher: 'Mme Ba',
    color: '#d97706'
  }
];

const DEFAULT_TASKS = [
  {
    id: 't_1',
    title: 'Faire les exercices 4 & 5 d\'Algorithmique',
    category: 'devoir', // 'devoir' | 'revision' | 'habitude' | 'perso'
    date: new Date().toISOString().split('T')[0],
    time: '18:00',
    done: false,
    doneAt: null,
    repeatReminder: true
  },
  {
    id: 't_2',
    title: 'Relire le cours de Mathématiques (Intégrales)',
    category: 'revision',
    date: new Date().toISOString().split('T')[0],
    time: '20:30',
    done: false,
    doneAt: null,
    repeatReminder: true
  },
  {
    id: 't_3',
    title: 'Préparer le support de présentation en Anglais',
    category: 'devoir',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '15:00',
    done: false,
    doneAt: null,
    repeatReminder: true
  },
  {
    id: 't_4',
    title: 'Lecture 20 minutes avant de dormir 📖',
    category: 'habitude',
    date: new Date().toISOString().split('T')[0],
    time: '22:00',
    done: true,
    doneAt: new Date().toISOString(),
    repeatReminder: false
  }
];

const DEFAULT_STATS = {
  streak: 5, // Jours consécutifs
  lastActiveDate: new Date().toISOString().split('T')[0],
  completedTasksCount: 18,
  totalTasksCount: 22,
  prayersToday: {
    Fajr: true,
    Dhuhr: true,
    Asr: false,
    Maghrib: false,
    Isha: false
  }
};

const DEFAULT_PRAYERS = {
  Fajr: '05:45',
  Dhuhr: '13:05',
  Asr: '16:25',
  Maghrib: '18:48',
  Isha: '19:58',
  lastFetchedDate: null,
  cityName: 'Dakar'
};

class StorageManager {
  constructor() {
    this.listeners = [];
  }

  getSettings() {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
  }

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this.notify('settings', settings);
  }

  getCourses() {
    const data = localStorage.getItem(STORAGE_KEYS.COURSES);
    return data ? JSON.parse(data) : [...DEFAULT_COURSES];
  }

  saveCourses(courses) {
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
    this.notify('courses', courses);
  }

  getTasks() {
    const data = localStorage.getItem(STORAGE_KEYS.TASKS);
    return data ? JSON.parse(data) : [...DEFAULT_TASKS];
  }

  saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    this.notify('tasks', tasks);
  }

  getStats() {
    const data = localStorage.getItem(STORAGE_KEYS.STATS);
    const today = new Date().toISOString().split('T')[0];
    let stats = data ? { ...DEFAULT_STATS, ...JSON.parse(data) } : { ...DEFAULT_STATS };

    // Vérifier la série de jours consécutifs
    if (stats.lastActiveDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (stats.lastActiveDate === yesterday) {
        // Enchaînement continu
        stats.streak = stats.streak || 1;
      } else {
        // Série réinitialisée ou commencée
        stats.streak = 1;
      }
      stats.lastActiveDate = today;
      stats.prayersToday = { Fajr: false, Dhuhr: false, Asr: false, Maghrib: false, Isha: false };
      this.saveStats(stats);
    }
    return stats;
  }

  saveStats(stats) {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    this.notify('stats', stats);
  }

  getPrayers() {
    const data = localStorage.getItem(STORAGE_KEYS.PRAYERS);
    return data ? { ...DEFAULT_PRAYERS, ...JSON.parse(data) } : { ...DEFAULT_PRAYERS };
  }

  savePrayers(prayers) {
    localStorage.setItem(STORAGE_KEYS.PRAYERS, JSON.stringify(prayers));
    this.notify('prayers', prayers);
  }

  getAIChatHistory() {
    const data = localStorage.getItem(STORAGE_KEYS.AI_CHAT);
    return data ? JSON.parse(data) : [];
  }

  saveAIChatHistory(history) {
    localStorage.setItem(STORAGE_KEYS.AI_CHAT, JSON.stringify(history.slice(-50))); // garder les 50 derniers
  }

  exportAllData() {
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      courses: this.getCourses(),
      tasks: this.getTasks(),
      prayers: this.getPrayers(),
      stats: this.getStats(),
      settings: this.getSettings()
    }, null, 2);
  }

  importAllData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.courses) this.saveCourses(parsed.courses);
      if (parsed.tasks) this.saveTasks(parsed.tasks);
      if (parsed.prayers) this.savePrayers(parsed.prayers);
      if (parsed.stats) this.saveStats(parsed.stats);
      if (parsed.settings) this.saveSettings(parsed.settings);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  resetAllData() {
    localStorage.removeItem(STORAGE_KEYS.COURSES);
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.PRAYERS);
    localStorage.removeItem(STORAGE_KEYS.STATS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.AI_CHAT);
    window.location.reload();
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify(event, data) {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (e) {
        console.error(e);
      }
    }
    // Auto-sync Cloud si connecté
    if (window.authManager && window.authManager.isAuthenticated()) {
      if (this.syncTimer) clearTimeout(this.syncTimer);
      this.syncTimer = setTimeout(() => {
        window.authManager.pushCloudData();
      }, 2000);
    }
  }
}

window.appStorage = new StorageManager();
