const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/database');
const authRoutes = require('./routes/authRoutes');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Route de test
app.get('/api/test', (req, res) => {
    res.json({ message: '✅ API fonctionne parfaitement !', timestamp: new Date() });
});

// Route pour tester la base de données
app.get('/api/test-db', async (req, res) => {
    try {
        const [result] = await db.execute('SELECT * FROM users LIMIT 5');
        res.json({ 
            message: '✅ Connexion BD réussie !', 
            users: result,
            count: result.length 
        });
    } catch (error) {
        res.status(500).json({ 
            message: '❌ Erreur de connexion à la BD', 
            error: error.message 
        });
    }
});

// Démarrer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🚀 Serveur backend démarré sur http://localhost:${PORT}`);
    console.log(`📝 Routes disponibles:`);
    console.log(`   - Test API: http://localhost:${PORT}/api/test`);
    console.log(`   - Test BD:  http://localhost:${PORT}/api/test-db`);
    console.log(`   - Inscription: POST http://localhost:${PORT}/api/auth/register`);
    console.log(`   - Connexion: POST http://localhost:${PORT}/api/auth/login`);
    console.log(`   - Spécialités: GET http://localhost:${PORT}/api/auth/specialites\n`);
});