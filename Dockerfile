# Sama Kharite - Dockerfile pour hébergement cloud (Render, Railway, Fly.io, VPS)
FROM node:20-alpine

WORKDIR /app

# Copie des fichiers de l'application
COPY package.json ./
COPY server.js ./
COPY index.html ./
COPY manifest.webmanifest ./
COPY service-worker.js ./
COPY css/ ./css/
COPY js/ ./js/
COPY icons/ ./icons/
COPY data/ ./data/

# Variables d'environnement
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# Démarrage direct (aucun build ni dépendance externe requise)
CMD ["node", "server.js"]
