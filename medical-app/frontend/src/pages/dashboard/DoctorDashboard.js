import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import SettingsPage from '../../components/SettingsPage';
import './Dashboard.css';
import jsPDF from 'jspdf';

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
    const d = new Date(dt), t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

export default function DoctorDashboard() {
    const { user, logout, authFetch } = useAuth();
    const navigate = useNavigate();
    const [active, setActive] = useState('home');
    const [aiMessage, setAiMessage] = useState('');
const [aiResponse, setAiResponse] = useState('');
const [report, setReport] = useState('');
const [aiLoading, setAiLoading] = useState(false);

    // Notifications
    const [notifications, setNotifications] = useState([]);
    const [showNotifPanel, setShowNotifPanel] = useState(false);

    // Modal confirmer avec prix
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [prixInput, setPrixInput] = useState('');
    const [modalMsg, setModalMsg] = useState('');

    // Stats paiements
    const [paymentStats, setPaymentStats] = useState({ stats: { total: 0, nombre: 0, moyenne: 0, mois_en_cours: 0 }, recent: [] });

    const { data: appointments, loading: loadAppts, refetch: refetchAppts } = useFetch('http://localhost:5000/api/doctors/appointments');
    const { data: patients,     loading: loadPats  }                        = useFetch('http://localhost:5000/api/doctors/patients');

    const handleLogout = () => { logout(); navigate('/login'); };
    const initials = user ? `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() : 'D';

    const todayAppts   = appointments?.filter(a => isToday(a.date_heure)) || [];
    const pendingAppts = appointments?.filter(a => a.statut === 'en_attente') || [];
    const unreadCount  = notifications.filter(n => !n.lu).length;

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await authFetch('http://localhost:5000/api/doctors/notifications');
            if (res.ok) setNotifications(await res.json());
        } catch {}
    }, [authFetch]);

    const fetchPaymentStats = useCallback(async () => {
        try {
            const res = await authFetch('http://localhost:5000/api/payments/doctor/stats');
            if (res.ok) setPaymentStats(await res.json());
        } catch {}
    }, [authFetch]);

    useEffect(() => {
        fetchNotifications();
        fetchPaymentStats();
        const interval = setInterval(fetchNotifications, 15000);
        return () => clearInterval(interval);
    }, [fetchNotifications, fetchPaymentStats]);

    const markNotificationsRead = async () => {
        setShowNotifPanel(v => !v);
        if (unreadCount > 0) {
            await authFetch('http://localhost:5000/api/doctors/notifications/read', { method: 'PUT' });
            setNotifications(prev => prev.map(n => ({ ...n, lu: 1 })));
        }
    };
    const handleAIChat = async () => {

    if (!aiMessage) return;

    setAiLoading(true);

    try {

        const res = await authFetch('http://localhost:5000/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: aiMessage
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
    const generateReport = () => {

    const generated = `
=========== RAPPORT MÉDICAL ===========

👨‍⚕️ Médecin :
Dr. ${user?.prenom} ${user?.nom}

📅 Date :
${new Date().toLocaleDateString()}

🩺 Symptômes du patient :
${aiMessage}

🤖 Analyse IA :
${aiResponse}

=======================================
`;

    setReport(generated);
};
const generatePDF = () => {

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('RAPPORT MEDICAL', 20, 20);

    doc.setFontSize(12);

    doc.text(`Médecin : Dr. ${user?.prenom} ${user?.nom}`, 20, 40);

    doc.text(`Date : ${new Date().toLocaleDateString()}`, 20, 50);

    doc.text('Symptômes du patient :', 20, 70);
    doc.text(aiMessage || '', 20, 80, { maxWidth: 170 });

    doc.text('Analyse IA :', 20, 110);
    doc.text(aiResponse || '', 20, 120, { maxWidth: 170 });

    doc.save('rapport-medical.pdf');
};

    // Ouvrir modal confirmation avec prix
    const openConfirmModal = (appt) => {
        setSelectedAppointment(appt);
        setPrixInput('');
        setModalMsg('');
        setShowPriceModal(true);
    };

    // Confirmer RDV avec prix → notifie patient
    const handleConfirmWithPrice = async () => {
        if (!prixInput || prixInput <= 0) { setModalMsg('Veuillez entrer un prix valide'); return; }
        try {
            const res = await authFetch(`http://localhost:5000/api/doctors/appointment/${selectedAppointment.id}/confirm`, {
                method: 'PUT',
                body: JSON.stringify({ prix: parseFloat(prixInput) }),
            });
            if (!res.ok) { const d = await res.json(); setModalMsg(d.message); return; }
            setShowPriceModal(false);
            refetchAppts();
            fetchPaymentStats();
        } catch { setModalMsg('Erreur de connexion'); }
    };

    // Refuser RDV → notifie patient
    const handleReject = async (appt) => {
        if (!window.confirm(`Refuser le rendez-vous de ${appt.patient_prenom} ${appt.patient_nom} ?`)) return;
        try {
            await authFetch(`http://localhost:5000/api/doctors/appointment/${appt.id}/reject`, { method: 'PUT' });
            refetchAppts();
        } catch {}
    };

    // Demander paiement → notifie patient
    const handleRequestPayment = async (appt) => {
        try {
            const res = await authFetch(`http://localhost:5000/api/doctors/appointment/${appt.id}/request-payment`, { method: 'PUT' });
            if (res.ok) refetchAppts();
        } catch {}
    };

    const renderHome = () => (
        <>
            <div className="payment-stats-grid">
                <div className="payment-card">
                    <div className="payment-card-icon blue">💰</div>
                    <div className="payment-card-info">
                        <div className="payment-card-value">{`${paymentStats.stats?.total || 0}€`}</div>
                        <div className="payment-card-title">Total des revenus</div>
                    </div>
                </div>
                <div className="payment-card">
                    <div className="payment-card-icon green">📊</div>
                    <div className="payment-card-info">
                        <div className="payment-card-value">{paymentStats.stats?.nombre || 0}</div>
                        <div className="payment-card-title">Consultations payées</div>
                    </div>
                </div>
                <div className="payment-card">
                    <div className="payment-card-icon purple">💶</div>
                    <div className="payment-card-info">
                        <div className="payment-card-value">{`${paymentStats.stats?.moyenne || 0}€`}</div>
                        <div className="payment-card-title">Moyenne / consultation</div>
                    </div>
                </div>
                <div className="payment-card">
                    <div className="payment-card-icon orange">📅</div>
                    <div className="payment-card-info">
                        <div className="payment-card-value">{`${paymentStats.stats?.mois_en_cours || 0}€`}</div>
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
                        <h3>⏳ Rendez-vous en attente</h3>
                        <span className="badge badge-orange">{pendingAppts.length} à traiter</span>
                    </div>
                    {loadAppts ? <div className="loading-text">Chargement...</div> : pendingAppts.length === 0 ? (
                        <div className="empty-state">Aucun rendez-vous en attente.</div>
                    ) : (
                        <div className="appt-list">
                            {pendingAppts.slice(0, 4).map((a, i) => (
                                <div className="appt-item" key={i}>
                                    <div className="appt-time">
                                        <div className="time">{formatTime(a.date_heure)}</div>
                                        <div className="date">{formatDate(a.date_heure)}</div>
                                    </div>
                                    <div className="appt-divider" />
                                    <div className="appt-info">
                                        <div className="patient-name">{a.patient_prenom} {a.patient_nom}</div>
                                        <div className="reason">{a.motif || 'Consultation'}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="tbl-btn green" onClick={() => openConfirmModal(a)}>✓ Confirmer</button>
                                        <button className="tbl-btn red" onClick={() => handleReject(a)}>✗ Refuser</button>
                                    </div>
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
                                <th>Date</th><th>Heure</th><th>Patient</th><th>Tél.</th>
                                <th>Motif</th><th>Prix</th><th>Statut</th><th>Actions</th>
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
                                    <td><span className={`badge ${STATUS_BADGE[a.statut] || 'badge-orange'}`}>{STATUS_LABEL[a.statut] || a.statut}</span></td>
                                    <td>
                                        {a.statut === 'en_attente' && (
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="tbl-btn green" onClick={() => openConfirmModal(a)}>✓ Confirmer</button>
                                                <button className="tbl-btn red" onClick={() => handleReject(a)}>✗ Refuser</button>
                                            </div>
                                        )}
                                        {a.statut === 'confirmé' && !a.paiement_requis && (
                                            <button className="tbl-btn blue" onClick={() => handleRequestPayment(a)}>💳 Demander paiement</button>
                                        )}
                                        {a.statut === 'confirmé' && a.paiement_requis === 1 && (
                                            <span className="badge badge-orange">⏳ Paiement en attente</span>
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
                        <thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Dernière visite</th></tr></thead>
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
<<<<<<< Updated upstream
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
                <div className="coming-soon-note">⚡ Cette fonctionnalité sera bientôt disponible.</div>
            </div>
=======
    <div className="card">
        <div className="card-header">
            <h3>🤖 Assistant IA Médical</h3>
>>>>>>> Stashed changes
        </div>

        <div style={{ marginTop: '20px' }}>

            <textarea
                placeholder="Décrivez les symptômes ou posez une question médicale..."
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '15px',
                    borderRadius: '10px',
                    border: '1px solid #ccc',
                    marginBottom: '15px'
                }}
            />

            <button
                onClick={handleAIChat}
                className="action-btn"
                disabled={aiLoading}
            >
                {aiLoading ? 'Analyse en cours...' : 'Envoyer à l’IA'}
            </button>
            <button
    onClick={() => {
    generateReport();
    generatePDF();
}}
    className="action-btn"
    style={{ marginLeft: '10px' }}
>
    📄 Générer rapport
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
            {report && (
    <div
        style={{
            marginTop: '20px',
            padding: '20px',
            background: '#eef6ff',
            borderRadius: '10px',
            whiteSpace: 'pre-line'
        }}
    >
        <h3>📄 Rapport Médical</h3>
        <p>{report}</p>
    </div>
)}

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

            {/* Modal confirmer avec prix */}
            {showPriceModal && selectedAppointment && (
                <div className="modal-overlay" onClick={() => setShowPriceModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>✅ Confirmer le rendez-vous</h3>
                            <button className="modal-close" onClick={() => setShowPriceModal(false)}>✕</button>
                        </div>
                        <div className="form-group">
                            <label>Patient</label>
                            <input type="text" value={`${selectedAppointment.patient_prenom} ${selectedAppointment.patient_nom}`} disabled className="disabled-input" />
                        </div>
                        <div className="form-group">
                            <label>Date</label>
                            <input type="text" value={`${formatDate(selectedAppointment.date_heure)} à ${formatTime(selectedAppointment.date_heure)}`} disabled className="disabled-input" />
                        </div>
                        <div className="form-group">
                            <label>Motif</label>
                            <input type="text" value={selectedAppointment.motif || '-'} disabled className="disabled-input" />
                        </div>
                        <div className="form-group">
                            <label>💰 Prix de la consultation (€)</label>
                            <input type="number" placeholder="Ex: 50" value={prixInput} onChange={e => setPrixInput(e.target.value)} min="0" step="5" autoFocus />
                        </div>
                        {modalMsg && <div className="modal-msg error">{modalMsg}</div>}
                        <div className="modal-buttons">
                            <button className="btn-secondary" onClick={() => setShowPriceModal(false)}>Annuler</button>
                            <button className="btn-primary" onClick={handleConfirmWithPrice}>✅ Confirmer & notifier le patient</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
