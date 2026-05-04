const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_USER || process.env.EMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS,
    },
});

const getSender = () => process.env.GMAIL_USER || process.env.EMAIL_USER;

async function sendPatientWelcome({ prenom, nom, email, password }) {
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr>
    <td style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:40px 48px;text-align:center;">
      <div style="font-size:48px;margin-bottom:12px;">&#127973;</div>
      <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:800;">MedCare AI</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">Votre plateforme medicale intelligente</p>
    </td>
  </tr>
  <tr>
    <td style="padding:40px 48px;">
      <h2 style="color:#0f172a;font-size:22px;margin:0 0 8px;">Bienvenue, ${prenom} !</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 28px;">
        Votre compte patient a ete cree avec succes. Voici vos informations de connexion :
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:2px solid #e0f2fe;border-radius:12px;margin-bottom:28px;">
        <tr><td style="padding:24px 28px;">
          <p style="margin:0 0 14px;color:#64748b;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Vos identifiants</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;"><span style="color:#64748b;font-size:14px;">&#128231; Email</span></td>
              <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;"><strong style="color:#0f172a;font-size:14px;">${email}</strong></td>
            </tr>
            <tr>
              <td style="padding:8px 0;"><span style="color:#64748b;font-size:14px;">&#128274; Mot de passe</span></td>
              <td style="padding:8px 0;text-align:right;"><strong style="color:#0f172a;font-size:14px;font-family:monospace;background:#e0f2fe;padding:4px 10px;border-radius:6px;">${password}</strong></td>
            </tr>
          </table>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr><td align="center">
          <a href="http://localhost:3001/login" style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;">
            Se connecter &rarr;
          </a>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;margin-bottom:28px;">
        <tr><td style="padding:24px 28px;">
          <p style="margin:0 0 16px;color:#0f172a;font-size:15px;font-weight:700;">Ce que vous pouvez faire :</p>
          <p style="margin:0 0 8px;color:#475569;font-size:14px;">&#128197; Prendre des rendez-vous avec des medecins</p>
          <p style="margin:0 0 8px;color:#475569;font-size:14px;">&#129302; Utiliser le diagnostic IA</p>
          <p style="margin:0 0 8px;color:#475569;font-size:14px;">&#128179; Payer vos consultations en ligne</p>
          <p style="margin:0;color:#475569;font-size:14px;">&#128276; Recevoir des notifications en temps reel</p>
        </td></tr>
      </table>
      <p style="color:#94a3b8;font-size:13px;margin:0;">
        &#9888;&#65039; Pour votre securite, nous vous recommandons de changer votre mot de passe apres votre premiere connexion.
      </p>
    </td>
  </tr>
  <tr>
    <td style="background:#f8fafc;padding:24px 48px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:13px;margin:0;">&copy; 2024 MedCare AI &mdash; Tous droits reserves</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body></html>`;

    await transporter.sendMail({
        from: `"MedCare AI" <${getSender()}>`,
        to: email,
        subject: 'Bienvenue sur MedCare AI - Vos identifiants de connexion',
        html,
    });
    console.log('✅ Email patient envoyé à:', email);
}

async function sendDoctorCredentials({ prenom, nom, email, password, specialite }) {
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr>
    <td style="background:linear-gradient(135deg,#059669,#0ea5e9);padding:40px 48px;text-align:center;">
      <div style="font-size:48px;margin-bottom:12px;">&#128104;&#8205;&#9877;&#65039;</div>
      <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:800;">MedCare AI</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">Espace Medecin</p>
    </td>
  </tr>
  <tr>
    <td style="padding:40px 48px;">
      <h2 style="color:#0f172a;font-size:22px;margin:0 0 8px;">Bonjour Dr. ${prenom} ${nom} !</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 28px;">
        Un compte medecin a ete cree pour vous sur la plateforme <strong>MedCare AI</strong>.
        Voici vos informations de connexion :
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;margin-bottom:28px;">
        <tr><td style="padding:24px 28px;">
          <p style="margin:0 0 14px;color:#64748b;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Vos identifiants</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #d1fae5;"><span style="color:#64748b;font-size:14px;">Specialite</span></td>
              <td style="padding:8px 0;border-bottom:1px solid #d1fae5;text-align:right;"><strong style="color:#059669;font-size:14px;">${specialite || 'Medecine generale'}</strong></td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #d1fae5;"><span style="color:#64748b;font-size:14px;">&#128231; Email</span></td>
              <td style="padding:8px 0;border-bottom:1px solid #d1fae5;text-align:right;"><strong style="color:#0f172a;font-size:14px;">${email}</strong></td>
            </tr>
            <tr>
              <td style="padding:8px 0;"><span style="color:#64748b;font-size:14px;">&#128274; Mot de passe temporaire</span></td>
              <td style="padding:8px 0;text-align:right;"><strong style="color:#0f172a;font-size:14px;font-family:monospace;background:#d1fae5;padding:4px 10px;border-radius:6px;">${password}</strong></td>
            </tr>
          </table>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:2px solid #fde68a;border-radius:12px;margin-bottom:28px;">
        <tr><td style="padding:18px 24px;">
          <p style="margin:0;color:#92400e;font-size:14px;font-weight:600;">&#9888;&#65039; Important - Changez votre mot de passe</p>
          <p style="margin:8px 0 0;color:#b45309;font-size:13px;line-height:1.5;">
            Ce mot de passe est temporaire. Connectez-vous et rendez-vous dans <strong>Parametres &rarr; Changer le mot de passe</strong> pour le modifier des votre premiere connexion.
          </p>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr><td align="center">
          <a href="http://localhost:3001/login" style="display:inline-block;background:linear-gradient(135deg,#059669,#0ea5e9);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;">
            Acceder a mon espace medecin &rarr;
          </a>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;">
        <tr><td style="padding:24px 28px;">
          <p style="margin:0 0 16px;color:#0f172a;font-size:15px;font-weight:700;">Votre espace medecin vous permet de :</p>
          <p style="margin:0 0 8px;color:#475569;font-size:14px;">&#128197; Gerer vos rendez-vous et votre planning</p>
          <p style="margin:0 0 8px;color:#475569;font-size:14px;">&#9989; Confirmer ou refuser les demandes de patients</p>
          <p style="margin:0 0 8px;color:#475569;font-size:14px;">&#128176; Suivre vos revenus et paiements</p>
          <p style="margin:0;color:#475569;font-size:14px;">&#128276; Recevoir des notifications en temps reel</p>
        </td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="background:#f8fafc;padding:24px 48px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:13px;margin:0;">&copy; 2024 MedCare AI &mdash; Tous droits reserves</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body></html>`;

    await transporter.sendMail({
        from: `"MedCare AI" <${getSender()}>`,
        to: email,
        subject: 'Votre compte medecin MedCare AI - Identifiants de connexion',
        html,
    });
    console.log('✅ Email médecin envoyé à:', email);
}

module.exports = { sendPatientWelcome, sendDoctorCredentials };
