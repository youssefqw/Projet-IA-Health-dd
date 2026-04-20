const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');

// POST /api/appointments — patient books an appointment
router.post('/', verifyToken, requireRole('patient'), async (req, res) => {
    try {
        const { medecin_id, date_heure, motif } = req.body;
        if (!medecin_id || !date_heure) {
            return res.status(400).json({ message: 'Médecin et date/heure requis.' });
        }

        // Check doctor exists
        const [doctor] = await db.execute(
            'SELECT id FROM users WHERE id = ? AND role = ?',
            [medecin_id, 'medecin']
        );
        if (doctor.length === 0) return res.status(404).json({ message: 'Médecin introuvable.' });

        // Check no conflict on same slot
        const [conflict] = await db.execute(
            'SELECT id FROM appointments WHERE medecin_id = ? AND date_heure = ? AND statut != ?',
            [medecin_id, date_heure, 'annulé']
        );
        if (conflict.length > 0) return res.status(409).json({ message: 'Ce créneau est déjà pris.' });

        const [result] = await db.execute(
            'INSERT INTO appointments (patient_id, medecin_id, date_heure, motif, statut) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, medecin_id, date_heure, motif || null, 'en_attente']
        );
        res.status(201).json({ message: 'Rendez-vous créé avec succès.', id: result.insertId });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// GET /api/appointments/:id — get one appointment (patient or doctor)
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT a.*,
                    p.nom AS patient_nom, p.prenom AS patient_prenom,
                    d.nom AS medecin_nom, d.prenom AS medecin_prenom, d.specialite
             FROM appointments a
             JOIN users p ON a.patient_id = p.id
             JOIN users d ON a.medecin_id = d.id
             WHERE a.id = ?`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Rendez-vous introuvable.' });

        const appt = rows[0];
        // Only the patient, the doctor, or admin can see it
        if (req.user.role !== 'admin' && req.user.id !== appt.patient_id && req.user.id !== appt.medecin_id) {
            return res.status(403).json({ message: 'Accès interdit.' });
        }
        res.json(appt);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// PUT /api/appointments/:id/status — doctor confirms or cancels
router.put('/:id/status', verifyToken, requireRole('medecin', 'admin'), async (req, res) => {
    try {
        const { statut } = req.body;
        const allowed = ['en_attente', 'confirmé', 'annulé', 'terminé'];
        if (!allowed.includes(statut)) {
            return res.status(400).json({ message: 'Statut invalide.' });
        }

        const [rows] = await db.execute('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Rendez-vous introuvable.' });

        if (req.user.role === 'medecin' && rows[0].medecin_id !== req.user.id) {
            return res.status(403).json({ message: 'Accès interdit.' });
        }

        await db.execute('UPDATE appointments SET statut = ? WHERE id = ?', [statut, req.params.id]);
        res.json({ message: 'Statut mis à jour.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// DELETE /api/appointments/:id — patient cancels their own appointment
router.delete('/:id', verifyToken, requireRole('patient', 'admin'), async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Rendez-vous introuvable.' });

        if (req.user.role === 'patient' && rows[0].patient_id !== req.user.id) {
            return res.status(403).json({ message: 'Accès interdit.' });
        }

        await db.execute('DELETE FROM appointments WHERE id = ?', [req.params.id]);
        res.json({ message: 'Rendez-vous supprimé.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// GET /api/appointments/admin/all — admin sees all
router.get('/admin/all', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT a.*,
                    p.nom AS patient_nom, p.prenom AS patient_prenom,
                    d.nom AS medecin_nom, d.prenom AS medecin_prenom, d.specialite
             FROM appointments a
             JOIN users p ON a.patient_id = p.id
             JOIN users d ON a.medecin_id = d.id
             ORDER BY a.date_heure DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

module.exports = router;
