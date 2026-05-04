const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/doctors/profile
router.get('/profile', verifyToken, requireRole('medecin'), async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, nom, prenom, email, telephone, specialite, role, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Médecin introuvable.' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// PUT /api/doctors/profile
router.put('/profile', verifyToken, requireRole('medecin'), async (req, res) => {
    try {
        const { nom, prenom, telephone, specialite } = req.body;
        await db.execute(
            'UPDATE users SET nom = ?, prenom = ?, telephone = ?, specialite = ? WHERE id = ?',
            [nom, prenom, telephone, specialite, req.user.id]
        );
        res.json({ message: 'Profil mis à jour avec succès.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// GET /api/doctors/patients — all patients who have an appointment with this doctor
router.get('/patients', verifyToken, requireRole('medecin'), async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT DISTINCT u.id, u.nom, u.prenom, u.email, u.telephone,
                    MAX(a.date_heure) AS derniere_visite
             FROM appointments a
             JOIN users u ON a.patient_id = u.id
             WHERE a.medecin_id = ?
             GROUP BY u.id, u.nom, u.prenom, u.email, u.telephone
             ORDER BY derniere_visite DESC`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// GET /api/doctors/appointments — doctor's own appointments
router.get('/appointments', verifyToken, requireRole('medecin'), async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT a.*, u.nom AS patient_nom, u.prenom AS patient_prenom, u.telephone AS patient_tel
             FROM appointments a
             JOIN users u ON a.patient_id = u.id
             WHERE a.medecin_id = ?
             ORDER BY a.date_heure ASC`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// PUT /api/doctors/appointment/:id/confirm — confirm appointment with price
router.put('/appointment/:id/confirm', verifyToken, requireRole('medecin'), async (req, res) => {
    const { id } = req.params;
    const { prix } = req.body;
    const medecin_id = req.user.id;

    if (!prix || prix <= 0) {
        return res.status(400).json({ message: 'Le prix doit être valide et supérieur à 0' });
    }

    try {
        // Vérifier que le rendez-vous appartient bien au médecin
        const [appointment] = await db.execute(
            'SELECT * FROM appointments WHERE id = ? AND medecin_id = ?',
            [id, medecin_id]
        );

        if (appointment.length === 0) {
            return res.status(404).json({ message: 'Rendez-vous non trouvé' });
        }

        // Mettre à jour le rendez-vous
        await db.execute(
            'UPDATE appointments SET statut = "confirmé", prix_medecin = ? WHERE id = ? AND medecin_id = ?',
            [prix, id, medecin_id]
        );

        res.json({ 
            message: 'Rendez-vous confirmé avec succès', 
            prix: prix,
            appointment_id: id
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// GET /api/doctors/list — public list (accessible to patients too)
router.get('/list', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, nom, prenom, specialite FROM users WHERE role = ? ORDER BY nom',
            ['medecin']
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

module.exports = router;