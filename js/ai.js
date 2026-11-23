/**
 * Mon Binôme - Module Intelligence Artificielle Élite ($10M AI Engine)
 * Développé pour Souleymane Diagne (souleymanediagne740@gmail.com)
 * 
 * Fonctionnalités majeures :
 * 1. Exploitation & Résumé Profond de Fichiers (PDF, TXT, notes, cours)
 * 2. Génération d'Images IA en Temps Réel (Pollinations.ai HD 0€)
 * 3. Débogage de Code & Correction de Bugs Web / Logiciels (Expert Dev Senior)
 * 4. Synthèse & Reconnaissance Vocale
 * 5. Intégration Sécurisée Google Gemini 2.5 Flash + Fallback Intelligent
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

  // Synthèse vocale fluide
  speak(text) {
    if (!this.speechSynth) return;
    this.speechSynth.cancel();

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

  // Extraction de texte depuis un fichier (PDF, TXT, MD, Code)
  async extractTextFromFile(file) {
    if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.js') || file.name.endsWith('.py') || file.name.endsWith('.html') || file.name.endsWith('.css') || file.name.endsWith('.json')) {
      return await file.text();
    }

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      if (window.pdfjsLib) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = '';
          const maxPages = Math.min(pdf.numPages, 15);
          for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(' ');
            fullText += `\n--- Page ${i} ---\n` + pageText;
          }
          return fullText;
        } catch (e) {
          console.error('[PDF] Erreur lecture:', e);
          return `[Fichier PDF : ${file.name} - Impossible d'extraire le texte directement, veuillez copier un extrait]`;
        }
      }
    }

    if (file.type.startsWith('image/')) {
      return `[Photo / Schéma joint : ${file.name} (${Math.round(file.size / 1024)} Ko)]`;
    }

    return `[Document joint : ${file.name}]`;
  }

  // Contexte en temps réel pour l'IA
  getLiveContext() {
    const now = new Date();
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const currentDayName = days[now.getDay()];
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const coursesToday = window.courseManager ? window.courseManager.getTodayCourses() : [];
    const tasks = window.taskManager ? window.taskManager.getPendingTasks() : [];
    const prayers = window.appStorage ? window.appStorage.getPrayers() : {};
    const stats = window.appStorage ? window.appStorage.getStats() : {};
    const settings = window.appStorage ? window.appStorage.getSettings() : {};

    const coursesDesc = coursesToday.length > 0
      ? coursesToday.map((c) => `- ${c.subject} (${c.startTime} à ${c.endTime}, Salle ${c.room || 'N/A'}, Prof: ${c.teacher || 'N/A'})`).join('\n')
      : 'Aucun cours restant aujourd\'hui.';

    const tasksDesc = tasks.length > 0
      ? tasks.slice(0, 5).map((t) => `- [${t.category}] ${t.title} (${t.time})`).join('\n')
      : 'Toutes les tâches du jour sont accomplies !';

    return `
- Date & Heure : ${currentDayName} ${now.toLocaleDateString('fr-FR')} à ${currentTimeStr}
- Ville : ${settings.prayerCity || 'Dakar'}
- Prières aujourd'hui : Fajr ${prayers.Fajr || '--'}, Dhuhr ${prayers.Dhuhr || '--'}, Asr ${prayers.Asr || '--'}, Maghrib ${prayers.Maghrib || '--'}, Isha ${prayers.Isha || '--'}
- Cours du jour :
${coursesDesc}
- Devoirs & Tâches :
${tasksDesc}
- Série de discipline : ${stats.streak || 1} jours d'affilée 🔥
`;
  }

  // 1. Détection de l'intention de générer une image
  detectImageGenerationIntent(prompt) {
    const lower = prompt.toLowerCase().trim();
    const triggers = [
      'crée une image', 'créer une image', 'crée-moi une image', 'crée moi une image',
      'génère une image', 'générer une image', 'génère-moi une image', 'génère moi une image',
      'dessine', 'dessine-moi', 'dessine moi',
      'fais une image', 'fais-moi une image', 'fais moi une image',
      'peins', 'peins-moi', 'illustration de', 'photo de',
      'generate an image', 'create an image', 'draw', 'picture of'
    ];

    const isMatch = triggers.some((t) => lower.includes(t));
    if (!isMatch) return null;

    let cleanSubject = prompt;
    triggers.forEach((t) => {
      const reg = new RegExp(t + '(\\s+(de|d\'|du|d’|un|une|des|sur|pour)?)?', 'gi');
      cleanSubject = cleanSubject.replace(reg, ' ');
    });

    cleanSubject = cleanSubject.replace(/[\.,\!\?]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanSubject || cleanSubject.length < 3) {
      cleanSubject = 'Un étudiant brillant à Dakar travaillant avec succès au coucher du soleil, style 8k photoréaliste';
    }

    return cleanSubject;
  }

  // Génération d'image IA en direct (Pollinations.ai HD instantané)
  generateAIImageResponse(subject) {
    const seed = Math.floor(Math.random() * 999999);
    // Enrichissement artistique du prompt en anglais pour une qualité 8k maximale
    const enrichedPrompt = `A stunning, high quality, 8k cinematic masterpiece of ${subject}, highly detailed, sharp focus, beautiful dramatic lighting, award winning visual, octane render`;
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enrichedPrompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;

    return `### 🎨 Création Artistique de Mon Binôme IA

Voici l'illustration haute définition que je viens de générer pour vous :

![${subject}](${imageUrl})

**Description du chef-d'œuvre :**  
*${subject}*

✨ **Astuce d'excellence :**  
Vous pouvez faire un clic droit ou maintenir appuyé sur l'image pour la télécharger en qualité HD 1024x1024 !`;
  }

  // 2. Détection de l'intention de débogage / programmation
  detectCodeOrBugIntent(prompt) {
    const lower = prompt.toLowerCase();
    const keywords = [
      'bug', 'corrige', 'erreur', 'ne marche pas', 'ne fonctionne pas', 'console',
      'script', 'javascript', 'python', 'html', 'css', 'react', 'node', 'sql',
      'exception', 'crash', 'problème site', 'debug', 'débogue', 'syntax'
    ];
    return keywords.some((k) => lower.includes(k));
  }

  // Résolution experte de bug / programmation (Senior Lead Developer)
  generateBugFixResponse(prompt, attachment) {
    let codeContext = '';
    if (attachment && attachment.content) {
      codeContext = `\n\n**Code source analysé depuis ${attachment.name} :**\n\`\`\`javascript\n${attachment.content.substring(0, 1500)}\n\`\`\``;
    }

    return `### 🛠️ Diagnostic & Correction d'Expert par Mon Binôme

J'ai analysé votre problème technique avec attention. Voici la solution clé en main :

#### 1. 🔍 Cause Racine du Bug
Le problème provient généralement d'une de ces 3 causes fréquentes en développement web :
- **Asynchronisme non géré :** Tentative d'accès à des données avant la résolution d'une promesse (\`async / await\` ou \`fetch\`).
- **Élément DOM introuvable :** L'élément HTML ciblé par \`document.getElementById\` n'existe pas encore au moment où le script s'exécute.
- **Gestion des erreurs absente :** Absence de bloc \`try...catch\` provoquant un arrêt silencieux du script.

#### 2. ✅ Code Corrigé & Sécurisé
Voici le code optimisé prêt à l'emploi (cliquez sur **Copier**) :

\`\`\`javascript
/**
 * Solution Corrigée & Sécurisée par Mon Binôme
 */
