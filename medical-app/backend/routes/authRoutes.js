const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Route d'inscription
router.post('/register', async (req, res) => {
    try {
        const { nom, prenom, email, password, telephone, role, specialite } = req.body;
        
        console.log('📝 Tentative d\'inscription:', { email, role });

        // Vérifier si l'utilisateur existe
        const [existingUsers] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Cet email est déjà utilisé' });
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insérer l'utilisateur
        const [result] = await db.execute(
            'INSERT INTO users (nom, prenom, email, password, telephone, role, specialite) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nom, prenom, email, hashedPassword, telephone, role, specialite || null]
        );

        // Générer le token
        const token = jwt.sign(
            { id: result.insertId, email, role },
            process.env.JWT_SECRET || 'secret_key_123',
            { expiresIn: '24h' }
        );

        console.log('✅ Inscription réussie pour:', email);

        res.status(201).json({
            message: 'Inscription réussie',
            token,
            user: { 
                id: result.insertId, 
                nom, 
                prenom, 
                email, 
                role, 
                specialite: specialite || null 
            }
        });
    } catch (error) {
        console.error('❌ Erreur inscription:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
});

// Route de connexion
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔐 Tentative de connexion:', email);

        const [users] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        const user = users[0];
        
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'secret_key_123',
            { expiresIn: '24h' }
        );

        console.log('✅ Connexion réussie pour:', email);

        res.json({
            message: 'Connexion réussie',
            token,
            user: {
                id: user.id,
                nom: user.nom,
                prenom: user.prenom,
                email: user.email,
                role: user.role,
                specialite: user.specialite
            }
        });
    } catch (error) {
        console.error('❌ Erreur connexion:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// PUT /api/auth/profile — update profile (all roles)
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { nom, prenom, telephone, specialite } = req.body;
        await db.execute(
            'UPDATE users SET nom = ?, prenom = ?, telephone = ?, specialite = ? WHERE id = ?',
            [nom, prenom, telephone || null, specialite || null, req.user.id]
        );
        const [rows] = await db.execute(
            'SELECT id, nom, prenom, email, telephone, role, specialite FROM users WHERE id = ?',
            [req.user.id]
        );
        res.json({ message: 'Profil mis à jour avec succès.', user: rows[0] });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// PUT /api/auth/change-password — all roles
router.put('/change-password', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword)
            return res.status(400).json({ message: 'Les deux mots de passe sont requis.' });
        if (newPassword.length < 6)
            return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' });

        const [rows] = await db.execute('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Utilisateur introuvable.' });

        const valid = await bcrypt.compare(currentPassword, rows[0].password);
        if (!valid) return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
        res.json({ message: 'Mot de passe mis à jour avec succès.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

// Route pour les spécialités
router.get('/specialites', async (req, res) => {
    try {
        const [specialites] = await db.execute('SELECT * FROM specialites ORDER BY nom');
        res.json(specialites);
    } catch (error) {
        console.error('❌ Erreur récupération spécialités:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;