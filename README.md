# 🏥 MedCare AI

MedCare AI est une plateforme médicale intelligente développée dans le cadre d’un projet universitaire. Elle permet d’améliorer la gestion des services médicaux grâce à l’intégration de l’intelligence artificielle.

La plateforme centralise la gestion des patients, médecins et administrateurs tout en automatisant certaines tâches médicales et administratives.

---

# 📌 Objectif du projet

L’objectif principal de MedCare AI est de moderniser la gestion médicale en proposant une plateforme intelligente permettant :

- la gestion des médecins
- la gestion des patients
- la gestion des rendez-vous
- l’analyse intelligente via IA
- la génération automatique de rapports PDF
- l’assistance administrative
- des tableaux de bord intelligents

---

# 👥 Équipe du projet

Projet réalisé par un trinôme :

## Imane
Responsable Intelligence Artificielle

Missions :

- intégration des fonctionnalités IA
- assistant intelligent
- analyse automatique
- génération de rapports PDF
- amélioration logique IA

---

## Hamza
Responsable Frontend

Missions :

- interfaces utilisateur
- design des dashboards
- expérience utilisateur
- intégration React

---

## Youssef
Responsable Backend

Missions :

- API REST
- gestion serveur
- gestion base de données
- sécurité et authentification

---

# Architecture du projet

```bash
medical-app/
│
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── config/
│   └── server.js
│
├── frontend/
│   ├── public/
│   ├── src/
│   │    ├── pages/
│   │    ├── components/
│   │    ├── hooks/
│   │    └── context/
│
└── README.md
```

---

# 👨‍⚕️ Utilisateurs de la plateforme

Le système comporte trois types d’utilisateurs :

## Administrateur

Fonctionnalités :

- gestion utilisateurs
- gestion médecins
- statistiques
- assistant IA
- génération PDF
- gestion globale

---

## Médecin

Fonctionnalités :

- suivi patients
- analyse intelligente
- rapports médicaux PDF
- gestion rendez-vous

---

## Patient

Fonctionnalités :

- création de compte
- réservation rendez-vous
- consultation informations
- accès aux services médicaux

---

# Intelligence Artificielle intégrée

MedCare AI intègre plusieurs fonctionnalités IA :

### Assistant Médecin

- analyse des informations saisies
- génération de rapports
- assistance médicale

### Assistant Patient

- orientation vers spécialité médicale adaptée

### Assistant Administrateur

- statistiques intelligentes
- génération de rapports administratifs

⚠️ Les résultats générés par l'IA sont destinés à l’assistance et ne remplacent pas un avis médical professionnel.

---

# 💻 Technologies utilisées

## Frontend

- React.js
- CSS
- Axios

## Backend

- Node.js
- Express.js

## Base de données

- MySQL

## Authentification

- JWT
- bcrypt

## Intelligence Artificielle

- Groq API

## Génération PDF

- jsPDF

---

# Installation

Cloner le projet :

```bash
git clone lien_github
```

Entrer dans le dossier :

```bash
cd medical-app
```

---

# Installation Backend

```bash
cd backend
npm install
```

Créer un fichier :

```env
.env
```

Ajouter :

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=medical_app

JWT_SECRET=your_secret

PORT=5000

GROQ_API_KEY=your_key
```

Lancer :

```bash
npm run dev
```

---

# Installation Frontend

```bash
cd frontend
npm install
npm start
```

---

# Base de données

Créer la base :

```sql
CREATE DATABASE medical_app;
```

Importer :

```bash
migrations.sql
```

---

# Lancement du projet

Backend :

```bash
npm run dev
```

Frontend :

```bash
npm start
```

Application :

```bash
http://localhost:3000
```

---

# Points forts du POC

✅ Interface moderne

✅ Trois profils utilisateurs

✅ Assistant IA

✅ Génération PDF

✅ Dashboard intelligent

✅ Gestion rendez-vous

✅ Authentification sécurisée

---

# Limites actuelles

- IA encore améliorable
- pas de téléconsultation
- notifications limitées
- application mobile absente

---

# Perspectives futures

Améliorations prévues :

- application mobile
- téléconsultation
- paiement en ligne
- IA prédictive avancée
- notifications temps réel
- chatbot plus intelligent

---

# Liens utiles

Business Plan :

Ajouter lien

Vidéo :

Ajouter lien

GitHub :

Ajouter lien

---

Projet universitaire – MedCare AI © 2026