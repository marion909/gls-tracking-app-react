# GLS Tracking App - React Edition

Eine moderne, sichere Web-Anwendung zur automatisierten Verfolgung von GLS-Sendungen mit Real-time Updates und verschlüsselter Datenspeicherung.

## 🚀 Ersteinrichtung

### Voraussetzungen
- Node.js (Version 16 oder höher)
- npm oder yarn
- Microsoft Edge Browser (für WebDriver)

### 1. Installation

```bash
# Repository klonen
git clone https://github.com/marion909/gls-tracking-app-react.git
cd gls-tracking-app-react/app

# Dependencies installieren
npm install

# Client Dependencies installieren
cd client && npm install
cd ..

# Server Dependencies installieren  
cd server && npm install
cd ..
```

### 2. Datenbank initialisieren

```bash
# Datenbank-Migration ausführen
cd server
npx prisma migrate deploy
npx prisma generate
cd ..
```

### 3. Anwendung starten

```bash
# Beide Services (Frontend + Backend) gleichzeitig starten
npm run dev
```

Die Anwendung ist nun verfügbar unter:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

### 4. Ersteinrichtung in der Anwendung

#### Schritt 1: Master-Passwort festlegen
1. Öffnen Sie http://localhost:3000 im Browser
2. Beim ersten Start werden Sie aufgefordert, ein **Master-Passwort** zu erstellen
3. Wählen Sie ein starkes Passwort (mindestens 8 Zeichen)
4. Dieses Passwort wird zur Verschlüsselung Ihrer GLS-Zugangsdaten verwendet

#### Schritt 2: GLS-Zugangsdaten konfigurieren
1. Nach der Anmeldung navigieren Sie zu den **Einstellungen**
2. Geben Sie Ihre GLS-Portal-Zugangsdaten ein:
   - **Benutzername**: Ihr GLS-Portal Benutzername
   - **Passwort**: Ihr GLS-Portal Passwort
3. Die Daten werden automatisch mit AES-256-Verschlüsselung gesichert

#### Schritt 3: Erste Sendungen laden
1. Kehren Sie zum **Dashboard** zurück
2. Klicken Sie auf **"Vom GLS Portal laden"**
3. Geben Sie Ihr Master-Passwort ein
4. Die Anwendung lädt automatisch alle verfügbaren Sendungen

## 🔧 Funktionen

### 🔐 Sicherheit
- **AES-256-CBC Verschlüsselung** für GLS-Zugangsdaten
- **PBKDF2-Passwort-Hashing** für Master-Passwort
- **JWT-Token-basierte Authentifizierung**
- **HTTP-Only Cookies** für sichere Session-Verwaltung

### 📦 Sendungsverfolgung
- **Automatisches Laden** aller Sendungen vom GLS-Portal
- **Real-time Browser-Automation** mit Selenium WebDriver
- **Intelligente Datenextraktion** mit mehreren Fallback-Strategien
- **Filteroptionen** (Zugestellte/Stornierte ausblenden)

### 🎯 Benutzeroberfläche
- **Material-UI Design** mit modernem, responsivem Layout
- **Deutsche Benutzeroberfläche** 
- **Übersichtliches Dashboard** mit Sendungsstatistiken
- **Detailansicht** für einzelne Sendungen

### 🔄 Automatisierung
- **Edge WebDriver Integration** für stabile Portal-Zugriffe
- **Robuste Fehlerbehandlung** bei Netzwerkproblemen
- **Automatische Wiederholung** bei temporären Fehlern
- **Background-Processing** ohne UI-Blockierung

## 🏗️ Technische Architektur

### Backend (Node.js/TypeScript)
- **Express.js** Web-Framework
- **Prisma ORM** mit SQLite-Datenbank
- **Selenium WebDriver** für Browser-Automation
- **Socket.IO** für Real-time Communication
- **bcrypt + crypto** für Verschlüsselung

### Frontend (React/TypeScript)
- **React 18** mit TypeScript
- **Material-UI (MUI)** Component Library
- **Socket.IO Client** für Live-Updates
- **Responsive Design** für alle Geräte

