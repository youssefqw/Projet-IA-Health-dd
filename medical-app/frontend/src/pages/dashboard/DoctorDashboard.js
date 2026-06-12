import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import SettingsPage from '../../components/SettingsPage';
import jsPDF from 'jspdf';
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

    // États IA
    const [aiTab, setAiTab] = useState('symptoms');
    const [symptomsInput, setSymptomsInput] = useState('');
    const [patientAge, setPatientAge] = useState('');
    const [diagnoseResult, setDiagnoseResult] = useState(null);
    const [diagnoseLoading, setDiagnoseLoading] = useState(false);
    const [reportPatient, setReportPatient] = useState('');
    const [reportSymptoms, setReportSymptoms] = useState('');
    const [reportDiag, setReportDiag] = useState('');
    const [reportResult, setReportResult] = useState('');
    const [reportLoading, setReportLoading] = useState(false);
    const [chatMessages, setChatMessages] = useState([{ role: 'bot', text: '👋 Bonjour Dr. ! Posez-moi une question médicale concernant vos patients.' }]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef(null);
    const [riskAge, setRiskAge] = useState('');
    const [riskConditions, setRiskConditions] = useState('');
    const [riskSymptoms, setRiskSymptoms] = useState('');
    const [riskResult, setRiskResult] = useState(null);
    const [riskLoading, setRiskLoading] = useState(false);

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
                                        {a.statut === 'confirmé' && (
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="tbl-btn purple" onClick={async () => {
                                                    await authFetch(`http://localhost:5000/api/doctors/appointment/${a.id}/terminate`, { method: 'PUT' });
                                                    refetchAppts(); fetchPaymentStats();
                                                }}>✅ Passé</button>
                                                <button className="tbl-btn red" onClick={async () => {
                                                    await authFetch(`http://localhost:5000/api/doctors/appointment/${a.id}/reject`, { method: 'PUT' });
                                                    refetchAppts();
                                                }}>❌ Annuler</button>
                                            </div>
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

    const handleDiagnose = async () => {
        const list = symptomsInput.split(',').map(s => s.trim()).filter(Boolean);
        if (!list.length) return;
        setDiagnoseLoading(true); setDiagnoseResult(null);
        try {
            const res = await authFetch('http://localhost:5000/api/ai/diagnose', {
                method: 'POST',
                body: JSON.stringify({ symptoms: list, age: patientAge }),
            });
            setDiagnoseResult(await res.json());
        } catch { setDiagnoseResult({ message: 'Erreur serveur.' }); }
        setDiagnoseLoading(false);
    };

    const handleGenerateReport = async () => {
        if (!reportPatient || !reportSymptoms) return;
        setReportLoading(true); setReportResult('');
        try {
            const prompt = `Tu es un médecin. Rédige un rapport médical professionnel en français.\nPatient : ${reportPatient}\nSymptômes : ${reportSymptoms}\nDiagnostic supposé : ${reportDiag || 'à déterminer'}\nInclure : résumé clinique, hypothèses diagnostiques, examens recommandés, traitement suggéré.`;
            const res = await authFetch('http://localhost:5000/api/ai/chat', {
                method: 'POST',
                body: JSON.stringify({ message: prompt }),
            });
            const data = await res.json();
            setReportResult(data.reply || 'Erreur génération.');
        } catch { setReportResult('Erreur serveur.'); }
        setReportLoading(false);
    };

    const downloadReportPDF = () => {
        const doc = new jsPDF();
        doc.setFillColor(10, 37, 64);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.text('MEDCARE AI — RAPPORT MÉDICAL', 20, 25);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        let y = 55;
        doc.text(`Patient : ${reportPatient}`, 20, y); y += 10;
        doc.text(`Médecin : Dr. ${user?.prenom} ${user?.nom}`, 20, y); y += 10;
        doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 20, y); y += 15;
        doc.setFontSize(11);
        const lines = doc.splitTextToSize(reportResult, 170);
        doc.text(lines, 20, y);
        doc.save(`rapport-${reportPatient.replace(/\s/g, '_')}.pdf`);
    };

    const handleChatSend = async () => {
        if (!chatInput.trim() || chatLoading) return;
        const userMsg = chatInput.trim();
        setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setChatInput('');
        setChatLoading(true);
        try {
            const res = await authFetch('http://localhost:5000/api/ai/chat', {
                method: 'POST',
                body: JSON.stringify({ message: userMsg }),
            });
            const data = await res.json();
            setChatMessages(prev => [...prev, { role: 'bot', text: data.reply || 'Erreur.' }]);
        } catch {
            setChatMessages(prev => [...prev, { role: 'bot', text: 'Erreur de connexion.' }]);
        }
        setChatLoading(false);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const handleRiskScore = async () => {
        if (!riskAge || !riskSymptoms) return;
        setRiskLoading(true); setRiskResult(null);
        try {
            const prompt = `Évalue le score de risque médical de ce patient en JSON.\nÂge : ${riskAge}\nConditions chroniques : ${riskConditions || 'aucune'}\nSymptômes actuels : ${riskSymptoms}\nRéponds UNIQUEMENT avec ce format JSON (sans markdown) :\n{"score": <0-100>, "niveau": "faible|modere|eleve", "facteurs": ["..."], "recommandation": "..."}`;
            const res = await authFetch('http://localhost:5000/api/ai/chat', {
                method: 'POST',
                body: JSON.stringify({ message: prompt }),
            });
            const data = await res.json();
            try {
                const cleaned = data.reply.replace(/```json|```/g, '').trim();
                setRiskResult(JSON.parse(cleaned));
            } catch { setRiskResult({ score: '?', niveau: 'inconnu', facteurs: [], recommandation: data.reply }); }
        } catch { setRiskResult({ score: '?', niveau: 'inconnu', facteurs: [], recommandation: 'Erreur serveur.' }); }
        setRiskLoading(false);
    };

    const AI_TABS = [
        { id: 'symptoms', icon: '🔍', label: 'Analyser symptômes' },
        { id: 'report',   icon: '📋', label: 'Rapport médical' },
        { id: 'chat',     icon: '💬', label: 'Chatbot médical' },
        { id: 'risk',     icon: '📊', label: 'Score de risque' },
    ];

    const renderAI = () => (
        <div className="card">
            <div className="card-header">
                <h3>🤖 Outils IA Médecin</h3>
                <span className="badge badge-green">IA Active</span>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
                {AI_TABS.map(t => (
                    <button key={t.id} onClick={() => setAiTab(t.id)} style={{
                        padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        fontWeight: 600, fontSize: 13,
                        background: aiTab === t.id ? 'linear-gradient(135deg,var(--primary),var(--primary-dark))' : '#f1f5f9',
                        color: aiTab === t.id ? '#fff' : 'var(--dark-3)',
                    }}>{t.icon} {t.label}</button>
                ))}
            </div>

            {aiTab === 'symptoms' && (
                <div>
                    <p style={{ color: 'var(--gray)', marginBottom: 16 }}>Entrez les symptômes séparés par des virgules.</p>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                        <input style={{ flex: 3, padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none' }}
                            placeholder="fièvre, toux, fatigue..."
                            value={symptomsInput} onChange={e => setSymptomsInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleDiagnose()} />
                        <input style={{ flex: 1, padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none' }}
                            type="number" placeholder="Âge" value={patientAge} onChange={e => setPatientAge(e.target.value)} />
                    </div>
                    <button className="btn-primary" style={{ width: 'auto', padding: '10px 28px' }} onClick={handleDiagnose} disabled={diagnoseLoading}>
                        {diagnoseLoading ? 'Analyse...' : '🔍 Analyser'}
                    </button>
                    {diagnoseResult && (
                        <div className="ai-result" style={{ marginTop: 20 }}>
                            <p style={{ marginBottom: 12, color: 'var(--gray)' }}>{diagnoseResult.message}</p>
                            {diagnoseResult.results?.map((r, i) => (
                                <div key={i} style={{ background: '#fff', borderRadius: 8, padding: '14px 18px', marginBottom: 10, border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <strong style={{ fontSize: 15 }}>{r.condition}</strong>
                                        <span className={`risk-badge risk-${r.urgence === 'élevé' ? 'eleve' : r.urgence === 'moyen' ? 'modere' : 'faible'}`}>{r.urgence}</span>
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 4 }}>Spécialité : <strong>{r.specialite}</strong> — Confiance : <strong>{r.confidence}%</strong></div>
                                    <div style={{ fontSize: 13, color: 'var(--dark-3)' }}>{r.conseil}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {aiTab === 'report' && (
                <div>
                    <p style={{ color: 'var(--gray)', marginBottom: 16 }}>Générez un rapport médical structuré via IA puis téléchargez-le en PDF.</p>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Nom du patient *</label>
                        <input style={{ width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                            placeholder="Prénom Nom" value={reportPatient} onChange={e => setReportPatient(e.target.value)} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Symptômes *</label>
                        <input style={{ width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                            placeholder="douleur thoracique, essoufflement..." value={reportSymptoms} onChange={e => setReportSymptoms(e.target.value)} />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Diagnostic supposé (optionnel)</label>
                        <input style={{ width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                            placeholder="ex: hypertension" value={reportDiag} onChange={e => setReportDiag(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }} onClick={handleGenerateReport} disabled={reportLoading}>
                            {reportLoading ? 'Génération...' : '📋 Générer le rapport'}
                        </button>
                        {reportResult && (
                            <button className="action-btn" style={{ width: 'auto', marginBottom: 0 }} onClick={downloadReportPDF}>📄 Télécharger PDF</button>
                        )}
                    </div>
                    {reportResult && (
                        <div className="ai-result" style={{ marginTop: 20 }}>
                            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14, margin: 0 }}>{reportResult}</pre>
                        </div>
                    )}
                </div>
            )}

            {aiTab === 'chat' && (
                <div className="chatbot-container">
                    <div className="chat-messages">
                        {chatMessages.map((m, i) => (
                            <div key={i} className={`chat-message ${m.role}`}>
                                <div className="message-bubble">{m.text}</div>
                            </div>
                        ))}
                        {chatLoading && <div className="chat-typing">L'IA réfléchit...</div>}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="chat-input-area">
                        <input placeholder="Posez une question médicale..."
                            value={chatInput} onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleChatSend()} disabled={chatLoading} />
                        <button onClick={handleChatSend} disabled={chatLoading}>Envoyer</button>
                    </div>
                </div>
            )}

            {aiTab === 'risk' && (
                <div>
                    <p style={{ color: 'var(--gray)', marginBottom: 16 }}>Évaluez le score de risque médical d'un patient.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Âge *</label>
                            <input style={{ width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                                type="number" placeholder="ex: 55" value={riskAge} onChange={e => setRiskAge(e.target.value)} />
                        </div>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Conditions chroniques</label>
                            <input style={{ width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                                placeholder="diabète, hypertension..." value={riskConditions} onChange={e => setRiskConditions(e.target.value)} />
                        </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Symptômes actuels *</label>
                        <input style={{ width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                            placeholder="douleur thoracique, essoufflement..." value={riskSymptoms} onChange={e => setRiskSymptoms(e.target.value)} />
                    </div>
                    <button className="btn-primary" style={{ width: 'auto', padding: '10px 28px' }} onClick={handleRiskScore} disabled={riskLoading}>
                        {riskLoading ? 'Évaluation...' : '📊 Évaluer le risque'}
                    </button>
                    {riskResult && (
                        <div className="ai-result" style={{ marginTop: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                                <div className={`risk-score risk-${riskResult.niveau === 'eleve' ? 'eleve' : riskResult.niveau === 'modere' ? 'modere' : 'faible'}`}>
                                    {riskResult.score}/100
                                </div>
                                <span className={`risk-badge risk-${riskResult.niveau === 'eleve' ? 'eleve' : riskResult.niveau === 'modere' ? 'modere' : 'faible'}`}>
                                    {riskResult.niveau === 'eleve' ? '⚠️ Risque élevé' : riskResult.niveau === 'modere' ? '⚡ Risque modéré' : '✅ Risque faible'}
                                </span>
                            </div>
                            {riskResult.facteurs?.length > 0 && (
                                <div style={{ marginBottom: 10 }}>
                                    <strong style={{ fontSize: 13 }}>Facteurs de risque :</strong>
                                    <ul style={{ margin: '6px 0 0 20px', fontSize: 13, color: 'var(--dark-3)' }}>
                                        {riskResult.facteurs.map((f, i) => <li key={i}>{f}</li>)}
                                    </ul>
                                </div>
                            )}
                            <div style={{ fontSize: 14, color: 'var(--dark-3)' }}><strong>Recommandation :</strong> {riskResult.recommandation}</div>
                        </div>
                    )}
                </div>
            )}
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