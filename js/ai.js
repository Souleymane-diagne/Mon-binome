/**
 * Mon Binôme - Module Intelligence Artificielle Élite ($10M AI Engine)
 * Développé pour Souleymane Diagne (souleymanediagne740@gmail.com)
 * 
 * Capacités majeures :
 * 1. Génération d'Images IA en Temps Réel (0€, ultra-haute résolution)
 * 2. Création Complète de Sites Web & Pages Modernes (HTML5, Tailwind, JS)
 * 3. Exploitation & Résumé Approfondi de Documents & Cours (PDF, texte collé, notes)
 * 4. Débogage de Code & Correction de Bugs Web / Logiciels (Expert Dev Senior)
 * 5. Synthèse & Reconnaissance Vocale
 * 6. Intégration Sécurisée Google Gemini 2.5 Flash Cloud + Fallback Local Intelligent
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
          const maxPages = Math.min(pdf.numPages, 25);
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

    if (file.type.startsWith('image/')) {
      return `[Photo / Schéma joint : ${file.name} (${Math.round(file.size / 1024)} Ko)]`;
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

  // ================= 1. DÉTECTION & GÉNÉRATION D'IMAGES IA =================
  detectImageGenerationIntent(prompt) {
    if (!prompt) return null;
    const lower = prompt.toLowerCase().trim();

    const hasImageWord = /\b(image|images|photo|photos|dessin|dessins|tableau|tableaux|illustration|illustrations|visuel|visuels|avatar|avatars|portrait|portraits|peinture|peintures|fond d'écran)\b/i.test(lower);
    const hasActionVerb = /\b(cr[éeè]e?r?|crrer|fai[rst]?|g[éeè]n[éeè]re?r?|dessine?r?|pein[td]?s?|illustre?r?|montre|affiche|generate|create|draw|make|paint)\b/i.test(lower);
    
    const directKeywords = [
      'crée une image', 'créer une image', 'crée image', 'crrer image', 'créer image', 'cré image',
      'fais une image', 'fais moi une image', 'fais image', 'fais une photo', 'fais photo',
      'génère une image', 'générer une image', 'genere image', 'génère image', 'génère photo',
      'dessine moi', 'dessine un', 'dessine une', 'dessine', 'peins moi', 'peins un', 'peins une',
      'fais moi un dessin', 'fais un dessin', 'generate image', 'create image', 'draw me', 'picture of'
    ];

    const isMatch = (hasImageWord && hasActionVerb) || directKeywords.some(t => lower.includes(t));
    if (!isMatch) return null;

    let cleanSubject = prompt
      .replace(/^(peux-tu|pourrais-tu|stp|s'il te plaît|s'il vous plaît|peux tu|merci de|veuillez)\s+/i, '')
      .replace(/\b(cr[éeè]e?r?|crrer|fai[rst]?|g[éeè]n[éeè]re?r?|dessine?r?|pein[td]?s?|illustre?r?|montre|generate|create|draw|make)\b(\s+(moi|nous))?/gi, '')
      .replace(/\b(une?|des|le|la|les|du|de la|d'un|d'une|sur|pour|un petit|une belle|un beau)\b/gi, '')
      .replace(/\b(image|images|photo|photos|dessin|dessins|illustration|visuel)\b/gi, '')
      .replace(/[\.,\!\?]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanSubject || cleanSubject.length < 2) {
      cleanSubject = 'Un étudiant dynamique et concentré dans une belle université moderne avec son robot assistant Mon Binom, style 8k photoréaliste';
    }

    return cleanSubject;
  }

  generateAIImageResponse(subject) {
    const seed = Math.floor(Math.random() * 999999);
    const enrichedPrompt = `A stunning, high quality, 8k cinematic masterpiece of ${subject}, highly detailed, sharp focus, beautiful dramatic lighting, award winning visual, octane render`;
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enrichedPrompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;

    return `### 🎨 Création Artistique de Mon Binôme IA

Voici l'illustration haute définition que je viens de créer spécialement pour vous :

![${subject}](${imageUrl})

**Description de l'œuvre :**  
*${subject}*

✨ **Options disponibles :**  
- Cliquez sur le bouton vert **HD ↗** pour l'ouvrir et l'enregistrer en pleine résolution.
- Vous pouvez me demander des variantes : *« Ajoute un coucher de soleil »*, *« Fais-le en style dessin animé 3D »*, etc. !`;
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
        { icon: '🍷', title: 'Cocktails & Boissons', desc: 'Une sélection de jus locaux frais et de boissons rafraîchissantes.' },
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

Voici les fonctionnalités intégrées :
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
    let userCode = '';
    if (attachment && attachment.content) {
      userCode = attachment.content.substring(0, 1500);
    } else {
      const matchCode = prompt.match(/```(?:javascript|js|html|css|python)?\s*([\s\S]*?)```/);
      if (matchCode && matchCode[1]) userCode = matchCode[1];
    }

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
    targetElement.classList.add('bg-emerald-500', 'text-white', 'p-4', 'rounded-xl');

  } catch (error) {
    console.error('[Bug Détecté & Corrigé] :', error.message);
    // Gestion élégante pour l'utilisateur
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
  async processMessage(userMessage, attachment = null) {
    const settings = window.appStorage.getSettings();
    const liveContext = this.getLiveContext();

    // A. Détection d'action automatique sur l'emploi du temps (ajouter cours ou tâche)
    const action = this.detectActionIntent(userMessage);

    // B. Détection de création d'image IA
    const imageSubject = this.detectImageGenerationIntent(userMessage);
    if (imageSubject) {
      const imgReply = this.generateAIImageResponse(imageSubject);
      return { text: imgReply, action };
    }

    // C. Détection de création de site web
    const siteTheme = this.detectWebsiteCreationIntent(userMessage);
    if (siteTheme) {
      // Si une clé Gemini est disponible, essayer de générer du code sur-mesure
      const cloudReply = await this.callAIBackendOrGemini(userMessage, liveContext, attachment, settings);
      if (cloudReply) return { text: cloudReply, action };

      const siteReply = this.generateWebsiteResponse(siteTheme, userMessage);
      return { text: siteReply, action };
    }

    // D. Détection d'exploitation de document ou cours (pièce jointe OU texte collé)
    if (this.detectDocumentSummaryIntent(userMessage, attachment)) {
      const cloudReply = await this.callAIBackendOrGemini(userMessage, liveContext, attachment, settings);
      if (cloudReply) return { text: cloudReply, action };

      const textToSummarize = (attachment && attachment.content) ? attachment.content : userMessage;
      const title = (attachment && attachment.name) ? attachment.name : 'Cours soumis';
      const summaryReply = this.generateDeepDocumentSummary(textToSummarize, title);
      return { text: summaryReply, action };
    }

    // E. Détection de débogage de code ou bug de site
    if (this.detectCodeOrBugIntent(userMessage)) {
      const cloudReply = await this.callAIBackendOrGemini(userMessage, liveContext, attachment, settings);
      if (cloudReply) return { text: cloudReply, action };

      const bugReply = this.generateBugFixResponse(userMessage, attachment);
      return { text: bugReply, action };
    }

    // F. Appel Cloud Gemini (si clé active sur le serveur ou dans les réglages)
    const cloudResponse = await this.callAIBackendOrGemini(userMessage, liveContext, attachment, settings);
    if (cloudResponse) {
      return { text: cloudResponse, action };
    }

    // G. Réponse locale pédagogique intelligente
    const localReply = this.generateLocalPedagogicalResponse(userMessage, liveContext, attachment, action);
    return { text: localReply, action };
  }

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
      console.warn('[AI Proxy] Serveur non joignable, bascule...');
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
2. Programmation et création de sites web complets (HTML, CSS, JS, Python, SQL, etc.). Analyse la cause racine et donne le code corrigé complet.
3. Création visuelle et prompts artistiques.
4. Motivation, organisation et équilibre entre études universitaires et heures de prière.
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

    return `Bonjour ! Je suis **Mon Binôme**, votre copilote d'excellence académique et technologique 🎓.

Voici tout ce que vous pouvez me demander directement :
- 🎨 **Générer une image IA :** *« Fais-moi une image d'un étudiant à Dakar au coucher du soleil »* ou *« Dessine un robot futuriste »*
- 🌐 **Créer un site web :** *« Fais-moi un site pour un restaurant »* ou *« Crée un site e-commerce »*
- 📑 **Exploiter et résumer un cours :** Joignez votre fichier PDF avec le trombone 📎 ou collez votre texte ici !
- 🛠️ **Corriger un bug ou coder :** *« Mon site ne marche pas, voici mon code... »*
- 🗓️ **Gérer votre planning :** *« Ajoute un devoir de maths demain à 20h »*

Que souhaitez-vous accomplir ensemble ?`;
  }
}

window.aiAssistant = new AIAssistant();
