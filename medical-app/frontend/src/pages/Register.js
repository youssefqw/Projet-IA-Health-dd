import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Register.css';

const ROLES = [
    { value: 'patient', icon: '🧑‍⚕️', label: 'Patient' },
    { value: 'medecin', icon: '👨‍⚕️', label: 'Médecin' },
    { value: 'admin', icon: '🛡️', label: 'Admin' },
];

export default function Register() {
    const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', telephone: '', role: 'patient', specialite: '' });
    const [specialites, setSpecialites] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetch('http://localhost:5000/api/auth/specialites')
            .then(r => r.json())
            .then(setSpecialites)
            .catch(() => {});
    }, []);

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message); return; }
            login(data.user, data.token);
            const routes = { patient: '/dashboard/patient', medecin: '/dashboard/doctor', admin: '/dashboard/admin' };
            navigate(routes[data.user.role] || '/dashboard/patient');
        } catch {
            setError('Erreur de connexion au serveur.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-left">
                <div className="brand">
                    <div className="brand-icon">🏥</div>
                    <div className="brand-name">Med<span>Care</span> AI</div>
                </div>
                <div className="auth-hero">
                    <h1>Rejoignez<br /><span>MedCare AI</span></h1>
                    <p>Créez votre compte et accédez à une plateforme médicale intelligente et sécurisée.</p>
                </div>
                <div className="stats-row">
                    <div className="stat-item">
                        <div className="num">24/7</div>
                        <div className="label">Disponible</div>
                    </div>
                    <div className="stat-item">
                        <div className="num">100%</div>
                        <div className="label">Sécurisé</div>
                    </div>
                    <div className="stat-item">
                        <div className="num">IA</div>
                        <div className="label">Intégrée</div>
                    </div>
                </div>
            </div>

            <div className="auth-right wide">
                <div className="auth-form-header">
                    <h2>Créer un compte ✨</h2>
                    <p>Choisissez votre rôle et remplissez le formulaire</p>
                </div>

                {error && <div className="error-msg">⚠️ {error}</div>}

                <div className="role-selector">
                    {ROLES.map(r => (
                        <div
                            key={r.value}
                            className={`role-card ${form.role === r.value ? 'active' : ''}`}
                            onClick={() => setForm({ ...form, role: r.value })}
                        >
                            <div className="role-icon">{r.icon}</div>
                            <div className="role-label">{r.label}</div>
                        </div>
                    ))}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Nom</label>
                            <div className="input-wrap">
                                <span className="icon">👤</span>
                                <input type="text" name="nom" placeholder="Dupont" value={form.nom} onChange={handleChange} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Prénom</label>
                            <div className="input-wrap">
                                <span className="icon">👤</span>
                                <input type="text" name="prenom" placeholder="Jean" value={form.prenom} onChange={handleChange} required />
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <div className="input-wrap">
                            <span className="icon">📧</span>
                            <input type="email" name="email" placeholder="votre@email.com" value={form.email} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Mot de passe</label>
                            <div className="input-wrap">
                                <span className="icon">🔒</span>
                                <input type="password" name="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Téléphone</label>
                            <div className="input-wrap">
                                <span className="icon">📱</span>
                                <input type="tel" name="telephone" placeholder="+33 6 00 00 00 00" value={form.telephone} onChange={handleChange} />
                            </div>
                        </div>
                    </div>

                    {form.role === 'medecin' && (
                        <div className="form-group">
                            <label>Spécialité</label>
                            <div className="input-wrap">
                                <span className="icon">🩺</span>
                                <select name="specialite" value={form.specialite} onChange={handleChange} required>
                                    <option value="">Choisir une spécialité</option>
                                    {specialites.map(s => (
                                        <option key={s.id} value={s.nom}>{s.nom}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <button className="btn-primary" type="submit" disabled={loading}>
                        {loading ? 'Création...' : 'Créer mon compte →'}
                    </button>
                </form>

                <div className="auth-footer">
                    Déjà un compte ? <Link to="/login">Se connecter</Link>
                </div>
            </div>
        </div>
    );
}
