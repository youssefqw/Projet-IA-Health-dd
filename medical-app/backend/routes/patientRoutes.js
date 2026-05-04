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

// GET /api/patients/appointments — own appointments with payment status
router.get('/appointments', verifyToken, requireRole('patient'), async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT a.*, 
                    u.nom AS medecin_nom, 
                    u.prenom AS medecin_prenom, 
                    u.specialite,
                    u.telephone AS medecin_tel,
                    CASE WHEN p.id IS NOT NULL THEN 'paye' ELSE 'non_paye' END AS statut_paiement
             FROM appointments a
             JOIN users u ON a.medecin_id = u.id
             LEFT JOIN paiements p ON a.id = p.rendez_vous_id AND p.statut = 'paye'
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

// POST /api/patients/appointments/create — create a new appointment
router.post('/appointments/create', verifyToken, requireRole('patient'), async (req, res) => {
    const { medecin_id, date_heure, motif } = req.body;
    const patient_id = req.user.id;

    // Validation
    if (!medecin_id || !date_heure) {
        return res.status(400).json({ message: 'Médecin et date/heure sont requis' });
    }

    try {
        // Vérifier que le médecin existe
        const [medecin] = await db.execute(
            'SELECT id FROM users WHERE id = ? AND role = "medecin"',
            [medecin_id]
        );

        if (medecin.length === 0) {
            return res.status(404).json({ message: 'Médecin non trouvé' });
        }

        // Vérifier que la date n'est pas dans le passé
        const appointmentDate = new Date(date_heure);
        if (appointmentDate < new Date()) {
            return res.status(400).json({ message: 'La date ne peut pas être dans le passé' });
        }

        // Créer le rendez-vous
        const [result] = await db.execute(
            'INSERT INTO appointments (patient_id, medecin_id, date_heure, motif, statut) VALUES (?, ?, ?, ?, "en_attente")',
            [patient_id, medecin_id, date_heure, motif || null]
        );

        // Notifier le médecin d'un nouveau rendez-vous
        const [patientInfo] = await db.execute('SELECT nom, prenom FROM users WHERE id = ?', [patient_id]);
        await db.execute(
            'INSERT INTO notifications (user_id, type, message, appointment_id) VALUES (?, ?, ?, ?)',
            [medecin_id, 'nouveau_rdv',
             `📅 Nouveau rendez-vous de ${patientInfo[0].prenom} ${patientInfo[0].nom} le ${new Date(date_heure).toLocaleDateString('fr-FR')}${motif ? ` — ${motif}` : ''}`,
             result.insertId]
        );

        res.status(201).json({ message: 'Rendez-vous créé avec succès', id: result.insertId });
    } catch (error) {
        console.error('Erreur création rendez-vous:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
});

// GET /api/patients/appointments/:id — get appointment details
router.get('/appointments/:id', verifyToken, requireRole('patient'), async (req, res) => {
    const { id } = req.params;
    const patient_id = req.user.id;

    try {
        const [rows] = await db.execute(
            `SELECT a.*, 
                    u.nom AS medecin_nom, 
                    u.prenom AS medecin_prenom, 
                    u.specialite,
                    u.telephone AS medecin_tel,
                    CASE WHEN p.id IS NOT NULL THEN 'paye' ELSE 'non_paye' END AS statut_paiement
             FROM appointments a
             JOIN users u ON a.medecin_id = u.id
             LEFT JOIN paiements p ON a.id = p.rendez_vous_id AND p.statut = 'paye'
             WHERE a.id = ? AND a.patient_id = ?`,
            [id, patient_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Rendez-vous non trouvé' });
        }

        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// PUT /api/patients/appointments/:id/cancel — cancel an appointment
router.put('/appointments/:id/cancel', verifyToken, requireRole('patient'), async (req, res) => {
    const { id } = req.params;
    const patient_id = req.user.id;

    try {
        const [appointment] = await db.execute(
            'SELECT * FROM appointments WHERE id = ? AND patient_id = ?',
            [id, patient_id]
        );

        if (appointment.length === 0) {
            return res.status(404).json({ message: 'Rendez-vous non trouvé' });
        }

        if (appointment[0].statut === 'en_attente') {
            await db.execute(
                'UPDATE appointments SET statut = "annulé" WHERE id = ?',
                [id]
            );
            res.json({ message: 'Rendez-vous annulé avec succès' });
        } else {
            res.status(400).json({ message: 'Impossible d\'annuler ce rendez-vous' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// GET /api/patients/notifications
router.get('/notifications', verifyToken, requireRole('patient'), async (req, res) => {
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

// PUT /api/patients/notifications/read
router.put('/notifications/read', verifyToken, requireRole('patient'), async (req, res) => {
    try {
        await db.execute('UPDATE notifications SET lu = 1 WHERE user_id = ?', [req.user.id]);
        res.json({ message: 'Notifications lues' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

module.exports = router;