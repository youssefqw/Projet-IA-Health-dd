import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import SettingsPage from '../../components/SettingsPage';
import './Dashboard.css';
import jsPDF from 'jspdf';

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
    const [adminMessage, setAdminMessage] = useState('');
    const [adminResponse, setAdminResponse] = useState('');
    const [adminReport, setAdminReport] = useState('');

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
    const handleAdminAI = () => {

    const generatedResponse = `
📊 ANALYSE INTELLIGENTE ADMIN

👨‍⚕️ Médecins actifs :
${stats?.medecins || 0}

🧑‍⚕️ Patients inscrits :
${stats?.patients || 0}

📅 Rendez-vous :
${stats?.rdv || 0}

💰 Revenus totaux :
${paymentGlobal?.total_global || 0}€

🩺 Analyse IA :
La plateforme connaît une bonne activité médicale.
La spécialité la plus active semble être la cardiologie et les consultations augmentent progressivement.
`;

    setAdminResponse(generatedResponse);
};

const generateAdminReport = () => {

   const report = `
=========== RAPPORT ADMIN IA ===========

Nombre de médecins :
${stats?.medecins || 0}

Nombre de patients :
${stats?.patients || 0}

Nombre de rendez-vous :
${stats?.rdv || 0}

Revenus :
${paymentGlobal?.total_global || 0}€

Maladies fréquentes :
- Diabète
- Hypertension
- Infections respiratoires

Analyse IA :
La plateforme présente une augmentation des consultations ce mois-ci.

=======================================
`;

    setAdminReport(report);
};
const generateAdminPDF = () => {

    const doc = new jsPDF();

    const img = new Image();
    img.src = '/medcare-logo.png';

    img.onload = () => {

        // HEADER BLEU
        doc.setFillColor(10, 37, 64);
        doc.rect(0, 0, 210, 45, 'F');

        // LOGO
        doc.addImage(img, 'PNG', 15, 8, 30, 30);

        // TITRE
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text('MEDCARE AI - RAPPORT ADMIN', 55, 25);

        // RETOUR TEXTE NOIR
        doc.setTextColor(0, 0, 0);

        let y = 60;
        doc.setFontSize(14);

doc.text(`Nombre de médecins : ${stats?.medecins || 0}`, 20, y);
y += 15;

doc.text(`Nombre de patients : ${stats?.patients || 0}`, 20, y);
y += 15;

doc.text(`Nombre de rendez-vous : ${stats?.rendezVous || 0}`, 20, y);
y += 15;

doc.text(`Revenus totaux : ${paymentGlobal?.total_global || 0}€`, 20, y);
y += 15;

doc.text('Maladies fréquentes :', 20, y);
y += 10;

doc.text('- Diabète', 30, y);
y += 10;

doc.text('- Hypertension', 30, y);
y += 10;

doc.text('- Infections respiratoires', 30, y);
y += 20;

doc.text('Analyse IA :', 20, y);
y += 10;

doc.text(
    'La plateforme présente une augmentation des consultations ce mois-ci.',
    20,
    y,
    { maxWidth: 160 }
);
                doc.save('rapport-admin-medcare.pdf');

    };
};
    const renderAI = () => (
    <div className="card">
        <div className="card-header">
            <h3>🤖 Assistant IA Administrateur</h3>
            <span className="badge badge-purple">IA Active</span>
        </div>

        <div style={{ marginTop: '20px' }}>

            <textarea
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                placeholder="Posez une question à l'IA admin..."
                rows="5"
                style={{
                    width: '100%',
                    padding: '15px',
                    borderRadius: '10px',
                    border: '1px solid #ddd',
                    marginBottom: '15px'
                }}
            />

            <button
                onClick={handleAdminAI}
                className="action-btn primary"
            >
                🤖 Analyser avec IA
            </button>

            <button
                onClick={() => {
    generateAdminReport();
    generateAdminPDF();
}}
                className="action-btn"
                style={{ marginLeft: '10px' }}
            >
                📄 Générer rapport
            </button>

            {adminResponse && (
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
                    <p>{adminResponse}</p>
                </div>
            )}

            {adminReport && (
                <div
                    style={{
                        marginTop: '20px',
                        padding: '20px',
                        background: '#eef6ff',
                        borderRadius: '10px',
                        whiteSpace: 'pre-wrap'
                    }}
                >
                    <strong>📄 Rapport Admin :</strong>
                    <p>{adminReport}</p>
                </div>
            )}

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