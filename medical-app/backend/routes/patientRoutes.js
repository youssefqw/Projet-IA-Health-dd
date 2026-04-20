const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/patients/profile — own profile
router.get('/profile', verifyToken, requireRole('patient'), async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, nom, prenom, email, telephone, role, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Patient introuvable.' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// PUT /api/patients/profile — update own profile
router.put('/profile', verifyToken, requireRole('patient'), async (req, res) => {
    try {
        const { nom, prenom, telephone } = req.body;
        await db.execute(
            'UPDATE users SET nom = ?, prenom = ?, telephone = ? WHERE id = ?',
            [nom, prenom, telephone, req.user.id]
        );
        res.json({ message: 'Profil mis à jour avec succès.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// GET /api/patients/appointments — own appointments
router.get('/appointments', verifyToken, requireRole('patient'), async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT a.*, u.nom AS medecin_nom, u.prenom AS medecin_prenom, u.specialite
             FROM appointments a
             JOIN users u ON a.medecin_id = u.id
             WHERE a.patient_id = ?
             ORDER BY a.date_heure DESC`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// GET /api/patients/doctors — list all doctors
router.get('/doctors', verifyToken, requireRole('patient'), async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, nom, prenom, email, telephone, specialite FROM users WHERE role = ? ORDER BY nom',
            ['medecin']
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

module.exports = router;
