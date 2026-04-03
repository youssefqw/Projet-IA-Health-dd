const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

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
        
        // Vérifier le mot de passe (pour admin en clair, pour les autres hashé)
        let validPassword = false;
        if (user.role === 'admin' && password === user.password) {
            validPassword = true;
        } else {
            validPassword = await bcrypt.compare(password, user.password);
        }

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