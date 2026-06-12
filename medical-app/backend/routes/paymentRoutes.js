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

        // Fallback: aussi compter les RDV confirmés/terminés avec prix mais sans paiement enregistré
        const [fallback] = await db.execute(
            `SELECT 
                COALESCE(SUM(a.prix_medecin), 0) as total,
                COUNT(*) as nombre_paiements,
                COALESCE(AVG(a.prix_medecin), 0) as moyenne,
                COALESCE(SUM(CASE WHEN MONTH(a.date_heure) = MONTH(CURRENT_DATE()) AND YEAR(a.date_heure) = YEAR(CURRENT_DATE()) THEN a.prix_medecin ELSE 0 END), 0) as mois_en_cours
             FROM appointments a
             WHERE a.medecin_id = ? AND a.statut IN ('confirmé','terminé') AND a.prix_medecin > 0
               AND a.id NOT IN (SELECT rendez_vous_id FROM paiements WHERE medecin_id = ? AND statut = 'paye')`,
            [medecin_id, medecin_id]
        );

        const merged = {
            total: parseFloat(total[0]?.total || 0) + parseFloat(fallback[0]?.total || 0),
            nombre: parseInt(total[0]?.nombre_paiements || 0) + parseInt(fallback[0]?.nombre_paiements || 0),
            moyenne: 0,
            mois_en_cours: parseFloat(total[0]?.mois_en_cours || 0) + parseFloat(fallback[0]?.mois_en_cours || 0),
        };
        merged.moyenne = merged.nombre > 0 ? Math.round(merged.total / merged.nombre) : 0;

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

        res.json({ stats: merged, recent });
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
        // Global: paiements enregistrés + RDV avec prix non encore dans paiements
        const [g1] = await db.execute(
            `SELECT COALESCE(SUM(montant), 0) as total_global, COUNT(*) as nombre_total, COUNT(DISTINCT medecin_id) as medecins_actifs
             FROM paiements WHERE statut = 'paye'`
        );
        const [g2] = await db.execute(
            `SELECT COALESCE(SUM(prix_medecin), 0) as total_global, COUNT(*) as nombre_total
             FROM appointments
             WHERE statut IN ('confirmé','terminé') AND prix_medecin > 0
               AND id NOT IN (SELECT rendez_vous_id FROM paiements WHERE statut = 'paye')`
        );

        const global = {
            total_global: parseFloat(g1[0].total_global) + parseFloat(g2[0].total_global),
            nombre_total: parseInt(g1[0].nombre_total) + parseInt(g2[0].nombre_total),
            medecins_actifs: g1[0].medecins_actifs,
        };

        const [byDoctor] = await db.execute(
            `SELECT 
                u.id, u.nom, u.prenom, u.specialite,
                COALESCE(
                    (SELECT SUM(p.montant) FROM paiements p WHERE p.medecin_id = u.id AND p.statut = 'paye'), 0
                ) + COALESCE(
                    (SELECT SUM(a.prix_medecin) FROM appointments a
                     WHERE a.medecin_id = u.id AND a.statut IN ('confirmé','terminé') AND a.prix_medecin > 0
                       AND a.id NOT IN (SELECT rendez_vous_id FROM paiements WHERE medecin_id = u.id AND statut = 'paye')), 0
                ) as total,
                COALESCE(
                    (SELECT COUNT(*) FROM paiements p WHERE p.medecin_id = u.id AND p.statut = 'paye'), 0
                ) + COALESCE(
                    (SELECT COUNT(*) FROM appointments a
                     WHERE a.medecin_id = u.id AND a.statut IN ('confirmé','terminé') AND a.prix_medecin > 0
                       AND a.id NOT IN (SELECT rendez_vous_id FROM paiements WHERE medecin_id = u.id AND statut = 'paye')), 0
                ) as nombre_paiements
             FROM users u
             WHERE u.role = 'medecin'
             ORDER BY total DESC`
        );

        res.json({ global, byDoctor });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;