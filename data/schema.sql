-- ====================================================================
-- MON BINÔME - Schéma PostgreSQL Production (10 000+ Utilisateurs)
-- Compatible : Supabase, Neon.tech, Render Postgres, AWS Aurora
-- ====================================================================

-- 1. Table des Utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(180) UNIQUE NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    role VARCHAR(20) DEFAULT 'user', -- 'admin' ou 'user'
    city VARCHAR(60) DEFAULT 'Dakar',
    status VARCHAR(20) DEFAULT 'active', -- 'active' ou 'suspended'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche ultra-rapide sur l'email (< 1ms)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 2. Table des Données Étudiants (Cours, Tâches, Prières, Stats, Réglages)
CREATE TABLE IF NOT EXISTS user_data (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    courses JSONB DEFAULT '[]'::jsonb,
    tasks JSONB DEFAULT '[]'::jsonb,
    prayers JSONB DEFAULT '{"Fajr":"05:45","Dhuhr":"13:05","Asr":"16:25","Maghrib":"18:48","Isha":"19:58"}'::jsonb,
    stats JSONB DEFAULT '{"streak":1,"completedTasksCount":0,"totalTasksCount":0}'::jsonb,
    settings JSONB DEFAULT '{"prayerCity":"Dakar","theme":"dark","soundType":"adhan"}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index GIN sur les champs JSONB pour requêtes analytiques instantanées
CREATE INDEX IF NOT EXISTS idx_user_data_stats ON user_data USING GIN (stats);

-- 3. Table des Annonces Administrateur (Souleymane Diagne)
CREATE TABLE IF NOT EXISTS announcements (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    author VARCHAR(100) DEFAULT 'Souleymane Diagne (Fondateur)',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertion du Fondateur & Administrateur Initial : Souleymane Diagne
-- Mot de passe : Alassane14 (Généré avec PBKDF2 sha512)
INSERT INTO users (id, name, email, password_hash, salt, role, city, status)
VALUES (
    'usr_souleymane_admin',
    'Souleymane Diagne',
    'souleymanediagne740@gmail.com',
    '9e8c4e402773413ea0f989f667107770851ec65ef9dbb6441bf7cbf9db485c2c776a3be2939db5c51b2289f8d9b9f7a78377f0a6ea58ad6498f395b1e6727271',
    '8e37a050f146241e172a6a61908b8b0e',
    'admin',
    'Dakar',
    'active'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO user_data (user_id, stats, settings)
VALUES (
    'usr_souleymane_admin',
    '{"streak": 14, "completedTasksCount": 42, "totalTasksCount": 45}'::jsonb,
    '{"prayerCity": "Dakar", "theme": "dark", "soundType": "adhan", "userName": "Souleymane"}'::jsonb
) ON CONFLICT (user_id) DO NOTHING;
