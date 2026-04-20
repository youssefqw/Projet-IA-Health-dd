const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');

const guard = [verifyToken, requireRole('admin')];

// GET /api/admin/stats
router.get('/stats', ...guard, async (req, res) => {
    try {
        const [[{ total }]]    = await db.execute('SELECT COUNT(*) AS total FROM users');
        const [[{ medecins }]] = await db.execute('SELECT COUNT(*) AS medecins FROM users WHERE role = "medecin"');
        const [[{ patients }]] = await db.execute('SELECT COUNT(*) AS patients FROM users WHERE role = "patient"');
        const [[{ rdv }]]      = await db.execute('SELECT COUNT(*) AS rdv FROM appointments');
        const [[{ ai }]]       = await db.execute('SELECT COUNT(*) AS ai FROM ai_diagnostics').catch(() => [[{ ai: 0 }]]);
        res.json({ total, medecins, patients, rdv, ai });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// GET /api/admin/users
router.get('/users', ...guard, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, nom, prenom, email, role, specialite, telephone, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', ...guard, async (req, res) => {
    try {
        if (parseInt(req.params.id) === req.user.id)
            return res.status(400).json({ message: 'Impossible de supprimer votre propre compte.' });
        await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'Utilisateur supprimé.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// GET /api/admin/appointments
router.get('/appointments', ...guard, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT a.*, p.nom AS patient_nom, p.prenom AS patient_prenom,
                    d.nom AS medecin_nom, d.prenom AS medecin_prenom, d.specialite
             FROM appointments a
             JOIN users p ON a.patient_id = p.id
             JOIN users d ON a.medecin_id = d.id
             ORDER BY a.date_heure DESC LIMIT 50`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

module.exports = router;
