const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Middleware d'authentification
const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Non autorisé' });
    }
    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token invalide' });
    }
};

// Créer un paiement pour un rendez-vous
router.post('/create', authMiddleware, async (req, res) => {
    const { rendez_vous_id, methode_paiement, montant } = req.body;
    const patient_id = req.user.id;

    console.log('📝 Tentative de paiement:', { rendez_vous_id, patient_id, montant });

    try {
        // CORRECTION: utiliser appointments au lieu de rendez_vous
        const [rdv] = await db.execute(
            `SELECT a.*, u.specialite FROM appointments a
             JOIN users u ON a.medecin_id = u.id 
             WHERE a.id = ? AND a.patient_id = ? AND a.statut = 'confirmé'`,
            [rendez_vous_id, patient_id]
        );

        if (rdv.length === 0) {
            return res.status(404).json({ message: 'Rendez-vous non trouvé ou non confirmé' });
        }

        const reference = `PAY-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        const [result] = await db.execute(
            `INSERT INTO paiements 
             (patient_id, medecin_id, rendez_vous_id, montant, methode_paiement, reference_paiement, date_paiement, statut) 
             VALUES (?, ?, ?, ?, ?, ?, NOW(), 'paye')`,
            [patient_id, rdv[0].medecin_id, rendez_vous_id, montant, methode_paiement, reference]
        );

        console.log('✅ Paiement créé avec succès, id:', result.insertId);

        res.status(201).json({
            message: 'Paiement effectué avec succès',
            paiement_id: result.insertId,
            reference: reference,
            montant: montant
        });
    } catch (error) {
        console.error('❌ Erreur paiement:', error);
        res.status(500).json({ message: 'Erreur lors du paiement: ' + error.message });
    }
});

// Médecin - Statistiques des paiements
router.get('/doctor/stats', authMiddleware, async (req, res) => {
    const medecin_id = req.user.id;

    if (req.user.role !== 'medecin') {
        return res.status(403).json({ message: 'Accès non autorisé' });
    }

    try {
        const [total] = await db.execute(
            `SELECT 
                COALESCE(SUM(montant), 0) as total,
                COUNT(*) as nombre_paiements,
                COALESCE(AVG(montant), 0) as moyenne,
                COALESCE(SUM(CASE WHEN MONTH(date_paiement) = MONTH(CURRENT_DATE()) AND YEAR(date_paiement) = YEAR(CURRENT_DATE()) THEN montant ELSE 0 END), 0) as mois_en_cours
             FROM paiements 
             WHERE medecin_id = ? AND statut = 'paye'`,
            [medecin_id]
        );

        const [recent] = await db.execute(
            `SELECT 
                p.*,
                u.nom as patient_nom,
                u.prenom as patient_prenom,
                a.date_heure as date_rendez_vous
             FROM paiements p
             JOIN users u ON p.patient_id = u.id
             JOIN appointments a ON p.rendez_vous_id = a.id
             WHERE p.medecin_id = ? AND p.statut = 'paye'
             ORDER BY p.date_paiement DESC
             LIMIT 10`,
            [medecin_id]
        );

        res.json({
            stats: {
                total: total[0]?.total || 0,
                nombre: total[0]?.nombre_paiements || 0,
                moyenne: Math.round(total[0]?.moyenne || 0),
                mois_en_cours: total[0]?.mois_en_cours || 0
            },
            recent: recent
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Admin - Paiements par médecin
router.get('/admin/stats', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Accès non autorisé' });
    }

    try {
        const [global] = await db.execute(
            `SELECT 
                COALESCE(SUM(montant), 0) as total_global,
                COUNT(*) as nombre_total,
                COUNT(DISTINCT medecin_id) as medecins_actifs
             FROM paiements 
             WHERE statut = 'paye'`
        );

        const [byDoctor] = await db.execute(
            `SELECT 
                u.id,
                u.nom,
                u.prenom,
                u.specialite,
                COALESCE(SUM(p.montant), 0) as total,
                COUNT(p.id) as nombre_paiements
             FROM users u
             LEFT JOIN paiements p ON u.id = p.medecin_id AND p.statut = 'paye'
             WHERE u.role = 'medecin'
             GROUP BY u.id, u.nom, u.prenom, u.specialite
             ORDER BY total DESC`
        );

        res.json({
            global: global[0],
            byDoctor: byDoctor
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;