### Datenbank-Schema
```sql
-- Anwendungskonfiguration
AppConfig {
  id: String (Primary Key)
  masterPasswordHash: String (PBKDF2)
  masterPasswordSalt: String
  glsUsernameEnc: String (AES-256)
  glsPasswordEnc: String (AES-256)
}

-- Sendungsinformationen
TrackingInfo {
  id: Int (Auto-increment)
  trackingNumber: String (Unique)
  customerName: String
  status: String
  location: String?
  lastUpdate: DateTime?
  isOverdue: Boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

## 🔒 Sicherheitskonzept

### Verschlüsselung
- **Master-Passwort**: PBKDF2 mit 100.000 Iterationen
- **GLS-Zugangsdaten**: AES-256-CBC mit Master-Passwort als Key
- **Session-Management**: JWT-Tokens mit HTTP-Only Cookies

### Browser-Automation
- **Headless-Modus** für Production
- **User-Agent Rotation** zur Vermeidung von Blocking
- **Proxy-Support** für Unternehmensumgebungen
- **Automatisches Cookie-Management**

## 📝 Entwicklung

### Projekt starten (Development)
```bash
npm run dev          # Startet Frontend + Backend
npm run client       # Nur Frontend (Port 3000)
npm run server       # Nur Backend (Port 5000)
```

### Build für Production
```bash
npm run build        # Baut beide Projekte
cd client && npm run build    # Nur Frontend
cd server && npm run build    # Nur Backend
```

### Datenbank-Änderungen
```bash
cd server
npx prisma migrate dev       # Neue Migration erstellen
npx prisma studio           # Datenbank-GUI öffnen
npx prisma generate         # Client neu generieren
```

## 🐛 Troubleshooting

### Häufige Probleme

**"Driver not initialized" Fehler:**
- Stellen Sie sicher, dass Microsoft Edge installiert ist
- Prüfen Sie die WebDriver-Berechtigungen

**GLS-Login schlägt fehl:**
- Überprüfen Sie Ihre GLS-Portal-Zugangsdaten
- Testen Sie den Login manuell im Browser
- Prüfen Sie Firewall/Proxy-Einstellungen

**Sendungen werden nicht geladen:**
- Kontrollieren Sie die Netzwerkverbindung
- Prüfen Sie die Browser-Logs in der Konsole
- Starten Sie die Anwendung neu

**Master-Passwort vergessen:**
- Löschen Sie die Datei `server/prisma/gls_tracking.db`
- Starten Sie die Anwendung neu für eine Neueinrichtung

## Project Structure

```
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Wiederverwendbare Komponenten
│   │   ├── pages/          # Hauptseiten (Dashboard, Login, etc.)
│   │   ├── hooks/          # Custom React Hooks
│   │   ├── services/       # API-Services
│   │   ├── types/          # TypeScript Typdefinitionen
│   │   └── utils/
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── middleware/     # Express Middleware
│   │   ├── routes/         # API-Routen
│   │   ├── services/       # Business Logic (GLS, Encryption, etc.)
│   │   └── index.ts        # Server-Einstiegspunkt
│   ├── prisma/            # Datenbank-Schema und Migrationen
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── gls_tracking.db
│   └── package.json
└── package.json           # Root-Konfiguration
```

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz veröffentlicht. Siehe [LICENSE](LICENSE) für Details.

## 🤝 Mitwirken

Beiträge sind willkommen! Bitte:
1. Forken Sie das Repository
2. Erstellen Sie einen Feature-Branch
3. Committen Sie Ihre Änderungen
4. Pushen Sie den Branch
5. Öffnen Sie eine Pull Request

## 📞 Support

Bei Fragen oder Problemen:
- Öffnen Sie ein [GitHub Issue](https://github.com/marion909/gls-tracking-app-react/issues)
- Beschreiben Sie das Problem detailliert
- Fügen Sie Log-Ausgaben bei, falls verfügbar

---

**Hinweis**: Diese Anwendung ist für den privaten/internen Gebrauch entwickelt. Bitte respektieren Sie die Nutzungsbedingungen des GLS-Portals und verwenden Sie die Anwendung verantwortungsvoll.
