const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/database');

const authRoutes        = require('./routes/authRoutes');
const patientRoutes     = require('./routes/patientRoutes');
const doctorRoutes      = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const aiRoutes          = require('./routes/aiRoutes');
const adminRoutes       = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);

// Protected routes
app.use('/api/patients',     patientRoutes);
app.use('/api/doctors',      doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/ai',           aiRoutes);
app.use('/api/admin',        adminRoutes);

// Health check
app.get('/api/test', (req, res) => {
    res.json({ message: '✅ API fonctionne !', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`\n📋 Routes disponibles:`);
    console.log(`   PUBLIC:`);
    console.log(`     POST /api/auth/register`);
    console.log(`     POST /api/auth/login`);
    console.log(`     GET  /api/auth/specialites`);
    console.log(`   PATIENT (JWT requis):`);
    console.log(`     GET  /api/patients/profile`);
    console.log(`     PUT  /api/patients/profile`);
    console.log(`     GET  /api/patients/appointments`);
    console.log(`     GET  /api/patients/doctors`);
    console.log(`   MÉDECIN (JWT requis):`);
    console.log(`     GET  /api/doctors/profile`);
    console.log(`     GET  /api/doctors/patients`);
    console.log(`     GET  /api/doctors/appointments`);
    console.log(`   RENDEZ-VOUS (JWT requis):`);
    console.log(`     POST   /api/appointments`);
    console.log(`     GET    /api/appointments/:id`);
    console.log(`     PUT    /api/appointments/:id/status`);
    console.log(`     DELETE /api/appointments/:id`);
    console.log(`   IA (JWT requis):`);
    console.log(`     POST /api/ai/diagnose`);
    console.log(`     GET  /api/ai/history\n`);
});
