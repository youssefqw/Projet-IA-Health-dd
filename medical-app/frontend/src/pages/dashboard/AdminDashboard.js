import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import SettingsPage from '../../components/SettingsPage';
import './Dashboard.css';

const NAV = [
    { icon: '🏠', label: "Vue d'ensemble", id: 'home' },
    { icon: '👥', label: 'Utilisateurs',   id: 'users' },
    { icon: '📅', label: 'Rendez-vous',    id: 'appointments' },
    { icon: '🤖', label: 'Assistant IA', id: 'ai' },
    { icon: '⚙️', label: 'Paramètres',     id: 'settings' },
];

const STATUS_BADGE = { 'en_attente': 'badge-orange', 'confirmé': 'badge-green', 'annulé': 'badge-red', 'terminé': 'badge-purple' };
const STATUS_LABEL = { 'en_attente': 'En attente', 'confirmé': 'Confirmé', 'annulé': 'Annulé', 'terminé': 'Terminé' };

function formatDate(dt) {
    if (!dt) return '-';
    return new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminDashboard() {
    const { user, logout, authFetch } = useAuth();
    const navigate = useNavigate();
    const [active, setActive] = useState('home');

    // State pour le formulaire de création de médecin
    const [showDoctorForm, setShowDoctorForm] = useState(false);
    const [doctorForm, setDoctorForm] = useState({
        nom: '',
        prenom: '',
        email: '',
        password: '',
        telephone: '',
        specialite: ''
    });
    const [doctorFormLoading, setDoctorFormLoading] = useState(false);
    const [doctorFormMsg, setDoctorFormMsg] = useState({ text: '', type: '' });
    const [specialites, setSpecialites] = useState([]);

    // États pour les paiements
    const [paymentGlobal, setPaymentGlobal] = useState(null);
    const [paymentByDoctor, setPaymentByDoctor] = useState([]);

    const { data: stats,        loading: loadStats,  refetch: refetchStats } = useFetch('http://localhost:5000/api/admin/stats');
    const { data: users,        loading: loadUsers,  refetch: refetchUsers } = useFetch('http://localhost:5000/api/admin/users');
    const { data: appointments, loading: loadAppts  }                        = useFetch('http://localhost:5000/api/admin/appointments');

    // Charger les spécialités
    useEffect(() => {
        fetch('http://localhost:5000/api/auth/specialites')
            .then(r => r.json())
            .then(setSpecialites)
            .catch(() => {});
        
        // Charger les stats de paiement
        fetchPaymentStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchPaymentStats = async () => {
        try {
            const res = await authFetch('http://localhost:5000/api/payments/admin/stats');
            const data = await res.json();
            setPaymentGlobal(data.global);
            setPaymentByDoctor(data.byDoctor);
        } catch (error) {
            console.error('Erreur:', error);
        }
    };

    const handleLogout = () => { logout(); navigate('/login'); };
    const initials = user ? `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() : 'A';

    const deleteUser = async (id) => {
        if (!window.confirm('Supprimer cet utilisateur ?')) return;
        await authFetch(`http://localhost:5000/api/admin/users/${id}`, { method: 'DELETE' });
        refetchUsers();
        refetchStats();
    };

    // Créer un médecin
    const handleDoctorInputChange = (e) => {
        setDoctorForm({ ...doctorForm, [e.target.name]: e.target.value });
        setDoctorFormMsg({ text: '', type: '' });
    };

    const handleCreateDoctor = async (e) => {
        e.preventDefault();
        if (doctorForm.password.length < 6) {
            setDoctorFormMsg({ text: 'Le mot de passe doit contenir au moins 6 caractères.', type: 'error' });
            return;
        }
        
        setDoctorFormLoading(true);
        setDoctorFormMsg({ text: '', type: '' });
        
        try {
            const res = await authFetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    ...doctorForm,
                    role: 'medecin'
                }),
            });
            const data = await res.json();
            
            if (!res.ok) {
                setDoctorFormMsg({ text: data.message, type: 'error' });
                return;
            }
            
            setDoctorFormMsg({ text: '✅ Médecin créé avec succès !', type: 'success' });
            setDoctorForm({ nom: '', prenom: '', email: '', password: '', telephone: '', specialite: '' });
            refetchUsers();
            refetchStats();
            
            setTimeout(() => {
                setShowDoctorForm(false);
                setDoctorFormMsg({ text: '', type: '' });
            }, 2000);
            
        } catch (error) {
            setDoctorFormMsg({ text: 'Erreur de connexion au serveur.', type: 'error' });
        } finally {
            setDoctorFormLoading(false);
        }
    };

    const renderHome = () => (
        <>
            <div className="action-bar">
                <button className="action-bar-btn primary" onClick={() => setShowDoctorForm(true)}>
                    <span className="btn-icon">👨‍⚕️</span> Créer un médecin
                </button>
            </div>

            {/* Section Paiements Admin */}
            <div className="payments-admin-section">
                <div className="section-header">
                    <h3>💰 Statistiques financières</h3>
                </div>
                <div className="admin-payment-stats">
                    <div className="admin-stat-card">
                        <div className="admin-stat-value">{paymentGlobal?.total_global || 0}€</div>
                        <div className="admin-stat-label">Total des consultations</div>
                    </div>
                    <div className="admin-stat-card">
                        <div className="admin-stat-value">{paymentGlobal?.nombre_total || 0}</div>
                        <div className="admin-stat-label">Consultations payées</div>
                    </div>
                    <div className="admin-stat-card">
                        <div className="admin-stat-value">{paymentGlobal?.medecins_actifs || 0}</div>
                        <div className="admin-stat-label">Médecins actifs</div>
                    </div>
                </div>

                <div className="doctors-payment-table">
                    <h4>👨‍⚕️ Revenus par médecin</h4>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr><th>Médecin</th><th>Spécialité</th><th>Consultations</th><th>Total reçu</th> </tr>
                            </thead>
                            <tbody>
                                {paymentByDoctor.map((doc) => (
                                    <tr key={doc.id}>
                                        <td><strong>Dr. {doc.prenom} {doc.nom}</strong></td>
                                        <td>{doc.specialite || '-'}</td>
                                        <td>{doc.nombre_paiements || 0}</td>
                                        <td className="highlight">{doc.total || 0}€</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">👥</div>
                    <div className="stat-info">
                        <div className="value">{loadStats ? '...' : stats?.total || 0}</div>
                        <div className="title">Utilisateurs total</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">👨‍⚕️</div>
                    <div className="stat-info">
                        <div className="value">{loadStats ? '...' : stats?.medecins || 0}</div>
                        <div className="title">Médecins</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple">🧑‍⚕️</div>
                    <div className="stat-info">
                        <div className="value">{loadStats ? '...' : stats?.patients || 0}</div>
                        <div className="title">Patients</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange">📅</div>
                    <div className="stat-info">
                        <div className="value">{loadStats ? '...' : stats?.rdv || 0}</div>
                        <div className="title">Rendez-vous</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red">🤖</div>
                    <div className="stat-info">
                        <div className="value">{loadStats ? '...' : stats?.ai || 0}</div>
                        <div className="title">Requêtes IA</div>
                    </div>
                </div>
            </div>

            <div className="content-grid">
                <div className="card">
                    <div className="card-header">
                        <h3>👥 Derniers inscrits</h3>
                        <span className="badge badge-green">En direct</span>
                    </div>
                    {loadUsers ? <div className="loading-text">Chargement...</div> : (
                        <div className="appt-list">
                            {users?.slice(0, 5).map((u, i) => (
                                <div className="appt-item" key={i}>
                                    <div className="user-avatar" style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                                        {u.prenom?.[0]}{u.nom?.[0]}
                                    </div>
                                    <div className="appt-info">
                                        <div className="patient-name">{u.prenom} {u.nom}</div>
                                        <div className="reason">{u.email}</div>
                                    </div>
                                    <span className={`badge ${u.role === 'medecin' ? 'badge-blue' : u.role === 'admin' ? 'badge-red' : 'badge-purple'}`}>
                                        {u.role}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="card-header"><h3>⚡ Actions admin</h3></div>
                    <button className="action-btn" onClick={() => setActive('users')}><span className="btn-icon">👥</span> Gérer les utilisateurs</button>
                    <button className="action-btn" onClick={() => setActive('appointments')}><span className="btn-icon">📅</span> Voir tous les rendez-vous</button>
                    <button className="action-btn" onClick={() => setActive('ai')}><span className="btn-icon">🤖</span> Assistant IA</button>
                    <button className="action-btn primary" onClick={() => setShowDoctorForm(true)}><span className="btn-icon">👨‍⚕️</span> Créer un médecin</button>
                </div>
            </div>
        </>
    );

    const renderUsers = () => (
        <div className="card">
            <div className="card-header">
                <h3>👥 Gestion des utilisateurs</h3>
                <span className="badge badge-blue">{users?.length || 0} comptes</span>
            </div>
            {loadUsers ? <div className="loading-text">Chargement...</div> : !users?.length ? (
                <div className="empty-state">Aucun utilisateur trouvé.</div>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Spécialité</th><th>Inscription</th><th>Action</th> </tr>
                        </thead>
                        <tbody>
                            {users.map((u, i) => (
                                <tr key={i}>
                                    <td><strong>{u.prenom} {u.nom}</strong></td>
                                    <td>{u.email}</td>
                                    <td>
                                        <span className={`badge ${u.role === 'medecin' ? 'badge-blue' : u.role === 'admin' ? 'badge-red' : 'badge-purple'}`}>
                                            {u.role === 'medecin' ? '👨‍⚕️ Médecin' : u.role === 'admin' ? '🛡️ Admin' : '🧑‍⚕️ Patient'}
                                        </span>
                                    </td>
                                    <td>{u.specialite || '-'}</td>
                                    <td>{formatDate(u.created_at)}</td>
                                    <td>
                                        {u.role !== 'admin' && (
                                            <button className="tbl-btn red" onClick={() => deleteUser(u.id)}>🗑</button>
                                        )}
                                    </td>
                                 </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    const renderAppointments = () => (
        <div className="card">
            <div className="card-header">
                <h3>📅 Tous les rendez-vous</h3>
                <span className="badge badge-blue">{appointments?.length || 0} total</span>
            </div>
            {loadAppts ? <div className="loading-text">Chargement...</div> : !appointments?.length ? (
                <div className="empty-state">Aucun rendez-vous trouvé.</div>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr><th>Date</th><th>Patient</th><th>Médecin</th><th>Spécialité</th><th>Motif</th><th>Statut</th> </tr>
                        </thead>
                        <tbody>
                            {appointments.map((a, i) => (
                                <tr key={i}>
                                    <td>{formatDate(a.date_heure)}</td>
                                    <td>{a.patient_prenom} {a.patient_nom}</td>
                                    <td>Dr. {a.medecin_prenom} {a.medecin_nom}</td>
                                    <td>{a.specialite}</td>
                                    <td>{a.motif || '-'}</td>
                                    <td><span className={`badge ${STATUS_BADGE[a.statut]}`}>{STATUS_LABEL[a.statut]}</span></td>
                                 </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    const renderAI = () => (
        <div className="card">
            <div className="card-header">
                <h3>🤖 Assistant IA - Gestion des utilisateurs</h3>
                <span className="badge badge-purple">Bientôt disponible</span>
            </div>
            <div className="coming-soon">
                <div className="coming-soon-icon">🚧</div>
                <h4>Assistant IA en développement</h4>
                <p>L'assistant intelligent vous permettra d'interagir avec la base de données<br />
                et de poser des questions sur les utilisateurs comme :</p>
                <ul className="coming-soon-list">
                    <li>📊 "Combien de médecins sont inscrits ?"</li>
                    <li>👥 "Quels sont les 5 derniers patients inscrits ?"</li>
                    <li>🩺 "Quel médecin a le plus de rendez-vous ?"</li>
                    <li>📅 "Combien de rendez-vous cette semaine ?"</li>
                    <li>🔍 "Trouver l'utilisateur avec l'email xxx@gmail.com"</li>
                    <li>📈 "Quel est le nombre total d'utilisateurs ?"</li>
                </ul>
                <div className="coming-soon-note">
                    ⚡ Cette fonctionnalité sera disponible prochainement pour faciliter la gestion des utilisateurs.
                </div>
            </div>
        </div>
    );

    const renderContent = () => {
        if (active === 'users')        return renderUsers();
        if (active === 'appointments') return renderAppointments();
        if (active === 'ai')           return renderAI();
        if (active === 'settings')     return <SettingsPage />;
        return renderHome();
    };

    return (
        <div className="dashboard-wrapper">
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <div className="brand-icon">🏥</div>
                    <div className="brand-name">Med<span>Care</span></div>
                </div>
                <nav className="sidebar-nav">
                    <div className="nav-section-title">Administration</div>
                    {NAV.map(item => (
                        <button key={item.id} className={`nav-item ${active === item.id ? 'active' : ''}`} onClick={() => setActive(item.id)}>
                            <span className="nav-icon">{item.icon}</span>{item.label}
                        </button>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <div className="user-card">
                        <div className="user-avatar">{initials}</div>
                        <div className="user-info">
                            <div className="name">{user?.prenom} {user?.nom}</div>
                            <div className="role-badge">Administrateur</div>
                        </div>
                        <button className="logout-btn" onClick={handleLogout} title="Déconnexion">🚪</button>
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <div className="welcome-banner">
                    <div>
                        <h2>Tableau de bord <span className="highlight">Admin 🛡️</span></h2>
                        <p>Vue d'ensemble de la plateforme MedCare AI</p>
                    </div>
                </div>
                {renderContent()}
            </main>

            {showDoctorForm && (
                <div className="modal-overlay" onClick={() => setShowDoctorForm(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>👨‍⚕️ Créer un nouveau médecin</h3>
                            <button className="modal-close" onClick={() => setShowDoctorForm(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreateDoctor}>
                            {doctorFormMsg.text && (
                                <div className={`modal-msg ${doctorFormMsg.type}`}>{doctorFormMsg.text}</div>
                            )}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Nom *</label>
                                    <input type="text" name="nom" value={doctorForm.nom} onChange={handleDoctorInputChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Prénom *</label>
                                    <input type="text" name="prenom" value={doctorForm.prenom} onChange={handleDoctorInputChange} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Email *</label>
                                <input type="email" name="email" value={doctorForm.email} onChange={handleDoctorInputChange} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Mot de passe *</label>
                                    <input type="password" name="password" value={doctorForm.password} onChange={handleDoctorInputChange} required />
                                    <small>Minimum 6 caractères</small>
                                </div>
                                <div className="form-group">
                                    <label>Téléphone</label>
                                    <input type="tel" name="telephone" value={doctorForm.telephone} onChange={handleDoctorInputChange} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Spécialité *</label>
                                <select name="specialite" value={doctorForm.specialite} onChange={handleDoctorInputChange} required>
                                    <option value="">Choisir une spécialité</option>
                                    {specialites.map(s => (
                                        <option key={s.id} value={s.nom}>{s.nom}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="modal-buttons">
                                <button type="button" className="btn-secondary" onClick={() => setShowDoctorForm(false)}>Annuler</button>
                                <button type="submit" className="btn-primary" disabled={doctorFormLoading}>
                                    {doctorFormLoading ? 'Création...' : 'Créer le médecin'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}