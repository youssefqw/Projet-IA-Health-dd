import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import SettingsPage from '../../components/SettingsPage';
import './Dashboard.css';

const NAV = [
    { icon: '🏠', label: "Vue d'ensemble", id: 'home' },
    { icon: '👥', label: 'Utilisateurs',   id: 'users' },
    { icon: '📅', label: 'Rendez-vous',    id: 'appointments' },
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

    const { data: stats,        loading: loadStats,  refetch: refetchStats } = useFetch('http://localhost:5000/api/admin/stats');
    const { data: users,        loading: loadUsers,  refetch: refetchUsers } = useFetch('http://localhost:5000/api/admin/users');
    const { data: appointments, loading: loadAppts  }                        = useFetch('http://localhost:5000/api/admin/appointments');

    const handleLogout = () => { logout(); navigate('/login'); };
    const initials = user ? `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() : 'A';

    const deleteUser = async (id) => {
        if (!window.confirm('Supprimer cet utilisateur ?')) return;
        await authFetch(`http://localhost:5000/api/admin/users/${id}`, { method: 'DELETE' });
        refetchUsers();
        refetchStats();
    };

    const renderHome = () => (
        <>
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">👥</div>
                    <div className="stat-info">
                        <div className="value">{loadStats ? '...' : stats?.total || 0}</div>
                        <div className="title">Utilisateurs total</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">👨⚕️</div>
                    <div className="stat-info">
                        <div className="value">{loadStats ? '...' : stats?.medecins || 0}</div>
                        <div className="title">Médecins</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple">🧑⚕️</div>
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
                        <div className="title">Diagnostics IA</div>
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
                            <tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Spécialité</th><th>Inscription</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                            {users.map((u, i) => (
                                <tr key={i}>
                                    <td><strong>{u.prenom} {u.nom}</strong></td>
                                    <td>{u.email}</td>
                                    <td>
                                        <span className={`badge ${u.role === 'medecin' ? 'badge-blue' : u.role === 'admin' ? 'badge-red' : 'badge-purple'}`}>
                                            {u.role === 'medecin' ? '👨⚕️ Médecin' : u.role === 'admin' ? '🛡️ Admin' : '🧑⚕️ Patient'}
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
                            <tr><th>Date</th><th>Patient</th><th>Médecin</th><th>Spécialité</th><th>Motif</th><th>Statut</th></tr>
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

    const renderContent = () => {
        if (active === 'users')        return renderUsers();
        if (active === 'appointments') return renderAppointments();
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
        </div>
    );
}
