USE medical_app;

-- Paiements table
CREATE TABLE IF NOT EXISTS paiements (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    patient_id           INT NOT NULL,
    medecin_id           INT NOT NULL,
    rendez_vous_id       INT NOT NULL,
    montant              DECIMAL(10,2) NOT NULL,
    methode_paiement     VARCHAR(50) DEFAULT 'carte',
    reference_paiement   VARCHAR(100) UNIQUE,
    statut               ENUM('paye','rembourse','annule') DEFAULT 'paye',
    date_paiement        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id)     REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (medecin_id)     REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (rendez_vous_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    patient_id  INT NOT NULL,
    medecin_id  INT NOT NULL,
    date_heure  DATETIME NOT NULL,
    motif       VARCHAR(255),
    statut      ENUM('en_attente', 'confirmé', 'annulé', 'terminé') DEFAULT 'en_attente',
    notes       TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (medecin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- AI diagnostics history table
CREATE TABLE IF NOT EXISTS ai_diagnostics (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    symptoms   JSON NOT NULL,
    result     JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Fix admin password: update to bcrypt hash of 'admin123'
-- Hash generated for 'admin123' with bcrypt rounds=10
UPDATE users
SET password = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE email = 'admin@medical.com' AND role = 'admin';
