import { useState } from 'react';
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

    // États pour les modales IA
    const [showSymptomsModal, setShowSymptomsModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showChatbotModal, setShowChatbotModal] = useState(false);
    const [showRiskModal, setShowRiskModal] = useState(false);
    
    // États pour les formulaires IA
    const [symptomsForm, setSymptomsForm] = useState({ patientName: '', symptoms: '' });
    const [reportForm, setReportForm] = useState({ patientName: '', diagnosis: '', treatment: '' });
    const [chatMessage, setChatMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [riskForm, setRiskForm] = useState({ patientName: '', age: '', symptoms: '' });
    
    // États pour les résultats IA
    const [aiResult, setAiResult] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);

    const { data: appointments, loading: loadAppts, refetch: refetchAppts } = useFetch('http://localhost:5000/api/doctors/appointments');
    const { data: patients,     loading: loadPats  }                        = useFetch('http://localhost:5000/api/doctors/patients');

    const handleLogout = () => { logout(); navigate('/login'); };
    const initials = user ? `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() : 'D';

    const todayAppts   = appointments?.filter(a => isToday(a.date_heure)) || [];
    const pendingAppts = appointments?.filter(a => a.statut === 'en_attente') || [];

    const updateStatus = async (id, statut) => {
        await authFetch(`http://localhost:5000/api/appointments/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ statut }),
        });
        refetchAppts();
    };

    // Analyse des symptômes
    const handleAnalyzeSymptoms = async (e) => {
        e.preventDefault();
        setAiLoading(true);
        setAiResult(null);
        
        // Simulation d'appel API (à remplacer par votre vrai endpoint)
        setTimeout(() => {
            setAiResult({
                type: 'symptoms',
                diagnostic: 'Infection respiratoire suspectée',
                probability: '85%',
                severity: 'Moyenne',
                recommendations: [
                    'Repos au lit pendant 2-3 jours',
                    'Hydratation abondante',
                    'Consultation médicale si fièvre > 39°C',
                    'Éviter les contacts rapprochés'
                ]
            });
            setAiLoading(false);
        }, 2000);
    };

    // Génération de rapport
    const handleGenerateReport = async (e) => {
        e.preventDefault();
        setAiLoading(true);
        setAiResult(null);
        
        setTimeout(() => {
            setAiResult({
                type: 'report',
                patientName: reportForm.patientName,
                diagnosis: reportForm.diagnosis,
                treatment: reportForm.treatment,
                report: `Rapport médical pour ${reportForm.patientName}\n\nDiagnostic: ${reportForm.diagnosis}\n\nTraitement prescrit: ${reportForm.treatment}\n\nRecommandations: Suivi dans 2 semaines.`
            });
            setAiLoading(false);
        }, 1500);
    };

    // Chatbot médical
    const handleSendMessage = async () => {
        if (!chatMessage.trim()) return;
        
        const newMessage = { text: chatMessage, sender: 'user', time: new Date().toLocaleTimeString() };
        setChatHistory([...chatHistory, newMessage]);
        setChatMessage('');
        setAiLoading(true);
        
        setTimeout(() => {
            const botResponse = {
                text: getBotResponse(chatMessage),
                sender: 'bot',
                time: new Date().toLocaleTimeString()
            };
            setChatHistory([...chatHistory, newMessage, botResponse]);
            setAiLoading(false);
        }, 1000);
    };

    const getBotResponse = (message) => {
        const msg = message.toLowerCase();
        if (msg.includes('symptôme') || msg.includes('symptomes')) {
            return 'Pour une analyse précise des symptômes, veuillez utiliser l\'outil "Analyse des symptômes" dans la section IA.';
        }
        if (msg.includes('rendez-vous') || msg.includes('rdv')) {
            return 'Vous pouvez gérer vos rendez-vous dans la section "Planning" du menu.';
        }
        if (msg.includes('patient')) {
            return 'La liste de vos patients est disponible dans la section "Mes patients".';
        }
        if (msg.includes('médicament') || msg.includes('traitement')) {
            return 'Pour les prescriptions, utilisez l\'outil "Génération de rapports".';
        }
        return 'Je suis votre assistant médical. Je peux vous aider avec l\'analyse des symptômes, la génération de rapports et les informations médicales générales. Comment puis-je vous aider ?';
    };

    // Score de risque
    const handleAnalyzeRisk = async (e) => {
        e.preventDefault();
        setAiLoading(true);
        setAiResult(null);
        
        setTimeout(() => {
            const riskScore = Math.floor(Math.random() * 100);
            let riskLevel = 'Faible';
            let recommendation = 'Patient en bonne santé générale.';
            
            if (riskScore > 70) {
                riskLevel = 'Élevé';
                recommendation = 'Consultation urgente recommandée. Examen approfondi nécessaire.';
            } else if (riskScore > 40) {
                riskLevel = 'Modéré';
                recommendation = 'Surveillance recommandée. Suivi dans 3 mois.';
            } else {
                riskLevel = 'Faible';
                recommendation = 'Patient en bonne santé générale.';
            }
            
            setAiResult({
                type: 'risk',
                patientName: riskForm.patientName,
                age: riskForm.age,
                riskScore: riskScore,
                riskLevel: riskLevel,
                recommendation: recommendation
            });
            setAiLoading(false);
        }, 1800);
    };

    const renderHome = () => (
        <>
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
                    <table>
                        <thead>
                            <tr><th>Date</th><th>Heure</th><th>Patient</th><th>Téléphone</th><th>Motif</th><th>Statut</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {appointments.map((a, i) => (
                                <tr key={i}>
                                    <td>{formatDate(a.date_heure)}</td>
                                    <td>{formatTime(a.date_heure)}</td>
                                    <td><strong>{a.patient_prenom} {a.patient_nom}</strong></td>
                                    <td>{a.patient_tel || '-'}</td>
                                    <td>{a.motif || '-'}</td>
                                    <td><span className={`badge ${STATUS_BADGE[a.statut]}`}>{STATUS_LABEL[a.statut]}</span></td>
                                    <td>
                                        {a.statut === 'en_attente' && (
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="tbl-btn green" onClick={() => updateStatus(a.id, 'confirmé')}>✓</button>
                                                <button className="tbl-btn red"   onClick={() => updateStatus(a.id, 'annulé')}>✕</button>
                                            </div>
                                        )}
                                        {a.statut === 'confirmé' && (
                                            <button className="tbl-btn purple" onClick={() => updateStatus(a.id, 'terminé')}>✔ Terminé</button>
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
                    <table>
                        <thead>
                            <tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Dernière visite</th> </tr>
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
        <>
            <div className="ai-content">
                <div className="ai-card" onClick={() => setShowSymptomsModal(true)}>
                    <div className="ai-icon">🧠</div>
                    <div className="ai-info">
                        <h4>Analyse des symptômes</h4>
                        <p>L'IA analyse les symptômes des patients et propose des diagnostics probables.</p>
                        <button className="btn-primary-sm">Utiliser →</button>
                    </div>
                </div>
                <div className="ai-card" onClick={() => setShowReportModal(true)}>
                    <div className="ai-icon">📋</div>
                    <div className="ai-info">
                        <h4>Génération de rapports médicaux</h4>
                        <p>Générez automatiquement des rapports détaillés pour vos patients.</p>
                        <button className="btn-primary-sm">Générer →</button>
                    </div>
                </div>
                <div className="ai-card" onClick={() => setShowChatbotModal(true)}>
                    <div className="ai-icon">💬</div>
                    <div className="ai-info">
                        <h4>Chatbot médical</h4>
                        <p>Assistant virtuel pour répondre aux questions des patients 24/7.</p>
                        <button className="btn-primary-sm">Démarrer →</button>
                    </div>
                </div>
                <div className="ai-card" onClick={() => setShowRiskModal(true)}>
                    <div className="ai-icon">📊</div>
                    <div className="ai-info">
                        <h4>Score de risque patient</h4>
                        <p>Évaluez les risques médicaux et obtenez des recommandations.</p>
                        <button className="btn-primary-sm">Analyser →</button>
                    </div>
                </div>
            </div>
            <div className="ai-stats">
                <div className="ai-stat-item">
                    <div className="ai-stat-value">24/7</div>
                    <div className="ai-stat-label">Disponibilité</div>
                </div>
                <div className="ai-stat-item">
                    <div className="ai-stat-value">98%</div>
                    <div className="ai-stat-label">Précision</div>
                </div>
                <div className="ai-stat-item">
                    <div className="ai-stat-value">Temps réel</div>
                    <div className="ai-stat-label">Analyse</div>
                </div>
            </div>

            {/* Modal Analyse des symptômes */}
            {showSymptomsModal && (
                <div className="modal-overlay" onClick={() => setShowSymptomsModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>🧠 Analyse des symptômes</h3>
                            <button className="modal-close" onClick={() => setShowSymptomsModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleAnalyzeSymptoms}>
                            <div className="form-group">
                                <label>Nom du patient</label>
                                <input type="text" placeholder="Nom du patient" value={symptomsForm.patientName} onChange={(e) => setSymptomsForm({ ...symptomsForm, patientName: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Symptômes (décrivez en détail)</label>
                                <textarea rows="4" placeholder="Ex: Fièvre, toux, maux de tête depuis 3 jours..." value={symptomsForm.symptoms} onChange={(e) => setSymptomsForm({ ...symptomsForm, symptoms: e.target.value })} required />
                            </div>
                            <button type="submit" className="btn-primary" disabled={aiLoading}>
                                {aiLoading ? 'Analyse en cours...' : 'Analyser les symptômes'}
                            </button>
                        </form>
                        {aiResult && aiResult.type === 'symptoms' && (
                            <div className="ai-result">
                                <h4>📊 Résultat de l'analyse</h4>
                                <p><strong>Diagnostic probable:</strong> {aiResult.diagnostic}</p>
                                <p><strong>Probabilité:</strong> {aiResult.probability}</p>
                                <p><strong>Niveau de gravité:</strong> {aiResult.severity}</p>
                                <p><strong>Recommandations:</strong></p>
                                <ul>
                                    {aiResult.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal Génération de rapport */}
            {showReportModal && (
                <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📋 Génération de rapport médical</h3>
                            <button className="modal-close" onClick={() => setShowReportModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleGenerateReport}>
                            <div className="form-group">
                                <label>Nom du patient</label>
                                <input type="text" placeholder="Nom du patient" value={reportForm.patientName} onChange={(e) => setReportForm({ ...reportForm, patientName: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Diagnostic</label>
                                <input type="text" placeholder="Diagnostic établi" value={reportForm.diagnosis} onChange={(e) => setReportForm({ ...reportForm, diagnosis: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Traitement prescrit</label>
                                <textarea rows="3" placeholder="Médicaments, posologie, durée..." value={reportForm.treatment} onChange={(e) => setReportForm({ ...reportForm, treatment: e.target.value })} required />
                            </div>
                            <button type="submit" className="btn-primary" disabled={aiLoading}>
                                {aiLoading ? 'Génération...' : 'Générer le rapport'}
                            </button>
                        </form>
                        {aiResult && aiResult.type === 'report' && (
                            <div className="ai-result">
                                <h4>📄 Rapport généré</h4>
                                <pre>{aiResult.report}</pre>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal Chatbot médical */}
            {showChatbotModal && (
                <div className="modal-overlay" onClick={() => setShowChatbotModal(false)}>
                    <div className="modal-content chatbot-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>💬 Chatbot médical</h3>
                            <button className="modal-close" onClick={() => setShowChatbotModal(false)}>✕</button>
                        </div>
                        <div className="chatbot-container">
                            <div className="chat-messages">
                                {chatHistory.length === 0 && (
                                    <div className="chat-welcome">
                                        <p>🤖 Bonjour ! Je suis votre assistant médical.<br />Posez-moi vos questions sur les symptômes, traitements, ou conseils médicaux.</p>
                                    </div>
                                )}
                                {chatHistory.map((msg, idx) => (
                                    <div key={idx} className={`chat-message ${msg.sender}`}>
                                        <div className="message-bubble">{msg.text}</div>
                                        <div className="message-time">{msg.time}</div>
                                    </div>
                                ))}
                                {aiLoading && <div className="chat-typing">🤖 L'assistant écrit...</div>}
                            </div>
                            <div className="chat-input-area">
                                <input type="text" placeholder="Écrivez votre message..." value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} />
                                <button onClick={handleSendMessage}>Envoyer</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Score de risque */}
            {showRiskModal && (
                <div className="modal-overlay" onClick={() => setShowRiskModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📊 Score de risque patient</h3>
                            <button className="modal-close" onClick={() => setShowRiskModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleAnalyzeRisk}>
                            <div className="form-group">
                                <label>Nom du patient</label>
                                <input type="text" placeholder="Nom du patient" value={riskForm.patientName} onChange={(e) => setRiskForm({ ...riskForm, patientName: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Âge</label>
                                <input type="number" placeholder="Âge du patient" value={riskForm.age} onChange={(e) => setRiskForm({ ...riskForm, age: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Symptômes / Antécédents</label>
                                <textarea rows="3" placeholder="Décrivez les symptômes ou antécédents médicaux..." value={riskForm.symptoms} onChange={(e) => setRiskForm({ ...riskForm, symptoms: e.target.value })} required />
                            </div>
                            <button type="submit" className="btn-primary" disabled={aiLoading}>
                                {aiLoading ? 'Calcul en cours...' : 'Évaluer le risque'}
                            </button>
                        </form>
                        {aiResult && aiResult.type === 'risk' && (
                            <div className="ai-result">
                                <h4>📊 Score de risque</h4>
                                <p><strong>Patient:</strong> {aiResult.patientName}</p>
                                <p><strong>Âge:</strong> {aiResult.age} ans</p>
                                <p><strong>Score de risque:</strong> <span className={`risk-score risk-${aiResult.riskLevel.toLowerCase()}`}>{aiResult.riskScore}/100</span></p>
                                <p><strong>Niveau:</strong> <span className={`risk-badge risk-${aiResult.riskLevel.toLowerCase()}`}>{aiResult.riskLevel}</span></p>
                                <p><strong>Recommandation:</strong> {aiResult.recommendation}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
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
        </div>
    );
}