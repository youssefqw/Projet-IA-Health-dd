import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import BookingModal from '../../components/BookingModal';
import SettingsPage from '../../components/SettingsPage';
import './Dashboard.css';

const NAV = [
    { icon: '🏠', label: 'Accueil',        id: 'home' },
    { icon: '📅', label: 'Mes rendez-vous', id: 'appointments' },
    { icon: '👨⚕️', label: 'Mes médecins',  id: 'doctors' },
    { icon: '🤖', label: 'Diagnostic IA',   id: 'ai' },
    { icon: '⚙️', label: 'Paramètres',      id: 'settings' },
];

const STATUS_BADGE = {
    'en_attente': 'badge-orange',
    'confirmé':   'badge-green',
    'annulé':     'badge-red',
    'terminé':    'badge-purple',
};

const STATUS_LABEL = {
    'en_attente': 'En attente',
    'confirmé':   'Confirmé',
    'annulé':     'Annulé',
    'terminé':    'Terminé',
};

function formatDate(dt) {
    if (!dt) return '-';
    return new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dt) {
    if (!dt) return '-';
    return new Date(dt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function PatientDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [active, setActive]       = useState('home');
    const [showModal, setShowModal] = useState(false);

    const { data: appointments, loading: loadAppts, refetch: refetchAppts } = useFetch('http://localhost:5000/api/patients/appointments');
    const { data: doctors,      loading: loadDocs  }                        = useFetch('http://localhost:5000/api/patients/doctors');

    const handleLogout = () => { logout(); navigate('/login'); };
    const initials = user ? `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() : 'P';

    const upcoming = appointments?.filter(a => a.statut !== 'annulé' && a.statut !== 'terminé') || [];
    const history  = appointments?.filter(a => a.statut === 'terminé') || [];
    const uniqueDoctors = doctors?.length || 0;

    const renderHome = () => (
        <>
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">📅</div>
                    <div className="stat-info">
                        <div className="value">{loadAppts ? '...' : upcoming.length}</div>
                        <div className="title">Rendez-vous à venir</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">👨⚕️</div>
                    <div className="stat-info">
                        <div className="value">{loadDocs ? '...' : uniqueDoctors}</div>
                        <div className="title">Médecins disponibles</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple">✅</div>
                    <div className="stat-info">
                        <div className="value">{loadAppts ? '...' : history.length}</div>
                        <div className="title">Consultations passées</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange">⏳</div>
                    <div className="stat-info">
                        <div className="value">{loadAppts ? '...' : appointments?.filter(a => a.statut === 'en_attente').length || 0}</div>
                        <div className="title">En attente</div>
                    </div>
                </div>
            </div>

            <div className="content-grid">
                <div className="card">
                    <div className="card-header">
                        <h3>📅 Prochains rendez-vous</h3>
                        <span className="badge badge-blue">{upcoming.length} à venir</span>
                    </div>
                    {loadAppts ? <div className="loading-text">Chargement...</div> : upcoming.length === 0 ? (
                        <div className="empty-state">Aucun rendez-vous à venir.<br />Prenez un rendez-vous dès maintenant !</div>
                    ) : (
                        <div className="appt-list">
                            {upcoming.slice(0, 4).map((a, i) => (
                                <div className="appt-item" key={i}>
                                    <div className="appt-time">
                                        <div className="time">{formatTime(a.date_heure)}</div>
                                        <div className="date">{formatDate(a.date_heure)}</div>
                                    </div>
                                    <div className="appt-divider" />
                                    <div className="appt-info">
                                        <div className="patient-name">Dr. {a.medecin_prenom} {a.medecin_nom}</div>
                                        <div className="reason">{a.specialite} {a.motif ? `— ${a.motif}` : ''}</div>
                                    </div>
                                    <span className={`badge ${STATUS_BADGE[a.statut] || 'badge-orange'}`}>
                                        {STATUS_LABEL[a.statut] || a.statut}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="card-header"><h3>⚡ Actions rapides</h3></div>
                    <button className="action-btn" onClick={() => setShowModal(true)}>
                        <span className="btn-icon">📅</span> Prendre un rendez-vous
                    </button>
                    <button className="action-btn" onClick={() => setActive('appointments')}>
                        <span className="btn-icon">📋</span> Voir tous mes rendez-vous
                    </button>
                    <button className="action-btn" onClick={() => setActive('doctors')}>
                        <span className="btn-icon">👨⚕️</span> Trouver un médecin
                    </button>
                    <button className="action-btn" onClick={() => setActive('ai')}>
                        <span className="btn-icon">🤖</span> Lancer un diagnostic IA
                    </button>
                </div>
            </div>
        </>
    );

    const renderAppointments = () => (
        <div className="card">
            <div className="card-header">
                <h3>📅 Tous mes rendez-vous</h3>
                <button className="btn-primary-sm" onClick={() => setShowModal(true)}>+ Nouveau</button>
            </div>
            {loadAppts ? <div className="loading-text">Chargement...</div> : !appointments?.length ? (
                <div className="empty-state">Aucun rendez-vous trouvé.</div>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr><th>Date</th><th>Heure</th><th>Médecin</th><th>Spécialité</th><th>Motif</th><th>Statut</th></tr>
                        </thead>
                        <tbody>
                            {appointments.map((a, i) => (
                                <tr key={i}>
                                    <td>{formatDate(a.date_heure)}</td>
                                    <td>{formatTime(a.date_heure)}</td>
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

    const renderDoctors = () => (
        <div className="card">
            <div className="card-header">
                <h3>👨⚕️ Médecins disponibles</h3>
                <span className="badge badge-blue">{doctors?.length || 0} médecins</span>
            </div>
            {loadDocs ? <div className="loading-text">Chargement...</div> : !doctors?.length ? (
                <div className="empty-state">Aucun médecin disponible.</div>
            ) : (
                <div className="doctors-grid">
                    {doctors.map((d, i) => (
                        <div className="doctor-card" key={i}>
                            <div className="doctor-avatar">{d.prenom?.[0]}{d.nom?.[0]}</div>
                            <div className="doctor-info">
                                <div className="doctor-name">Dr. {d.prenom} {d.nom}</div>
                                <div className="doctor-spec">{d.specialite || 'Médecine générale'}</div>
                                {d.telephone && <div className="doctor-tel">📱 {d.telephone}</div>}
                            </div>
                            <button className="btn-book" onClick={() => setShowModal(true)}>Réserver</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderContent = () => {
        if (active === 'appointments') return renderAppointments();
        if (active === 'doctors')      return renderDoctors();
        if (active === 'ai')           return <div className="card"><div className="empty-state">🤖 Module IA — Bientôt disponible</div></div>;
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
                    <div className="nav-section-title">Menu principal</div>
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
                            <div className="role-badge">Patient</div>
                        </div>
                        <button className="logout-btn" onClick={handleLogout} title="Déconnexion">🚪</button>
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <div className="welcome-banner">
                    <div>
                        <h2>Bonjour, <span className="highlight">{user?.prenom} 👋</span></h2>
                        <p>Voici un aperçu de votre espace santé</p>
                    </div>
                </div>
                {renderContent()}
            </main>

            {showModal && (
                <BookingModal
                    doctors={doctors}
                    onClose={() => setShowModal(false)}
                    onSuccess={refetchAppts}
                />
            )}
        </div>
    );
}
