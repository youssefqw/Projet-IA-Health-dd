// backend/generate-valid-hash.js
const bcrypt = require('bcrypt');

async function generateValidHash() {
    const password = 'medecin123';
    
    // Générer un hash valide
    const hash = await bcrypt.hash(password, 10);
    
    console.log('✅ Nouveau hash valide généré:');
    console.log(hash);
    console.log('\n📊 Informations:');
    console.log(`Longueur: ${hash.length} caractères`);
    console.log(`Format: ${hash.substring(0, 7)}...`);
    
    // Vérifier
    const isValid = await bcrypt.compare(password, hash);
    console.log(`Vérification: ${isValid ? '✅ Valide' : '❌ Invalide'}`);
    
    console.log('\n📝 SQL à exécuter:');
    console.log(`UPDATE users SET password = '${hash}' WHERE email = 'sophie.martin@medecin.fr';`);
}

generateValidHash();