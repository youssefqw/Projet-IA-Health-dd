const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ message: 'Accès refusé. Token manquant.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Token invalide ou expiré.' });
    }
};

const requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Accès interdit. Rôle insuffisant.' });
    }
    next();
};

module.exports = { verifyToken, requireRole };
