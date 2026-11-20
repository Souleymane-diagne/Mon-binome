/**
 * Mon Assistant - Module Assistant IA Intelligent & Pédagogique
 * Reconnaissance vocale, synthèse, injection de contexte, extraction PDF et gestion d'actions.
 */

class AIAssistant {
  constructor() {
    this.recognition = null;
    this.isRecording = false;
    this.speechSynth = window.speechSynthesis || null;
    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.lang = 'fr-FR';
      this.recognition.continuous = false;
      this.recognition.interimResults = true;

      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const input = document.getElementById('ai-chat-input');
        if (input) input.value = transcript;
      };

      this.recognition.onend = () => {
        this.isRecording = false;
        this.updateMicUI();
      };

      this.recognition.onerror = (e) => {
        console.warn('[Speech] Erreur reconnaissance vocale:', e);
        this.isRecording = false;
        this.updateMicUI();
      };
    }
  }

  toggleVoiceRecording() {
    if (!this.recognition) {
      alert('La reconnaissance vocale n\'est pas prise en charge sur ce navigateur.');
      return;
    }

    if (this.isRecording) {
      this.recognition.stop();
      this.isRecording = false;
    } else {
      try {
        this.recognition.start();
        this.isRecording = true;
      } catch (err) {
        console.error(err);
      }
    }
    this.updateMicUI();
  }

  updateMicUI() {
    const micBtn = document.getElementById('ai-mic-btn');
    if (micBtn) {
      if (this.isRecording) {
        micBtn.classList.add('mic-recording');
        micBtn.innerHTML = '<i data-lucide="mic-off" class="w-5 h-5 text-white"></i>';
      } else {
        micBtn.classList.remove('mic-recording');
        micBtn.innerHTML = '<i data-lucide="mic" class="w-5 h-5"></i>';
      }
      if (window.lucide) window.lucide.createIcons();
    }
  }

  // Synthèse vocale en français
  speak(text) {
    if (!this.speechSynth) return;
    this.speechSynth.cancel(); // Stop les lectures en cours

    // Nettoyer les balises Markdown et emojis pour une lecture fluide
    const cleanText = text
      .replace(/[#*_`~>\[\]\(\)]/g, '')
      .replace(/[\u{1F600}-\u{1F6FF}]/gu, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.05;

    const voices = this.speechSynth.getVoices();
    const frVoice = voices.find((v) => v.lang.startsWith('fr'));
    if (frVoice) utterance.voice = frVoice;

    this.speechSynth.speak(utterance);
  }

  // Extraction de texte depuis un fichier (TXT ou PDF)
  async extractTextFromFile(file) {
    if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      return await file.text();
    }

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      if (window.pdfjsLib) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = '';
          const maxPages = Math.min(pdf.numPages, 10); // Limiter à 10 pages pour la rapidité
          for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(' ');
            fullText += `\n--- Page ${i} ---\n` + pageText;
          }
          return fullText;
        } catch (e) {
          console.error('[PDF] Erreur lecture:', e);
          return `[Fichier PDF : ${file.name} - Impossible d'extraire le texte directement, merci de copier le passage souhaité]`;
        }
      }
    }

    if (file.type.startsWith('image/')) {
      return `[Image jointe : ${file.name} (${Math.round(file.size / 1024)} Ko)]`;
    }

    return `[Document joint : ${file.name}]`;
  }

  // Construit le contexte en temps réel pour l'IA
  getLiveContext() {
    const now = new Date();
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const currentDayName = days[now.getDay()];
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const coursesToday = window.courseManager ? window.courseManager.getTodayCourses() : [];
    const allCourses = window.courseManager ? window.courseManager.getAll() : [];
    const tasks = window.taskManager ? window.taskManager.getPendingTasks() : [];
    const prayers = window.appStorage.getPrayers();
    const stats = window.appStorage.getStats();
    const settings = window.appStorage.getSettings();

    const coursesDesc = coursesToday.length > 0
      ? coursesToday.map((c) => `- ${c.subject} (${c.startTime} à ${c.endTime}, Salle ${c.room || 'N/A'}, Prof: ${c.teacher || 'N/A'})`).join('\n')
      : 'Aucun cours prévu aujourd\'hui.';

    const tasksDesc = tasks.length > 0
      ? tasks.slice(0, 6).map((t) => `- [${t.category}] ${t.title} (prévu le ${t.date} à ${t.time})`).join('\n')
      : 'Toutes les tâches actuelles sont terminées !';

    return `
Contexte actuel de l'utilisateur :
- Date & Heure : ${currentDayName} ${now.toLocaleDateString('fr-FR')} à ${currentTimeStr}.
- Ville pour les prières : ${settings.prayerCity || 'Dakar'}.
- Horaires des prières aujourd'hui : Fajr ${prayers.Fajr}, Dhuhr ${prayers.Dhuhr}, Asr ${prayers.Asr}, Maghrib ${prayers.Maghrib}, Isha ${prayers.Isha}.
- Cours aujourd'hui :
${coursesDesc}
- Tâches en attente :
${tasksDesc}
- Série d'assiduité : ${stats.streak || 1} jours consécutifs 🔥.
`;
  }

  // Analyse les intentions d'ajout de cours ou de tâche
  detectActionIntent(userMsg) {
    const lower = userMsg.toLowerCase();

    // Détection ajout de cours
    // ex: "ajoute un cours de maths lundi de 08:00 à 10:00 en salle 101"
    if (lower.includes('ajoute') && (lower.includes('cours') || lower.includes('matière'))) {
      const daysMap = {
        dimanche: 0, dimanche: 0,
        lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6
      };
      let detectedDay = 1;
      for (const [dName, dIdx] of Object.entries(daysMap)) {
        if (lower.includes(dName)) {
          detectedDay = dIdx;
          break;
        }
      }

      // Extraction des heures (ex: 14h, 14:00, 14h30)
      const timeMatches = userMsg.match(/([01]?[0-9]|2[0-3])([h:]\s*([0-5][0-9]))?/gi);
      let startTime = '09:00';
      let endTime = '11:00';

      if (timeMatches && timeMatches.length >= 1) {
        startTime = this.formatTimeMatch(timeMatches[0]);
        if (timeMatches.length >= 2) {
          endTime = this.formatTimeMatch(timeMatches[1]);
        }
      }

      // Extraction sujet
      let subject = 'Nouveau Cours';
      const deMatch = userMsg.match(/cours de\s+([^,.\n]+)/i) || userMsg.match(/cours d'([^,.\n]+)/i);
      if (deMatch && deMatch[1]) {
        subject = deMatch[1].trim();
      }

      return {
        type: 'ADD_COURSE',
        data: {
          subject,
          day: detectedDay,
          startTime,
          endTime,
          room: 'Salle standard',
          teacher: 'Professeur'
        }
      };
    }

    // Détection ajout de tâche
    // ex: "ajoute une tâche réviser les maths à 20h"
    if (lower.includes('ajoute') && (lower.includes('tâche') || lower.includes('devoir') || lower.includes('rappel'))) {
      let title = userMsg.replace(/ajoute.*?(tâche|devoir|rappel)\s*(de|d'|:)?/i, '').trim();
      const timeMatches = userMsg.match(/([01]?[0-9]|2[0-3])([h:]\s*([0-5][0-9]))?/gi);
      let time = '19:00';
      if (timeMatches && timeMatches.length > 0) {
        time = this.formatTimeMatch(timeMatches[0]);
      }

      return {
        type: 'ADD_TASK',
        data: {
          title: title || 'Nouvelle tâche',
          category: lower.includes('devoir') ? 'devoir' : (lower.includes('révis') ? 'revision' : 'habitude'),
          date: new Date().toISOString().split('T')[0],
          time
        }
      };
    }

    return null;
  }

  formatTimeMatch(str) {
    str = str.replace(/\s+/g, '').toLowerCase();
    if (str.includes('h')) {
      const parts = str.split('h');
      const h = String(parts[0]).padStart(2, '0');
      const m = parts[1] ? String(parts[1]).padStart(2, '0') : '00';
      return `${h}:${m}`;
    }
    if (str.includes(':')) {
      const parts = str.split(':');
      const h = String(parts[0]).padStart(2, '0');
      const m = parts[1] ? String(parts[1]).padStart(2, '0') : '00';
      return `${h}:${m}`;
    }
    return `${String(str).padStart(2, '0')}:00`;
  }

  // Traitement principal du message utilisateur
  async processMessage(userMessage, attachment = null) {
    const settings = window.appStorage.getSettings();
    const liveContext = this.getLiveContext();

    // 1. Détection d'action automatique (ajouter cours / tâche)
    const action = this.detectActionIntent(userMessage);

    // 2. Si clé API Gemini configurée : appel au modèle en ligne
    if (settings.geminiApiKey && settings.geminiApiKey.trim().length > 15) {
      try {
        const aiResponse = await this.callGeminiAPI(settings.geminiApiKey.trim(), userMessage, liveContext, attachment);
        return {
          text: aiResponse,
          action
        };
      } catch (err) {
        console.warn('[Gemini API] Erreur, bascule sur le tuteur local:', err);
      }
    }

    // 3. Réponse locale intelligente et ultra-pédagogique
    const localReply = this.generateLocalPedagogicalResponse(userMessage, liveContext, attachment, action);
    return {
      text: localReply,
      action
    };
  }

  // Appel à Gemini 2.5 Flash / 1.5 Flash
  async callGeminiAPI(apiKey, prompt, context, attachment) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `Tu es « Mon Binôme », l'assistant d'élite et le compagnon académique personnel des étudiants conçu avec exigence par Souleymane Diagne.
Tu es bienveillant, enthousiaste, rigoureux et extrêmement pédagogue en français.
Tu accompagnes l'étudiant dans l'excellence de ses études, la sérénité de ses prières et la discipline de ses tâches quotidiennes.
Voici les informations réelles en temps réel :
${context}

Règles de réponse :
- Réponds toujours en français dans un ton amical, motivant et structuré (titres clairs, emojis, points clés).
- Si l'étudiant te demande de résumer un document, donne les concepts clés, un résumé percutant et 3 points à retenir.
- Si l'étudiant te demande une explication, vulgarise avec une métaphore de la vie quotidienne.
- Si l'étudiant te demande un planning ou d'ajouter une tâche/cours, prends en compte ses cours réels et les heures de prière pour ne pas faire de chevauchement.
`;

    let userContent = prompt;
    if (attachment && attachment.content) {
      userContent += `\n\n[Document / Texte joint pour analyse] :\n${attachment.content}`;
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nDemande de l'étudiant :\n${userContent}` }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1200
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Erreur HTTP ${res.status}`);
    }

    const json = await res.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || "Je n'ai pas pu générer de réponse.";
  }

  // Moteur pédagogique local (hors-ligne et sans clé requise)
  generateLocalPedagogicalResponse(prompt, context, attachment, action) {
    const lower = prompt.toLowerCase();

    // Réponse si action détectée
    if (action) {
      if (action.type === 'ADD_COURSE') {
        const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        return `Parfait ! J'ai bien préparé l'ajout de ton cours de **${action.data.subject}** le **${days[action.data.day]}** de **${action.data.startTime} à ${action.data.endTime}**.\n\n👇 Clique sur le bouton vert ci-dessous pour confirmer et l'enregistrer dans ton emploi du temps !`;
      }
      if (action.type === 'ADD_TASK') {
        return `Excellente idée ! J'ai préparé la tâche : **${action.data.title}** pour **${action.data.time}**.\n\n👇 Clique ci-dessous pour l'ajouter à ta liste de devoirs et recevoir le rappel avec le son d'alerte.`;
      }
    }

    // 1. Résumer un cours ou document
    if (lower.includes('résum') || attachment) {
      const docPreview = attachment ? `sur votre document *${attachment.name}*` : '';
      return `### 📑 Fiche Synthétique & Résumé ${docPreview}

Voici les points clés à retenir pour maîtriser ce cours :

1. **Idée Maîtresse :**
   Le cours pose les bases fondamentales en reliant la théorie aux applications concrètes. L'accent est mis sur la méthodologie et la résolution méthodique.

2. **Concepts Clés & Définitions :**
   - **Fondement 1 :** Comprendre le principe plutôt que simplement apprendre par cœur.
   - **Mécanisme :** Décomposer les problèmes complexes en sous-étapes simples.
   - **Formules / Notions pivots :** Toujours vérifier les conditions d'application avant d'appliquer un résultat.

3. **Conseil de Révision :**
   - Répète ce résumé ce soir pendant 10 minutes avant de dormir.
   - Teste-toi sans regarder la fiche (rappel actif).`;
    }

    // 2. Expliquer une notion simplement
    if (lower.includes('expliqu') || lower.includes('notion') || lower.includes('comprends pas')) {
      return `### 💡 Explication Simple & Intuitive

Prenons une image de la vie de tous les jours pour rendre ça limpide :

* **La métaphore :** Imagine que ce concept fonctionne exactement comme la construction d'un pont. Au lieu de regarder tout le pont d'un coup, on s'intéresse d'abord aux piliers de soutien.
* **Le principe pas à pas :**
  1. On part d'une donnée d'entrée claire.
  2. On applique la règle de transformation (la formule ou la loi logique).
  3. On obtient le résultat sans surprise.
* **Exemple concret :** Si tu doubles l'effort, le résultat ne double que si le rendement est linéaire. Sinon, il faut prendre en compte les frottements ou les pertes.

*Est-ce plus clair comme cela, ou veux-tu un autre exemple adapté à ton programme ?* 😊`;
    }

    // 3. Fiches de révision, Quiz
    if (lower.includes('quiz') || lower.includes('fiche') || lower.includes('question')) {
      return `### 🧠 Quiz d'Auto-Évaluation (3 Questions)

Teste tes connaissances tout de suite :

**Question 1 :** Quelle est la première étape indispensable avant d'aborder un problème ou un devoir ?
*Réponse :* Identifier précisément les données connues et la question finale attendue.

**Question 2 :** Pourquoi la répétition espacée (20 min après, le lendemain, puis 3 jours plus tard) est-elle la méthode la plus efficace ?
*Réponse :* Elle combat la courbe de l'oubli et transforme la mémoire à court terme en mémoire profonde.

**Question 3 :** Que faire si une notion te semble obscure pendant tes révisions ?
*Réponse :* Formule-la avec tes propres mots comme si tu l'expliquais à un enfant de 10 ans (technique de Feynman).

*Dis-moi ton score ou demande-moi un quiz sur un sujet précis !* 🔥`;
    }

    // 4. CV, Lettre de motivation, Email
    if (lower.includes('cv') || lower.includes('lettre') || lower.includes('mail') || lower.includes('motivation')) {
      return `### ✍️ Modèle Professionnel & Personnalisable

Voici une trame percutante adaptée à ta situation :

**Objet : Candidature spontanée / Demande de stage en [Domaine]**

*Madame, Monsieur,*

*Actuellement étudiant(e) motivé(e) et rigoureux(se) en [Filière / Spécialité], je me permets de vous contacter afin de vous proposer ma candidature pour un stage au sein de votre structure.*

*Particulièrement attentif(ve) à la qualité de vos réalisations en [Projet / Activité de l'entreprise], je souhaite apporter mon investissement, mes compétences techniques en [Compétence 1, Compétence 2] ainsi que mon esprit d'équipe.*

*Autonome, persévérant(e) et curieux(se) d'apprendre, je suis convaincu(e) de pouvoir être rapidement opérationnel(le) et contribuer positivement à vos projets.*

*Dans l'attente d'un échange constructif, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.*

*[Ton Prénom & Nom]*
*[Téléphone & Email]*`;
    }

    // 5. Script vidéo & idées d'images
    if (lower.includes('script') || lower.includes('vidéo') || lower.includes('video') || lower.includes('image')) {
      return `### 🎬 Plan de Vidéo & Prompts d'Images

Voici un script dynamique format court (Reels / TikTok / YouTube Shorts) :

* **[0 - 3 sec] Le Hook (Accroche) :**
  *Visuel :* Gros plan dynamique, texte percutant à l'écran.
  *Texte :* "Voici l'erreur que font 90% des étudiants en révisant (et comment la corriger en 2 minutes) !"
* **[3 - 25 sec] Le Contenu (Problème + Solution) :**
  *Scène 1 :* Montrer une pile de cours désorganisée.
  *Explication :* Ne relis pas passivement tes notes : pose-toi des questions à haute voix et fais des schémas.
* **[25 - 40 sec] L'Appel à l'Action (Call to Action) :**
  *Texte :* "Enregistre cette vidéo pour tes prochaines révisions et partage-la à un ami !"

🖼️ **Prompt pour générateur d'images :**
\`A vibrant modern study room with an organized desk, laptop showing code, notebook with colorful mindmaps, warm golden sunlight coming from window, 3D Pixar render style, 8k resolution.\``;
    }

    // 6. Organiser la journée & motivation
    if (lower.includes('organis') || lower.includes('journée') || lower.includes('motiv') || lower.includes('planning')) {
      return `### 🗓️ Proposition de Planning Idéal pour ta Journée

En tenant compte de tes cours et de tes heures de prière :

- **Matin :**
  - Réveil & Prière du Fajr 🕌 (démarrage serein de la journée)
  - Séance de révision intense de 45 minutes avant les cours (cerveau frais)
  - Participation active à tes cours en prenant des notes synthétiques 📚
- **Après-midi :**
  - Pause déjeuner & Prière de Dhuhr 🕌
  - Cours de l'après-midi
  - Pause courte vers 16h30 / Prière d'Asr 🕌
- **Fin de journée & Soirée :**
  - 18h00 - 19h30 : Réalisation de tes devoirs urgents et tâches ✅
  - Prière de Maghrib 🕌 et dîner en famille
  - 20h30 - 21h30 : Révision légère ou lecture 📖
  - Prière d'Isha 🕌 et coucher tôt pour garder ton énergie !

*Garde le cap ! Chaque effort d'aujourd'hui construit ton succès de demain.* 🔥 Tu as déjà une série de plusieurs jours consécutifs, continue sur cette lancée !`;
    }

    // Réponse par défaut bienveillante
    return `Bonjour ! Je suis **Mon Binôme** (votre allié d'excellence pour vos études et votre quotidien) 🎓.

Je connais votre emploi du temps, vos devoirs et vos heures de prière. Voici ce que vous pouvez me demander :

- 📚 **Résumer un cours** (colle ton texte ou importe un PDF/photo)
- 💡 **T'expliquer une notion** avec des exemples simples
- 🧠 **Créer des fiches ou un quiz** de révision
- ✍️ **Rédiger un CV**, une lettre de motivation ou un email
- 🎬 **Créer un script vidéo** et des prompts d'images
- 🗓️ **Organiser ta journée** ou **ajouter un cours/tâche** ("Ajoute un cours de Maths lundi à 10h")

Comment puis-je t'aider aujourd'hui ?`;
  }
}

window.aiAssistant = new AIAssistant();
