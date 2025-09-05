# Production Deployment Guide

## 🚀 Quick Start für Production

### Option 1: Automatisches Production-Setup (Empfohlen)

```bash
# 1. Aktueller Build (falls nicht vorhanden)
npm run build

# 2. Production starten (Frontend + Backend)
npm run production
```

Dies startet:
- **Backend**: http://localhost:5000 (Development-Modus mit nodemon)
- **Frontend**: http://localhost:3000 (Production-Build mit serve)

### Option 2: Manuelles Setup

```bash
# Terminal 1: Backend starten
cd server
npm run dev

# Terminal 2: Frontend Production-Build servieren  
cd client
serve -s build -l 3000
```

### Option 3: Vollständige Production (Kompiliert)

```bash
# 1. Frontend Build erstellen
cd client
npm run build
cd ..

# 2. Backend kompilieren
cd server
npm run build
cd ..

# 3. Production starten
npm run production
```

## 📁 Verzeichnisstruktur

```
app/
├── client/
│   ├── build/          # ← Production-Build des Frontends
│   ├── src/
│   └── package.json
├── server/
│   ├── dist/           # ← Kompiliertes Backend (nach npm run build)
│   ├── src/
│   └── package.json
└── package.json        # ← Root-Scripts
```

## 🔧 Verfügbare Scripts

### Root-Level (app/)
- `npm run dev` - Development-Modus (beide Server)
- `npm run production` - Production-Modus (Frontend-Build + Backend-Dev)
- `npm run build` - Nur Frontend bauen
- `npm run serve-build` - Nur Frontend-Build servieren

### Server (server/)
- `npm run dev` - Development mit nodemon
- `npm run build` - TypeScript kompilieren
- `npm run start` - Kompilierte Version starten
- `npm run production` - Build + Start

### Client (client/)
- `npm start` - Development-Server
- `npm run build` - Production-Build erstellen

## 🌐 URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Network**: http://192.168.0.100:3000 (Frontend)

## ⚠️ Häufige Probleme

### Problem: 404-Fehler beim Production-Build

**Ursache**: `serve` wird vom falschen Verzeichnis gestartet

**Lösung**:
```bash
# ❌ Falsch (404-Fehler)
serve -s build

# ✅ Richtig
cd client && serve -s build
# oder
npm run serve-build
```

### Problem: Backend nicht erreichbar

**Lösung**: Stelle sicher, dass beide Server laufen:
```bash
# Terminal 1
npm run server

# Terminal 2  
npm run serve-build
```

### Problem: Build-Ordner leer

**Lösung**:
```bash
cd client
npm run build
```

## 🔄 Production-Workflow

1. **Development → Production**:
   ```bash
   # Development beenden
   Ctrl+C
   
   # Build erstellen
   npm run build
   
   # Production starten
   npm run production
   ```

2. **Nach Code-Änderungen**:
   ```bash
   # Frontend-Änderungen
   npm run build
   
   # Backend-Änderungen (wenn TypeScript verwendet)
   cd server && npm run build
   ```

## 📊 Performance-Optimierungen

### Frontend (React)
- ✅ Production-Build mit Minifizierung
- ✅ Code-Splitting automatisch aktiviert
- ✅ Statische Assets mit Caching

### Backend (Node.js)
- ✅ TypeScript kompiliert zu optimiertem JavaScript
- ✅ Keine Source-Maps in Production
- ✅ Optimierte Abhängigkeiten

## 🔒 Security Checklist

- [ ] Umgebungsvariablen für Production konfiguriert
- [ ] Master-Password sicher gespeichert
- [ ] HTTPS für Production-Deployment
- [ ] CORS richtig konfiguriert
- [ ] Sensitive Daten nicht in Client-Bundle

## 📈 Monitoring

```bash
# Backend-Logs überwachen
cd server
npm run dev

# Frontend-Build-Größe prüfen
cd client
npm run build
```

Build-Analyse:
- Bundlegröße wird nach `npm run build` angezeigt
- Optimierungsvorschläge in der Konsole
