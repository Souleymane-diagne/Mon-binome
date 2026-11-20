/**
 * Mon Assistant - Gestionnaire d'Emploi du Temps et des Cours
 */

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DAYS_SHORT_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const COURSE_COLORS = [
  { name: 'Émeraude', hex: '#059669' },
  { name: 'Ciel', hex: '#0284c7' },
  { name: 'Violet', hex: '#7c3aed' },
  { name: 'Ambre', hex: '#d97706' },
  { name: 'Rose', hex: '#e11d48' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Teal', hex: '#0d9488' }
];

class CourseManager {
  constructor() {
    this.selectedDay = new Date().getDay(); // Jour par défaut
  }

  getAll() {
    return window.appStorage.getCourses();
  }

  getCoursesForDay(dayIndex) {
    const courses = this.getAll();
    return courses
      .filter((c) => Number(c.day) === Number(dayIndex))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  getTodayCourses() {
    const currentDay = new Date().getDay();
    return this.getCoursesForDay(currentDay);
  }

  // Détermine le prochain cours et son statut
  getNextCourse() {
    const now = new Date();
    const currentDay = now.getDay();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const todayCourses = this.getTodayCourses();
    for (const c of todayCourses) {
      const [sh, sm] = c.startTime.split(':').map(Number);
      const [eh, em] = c.endTime.split(':').map(Number);
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;

      if (currentMins < startMins) {
        const diff = startMins - currentMins;
        const diffH = Math.floor(diff / 60);
        const diffM = diff % 60;
        return {
          course: c,
          status: 'upcoming',
          label: diffH > 0 ? `Dans ${diffH}h ${diffM}m` : `Dans ${diffM} min`,
          isToday: true
        };
      } else if (currentMins >= startMins && currentMins <= endMins) {
        const remaining = endMins - currentMins;
        return {
          course: c,
          status: 'ongoing',
          label: `En cours (fin dans ${remaining}m)`,
          isToday: true
        };
      }
    }

    // Aucun cours restant aujourd'hui, chercher dans les prochains jours
    for (let offset = 1; offset <= 7; offset++) {
      const nextDay = (currentDay + offset) % 7;
      const nextCourses = this.getCoursesForDay(nextDay);
      if (nextCourses.length > 0) {
        return {
          course: nextCourses[0],
          status: 'future',
          label: offset === 1 ? `Demain à ${nextCourses[0].startTime}` : `${DAYS_FR[nextDay]} à ${nextCourses[0].startTime}`,
          isToday: false
        };
      }
    }

    return null;
  }

  addCourse(course) {
    const courses = this.getAll();
    const newCourse = {
      id: 'c_' + Date.now(),
      subject: course.subject.trim(),
      day: parseInt(course.day, 10),
      startTime: course.startTime,
      endTime: course.endTime,
      room: (course.room || '').trim(),
      teacher: (course.teacher || '').trim(),
      color: course.color || '#059669'
    };
    courses.push(newCourse);
    window.appStorage.saveCourses(courses);
    return newCourse;
  }

  updateCourse(id, updatedFields) {
    let courses = this.getAll();
    courses = courses.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          ...updatedFields,
          day: parseInt(updatedFields.day !== undefined ? updatedFields.day : c.day, 10)
        };
      }
      return c;
    });
    window.appStorage.saveCourses(courses);
  }

  deleteCourse(id) {
    let courses = this.getAll();
    courses = courses.filter((c) => c.id !== id);
    window.appStorage.saveCourses(courses);
  }
}

window.courseManager = new CourseManager();
