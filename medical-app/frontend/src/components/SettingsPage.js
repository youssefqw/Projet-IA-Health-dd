import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './SettingsPage.css';

export default function SettingsPage() {
    const { user, token, login, authFetch } = useAuth();

    const [profile, setProfile] = useState({ nom: '', prenom: '', telephone: '', specialite: '' });
    const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });
    const [profileLoading, setProfileLoading] = useState(false);

    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passMsg, setPassMsg] = useState({ text: '', type: '' });
    const [passLoading, setPassLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setProfile({ 
                nom: user.nom || '', 
                prenom: user.prenom || '', 
                telephone: user.telephone || '',
                specialite: user.specialite || ''
            });
        }
    }, [user]);

    const handleProfileSave = async e => {
        e.preventDefault();
        setProfileMsg({ text: '', type: '' });
        setProfileLoading(true);
        try {
            const res = await authFetch('http://localhost:5000/api/auth/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    nom: profile.nom,
                    prenom: profile.prenom,
                    telephone: profile.telephone
                }),
            });
            const data = await res.json();
            if (!res.ok) { 
                setProfileMsg({ text: data.message, type: 'error' }); 
                return; 
            }
            login(data.user, token);
            setProfileMsg({ text: '✅ Profil mis à jour avec succès !', type: 'success' });
        } catch {
            setProfileMsg({ text: 'Erreur de connexion au serveur.', type: 'error' });
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordSave = async e => {
        e.preventDefault();
        setPassMsg({ text: '', type: '' });
        if (passwords.newPassword !== passwords.confirmPassword) {
            setPassMsg({ text: 'Les nouveaux mots de passe ne correspondent pas.', type: 'error' });
            return;
        }
        if (passwords.newPassword.length < 6) {
            setPassMsg({ text: 'Le mot de passe doit contenir au moins 6 caractères.', type: 'error' });
            return;
        }
        setPassLoading(true);
        try {
            const res = await authFetch('http://localhost:5000/api/auth/change-password', {
                method: 'PUT',
                body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
            });
            const data = await res.json();
            if (!res.ok) { 
                setPassMsg({ text: data.message, type: 'error' }); 
                return; 
            }
            setPassMsg({ text: '✅ Mot de passe modifié avec succès !', type: 'success' });
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch {
            setPassMsg({ text: 'Erreur de connexion au serveur.', type: 'error' });
        } finally {
            setPassLoading(false);
        }
    };

    const initials = user ? `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() : '?';
    const roleLabel = { patient: 'Patient', medecin: 'Médecin', admin: 'Administrateur' };

    return (
        <div className="settings-wrapper">

            {/* Profile Card */}
            <div className="settings-profile-card">
                <div className="settings-avatar">{initials}</div>
                <div className="settings-identity">
                    <div className="settings-name">{user?.prenom} {user?.nom}</div>
                    <div className="settings-role">{roleLabel[user?.role] || user?.role}</div>
                    <div className="settings-email">📧 {user?.email}</div>
                </div>
            </div>

            <div className="settings-grid">
                {/* Profile Info Form */}
                <div className="card">
                    <div className="card-header">
                        <h3>👤 Informations personnelles</h3>
                    </div>
                    {profileMsg.text && (
                        <div className={`settings-msg ${profileMsg.type}`}>{profileMsg.text}</div>
                    )}
                    <form onSubmit={handleProfileSave}>
                        <div className="settings-form-row">
                            <div className="settings-field">
                                <label>Prénom</label>
                                <input
                                    type="text"
                                    value={profile.prenom}
                                    onChange={e => setProfile({ ...profile, prenom: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="settings-field">
                                <label>Nom</label>
                                <input
                                    type="text"
                                    value={profile.nom}
                                    onChange={e => setProfile({ ...profile, nom: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="settings-field">
                            <label>Email</label>
                            <input type="email" value={user?.email || ''} disabled className="disabled-input" />
                            <span className="field-hint">L'email ne peut pas être modifié.</span>
                        </div>

                        <div className="settings-field">
                            <label>Téléphone</label>
                            <input
                                type="tel"
                                placeholder="+33 6 00 00 00 00"
                                value={profile.telephone}
                                onChange={e => setProfile({ ...profile, telephone: e.target.value })}
                            />
                        </div>

                        {user?.role === 'medecin' && (
                            <div className="settings-field">
                                <label>Spécialité</label>
                                <input 
                                    type="text" 
                                    value={profile.specialite || 'Non définie'} 
                                    disabled 
                                    className="disabled-input"
                                />
                                <span className="field-hint">La spécialité ne peut pas être modifiée.</span>
                            </div>
                        )}

                        <button className="settings-save-btn" type="submit" disabled={profileLoading}>
                            {profileLoading ? 'Enregistrement...' : '💾 Enregistrer les modifications'}
                        </button>
                    </form>
                </div>

                {/* Change Password Form */}
                <div className="card">
                    <div className="card-header">
                        <h3>🔒 Changer le mot de passe</h3>
                    </div>
                    {passMsg.text && (
                        <div className={`settings-msg ${passMsg.type}`}>{passMsg.text}</div>
                    )}
                    <form onSubmit={handlePasswordSave}>
                        <div className="settings-field">
                            <label>Mot de passe actuel</label>
                            <div className="pass-input-wrap">
                                <span className="pass-icon">🔒</span>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={passwords.currentPassword}
                                    onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="settings-field">
                            <label>Nouveau mot de passe</label>
                            <div className="pass-input-wrap">
                                <span className="pass-icon">🔑</span>
                                <input
                                    type="password"
                                    placeholder="Minimum 6 caractères"
                                    value={passwords.newPassword}
                                    onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="settings-field">
                            <label>Confirmer le nouveau mot de passe</label>
                            <div className="pass-input-wrap">
                                <span className="pass-icon">✅</span>
                                <input
                                    type="password"
                                    placeholder="Répétez le mot de passe"
                                    value={passwords.confirmPassword}
                                    onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                    required
                                />
                            </div>
                            {passwords.newPassword && passwords.confirmPassword && (
                                <span className={`field-hint ${passwords.newPassword === passwords.confirmPassword ? 'hint-ok' : 'hint-err'}`}>
                                    {passwords.newPassword === passwords.confirmPassword ? '✓ Les mots de passe correspondent' : '✗ Les mots de passe ne correspondent pas'}
                                </span>
                            )}
                        </div>

                        {/* Password strength indicator */}
                        {passwords.newPassword && (
                            <div className="pass-strength">
                                <div className="pass-strength-label">Force du mot de passe :</div>
                                <div className="pass-strength-bar">
                                    <div
                                        className={`pass-strength-fill ${
                                            passwords.newPassword.length >= 12 ? 'strong' :
                                            passwords.newPassword.length >= 8  ? 'medium' : 'weak'
                                        }`}
                                        style={{ width: `${Math.min((passwords.newPassword.length / 12) * 100, 100)}%` }}
                                    />
                                </div>
                                <span className={`pass-strength-text ${
                                    passwords.newPassword.length >= 12 ? 'strong' :
                                    passwords.newPassword.length >= 8  ? 'medium' : 'weak'
                                }`}>
                                    {passwords.newPassword.length >= 12 ? 'Fort' : passwords.newPassword.length >= 8 ? 'Moyen' : 'Faible'}
                                </span>
                            </div>
                        )}

                        <button className="settings-save-btn" type="submit" disabled={passLoading}>
                            {passLoading ? 'Modification...' : '🔐 Modifier le mot de passe'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}