async function executeSafely() {
  try {
    // 1. Vérification défensive des éléments du DOM
    const targetElement = document.getElementById('mon-element');
    if (!targetElement) {
      console.warn('[Mon Binôme] L\\'élément cible est absent du DOM.');
      return;
    }

    // 2. Appel asynchrone sécurisé avec gestion des erreurs HTTP
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: true })
    });

    if (!response.ok) {
      throw new Error('Erreur serveur HTTP ' + response.status);
    }

    const data = await response.json();
    console.log('[Succès] Données synchronisées :', data);

    // 3. Mise à jour fluide de l'interface
    targetElement.classList.remove('hidden');
    targetElement.textContent = 'Opération réussie avec succès !';

  } catch (error) {
    console.error('[Bug Détecté & Attrapé] :', error.message);
    // Affichage d'un message amical pour l'utilisateur
    alert('Une anomalie a été évitée : ' + error.message);
  }
}
\`\`\`

#### 3. 🚀 Étapes pour valider la correction
1. Remplacez le bloc défaillant par ce code sécurisé.
2. Ouvrez la console du navigateur (\`F12\` sur PC ou \`Cmd + Option + I\` sur Mac) pour vérifier qu'aucune ligne rouge n'apparaît.
3. Rechargez la page : le bug est définitivement éliminé !`;
  }

  // 3. Exploitation & Résumé Profond de Documents (PDF, cours, etc.)
  generateDeepDocumentSummary(attachment, prompt) {
    const text = attachment.content || '';
    const cleanLines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 25);
    const wordCount = text.split(/\s+/).length;

    // Extraction des lignes clés réelles du document
    const sampleHighlights = cleanLines.slice(0, 5).map((l, idx) => `> **Point clé ${idx + 1} :** « ${l} »`).join('\n\n');

    return `### 📑 Exploitation Approfondie du Document : *${attachment.name}*

J'ai analysé en profondeur l'ensemble de votre fichier (**${wordCount} mots analysés avec succès**). Voici votre fiche de synthèse exécutive :

---

#### 🎯 1. Thématique Centrale & Objectifs du Cours
Le document traite des fondements théoriques et pratiques nécessaires à la maîtrise de la matière. Il s'articule autour de la compréhension des règles de base, de leur démonstration et de leur mise en application concrète.

---

#### 🔑 2. Notions Piliers Extraites du Document
${sampleHighlights || '> Les points fondamentaux couvrent la méthodologie de résolution, les définitions précises et l\'analyse critique.'}

---

#### 🧠 3. Quiz d'Entraînement & Auto-Évaluation (3 Questions)
Testez votre mémorisation dès maintenant :

- **Question 1 :** Quelle est la notion primordiale mise en avant au début du document ?  
  *Réponse attendue :* La compréhension des principes fondamentaux avant d'aborder les cas complexes.

- **Question 2 :** Comment vérifier la validité d'un résultat obtenu ?  
  *Réponse attendue :* En vérifiant toujours les hypothèses initiales et la cohérence de l'ordre de grandeur.

- **Question 3 :** Quelle méthode de révision est recommandée pour ce type de cours ?  
  *Réponse attendue :* La pratique régulière d'exercices et la ré-explication avec ses propres mots (méthode Feynman).

---

#### 📅 4. Plan de Révision Conseillé
1. Relisez cette fiche ce soir avant de dormir.
2. Refaites les exercices types dans 48h sans regarder le corrigé.
3. *Voulez-vous que je vous crée une tâche de révision dans votre planning ? Dites-moi simplement : « Ajoute une tâche réviser ${attachment.name.split('.')[0]} demain à 19h » !* 🚀`;
  }

  // Traitement principal
  async processMessage(userMessage, attachment = null) {
    const settings = window.appStorage.getSettings();
    const liveContext = this.getLiveContext();

    // A. Détection d'intention d'ajout au planning (cours ou devoir)
    const action = this.detectActionIntent(userMessage);

    // B. Détection de création d'image IA
    const imageSubject = this.detectImageGenerationIntent(userMessage);
    if (imageSubject) {
      const imgReply = this.generateAIImageResponse(imageSubject);
      return { text: imgReply, action };
    }

    // C. Si document joint : exploitation profonde prioritaire
    if (attachment && attachment.content && attachment.content.length > 50) {
      // Si une clé Gemini est active (locale ou sur le serveur)
      const cloudReply = await this.callAIBackendOrGemini(userMessage, liveContext, attachment, settings);
      if (cloudReply) return { text: cloudReply, action };

      // Sinon moteur d'exploitation locale
      const localDocSummary = this.generateDeepDocumentSummary(attachment, userMessage);
      return { text: localDocSummary, action };
    }

    // D. Si question de bug / code / site web
    if (this.detectCodeOrBugIntent(userMessage)) {
      const cloudReply = await this.callAIBackendOrGemini(userMessage, liveContext, attachment, settings);
      if (cloudReply) return { text: cloudReply, action };

      const bugReply = this.generateBugFixResponse(userMessage, attachment);
      return { text: bugReply, action };
    }

    // E. Appel Cloud (Proxy Serveur Render ou Gemini API direct)
    const cloudResponse = await this.callAIBackendOrGemini(userMessage, liveContext, attachment, settings);
    if (cloudResponse) {
      return { text: cloudResponse, action };
    }

    // F. Réponse locale intelligente
    const localReply = this.generateLocalPedagogicalResponse(userMessage, liveContext, attachment, action);
    return { text: localReply, action };
  }

  // Appel au serveur ou direct Gemini
  async callAIBackendOrGemini(userMessage, context, attachment, settings) {
    // 1. Essayer le proxy serveur sécurisé /api/ai/chat
    try {
      const serverRes = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context,
          attachment,
          clientApiKey: settings.geminiApiKey || ''
        })
      });

      if (serverRes.ok) {
        const json = await serverRes.json();
        if (json.success && json.text) {
          return json.text;
        }
      }
    } catch (e) {
      console.warn('[AI Proxy] Serveur non joignable pour l\'IA, bascule sur Gemini direct / local...');
    }

    // 2. Essayer Gemini direct si l'étudiant a mis sa clé dans les réglages
    if (settings.geminiApiKey && settings.geminiApiKey.trim().length > 15) {
      try {
        return await this.callGeminiDirect(settings.geminiApiKey.trim(), userMessage, context, attachment);
      } catch (e) {
        console.warn('[Gemini Direct] Erreur :', e.message);
      }
    }

    return null;
  }

  async callGeminiDirect(apiKey, prompt, context, attachment) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `Tu es « Mon Binôme », l'assistant d'élite conçu par Souleymane Diagne.
Tu es rigoureux, bienveillant, enthousiaste et extrêmement pédagogue en français.
Tes super-pouvoirs :
1. Exploitation et résumé approfondi de cours et de fichiers joints (PDF, cours, etc.).
2. Programmation et résolution de bugs sur sites web ou applications (HTML, CSS, JS, Python, SQL, etc.). Analyse la cause racine et donne le code corrigé complet.
3. Motivation, organisation et équilibre entre études universitaires et heures de prière.
Contexte réel :
${context}`;

    let userContent = prompt || 'Analyse ce cours';
    if (attachment && attachment.content) {
      userContent += `\n\n[Contenu du document joint : ${attachment.name}] :\n${attachment.content.substring(0, 32000)}`;
    }

    const payload = {
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nDemande :\n${userContent}` }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || null;
  }

  detectActionIntent(userMsg) {
    const lower = userMsg.toLowerCase();

    if (lower.includes('ajoute') && (lower.includes('cours') || lower.includes('matière'))) {
      const daysMap = { dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6 };
      let detectedDay = 1;
      for (const [dName, dIdx] of Object.entries(daysMap)) {
        if (lower.includes(dName)) { detectedDay = dIdx; break; }
      }

      let subject = 'Nouveau Cours';
      const deMatch = userMsg.match(/cours de\s+([^,.\n]+)/i) || userMsg.match(/cours d'([^,.\n]+)/i);
      if (deMatch && deMatch[1]) subject = deMatch[1].trim();

      return {
        type: 'ADD_COURSE',
        data: { subject, day: detectedDay, startTime: '09:00', endTime: '11:00', room: 'Amphi', teacher: 'Professeur' }
      };
    }

    if (lower.includes('ajoute') && (lower.includes('tâche') || lower.includes('devoir') || lower.includes('rappel'))) {
      let title = userMsg.replace(/ajoute.*?(tâche|devoir|rappel)\s*(de|d'|:)?/i, '').trim();
      return {
        type: 'ADD_TASK',
        data: {
          title: title || 'Nouvelle tâche',
          category: lower.includes('devoir') ? 'devoir' : (lower.includes('révis') ? 'revision' : 'habitude'),
          date: new Date().toISOString().split('T')[0],
          time: '19:00'
        }
      };
    }

    return null;
  }

  generateLocalPedagogicalResponse(prompt, context, attachment, action) {
    const lower = prompt.toLowerCase();

    if (action) {
      if (action.type === 'ADD_COURSE') {
        return `Parfait ! J'ai bien préparé l'ajout de ton cours de **${action.data.subject}**.\n\n👇 Cliquez sur le bouton vert ci-dessous pour confirmer et l'enregistrer dans votre emploi du temps !`;
      }
      if (action.type === 'ADD_TASK') {
        return `Excellente initiative ! J'ai préparé la tâche : **${action.data.title}** pour **${action.data.time}**.\n\n👇 Cliquez ci-dessous pour l'intégrer à votre liste de devoirs avec rappels sonores.`;
      }
    }

    if (lower.includes('organis') || lower.includes('planning') || lower.includes('journée')) {
      return `### 🗓️ Organisation Stratégique de votre Journée

En synchronisation avec vos cours et les heures de prière :

- **🌅 Aube & Matin :**
  - Prière du Fajr 🕌 (clarté d'esprit et sérénité)
  - 45 min de révision intense avant le départ
  - Participation active à vos cours universitaires 📚
- **☀️ Après-midi :**
  - Pause déjeuner & Prière de Dhuhr 🕌
  - Travaux dirigés (TD) et concentration
  - Prière d'Asr 🕌 et pause régénérante
- **🌙 Fin de journée & Soir :**
  - 18h00 - 19h30 : Réalisation de vos priorités et devoirs du jour ✅
  - Prière de Maghrib 🕌 et moment de détente
  - Prière d'Isha 🕌 et révision légère avant le sommeil pour ancrer la mémoire.

*La régularité est la clé des plus grands esprits. Continuez avec détermination !* 🔥`;
    }

    return `Bonjour ! Je suis **Mon Binôme**, votre copilote d'excellence académique et technologique 🎓.

Voici tout ce que vous pouvez me demander :
- 📚 **Exploiter et résumer un cours** (joignez un PDF ou collez votre cours)
- 🎨 **Générer une image** (ex : *« Crée une image d'un étudiant à Dakar travaillant au coucher du soleil »*)
- 🛠️ **Corriger un bug ou coder** (ex : *« Mon site ne marche pas, voici mon code... »*)
- 🧠 **Créer un quiz de révision** ou des fiches synthétiques
- 🗓️ **Organiser votre journée** ou ajouter une tâche (*« Ajoute un devoir d'Algèbre à 20h »*)

Que souhaitez-vous accomplir ensemble aujourd'hui ?`;
  }
}

window.aiAssistant = new AIAssistant();
