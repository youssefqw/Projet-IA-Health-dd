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
        const [appointment] = await db.execute(
            'SELECT a.*, u.nom, u.prenom FROM appointments a JOIN users u ON a.medecin_id = u.id WHERE a.id = ? AND a.medecin_id = ?',
            [id, medecin_id]
        );
        if (appointment.length === 0) return res.status(404).json({ message: 'Rendez-vous non trouvé' });

        await db.execute(
            'UPDATE appointments SET statut = "confirmé", prix_medecin = ?, paiement_requis = 0 WHERE id = ? AND medecin_id = ?',
            [prix, id, medecin_id]
        );

        // Auto-enregistrer dans paiements
        const reference = `PAY-DOCTOR-${id}-${Date.now()}`;
        await db.execute(
            `INSERT INTO paiements (patient_id, medecin_id, rendez_vous_id, montant, methode_paiement, reference_paiement, date_paiement, statut)
             VALUES (?, ?, ?, ?, 'consultation', ?, NOW(), 'paye')
             ON DUPLICATE KEY UPDATE montant = VALUES(montant)`,
            [appointment[0].patient_id, medecin_id, id, prix, reference]
        );

        // Notifier le patient que son RDV est confirmé
        await db.execute(
            'INSERT INTO notifications (user_id, type, message, appointment_id) VALUES (?, ?, ?, ?)',
            [appointment[0].patient_id, 'rdv_confirme',
             `✅ Votre rendez-vous avec Dr. ${appointment[0].prenom} ${appointment[0].nom} a été confirmé. Prix: ${prix}€`,
             id]
        );

        res.json({ message: 'Rendez-vous confirmé avec succès', prix, appointment_id: id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// PUT /api/doctors/appointment/:id/reject — reject appointment
router.put('/appointment/:id/reject', verifyToken, requireRole('medecin'), async (req, res) => {
    const { id } = req.params;
    const medecin_id = req.user.id;

    try {
        const [appointment] = await db.execute(
            'SELECT a.*, u.nom, u.prenom FROM appointments a JOIN users u ON a.medecin_id = u.id WHERE a.id = ? AND a.medecin_id = ?',
            [id, medecin_id]
        );
        if (appointment.length === 0) return res.status(404).json({ message: 'Rendez-vous non trouvé' });

        await db.execute('UPDATE appointments SET statut = "annulé" WHERE id = ?', [id]);

        // Notifier le patient que son RDV est refusé
        await db.execute(
            'INSERT INTO notifications (user_id, type, message, appointment_id) VALUES (?, ?, ?, ?)',
            [appointment[0].patient_id, 'rdv_refuse',
             `❌ Votre rendez-vous avec Dr. ${appointment[0].prenom} ${appointment[0].nom} a été refusé.`,
             id]
        );

        res.json({ message: 'Rendez-vous refusé' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// PUT /api/doctors/appointment/:id/terminate — mark as terminé
router.put('/appointment/:id/terminate', verifyToken, requireRole('medecin'), async (req, res) => {
    const { id } = req.params;
    const medecin_id = req.user.id;
    try {
        const [rows] = await db.execute(
            'SELECT * FROM appointments WHERE id = ? AND medecin_id = ? AND statut = "confirmé"',
            [id, medecin_id]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Rendez-vous non trouvé ou non confirmé' });
        await db.execute('UPDATE appointments SET statut = "terminé" WHERE id = ?', [id]);
        res.json({ message: 'Rendez-vous marqué comme terminé' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// PUT /api/doctors/appointment/:id/request-payment — doctor requests payment from patient
router.put('/appointment/:id/request-payment', verifyToken, requireRole('medecin'), async (req, res) => {
    const { id } = req.params;
    const medecin_id = req.user.id;

    try {
        const [appointment] = await db.execute(
            'SELECT a.*, u.nom, u.prenom FROM appointments a JOIN users u ON a.medecin_id = u.id WHERE a.id = ? AND a.medecin_id = ? AND a.statut = "confirmé"',
            [id, medecin_id]
        );
        if (appointment.length === 0) return res.status(404).json({ message: 'Rendez-vous non trouvé ou non confirmé' });
        if (!appointment[0].prix_medecin) return res.status(400).json({ message: 'Prix non défini' });

        await db.execute('UPDATE appointments SET paiement_requis = 1 WHERE id = ?', [id]);

        // Notifier le patient qu'il doit payer
        await db.execute(
            'INSERT INTO notifications (user_id, type, message, appointment_id) VALUES (?, ?, ?, ?)',
            [appointment[0].patient_id, 'paiement_requis',
             `💳 Dr. ${appointment[0].prenom} ${appointment[0].nom} vous demande de régler votre consultation: ${appointment[0].prix_medecin}€`,
             id]
        );

        res.json({ message: 'Demande de paiement envoyée au patient' });
    } catch (err) {
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

// GET /api/doctors/notifications
router.get('/notifications', verifyToken, requireRole('medecin'), async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// PUT /api/doctors/notifications/read
router.put('/notifications/read', verifyToken, requireRole('medecin'), async (req, res) => {
    try {
        await db.execute('UPDATE notifications SET lu = 1 WHERE user_id = ?', [req.user.id]);
        res.json({ message: 'Notifications lues' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

module.exports = router;