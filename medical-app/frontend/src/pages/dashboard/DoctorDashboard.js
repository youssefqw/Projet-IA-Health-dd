import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import SettingsPage from '../../components/SettingsPage';
import './Dashboard.css';

const NAV = [
    { icon: '🏠', label: 'Accueil',       id: 'home' },
    { icon: '📅', label: 'Planning',       id: 'planning' },
    { icon: '🧑‍⚕️', label: 'Mes patients', id: 'patients' },
    { icon: '🤖', label: 'Outils IA',      id: 'ai' },
    { icon: '⚙️', label: 'Paramètres',     id: 'settings' },
];

const STATUS_BADGE  = { 'en_attente': 'badge-orange', 'confirmé': 'badge-green', 'annulé': 'badge-red', 'terminé': 'badge-purple' };
const STATUS_LABEL  = { 'en_attente': 'En attente', 'confirmé': 'Confirmé', 'annulé': 'Annulé', 'terminé': 'Terminé' };

function formatDate(dt) {
    if (!dt) return '-';
    return new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dt) {
    if (!dt) return '-';
    return new Date(dt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function isToday(dt) {
    const d = new Date(dt);
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

export default function DoctorDashboard() {
    const { user, logout, authFetch } = useAuth();
    const navigate = useNavigate();
    const [active, setActive] = useState('home');

    // États pour le modal de confirmation avec prix
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [prixInput, setPrixInput] = useState('');

    // États pour les paiements
    const [paymentStats, setPaymentStats] = useState({ stats: { total: 0, nombre: 0, moyenne: 0, mois_en_cours: 0 }, recent: [] });
    const [loadingPayments, setLoadingPayments] = useState(false);

    const { data: appointments, loading: loadAppts, refetch: refetchAppts } = useFetch('http://localhost:5000/api/doctors/appointments');
    const { data: patients,     loading: loadPats  }                        = useFetch('http://localhost:5000/api/doctors/patients');

    const handleLogout = () => { logout(); navigate('/login'); };
    const initials = user ? `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() : 'D';

    const todayAppts   = appointments?.filter(a => isToday(a.date_heure)) || [];
    const pendingAppts = appointments?.filter(a => a.statut === 'en_attente') || [];

    // Charger les statistiques de paiement
    const fetchPaymentStats = async () => {
        setLoadingPayments(true);
        try {
            const res = await authFetch('http://localhost:5000/api/payments/doctor/stats');
            const data = await res.json();
            setPaymentStats(data);
        } catch (error) {
            console.error('Erreur chargement stats paiements:', error);
        } finally {
            setLoadingPayments(false);
        }
    };

    useEffect(() => {
        fetchPaymentStats();
    }, []);

    // Ouvrir modal pour fixer le prix
    const openPriceModal = (appointment) => {
        setSelectedAppointment(appointment);
        setPrixInput('');
        setShowPriceModal(true);
    };

    // Confirmer le rendez-vous avec prix
    const handleConfirmWithPrice = async () => {
        if (!prixInput || prixInput <= 0) {
            alert('Veuillez entrer un prix valide');
            return;
        }
        
        try {
            await authFetch(`http://localhost:5000/api/doctors/appointment/${selectedAppointment.id}/confirm`, {
                method: 'PUT',
                body: JSON.stringify({ prix: parseFloat(prixInput) }),
            });
            
            setShowPriceModal(false);
            refetchAppts();
            fetchPaymentStats();
        } catch (error) {
            console.error('Erreur:', error);
        }
    };

    const renderHome = () => (
        <>
            <div className="payment-stats-grid">
                <div className="payment-card">
                    <div className="payment-card-icon blue">💰</div>
                    <div className="payment-card-info">
                        <div className="payment-card-value">{loadingPayments ? '...' : `${paymentStats.stats?.total || 0}€`}</div>
                        <div className="payment-card-title">Total des revenus</div>
                    </div>
                </div>
                <div className="payment-card">
                    <div className="payment-card-icon green">📊</div>
                    <div className="payment-card-info">
                        <div className="payment-card-value">{loadingPayments ? '...' : paymentStats.stats?.nombre || 0}</div>
                        <div className="payment-card-title">Consultations payées</div>
                    </div>
                </div>
                <div className="payment-card">
                    <div className="payment-card-icon purple">💶</div>
                    <div className="payment-card-info">
                        <div className="payment-card-value">{loadingPayments ? '...' : `${paymentStats.stats?.moyenne || 0}€`}</div>
                        <div className="payment-card-title">Moyenne par consultation</div>
                    </div>
                </div>
                <div className="payment-card">
                    <div className="payment-card-icon orange">📅</div>
                    <div className="payment-card-info">
                        <div className="payment-card-value">{loadingPayments ? '...' : `${paymentStats.stats?.mois_en_cours || 0}€`}</div>
                        <div className="payment-card-title">Ce mois-ci</div>
                    </div>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">🧑‍⚕️</div>
                    <div className="stat-info">
                        <div className="value">{loadPats ? '...' : patients?.length || 0}</div>
                        <div className="title">Patients total</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">📅</div>
                    <div className="stat-info">
                        <div className="value">{loadAppts ? '...' : todayAppts.length}</div>
                        <div className="title">Aujourd'hui</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange">⏳</div>
                    <div className="stat-info">
                        <div className="value">{loadAppts ? '...' : pendingAppts.length}</div>
                        <div className="title">En attente</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple">✅</div>
                    <div className="stat-info">
                        <div className="value">{loadAppts ? '...' : appointments?.filter(a => a.statut === 'terminé').length || 0}</div>
                        <div className="title">Terminés</div>
                    </div>
                </div>
            </div>

            <div className="content-grid">
                <div className="card">
                    <div className="card-header">
                        <h3>📅 Planning du jour</h3>
                        <span className="badge badge-blue">{todayAppts.length} consultations</span>
                    </div>
                    {loadAppts ? <div className="loading-text">Chargement...</div> : todayAppts.length === 0 ? (
                        <div className="empty-state">Aucune consultation aujourd'hui.</div>
                    ) : (
                        <div className="appt-list">
                            {todayAppts.map((a, i) => (
                                <div className="appt-item" key={i}>
                                    <div className="appt-time">
                                        <div className="time">{formatTime(a.date_heure)}</div>
                                        <div className="date">Aujourd'hui</div>
                                    </div>
                                    <div className="appt-divider" />
                                    <div className="appt-info">
                                        <div className="patient-name">{a.patient_prenom} {a.patient_nom}</div>
                                        <div className="reason">{a.motif || 'Consultation'}</div>
                                    </div>
                                    <span className={`badge ${STATUS_BADGE[a.statut]}`}>{STATUS_LABEL[a.statut]}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="card-header"><h3>⚡ Actions rapides</h3></div>
                    <button className="action-btn" onClick={() => setActive('planning')}><span className="btn-icon">📅</span> Voir mon planning</button>
                    <button className="action-btn" onClick={() => setActive('patients')}><span className="btn-icon">🧑‍⚕️</span> Mes patients</button>
                    <button className="action-btn" onClick={() => setActive('ai')}><span className="btn-icon">🤖</span> Aide au diagnostic IA</button>
                </div>
            </div>
        </>
    );

    const renderPlanning = () => (
        <div className="card">
            <div className="card-header">
                <h3>📅 Tous mes rendez-vous</h3>
                <span className="badge badge-blue">{appointments?.length || 0} total</span>
            </div>
            {loadAppts ? <div className="loading-text">Chargement...</div> : !appointments?.length ? (
                <div className="empty-state">Aucun rendez-vous trouvé.</div>
            ) : (
                <div className="table-wrap">
                    <table className="appointments-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Heure</th>
                                <th>Patient</th>
                                <th>Téléphone</th>
                                <th>Motif</th>
                                <th>Prix</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {appointments.map((a, i) => (
                                <tr key={i}>
                                    <td>{formatDate(a.date_heure)}</td>
                                    <td>{formatTime(a.date_heure)}</td>
                                    <td><strong>{a.patient_prenom} {a.patient_nom}</strong></td>
                                    <td>{a.patient_tel || '-'}</td>
                                    <td>{a.motif || '-'}</td>
                                    <td>{a.prix_medecin ? `${a.prix_medecin}€` : '-'}</td>
                                    <td><span className={`badge ${STATUS_BADGE[a.statut]}`}>{STATUS_LABEL[a.statut]}</span></td>
                                    <td>
                                        {a.statut === 'en_attente' && (
                                            <button className="tbl-btn green" onClick={() => openPriceModal(a)}>
                                                ✓ Confirmer & fixer prix
                                            </button>
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

    const renderPatients = () => (
        <div className="card">
            <div className="card-header">
                <h3>🧑‍⚕️ Mes patients</h3>
                <span className="badge badge-purple">{patients?.length || 0} patients</span>
            </div>
            {loadPats ? <div className="loading-text">Chargement...</div> : !patients?.length ? (
                <div className="empty-state">Aucun patient pour l'instant.</div>
            ) : (
                <div className="table-wrap">
                    <table className="patients-table">
                        <thead>
                            <tr>
                                <th>Nom</th>
                                <th>Email</th>
                                <th>Téléphone</th>
                                <th>Dernière visite</th>
                            </tr>
                        </thead>
                        <tbody>
                            {patients.map((p, i) => (
                                <tr key={i}>
                                    <td><strong>{p.prenom} {p.nom}</strong></td>
                                    <td>{p.email}</td>
                                    <td>{p.telephone || '-'}</td>
                                    <td>{formatDate(p.derniere_visite)}</td>
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
                <h3>🤖 Outils IA</h3>
                <span className="badge badge-purple">Bientôt disponible</span>
            </div>
            <div className="coming-soon">
                <div className="coming-soon-icon">🚧</div>
                <h4>Module IA en développement</h4>
                <p>L'intelligence artificielle vous permettra bientôt de :</p>
                <ul className="coming-soon-list">
                    <li>🔍 Analyser les symptômes des patients</li>
                    <li>📋 Générer des rapports médicaux</li>
                    <li>💬 Chatbot pour répondre aux patients</li>
                    <li>📊 Évaluer les scores de risque</li>
                </ul>
                <div className="coming-soon-note">
                    ⚡ Cette fonctionnalité sera bientôt disponible.
                </div>
            </div>
        </div>
    );

    const renderContent = () => {
        if (active === 'planning') return renderPlanning();
        if (active === 'patients') return renderPatients();
        if (active === 'ai')       return renderAI();
        if (active === 'settings') return <SettingsPage />;
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
                    <div className="nav-section-title">Espace médecin</div>
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
                            <div className="name">Dr. {user?.prenom} {user?.nom}</div>
                            <div className="role-badge">{user?.specialite || 'Médecin'}</div>
                        </div>
                        <button className="logout-btn" onClick={handleLogout} title="Déconnexion">🚪</button>
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <div className="welcome-banner">
                    <div>
                        <h2>Bonjour, <span className="highlight">Dr. {user?.prenom} 👋</span></h2>
                        <p>Vous avez <strong style={{ color: 'var(--primary)' }}>{todayAppts.length} consultation(s)</strong> aujourd'hui</p>
                    </div>
                </div>
                {renderContent()}
            </main>

            {/* Modal pour fixer le prix */}
            {showPriceModal && selectedAppointment && (
                <div className="modal-overlay" onClick={() => setShowPriceModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>💰 Fixer le prix de la consultation</h3>
                            <button className="modal-close" onClick={() => setShowPriceModal(false)}>✕</button>
                        </div>
                        <div className="form-group">
                            <label>Patient</label>
                            <input type="text" value={`${selectedAppointment.patient_prenom} ${selectedAppointment.patient_nom}`} disabled className="disabled-input" />
                        </div>
                        <div className="form-group">
                            <label>Date</label>
                            <input type="text" value={formatDate(selectedAppointment.date_heure)} disabled className="disabled-input" />
                        </div>
                        <div className="form-group">
                            <label>Motif</label>
                            <input type="text" value={selectedAppointment.motif || '-'} disabled className="disabled-input" />
                        </div>
                        <div className="form-group">
                            <label>💰 Prix de la consultation (€)</label>
                            <input type="number" placeholder="Entrez le montant" value={prixInput} onChange={(e) => setPrixInput(e.target.value)} min="0" step="10" required autoFocus />
                        </div>
                        <div className="modal-buttons">
                            <button className="btn-secondary" onClick={() => setShowPriceModal(false)}>Annuler</button>
                            <button className="btn-primary" onClick={handleConfirmWithPrice}>Confirmer et notifier le patient</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}