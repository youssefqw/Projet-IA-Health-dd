import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('http://localhost:5000/api/auth/login', {
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
                    <h1>Votre santé,<br /><span>notre priorité</span></h1>
                    <p>Plateforme médicale intelligente connectant patients et médecins pour des soins de qualité.</p>
                </div>
                <div className="stats-row">
                    <div className="stat-item">
                        <div className="num">500+</div>
                        <div className="label">Médecins</div>
                    </div>
                    <div className="stat-item">
                        <div className="num">12k+</div>
                        <div className="label">Patients</div>
                    </div>
                    <div className="stat-item">
                        <div className="num">98%</div>
                        <div className="label">Satisfaction</div>
                    </div>
                </div>
            </div>

            <div className="auth-right">
                <div className="auth-form-header">
                    <h2>Bon retour 👋</h2>
                    <p>Connectez-vous à votre espace médical</p>
                </div>

                {error && <div className="error-msg">⚠️ {error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <div className="input-wrap">
                            <span className="icon">📧</span>
                            <input
                                type="email"
                                name="email"
                                placeholder="votre@email.com"
                                value={form.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Mot de passe</label>
                        <div className="input-wrap">
                            <span className="icon">🔒</span>
                            <input
                                type="password"
                                name="password"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>
                    <button className="btn-primary" type="submit" disabled={loading}>
                        {loading ? 'Connexion...' : 'Se connecter →'}
                    </button>
                </form>

                <div className="auth-footer">
                    Pas encore de compte ? <Link to="/register">Créer un compte</Link>
                </div>
            </div>
        </div>
    );
}
