// backend/simple-bcrypt-test.js
const bcrypt = require('bcrypt');

async function testPassword() {
    // Mot de passe à tester
    const plainPassword = 'admin123';
    
    // Hash existant dans votre base de données
    const existingHash = '$2b$10$92IXUNpkj00r0Q5byMi.Ye4oKoEa3Ro911C/.og/at2.uhewG/igi';
    
    // 1. Hacher un nouveau mot de passe
    const newHash = await bcrypt.hash(plainPassword, 10);
    console.log(`Hash pour "${plainPassword}": ${newHash}`);
    
    // 2. Vérifier si le hash existant correspond à "password"
    const isValid1 = await bcrypt.compare('password', existingHash);
    console.log(`Le hash existant correspond à "password": ${isValid1}`);
    
    // 3. Vérifier si le hash existant correspond à "admin123"
    const isValid2 = await bcrypt.compare('admin123', existingHash);
    console.log(`Le hash existant correspond à "admin123": ${isValid2}`);
    
    // 4. Comparer avec votre nouveau hash
    const isValid3 = await bcrypt.compare(plainPassword, newHash);
    console.log(`Le nouveau hash correspond à "${plainPassword}": ${isValid3}`);
}

testPassword();