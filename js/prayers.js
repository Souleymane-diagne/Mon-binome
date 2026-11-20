/**
 * Mon Assistant - Module Heures de Prière
 * Supporte le calcul astronomique hors-ligne, l'API Aladhan et la saisie manuelle.
 */

class PrayerService {
  constructor() {
    this.cities = [
      { name: 'Dakar', country: 'Senegal', lat: 14.6928, lng: -17.4467 },
      { name: 'Thiès', country: 'Senegal', lat: 14.7910, lng: -16.9359 },
      { name: 'Saint-Louis', country: 'Senegal', lat: 16.0326, lng: -16.4818 },
      { name: 'Touba', country: 'Senegal', lat: 14.8647, lng: -15.8756 },
      { name: 'Ziguinchor', country: 'Senegal', lat: 12.5833, lng: -16.2719 },
      { name: 'Abidjan', country: 'Ivory Coast', lat: 5.3600, lng: -4.0083 },
      { name: 'Bamako', country: 'Mali', lat: 12.6392, lng: -8.0029 },
      { name: 'Conakry', country: 'Guinea', lat: 9.6412, lng: -13.5784 },
      { name: 'Nouakchott', country: 'Mauritania', lat: 18.0735, lng: -15.9582 },
      { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
      { name: 'Casablanca', country: 'Morocco', lat: 33.5731, lng: -7.5898 }
    ];
  }

  // Calcul astronomique hors-ligne précis pour Dakar et Afrique de l'Ouest
  calculateOfflineTimes(date = new Date(), lat = 14.6928, lng = -17.4467) {
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    
    // Déclinaison solaire
    const P = 2 * Math.PI / 365 * (dayOfYear - 1);
    const decl = 0.006918 - 0.399912 * Math.cos(P) + 0.070257 * Math.sin(P) - 0.006758 * Math.cos(2 * P) + 0.000907 * Math.sin(2 * P);
    
    // Équation du temps (en minutes)
    const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(P) - 0.032077 * Math.sin(P) - 0.014615 * Math.cos(2 * P) - 0.040849 * Math.sin(2 * P));
    
    // Midi solaire (Dhuhr)
    const timeZoneOffset = -date.getTimezoneOffset() / 60; // Dakar = UTC+0
    const solarNoon = 12 + (timeZoneOffset - lng / 15) - (eqTime / 60);

    // Angle horaire pour un angle zénithal donné
    const rad = (deg) => deg * Math.PI / 180;
    const deg = (rad) => rad * 180 / Math.PI;

    const hourAngle = (angle) => {
      const cosH = (Math.sin(rad(-angle)) - Math.sin(rad(lat)) * Math.sin(decl)) / (Math.cos(rad(lat)) * Math.cos(decl));
      if (cosH > 1 || cosH < -1) return 0;
      return deg(Math.acos(cosH)) / 15;
    };

    // Asr (Ombre = longueur de l'objet + ombre à midi)
    const noonAngle = Math.abs(lat - deg(decl));
    const asrAngle = deg(Math.atan(1 + Math.tan(rad(noonAngle))));
    const asrHA = hourAngle(asrAngle);

    const fajrHA = hourAngle(18.0); // Fajr 18°
    const maghribHA = hourAngle(0.833); // Coucher du soleil
    const ishaHA = hourAngle(17.5); // Isha 17.5°

    const toTimeStr = (decimalHours) => {
      let h = Math.floor(decimalHours);
      let m = Math.round((decimalHours - h) * 60);
      if (m >= 60) { h += 1; m = 0; }
      h = ((h % 24) + 24) % 24;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    return {
      Fajr: toTimeStr(solarNoon - fajrHA),
      Dhuhr: toTimeStr(solarNoon),
      Asr: toTimeStr(solarNoon + asrHA),
      Maghrib: toTimeStr(solarNoon + maghribHA),
      Isha: toTimeStr(solarNoon + ishaHA)
    };
  }

  // Récupération via l'API Aladhan (avec fallback hors-ligne automatique)
  async fetchPrayerTimes(city = 'Dakar', country = 'Senegal') {
    const todayStr = new Date().toISOString().split('T')[0];
    const cached = window.appStorage.getPrayers();

    // Si déjà récupéré aujourd'hui pour cette ville et en mode auto
    if (cached.lastFetchedDate === todayStr && cached.cityName === city) {
      return cached;
    }

    try {
      const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=3`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error('API non joignable');
      const data = await res.json();
      
      if (data && data.data && data.data.timings) {
        const timings = data.data.timings;
        const newPrayers = {
          Fajr: timings.Fajr.substring(0, 5),
          Dhuhr: timings.Dhuhr.substring(0, 5),
          Asr: timings.Asr.substring(0, 5),
          Maghrib: timings.Maghrib.substring(0, 5),
          Isha: timings.Isha.substring(0, 5),
          lastFetchedDate: todayStr,
          cityName: city
        };
        window.appStorage.savePrayers(newPrayers);
        return newPrayers;
      }
    } catch (err) {
      console.warn('[Prayers] Échec API Aladhan, bascule sur calcul astronomique hors-ligne:', err);
    }

    // Fallback calcul hors-ligne
    const cityInfo = this.cities.find((c) => c.name.toLowerCase() === city.toLowerCase()) || this.cities[0];
    const calculated = this.calculateOfflineTimes(new Date(), cityInfo.lat, cityInfo.lng);
    const offlinePrayers = {
      ...calculated,
      lastFetchedDate: todayStr,
      cityName: city
    };
    window.appStorage.savePrayers(offlinePrayers);
    return offlinePrayers;
  }

  // Détermine la prochaine prière et le temps restant
  getNextPrayer(prayers) {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const prayerOrder = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

    for (const name of prayerOrder) {
      if (!prayers[name]) continue;
      const [h, m] = prayers[name].split(':').map(Number);
      const prayerMins = h * 60 + m;

      if (prayerMins > currentMins) {
        const diff = prayerMins - currentMins;
        const diffH = Math.floor(diff / 60);
        const diffM = diff % 60;
        return {
          name,
          time: prayers[name],
          remainingStr: diffH > 0 ? `${diffH}h ${diffM}min` : `${diffM} min`,
          isTomorrow: false
        };
      }
    }

    // Si toutes les prières du jour sont passées, la prochaine est Fajr demain
    const [fH, fM] = (prayers.Fajr || '05:45').split(':').map(Number);
    const fajrMinsTomorrow = (24 * 60 - currentMins) + (fH * 60 + fM);
    const diffH = Math.floor(fajrMinsTomorrow / 60);
    const diffM = fajrMinsTomorrow % 60;

    return {
      name: 'Fajr',
      time: prayers.Fajr || '05:45',
      remainingStr: `${diffH}h ${diffM}min`,
      isTomorrow: true
    };
  }

  // Marquer une prière comme accomplie (augmente les stats)
  togglePrayerDone(prayerName) {
    const stats = window.appStorage.getStats();
    stats.prayersToday = stats.prayersToday || {};
    const currentState = !!stats.prayersToday[prayerName];
    stats.prayersToday[prayerName] = !currentState;
    
    if (!currentState) {
      // Effet audio de célébration
      if (window.soundEngine) window.soundEngine.playSuccess();
    }
    
    window.appStorage.saveStats(stats);
    return !currentState;
  }
}

window.prayerService = new PrayerService();
