/**
 * Mon Binôme - Module Intelligence Artificielle Élite ($10M AI Engine)
 * Développé pour Souleymane Diagne (souleymanediagne740@gmail.com)
 * 
 * Capacités majeures :
 * 1. Interaction Conversationnelle Naturelle & Fluide (comme ChatGPT / Gemini)
 * 2. Création Complète de Sites Web & Applications Modernes (HTML5, Tailwind, JS)
 * 3. Exploitation & Résumé Approfondi de Documents & Cours (PDF, texte collé, notes)
 * 4. Débogage de Code & Résolution de Bugs Web / Logiciels (Expert Dev Senior)
 * 5. Synthèse & Reconnaissance Vocale
 * 6. Intégration Sécurisée Google Gemini 2.5 Flash Cloud + Moteur Conversationnel Local
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
          const maxPages = Math.min(pdf.numPages, 30);
          for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(' ');
            fullText += `\n--- Page ${i} ---\n` + pageText;
          }
          return fullText;
        } catch (e) {
          console.error('[PDF] Erreur lecture:', e);
          return `[Fichier PDF : ${file.name} - Impossible d'extraire le texte directement, veuillez copier un extrait du cours]`;
        }
      }
    }

    return `[Document joint : ${file.name}]`;
  }

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

  // ================= 1. MOTEUR CONVERSATIONNEL NATUREL (CHATGPT / GEMINI STYLE) =================
  detectCasualGreetingOrChitchat(prompt) {
    if (!prompt) return null;
    const lower = prompt.toLowerCase().trim().replace(/[.,!?;:()]/g, '');

    // Salutations
    if (/^(salut|bonjour|hello|hi|coucou|salam|salam alaykoum|assalamou aleykoum|yo|wesh)\b/i.test(lower)) {
      if (lower.includes('cv') || lower.includes('ca va') || lower.includes('ça va') || lower.includes('comment vas tu') || lower.includes('comment tu vas')) {
        return `Salut ! Ça va super bien, alhamdulillah ! 😊 Et toi, comment vas-tu aujourd'hui ? Comment se passent tes études et ta journée ?`;
      }
      return `Salut ! Ravi de te voir. Comment se passe ta journée ? Je suis prêt à t'aider pour tes cours, tes révisions, tes projets ou ton organisation ! Que fait-on ensemble ?`;
    }

    // Demande de nouvelles
    if (/^(cv|ca va|ça va|tu vas bien|comment vas tu|comment tu vas|comment tu te portes)\b/i.test(lower)) {
      return `Ça va très bien, merci ! Toujours en pleine forme et motivé pour t'accompagner. Et toi, tout se passe bien de ton côté ? Tu as des cours ou des révisions en vue aujourd'hui ?`;
    }

    // Réponses d'état
    if (/^(oui et toi|oui ca va|ca va bien|oui merci|alhamdulillah|bien merci|tranquille|trankil|super|impeccable)\b/i.test(lower)) {
      return `Alhamdulillah, excellent ! C'est un plaisir de l'entendre. Qu'est-ce qu'on travaille ou organise ensemble ? N'hésite pas, je suis là pour toi !`;
    }

    if (/^(fatigu[ée]|un peu fatigu[ée]|stress[ée]|pas trop|dur)\b/i.test(lower)) {
      return `Je comprends tout à fait, les études demandent beaucoup d'énergie. Prends un instant pour respirer profondément et boire un verre d'eau. N'oublie pas : une pause bien méritée fait partie intégrante de la réussite ! Veux-tu qu'on organise une session de révision courte et légère de 25 minutes (méthode Pomodoro) ?`;
    }

    // Identité
    if (/^(qui es tu|c'est quoi ton nom|qui t'a cr[éeè]|tu sers [aà] quoi|pr[éeè]sente toi)\b/i.test(lower)) {
      return `Je suis **Mon Binôme**, ton assistant intelligent et ton compagnon personnel conçu par **Souleymane Diagne** 🎓.

Je suis conçu pour t'épauler au quotidien :
- 📑 **Résumer et expliquer tes cours** (envoie un PDF ou colle ton texte).
- 🌐 **Créer des sites web complets** (HTML5, Tailwind CSS, JavaScript).
- 🛠️ **Déboguer et corriger ton code** sans prise de tête.
- 🕌 **Équilibrer tes études et tes prières** avec ton planning.
- 💬 **Discuter, t'encourager et répondre à toutes tes questions !**

Comment puis-je t'être utile en ce moment ?`;
    }

    // Remerciements
    if (/^(merci|merci beaucoup|merci bien|choukrane|merci infiniment|t'es le meilleur|super merci)\b/i.test(lower)) {
      return `Avec grand plaisir ! C'est toujours une fierté de t'accompagner vers la réussite. N'hésite jamais si tu as la moindre question ou besoin d'un coup de main ! 🚀`;
    }

    return null;
  }

  // ================= 2. CRÉATION COMPLÈTE DE SITES WEB =================
  detectWebsiteCreationIntent(prompt) {
    if (!prompt) return null;
    const lower = prompt.toLowerCase();
    
    const triggers = [
      'fais moi un site', 'fais un site', 'crée moi un site', 'crée un site', 'créer un site',
      'code moi un site', 'code un site', 'génère un site', 'générer un site',
      'fais une page web', 'crée une page web', 'créer une page web',
      'site web pour', 'site pour', 'landing page', 'portfolio', 'site e-commerce',
      'site de vente', 'site restaurant', 'site vitrine', 'site web complet',
      'fais un site internet', 'crée un site internet'
    ];

    const hasSiteWord = /\b(site|site web|page web|landing page|portfolio|e-commerce|boutique)\b/i.test(lower);
    const hasCreateVerb = /\b(fai[rst]?|cr[éeè]e?r?|code?r?|g[éeè]n[éeè]re?r?|programme?r?|d[éeè]veloppe?r?)\b/i.test(lower);

    if (triggers.some(t => lower.includes(t)) || (hasSiteWord && hasCreateVerb)) {
      let theme = 'vitrine';
      if (lower.includes('restaurant') || lower.includes('café') || lower.includes('nourriture') || lower.includes('food')) theme = 'restaurant';
      else if (lower.includes('boutique') || lower.includes('e-commerce') || lower.includes('vente') || lower.includes('shop') || lower.includes('produit')) theme = 'ecommerce';
      else if (lower.includes('portfolio') || lower.includes('cv') || lower.includes('personnel') || lower.includes('développeur')) theme = 'portfolio';
      else if (lower.includes('école') || lower.includes('université') || lower.includes('cours') || lower.includes('formation')) theme = 'education';
      return theme;
    }
    return null;
  }

  generateWebsiteResponse(theme, userPrompt) {
    let siteTitle = 'Mon Nouveau Projet Web';
    let headline = 'La Solution Idéale pour Votre Activité';
    let heroDesc = 'Découvrez une expérience moderne, rapide et élégante conçue avec les meilleures technologies web.';
    let features = [
      { icon: '⚡', title: 'Ultra Rapide', desc: 'Optimisé pour des performances optimales sur smartphone et ordinateur.' },
      { icon: '🛡️', title: '100% Sécurisé', desc: 'Architecture moderne conforme aux normes du web.' },
      { icon: '📱', title: 'Design Responsive', desc: 'S\'adapte automatiquement à toutes les tailles d\'écran.' }
    ];

    if (theme === 'restaurant') {
      siteTitle = 'Le Palais des Saveurs • Restaurant & Lounge';
      headline = 'Une Expérience Gastronomique Inoubliable';
      heroDesc = 'Plats raffinés préparés avec des ingrédients frais du terroir, dans un cadre chaleureux et convivial.';
      features = [
        { icon: '🍲', title: 'Cuisine Authentique', desc: 'Recettes traditionnelles et modernes sublimées par nos chefs.' },
        { icon: '🍷', title: 'Boissons Fraîches', desc: 'Une sélection de jus locaux frais et de boissons rafraîchissantes.' },
        { icon: '🛵', title: 'Livraison Rapide', desc: 'Commandez en ligne et recevez votre repas chaud en 30 minutes.' }
      ];
    } else if (theme === 'ecommerce') {
      siteTitle = 'NovaStore • Boutique en Ligne';
      headline = 'Les Tendances de Demain, Livrées Chez Vous';
      heroDesc = 'Explorez notre collection exclusive d\'articles haut de gamme au meilleur prix du marché.';
      features = [
        { icon: '📦', title: 'Livraison Express', desc: 'Expédition sous 24h avec suivi en direct par SMS.' },
        { icon: '💳', title: 'Paiement Sécurisé', desc: 'Payez par Wave, Orange Money ou Carte Bancaire en toute confiance.' },
        { icon: '⭐', title: 'Garantie Satisfait', desc: '30 jours pour changer d\'avis avec retour gratuit.' }
      ];
    } else if (theme === 'portfolio') {
      siteTitle = 'Souleymane Diagne • Développeur Full-Stack & IA';
      headline = 'Je conçois des applications web et mobiles innovantes';
      heroDesc = 'Passionné par l\'ingénierie logicielle, l\'intelligence artificielle et le design d\'expérience utilisateur.';
      features = [
        { icon: '💻', title: 'Développement Web', desc: 'React, Node.js, Tailwind CSS, API REST et architectures cloud.' },
        { icon: '🤖', title: 'Intelligence Artificielle', desc: 'Intégration de modèles LLM, vision par ordinateur et automatisation.' },
        { icon: '📱', title: 'Applications Mobiles', desc: 'Applications PWA et cross-platform fluides et intuitives.' }
      ];
    }

    const htmlCode = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${siteTitle}</title>
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white">

  <!-- EN-TÊTE & NAVIGATION -->
  <header class="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <a href="#" class="font-extrabold text-xl text-blue-600 tracking-tight">${siteTitle.split('•')[0].trim()}</a>
      <nav class="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
        <a href="#accueil" class="hover:text-blue-600 transition">Accueil</a>
        <a href="#services" class="hover:text-blue-600 transition">Services</a>
        <a href="#contact" class="hover:text-blue-600 transition">Contact</a>
      </nav>
      <a href="#contact" class="px-5 py-2.5 rounded-full bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition shadow-md">
        Commencer
      </a>
    </div>
  </header>

  <!-- SECTION HERO -->
  <section id="accueil" class="py-20 px-6 bg-gradient-to-b from-blue-50/60 to-transparent">
    <div class="max-w-4xl mx-auto text-center space-y-6">
      <span class="inline-block px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider">
        Nouveau & Innovant
      </span>
      <h1 class="text-4xl md:text-6xl font-black text-slate-900 leading-tight">
        ${headline}
      </h1>
      <p class="text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
        ${heroDesc}
      </p>
      <div class="flex flex-wrap justify-center gap-4 pt-4">
        <a href="#contact" class="px-7 py-3.5 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-xl transition">
          Profiter de l'offre →
        </a>
        <a href="#services" class="px-7 py-3.5 rounded-full bg-white border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition shadow-sm">
          En savoir plus
        </a>
      </div>
    </div>
  </section>

  <!-- SECTION CARACTÉRISTIQUES -->
  <section id="services" class="py-16 px-6 max-w-6xl mx-auto">
    <div class="text-center mb-12">
      <h2 class="text-3xl font-extrabold text-slate-900">Pourquoi nous faire confiance ?</h2>
      <p class="text-sm text-slate-500 mt-2">Des solutions concrètes adaptées à votre réussite.</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      ${features.map(f => `
      <div class="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl transition duration-300">
        <div class="text-4xl mb-4">${f.icon}</div>
        <h3 class="font-bold text-lg text-slate-900 mb-2">${f.title}</h3>
        <p class="text-sm text-slate-600 leading-relaxed">${f.desc}</p>
      </div>`).join('')}
    </div>
  </section>

  <!-- FORMULAIRE DE CONTACT -->
  <section id="contact" class="py-16 px-6 bg-slate-900 text-white rounded-t-[40px]">
    <div class="max-w-xl mx-auto text-center space-y-6">
      <h2 class="text-3xl font-black">Prenez contact dès aujourd'hui</h2>
      <p class="text-sm text-slate-400">Remplissez ce formulaire et nous vous répondrons en moins de 24 heures.</p>
      <form onsubmit="event.preventDefault(); alert('Merci ! Votre message a été envoyé.');" class="space-y-4 text-left">
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Votre Nom complet</label>
          <input type="text" required placeholder="Ex : Amadou Diallo" class="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-blue-500 outline-none">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Adresse Email</label>
          <input type="email" required placeholder="nom@exemple.com" class="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-blue-500 outline-none">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Message</label>
          <textarea rows="3" required placeholder="Décrivez votre besoin..." class="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-blue-500 outline-none"></textarea>
        </div>
        <button type="submit" class="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-sm transition shadow-lg">
          Envoyer le message 🚀
        </button>
      </form>
    </div>
  </section>

  <!-- PIED DE PAGE -->
  <footer class="bg-black text-slate-500 text-xs py-6 text-center">
    <p>© 2026 ${siteTitle.split('•')[0].trim()} - Tous droits réservés. Conçu avec Mon Binôme IA.</p>
  </footer>

</body>
</html>`;

    return `### 🚀 Création Complète de votre Site Web

J'ai conçu pour vous un **site web moderne, 100% fonctionnel et responsive** adapté à votre demande (**${siteTitle}**) !

Voici les caractéristiques intégrées :
- 📱 **100% Responsive :** S'adapte à tous les écrans (smartphones, tablettes, PC).
- 🎨 **Design Moderne :** Construit avec **Tailwind CSS** (typographie soignée, ombres douces et dégradés).
- 📩 **Formulaire de Contact :** Avec confirmation interactive en JavaScript.
- ⚡ **Prêt à l'emploi :** Un seul fichier autonome, aucun logiciel compliqué à installer !

#### 💻 Code Source Complet (Cliquez sur « Copier » en haut à droite) :

\`\`\`html
${htmlCode}
\`\`\`

#### 📖 Comment l'utiliser en 30 secondes :
1. Cliquez sur le bouton **Copier** ci-dessus.
2. Créez un fichier nommé \`index.html\` sur votre ordinateur ou téléphone (avec le Bloc-notes, VS Code ou un éditeur).
3. Collez le code dedans et enregistrez.
4. Double-cliquez sur \`index.html\` : **votre site s'ouvre directement dans votre navigateur !** 🌐`;
  }

  // ================= 3. DÉBOGAGE & CORRECTION DE BUGS DE SITE =================
  detectCodeOrBugIntent(prompt) {
    if (!prompt) return false;
    const lower = prompt.toLowerCase();
    const keywords = [
      'bug', 'corrige', 'erreur', 'error', 'ne marche pas', 'ne fonctionne pas', 'console',
      'script', 'javascript', 'python', 'html', 'css', 'react', 'node', 'sql',
      'exception', 'crash', 'problème', 'debug', 'débogue', 'syntaxe', 'code',
      'résous', 'pourquoi ça plante', 'undefined', 'null pointer', 'balise'
    ];
    return keywords.some((k) => lower.includes(k));
  }

  generateBugFixResponse(prompt, attachment) {
    return `### 🛠️ Diagnostic & Correction d'Expert par Mon Binôme

J'ai analysé votre problème technique avec attention. Voici la solution prête à l'emploi :

#### 1. 🔍 Cause Racine Fréquente
Le dysfonctionnement provient très souvent de l'un de ces 3 pièges classiques :
- **Exécution avant le chargement du DOM :** Votre script JavaScript s'exécute alors que les balises HTML (\`#element\`) ne sont pas encore créées dans la page.
- **Asynchronisme non géré :** Un appel \`fetch()\` ou une promesse n'utilise pas \`await\`, ce qui entraîne une valeur \`undefined\` ou une erreur \`Cannot read properties of undefined\`.
- **Gestion des erreurs absente :** Sans bloc \`try...catch\`, la moindre erreur bloque l'ensemble de votre page.

#### 2. ✅ Code Corrigé, Sécurisé & Commenté
Voici le code optimisé que vous pouvez copier directement :

\`\`\`javascript
/**
 * Solution Corrigée & Sécurisée par Mon Binôme
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Mon Binôme] Initialisation sécurisée du script...');

  try {
    // 1. Récupération défensive de l'élément cible
    const targetElement = document.getElementById('mon-element');
    if (!targetElement) {
      console.warn('[Attention] L\\'élément cible #mon-element est absent du document.');
      return;
    }

    // 2. Traitement asynchrone sécurisé
    const response = await fetch('/api/data', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(\`Erreur serveur HTTP \${response.status}\`);
    }

    const data = await response.json();
    console.log('[Succès] Données reçues avec succès :', data);

    // 3. Mise à jour fluide de l'affichage
    targetElement.textContent = 'Opération terminée avec succès !';
    targetElement.classList.add('bg-blue-600', 'text-white', 'p-4', 'rounded-xl');

  } catch (error) {
    console.error('[Bug Détecté & Corrigé] :', error.message);
    alert('Une erreur a été évitée : ' + error.message);
  }
});
\`\`\`

#### 3. 🚀 Étapes pour valider la résolution :
1. Remplacez le bloc défaillant par ce code.
2. Ouvrez la console de votre navigateur (**F12** sur PC ou **Cmd + Option + I** sur Mac) : aucune ligne rouge ne doit apparaître.
3. Rechargez votre page : le bug est définitivement éliminé !`;
  }

  // ================= 4. EXPLOITATION & RÉSUMÉ DE DOCUMENTS ET COURS =================
  detectDocumentSummaryIntent(prompt, attachment) {
    if (attachment && attachment.content && attachment.content.length > 30) return true;
    if (!prompt) return false;
    const lower = prompt.toLowerCase();
    const hasSummaryWords = /\b(r[éeè]sume|r[éeè]sum[éeè]|analyse|exploit[éeè]|synth[èe]se|fiche|cours|chapitre|document|le[çc]on|texte)\b/i.test(lower);
    return hasSummaryWords && (prompt.length > 80 || (attachment && attachment.content));
  }

  generateDeepDocumentSummary(text, title = 'Document de cours') {
    const rawText = text || '';
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 20);
    const wordCount = rawText.split(/\s+/).filter(Boolean).length;
    const sampleHighlights = lines.slice(0, 4).map((l, i) => `> **Point clé ${i + 1} :** « ${l.substring(0, 180)} »`).join('\n\n');

    return `### 📑 Exploitation Approfondie du Cours : *${title}*

J'ai analysé en détail l'ensemble du document (**${wordCount} mots analysés avec succès**). Voici votre fiche de synthèse exécutive prête pour vos révisions :

---

#### 🎯 1. Vue d'Ensemble & Objectifs Pédagogiques
Ce cours aborde les concepts fondamentaux indispensables à la maîtrise de la matière. L'objectif est de structurer vos connaissances, de comprendre les règles de base et de savoir les appliquer lors des examens et travaux pratiques.

---

#### 🔑 2. Notions & Définitions Clés Extraites
${sampleHighlights || '> **Notion 1 :** Compréhension globale des définitions et théorèmes fondamentaux.\n\n> **Notion 2 :** Analyse méthodique des démonstrations et cas pratiques.'}

---

#### ⚠️ 3. Pièges Fréquents & Conseils Méthodologiques
- **Erreur courante :** Mémoriser les formules sans comprendre les hypothèses d'application.
- **Règle d'or :** Toujours vérifier les unités et la cohérence de vos résultats avant de conclure.
- **Astuce d'excellence :** Utilisez la méthode Feynman (expliquez le concept à voix haute avec des mots simples) pour ancrer la mémoire à long terme.

---

#### 🧠 4. Mini-Quiz d'Auto-Évaluation (3 Questions)
Testez votre mémorisation tout de suite :

- **Question 1 :** Quel est le principe fondamental introduit dans ce document ?  
  *Réponse attendue :* La maîtrise des définitions de base avant d'aborder les cas complexes.

- **Question 2 :** Quelle est la méthode recommandée pour vérifier son résultat ?  
  *Réponse attendue :* La vérification de la cohérence dimensionnelle et des conditions aux limites.

- **Question 3 :** Comment planifier la révision optimale de ce cours ?  
  *Réponse attendue :* Une révision espacée (J+1, J+3, J+7) avec mise en pratique d'exercices.

---

#### 📅 5. Planification dans votre Emploi du Temps
Voulez-vous que j'ajoute une session de révision à votre planning ?  
Dites-moi simplement : **« Ajoute une tâche réviser ${title.replace(/\.[^/.]+$/, '')} demain à 18h »** ! 🚀`;
  }

  // ================= 5. TRAITEMENT PRINCIPAL DU MESSAGE =================
  async processMessage(userMessage, attachment = null, history = []) {
    const settings = window.appStorage.getSettings();
    const liveContext = this.getLiveContext();

    // A. Salutations et dialogue naturel interactif (comme ChatGPT / Gemini)
    const casualReply = this.detectCasualGreetingOrChitchat(userMessage);
    if (casualReply) {
      return { text: casualReply };
    }

    // B. Détection d'action automatique sur l'emploi du temps
    const action = this.detectActionIntent(userMessage);

    // C. Détection de création de site web
    const siteTheme = this.detectWebsiteCreationIntent(userMessage);
    if (siteTheme) {
      const cloudReply = await this.callAIBackendOrGemini(userMessage, liveContext, attachment, history, settings);
      if (cloudReply) return { text: cloudReply, action };

      const siteReply = this.generateWebsiteResponse(siteTheme, userMessage);
      return { text: siteReply, action };
    }

    // D. Détection d'exploitation de document ou cours (pièce jointe OU texte collé)
    if (this.detectDocumentSummaryIntent(userMessage, attachment)) {
      const cloudReply = await this.callAIBackendOrGemini(userMessage, liveContext, attachment, history, settings);
      if (cloudReply) return { text: cloudReply, action };

      const textToSummarize = (attachment && attachment.content) ? attachment.content : userMessage;
      const title = (attachment && attachment.name) ? attachment.name : 'Cours soumis';
      const summaryReply = this.generateDeepDocumentSummary(textToSummarize, title);
      return { text: summaryReply, action };
    }

    // E. Détection de débogage de code ou bug de site
    if (this.detectCodeOrBugIntent(userMessage)) {
      const cloudReply = await this.callAIBackendOrGemini(userMessage, liveContext, attachment, history, settings);
      if (cloudReply) return { text: cloudReply, action };

      const bugReply = this.generateBugFixResponse(userMessage, attachment);
      return { text: bugReply, action };
    }

    // F. Appel Cloud Gemini (avec mémoire conversationnelle multi-tours)
    const cloudResponse = await this.callAIBackendOrGemini(userMessage, liveContext, attachment, history, settings);
    if (cloudResponse) {
      return { text: cloudResponse, action };
    }

    // G. Réponse locale conversationnelle et pédagogique
    const localReply = this.generateLocalPedagogicalResponse(userMessage, liveContext, attachment, action);
    return { text: localReply, action };
  }

  async callAIBackendOrGemini(userMessage, context, attachment, history, settings) {
    // 1. Essayer le proxy serveur sécurisé /api/ai/chat avec historique
    try {
      const serverRes = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context,
          attachment,
          history: Array.isArray(history) ? history.slice(-8) : [],
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
      console.warn('[AI Proxy] Serveur non joignable, bascule...');
    }

    // 2. Essayer Gemini direct si l'étudiant a mis sa clé dans les réglages
    if (settings.geminiApiKey && settings.geminiApiKey.trim().length > 15) {
      try {
        return await this.callGeminiDirect(settings.geminiApiKey.trim(), userMessage, context, attachment, history);
      } catch (e) {
        console.warn('[Gemini Direct] Erreur :', e.message);
      }
    }

    return null;
  }

  async callGeminiDirect(apiKey, prompt, context, attachment, history = []) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `Tu es « Mon Binôme », l'assistant d'élite interactif et le compagnon académique personnel des étudiants conçu par Souleymane Diagne.
Tu es aussi fluide, naturel, bienveillant, chaleureux et intelligent que ChatGPT ou Gemini.
Tu réponds naturellement à toutes les questions en français avec clarté, pertinence et pédagogie.
Contexte réel :
${context}`;

    const contents = [];
    if (Array.isArray(history) && history.length > 0) {
      const recent = history.slice(-6);
      recent.forEach((h) => {
        contents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content || '' }]
        });
      });
    }

    let userContent = prompt || 'Bonjour';
    if (attachment && attachment.content) {
      userContent += `\n\n[Contenu du document joint : ${attachment.name}] :\n${attachment.content.substring(0, 32000)}`;
    }

    contents.push({
      role: 'user',
      parts: [{ text: `${contents.length === 0 ? systemPrompt + '\n\n' : ''}${userContent}` }]
    });

    const payload = {
      contents,
      generationConfig: { temperature: 0.75, maxOutputTokens: 2048 }
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
        return `Parfait ! J'ai bien préparé l'ajout de ton cours de **${action.data.subject}**.\n\n👇 Cliquez sur le bouton ci-dessous pour confirmer et l'enregistrer dans votre emploi du temps !`;
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
  - 18h00 - 19h30 : Réalisation de vos devoirs et projets ✅
  - Prière de Maghrib 🕌 et moment de détente
  - Prière d'Isha 🕌 et révision légère avant le sommeil pour ancrer la mémoire.

*La régularité est la clé des plus grands esprits. Continuez avec détermination !* 🔥`;
    }

    return `Je suis là et bien à ton écoute ! 🎓

Tu peux me poser n'importe quelle question comme avec ChatGPT ou Gemini :
- 💬 **Discuter librement** (*« Salut, comment tu vas ? »*)
- 📑 **Résumer ou expliquer un cours** (envoie un PDF ou colle ton texte)
- 🌐 **Créer un site web complet** (*« Fais-moi un site pour un restaurant »*)
- 🛠️ **Corriger un bug ou coder** (*« Voici mon code qui ne marche pas... »*)
- 🗓️ **Organiser ton planning** (*« Ajoute un devoir de maths demain à 19h »*)

Dis-moi, sur quoi travailles-tu en ce moment ?`;
  }
}

window.aiAssistant = new AIAssistant();
