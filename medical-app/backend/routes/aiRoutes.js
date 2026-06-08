const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const axios = require('axios');

// Symptom → condition knowledge base
const SYMPTOM_DB = [
    {
        condition: 'Grippe / Infection virale',
        specialite: 'Médecine générale',
        urgence: 'faible',
        symptoms: ['fièvre', 'toux', 'fatigue', 'courbatures', 'maux de tête', 'frissons', 'nez qui coule'],
        conseil: 'Repos, hydratation, paracétamol si fièvre > 38.5°C. Consultez si fièvre > 39.5°C ou > 3 jours.'
    },
    {
        condition: 'Hypertension artérielle',
        specialite: 'Cardiologie',
        urgence: 'moyen',
        symptoms: ['maux de tête', 'vertiges', 'vision floue', 'bourdonnements', 'saignement de nez', 'palpitations'],
        conseil: 'Mesurez votre tension. Évitez le sel et le stress. Consultez un cardiologue rapidement.'
    },
    {
        condition: 'Problème cardiaque',
        specialite: 'Cardiologie',
        urgence: 'élevé',
        symptoms: ['douleur thoracique', 'essoufflement', 'palpitations', 'douleur bras gauche', 'sueurs froides', 'nausées'],
        conseil: '⚠️ URGENCE — Appelez le 15 (SAMU) immédiatement si douleur thoracique intense.'
    },
    {
        condition: 'Diabète / Hyperglycémie',
        specialite: 'Endocrinologie',
        urgence: 'moyen',
        symptoms: ['soif excessive', 'urines fréquentes', 'fatigue', 'vision floue', 'perte de poids', 'cicatrisation lente'],
        conseil: 'Contrôlez votre glycémie. Consultez un endocrinologue pour bilan complet.'
    },
    {
        condition: 'Infection respiratoire / Bronchite',
        specialite: 'Pneumologie',
        urgence: 'faible',
        symptoms: ['toux', 'expectorations', 'essoufflement', 'douleur poitrine', 'fièvre', 'sifflement'],
        conseil: 'Évitez la fumée, restez hydraté. Consultez si essoufflement au repos ou fièvre persistante.'
    },
    {
        condition: 'Problème dermatologique',
        specialite: 'Dermatologie',
        urgence: 'faible',
        symptoms: ['démangeaisons', 'éruption cutanée', 'rougeurs', 'plaques', 'boutons', 'peau sèche', 'urticaire'],
        conseil: 'Évitez de gratter. Utilisez une crème hydratante. Consultez un dermatologue.'
    },
    {
        condition: 'Trouble anxieux / Stress',
        specialite: 'Psychiatrie',
        urgence: 'faible',
        symptoms: ['anxiété', 'insomnie', 'palpitations', 'tremblements', 'irritabilité', 'difficultés concentration', 'fatigue'],
        conseil: 'Pratiquez la relaxation et la respiration profonde. Consultez un médecin si cela persiste > 2 semaines.'
    },
    {
        condition: 'Problème gastro-intestinal',
        specialite: 'Gastro-entérologie',
        urgence: 'faible',
        symptoms: ['douleur abdominale', 'nausées', 'vomissements', 'diarrhée', 'constipation', 'ballonnements', 'brûlures estomac'],
        conseil: 'Mangez léger, restez hydraté. Consultez si douleur intense ou sang dans les selles.'
    },
    {
        condition: 'Migraine',
        specialite: 'Neurologie',
        urgence: 'faible',
        symptoms: ['maux de tête', 'nausées', 'sensibilité lumière', 'sensibilité bruit', 'vision trouble', 'vertiges'],
        conseil: 'Repos dans une pièce sombre et calme. Antalgiques si nécessaire. Consultez si migraines fréquentes.'
    },
    {
        condition: 'Infection urinaire',
        specialite: 'Urologie',
        urgence: 'moyen',
        symptoms: ['brûlures urinaires', 'urines fréquentes', 'douleur bas ventre', 'urines troubles', 'fièvre', 'frissons'],
        conseil: 'Buvez beaucoup d\'eau. Consultez rapidement pour un traitement antibiotique.'
    },
];

const normalize = str => str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// POST /api/ai/diagnose
router.post('/diagnose', verifyToken, async (req, res) => {
    try {
        const { symptoms, age, sexe } = req.body;

        if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
            return res.status(400).json({ message: 'Veuillez fournir au moins un symptôme.' });
        }

        const normalizedInput = symptoms.map(normalize);

        // Score each condition
        const scored = SYMPTOM_DB.map(entry => {
            const matches = entry.symptoms.filter(s =>
                normalizedInput.some(input => normalize(s).includes(input) || input.includes(normalize(s)))
            );
            return { ...entry, score: matches.length, matchedSymptoms: matches };
        }).filter(e => e.score > 0)
          .sort((a, b) => b.score - a.score);

        if (scored.length === 0) {
            return res.json({
                message: 'Aucune correspondance trouvée. Consultez un médecin généraliste.',
                results: [],
                recommendation: 'Médecine générale'
            });
        }

        const top3 = scored.slice(0, 3).map(e => ({
            condition: e.condition,
            specialite: e.specialite,
            urgence: e.urgence,
            conseil: e.conseil,
            confidence: Math.min(Math.round((e.score / e.symptoms.length) * 100), 95),
            symptomesCorrespondants: e.matchedSymptoms
        }));

        // Save to DB
        await db.execute(
            'INSERT INTO ai_diagnostics (user_id, symptoms, result, created_at) VALUES (?, ?, ?, NOW())',
            [req.user.id, JSON.stringify(symptoms), JSON.stringify(top3)]
        ).catch(() => {}); // silent fail if table doesn't exist yet

        res.json({
            message: 'Analyse complétée.',
            results: top3,
            recommendation: top3[0].specialite,
            urgence: top3[0].urgence
        });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// GET /api/ai/history — user's past diagnostics
router.get('/history', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM ai_diagnostics WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});
// POST /api/ai/chat
const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// POST /api/ai/chat
router.post('/chat', verifyToken, async (req, res) => {

    try {

        const { message } = req.body;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "Tu es un assistant médical professionnel.",
                },
                {
                    role: "user",
                    content: message,
                },
            ],
           model: "llama-3.3-70b-versatile",
        });

        res.json({
            reply: chatCompletion.choices[0].message.content
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: 'Erreur chatbot IA'
        });
    }
});
module.exports = router;
