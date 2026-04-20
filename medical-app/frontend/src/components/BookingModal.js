import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './BookingModal.css';

export default function BookingModal({ doctors, onClose, onSuccess }) {
    const { authFetch } = useAuth();
    const [form, setForm] = useState({ medecin_id: '', date: '', heure: '', motif: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const date_heure = `${form.date} ${form.heure}:00`;
            const res = await authFetch('http://localhost:5000/api/appointments', {
                method: 'POST',
                body: JSON.stringify({ medecin_id: form.medecin_id, date_heure, motif: form.motif }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message); return; }
            onSuccess();
            onClose();
        } catch {
            setError('Erreur de connexion au serveur.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>📅 Prendre un rendez-vous</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {error && <div className="modal-error">⚠️ {error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="modal-field">
                        <label>Médecin</label>
                        <select value={form.medecin_id} onChange={e => setForm({ ...form, medecin_id: e.target.value })} required>
                            <option value="">Choisir un médecin</option>
                            {doctors?.map(d => (
                                <option key={d.id} value={d.id}>
                                    Dr. {d.prenom} {d.nom} — {d.specialite}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="modal-row">
                        <div className="modal-field">
                            <label>Date</label>
                            <input
                                type="date"
                                value={form.date}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                                required
                            />
                        </div>
                        <div className="modal-field">
                            <label>Heure</label>
                            <input
                                type="time"
                                value={form.heure}
                                onChange={e => setForm({ ...form, heure: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div className="modal-field">
                        <label>Motif de consultation</label>
                        <input
                            type="text"
                            placeholder="Ex: Douleurs abdominales, suivi..."
                            value={form.motif}
                            onChange={e => setForm({ ...form, motif: e.target.value })}
                        />
                    </div>
                    <button className="modal-submit" type="submit" disabled={loading}>
                        {loading ? 'Envoi...' : 'Confirmer le rendez-vous →'}
                    </button>
                </form>
            </div>
        </div>
    );
}
