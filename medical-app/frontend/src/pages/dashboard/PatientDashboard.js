import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import SettingsPage from '../../components/SettingsPage';
import './Dashboard.css';

const NAV = [
    { icon: '🏠', label: 'Accueil',        id: 'home' },
    { icon: '📅', label: 'Mes rendez-vous', id: 'appointments' },
    { icon: '👨⚕️', label: 'Mes médecins',  id: 'doctors' },
    { icon: '🤖', label: 'Diagnostic IA',   id: 'ai' },
    { icon: '⚙️', label: 'Paramètres',      id: 'settings' },
];

const STATUS_BADGE = { 'en_attente': 'badge-orange', 'confirmé': 'badge-green', 'annulé': 'badge-red', 'terminé': 'badge-purple' };
const STATUS_LABEL = { 'en_attente': 'En attente', 'confirmé': 'Confirmé', 'annulé': 'Annulé', 'terminé': 'Terminé' };

function formatDate(dt) {
    if (!dt) return '-';
    return new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTime(dt) {
    if (!dt) return '-';
    return new Date(dt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function PatientDashboard() {
    const { user, logout, authFetch } = useAuth();
    const navigate = useNavigate();
    const [active, setActive] = useState('home');

    // Notifications
    const [notifications, setNotifications] = useState([]);
    const [showNotifPanel, setShowNotifPanel] = useState(false);

    // Booking
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedMotif, setSelectedMotif] = useState('');
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingMessage, setBookingMessage] = useState('');
    const [aiMessage, setAiMessage] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    // Payment
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentMessage, setPaymentMessage] = useState('');

    const { data: appointments, loading: loadAppts, refetch: refetchAppts } = useFetch('http://localhost:5000/api/patients/appointments');
    const { data: doctors, loading: loadDocs } = useFetch('http://localhost:5000/api/patients/doctors');

    const handleLogout = () => { logout(); navigate('/login'); };
    const initials = user ? `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() : 'P';

    const upcoming = appointments?.filter(a => a.statut !== 'annulé' && a.statut !== 'terminé') || [];
    const history  = appointments?.filter(a => a.statut === 'terminé') || [];
    const unreadCount = notifications.filter(n => !n.lu).length;

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await authFetch('http://localhost:5000/api/patients/notifications');
            if (res.ok) setNotifications(await res.json());
        } catch {}
    }, [authFetch]);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const markNotificationsRead = async () => {
        setShowNotifPanel(v => !v);
        if (unreadCount > 0) {
            await authFetch('http://localhost:5000/api/patients/notifications/read', { method: 'PUT' });
            setNotifications(prev => prev.map(n => ({ ...n, lu: 1 })));
        }
    };

    const openBookingModal = (doctor) => {
        setSelectedDoctor(doctor);
        setSelectedDate('');
        setSelectedMotif('');
        setBookingMessage('');
        setShowBookingModal(true);
    };

    const handleCreateAppointment = async (e) => {
        e.preventDefault();
        setBookingLoading(true);
        setBookingMessage('');
        try {
            const res = await authFetch('http://localhost:5000/api/patients/appointments/create', {
                method: 'POST',
                body: JSON.stringify({ medecin_id: selectedDoctor.id, date_heure: selectedDate, motif: selectedMotif }),
            });
            const data = await res.json();
            if (!res.ok) { setBookingMessage(data.message || 'Erreur lors de la réservation'); return; }
            setBookingMessage('✅ Rendez-vous demandé ! En attente de confirmation du médecin.');
            setTimeout(() => {
                setShowBookingModal(false);
                refetchAppts();
                setBookingMessage('');
            }, 2000);
        } catch { setBookingMessage('Erreur de connexion au serveur'); }
        finally { setBookingLoading(false); }
    };

    const openPaymentModal = (appt) => {
        setSelectedAppointment(appt);
        setPaymentMessage('');
        setShowPaymentModal(true);
    };

    const handlePayAppointment = async () => {
        setPaymentLoading(true);
        setPaymentMessage('');
        try {
            const res = await authFetch('http://localhost:5000/api/payments/create', {
                method: 'POST',
                body: JSON.stringify({
                    rendez_vous_id: selectedAppointment.id,
                    methode_paiement: 'carte',
                    montant: selectedAppointment.prix_medecin,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setPaymentMessage(data.message || 'Erreur lors du paiement'); return; }
            setPaymentMessage(`✅ Paiement effectué ! Réf: ${data.reference}`);
            setTimeout(() => {
                setShowPaymentModal(false);
                refetchAppts();
                fetchNotifications();
                setPaymentMessage('');
            }, 2000);
        } catch { setPaymentMessage('Erreur de connexion au serveur'); }
        finally { setPaymentLoading(false); }
    };
    const handlePatientAI = async () => {

    if (!aiMessage) return;

    setAiLoading(true);

    try {

        const res = await authFetch('http://localhost:5000/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `
Tu es un assistant médical pour patients.

Analyse les symptômes suivants et indique :
- la spécialité médicale recommandée
- une courte explication

Symptômes :
${aiMessage}
`
            })
        });

        const data = await res.json();

        setAiResponse(data.reply);

    } catch (error) {

        console.error(error);

        setAiResponse("Erreur avec l'IA");

    } finally {

        setAiLoading(false);
    }
};

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
                        <div className="value">{loadDocs ? '...' : doctors?.length || 0}</div>
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
                                        <div className="reason">{a.specialite}{a.motif ? ` — ${a.motif}` : ''}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                        <span className={`badge ${STATUS_BADGE[a.statut] || 'badge-orange'}`}>
                                            {STATUS_LABEL[a.statut] || a.statut}
                                        </span>
                                        {a.statut === 'confirmé' && a.paiement_requis === 1 && a.statut_paiement !== 'paye' && (
                                            <button className="btn-book" style={{ fontSize: 12 }} onClick={() => openPaymentModal(a)}>💳 Payer {a.prix_medecin}€</button>
                                        )}
                                        {a.statut_paiement === 'paye' && (
                                            <span className="badge badge-green" style={{ fontSize: 11 }}>✅ Payé</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="card-header"><h3>⚡ Actions rapides</h3></div>
                    <button className="action-btn" onClick={() => setActive('doctors')}><span className="btn-icon">📅</span> Prendre un rendez-vous</button>
                    <button className="action-btn" onClick={() => setActive('appointments')}><span className="btn-icon">📋</span> Voir tous mes rendez-vous</button>
                    <button className="action-btn" onClick={() => setActive('doctors')}><span className="btn-icon">👨⚕️</span> Trouver un médecin</button>
                    <button className="action-btn" onClick={() => setActive('ai')}><span className="btn-icon">🤖</span> Lancer un diagnostic IA</button>
                </div>
            </div>
        </>
    );

    const renderAppointments = () => (
        <div className="card">
            <div className="card-header">
                <h3>📅 Tous mes rendez-vous</h3>
                <button className="btn-primary-sm" onClick={() => setActive('doctors')}>+ Nouveau</button>
            </div>
            {loadAppts ? <div className="loading-text">Chargement...</div> : !appointments?.length ? (
                <div className="empty-state">Aucun rendez-vous trouvé.</div>
            ) : (
                <div className="table-wrap">
                    <table className="appointments-table">
                        <thead>
                            <tr>
                                <th>Date</th><th>Heure</th><th>Médecin</th><th>Spécialité</th>
                                <th>Motif</th><th>Prix</th><th>Statut</th><th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {appointments.map((a, i) => (
                                <tr key={i}>
                                    <td>{formatDate(a.date_heure)}</td>
                                    <td>{formatTime(a.date_heure)}</td>
                                    <td>Dr. {a.medecin_prenom} {a.medecin_nom}</td>
                                    <td>{a.specialite}</td>
                                    <td>{a.motif || '-'}</td>
                                    <td>{a.prix_medecin ? `${a.prix_medecin}€` : '-'}</td>
                                    <td><span className={`badge ${STATUS_BADGE[a.statut] || 'badge-orange'}`}>{STATUS_LABEL[a.statut] || a.statut}</span></td>
                                    <td>
                                        {a.statut === 'confirmé' && a.paiement_requis === 1 && a.statut_paiement !== 'paye' && (
                                            <button className="btn-book" onClick={() => openPaymentModal(a)}>💳 Payer {a.prix_medecin}€</button>
                                        )}
                                        {a.statut_paiement === 'paye' && (
                                            <span className="badge badge-green">✅ Payé</span>
                                        )}
                                        {a.statut === 'en_attente' && (
                                            <span className="badge badge-orange" style={{ fontSize: 11 }}>⏳ Attente confirmation</span>
                                        )}
                                        {a.statut === 'confirmé' && !a.paiement_requis && a.statut_paiement !== 'paye' && (
                                            <span className="badge badge-green" style={{ fontSize: 11 }}>✅ Confirmé</span>
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
                            <button className="btn-book" onClick={() => openBookingModal(d)}>📅 Réserver</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderAI = () => (
    <>
        <div className="card">
            <div className="card-header">
                <h3>🤖 Diagnostic IA</h3>
                <span className="badge badge-purple">Disponible</span>
            </div>

            <div className="coming-soon">
                <div className="coming-soon-icon">🤖</div>

                <textarea
                    placeholder="Décrivez vos symptômes..."
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    style={{
                        width: '100%',
                        minHeight: '150px',
                        padding: '15px',
                        borderRadius: '10px',
                        border: '1px solid #ccc',
                        marginTop: '20px'
                    }}
                />

                <button
                    className="action-btn"
                    onClick={handlePatientAI}
                    disabled={aiLoading}
                    style={{ marginTop: '15px' }}
                >
                    {aiLoading
                        ? 'Analyse en cours...'
                        : 'Analyser mes symptômes'}
                </button>

                {aiResponse && (
                    <div
                        style={{
                            marginTop: '20px',
                            padding: '20px',
                            background: '#f5f7ff',
                            borderRadius: '10px',
                            whiteSpace: 'pre-wrap'
                        }}
                    >
                        <strong>Réponse IA :</strong>
                        <p>{aiResponse}</p>
                    </div>
                )}
            </div>
        </div>
    </>
);
    const renderContent = () => {
        if (active === 'appointments') return renderAppointments();
        if (active === 'doctors')      return renderDoctors();
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
                    <button className="notif-bell" onClick={markNotificationsRead}>
                        🔔
                        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                    </button>
                </div>

                {/* Panneau notifications (hors du banner pour éviter overflow:hidden) */}
                {showNotifPanel && (
                    <div className="notif-panel-wrapper">
                        <div className="notif-panel">
                            <div className="notif-panel-header">
                                🔔 Notifications
                                <button className="notif-close" onClick={() => setShowNotifPanel(false)}>✕</button>
                            </div>
                            {notifications.length === 0 ? (
                                <div className="notif-empty">Aucune notification</div>
                            ) : notifications.map((n, i) => (
                                <div key={i} className={`notif-item ${n.lu ? '' : 'unread'}`}>
                                    <div className="notif-msg">{n.message}</div>
                                    <div className="notif-time">{formatDate(n.created_at)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {renderContent()}
            </main>

            {/* Modal réservation */}
            {showBookingModal && selectedDoctor && (
                <div className="modal-overlay" onClick={() => setShowBookingModal(false)}>
                    <div className="modal-content payment-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📅 Nouveau rendez-vous</h3>
                            <button className="modal-close" onClick={() => setShowBookingModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreateAppointment}>
                            <div className="form-group">
                                <label>👨⚕️ Médecin</label>
                                <input type="text" value={`Dr. ${selectedDoctor.prenom} ${selectedDoctor.nom} — ${selectedDoctor.specialite || 'Médecine générale'}`} disabled className="disabled-input" />
                            </div>
                            <div className="form-group">
                                <label>📅 Date et heure *</label>
                                <input type="datetime-local" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>📝 Motif</label>
                                <input type="text" placeholder="Ex: Consultation annuelle, douleur..." value={selectedMotif} onChange={e => setSelectedMotif(e.target.value)} />
                            </div>
                            {bookingMessage && (
                                <div className={`payment-message ${bookingMessage.includes('✅') ? 'success' : 'error'}`}>{bookingMessage}</div>
                            )}
                            <div className="modal-buttons">
                                <button type="button" className="btn-secondary" onClick={() => setShowBookingModal(false)}>Annuler</button>
                                <button type="submit" className="btn-primary" disabled={bookingLoading}>
                                    {bookingLoading ? 'Envoi...' : 'Demander le rendez-vous'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal paiement */}
            {showPaymentModal && selectedAppointment && (
                <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="modal-content payment-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>💳 Paiement consultation</h3>
                            <button className="modal-close" onClick={() => setShowPaymentModal(false)}>✕</button>
                        </div>
                        <div className="form-group">
                            <label>👨⚕️ Médecin</label>
                            <input type="text" value={`Dr. ${selectedAppointment.medecin_prenom} ${selectedAppointment.medecin_nom}`} disabled className="disabled-input" />
                        </div>
                        <div className="form-group">
                            <label>📅 Date</label>
                            <input type="text" value={`${formatDate(selectedAppointment.date_heure)} à ${formatTime(selectedAppointment.date_heure)}`} disabled className="disabled-input" />
                        </div>
                        <div className="form-group">
                            <label>💰 Montant à payer</label>
                            <input type="text" value={`${selectedAppointment.prix_medecin}€`} disabled className="disabled-input" style={{ fontSize: 22, fontWeight: 'bold', color: 'var(--primary)' }} />
                        </div>
                        {paymentMessage && (
                            <div className={`payment-message ${paymentMessage.includes('✅') ? 'success' : 'error'}`}>{paymentMessage}</div>
                        )}
                        <div className="modal-buttons">
                            <button className="btn-secondary" onClick={() => setShowPaymentModal(false)}>Annuler</button>
                            <button className="btn-primary" onClick={handlePayAppointment} disabled={paymentLoading}>
                                {paymentLoading ? 'Traitement...' : '💳 Payer maintenant'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
