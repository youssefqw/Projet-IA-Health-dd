// backend/analyze-hash.js
const bcrypt = require('bcrypt');

class HashAnalyzer {
    constructor(hash) {
        this.hash = hash;
    }

    /**
     * Analyser et afficher les infos du hash
     */
    analyze() {
        console.log('\n📊 === ANALYSE DU HASH ===\n');
        console.log(`Hash complet: ${this.hash}`);
        
        // Décomposer le hash
        const parts = this.hash.split('$');
        
        if (parts.length >= 4) {
            console.log(`\n📝 Structure du hash:`);
            console.log(`   - Algorithme: ${parts[1]}`);
            console.log(`   - Coût (rounds): ${parts[2]}`);
            console.log(`   - Salt (22 premiers caractères): ${parts[3].substring(0, 22)}`);
            console.log(`   - Hash final: ${parts[3].substring(22)}`);
        }
        
        console.log(`\n📏 Longueur: ${this.hash.length} caractères`);
        
        // Vérifier si format valide
        const isValid = /^\$2[aby]\$\d+\$[./A-Za-z0-9]{53}$/.test(this.hash);
        console.log(`✅ Format bcrypt valide: ${isValid ? 'OUI' : 'NON'}`);
    }

    /**
     * Tester un mot de passe
     */
    async testPassword(password) {
        const isValid = await bcrypt.compare(password, this.hash);
        console.log(`\n🔐 Test mot de passe "${password}": ${isValid ? '✅ CORRECT' : '❌ INCORRECT'}`);
        return isValid;
    }
}

// Analyser votre hash
const hash = '$2b$10$8YQ8qQqYqQqYqQqYqQqYqQeO8k7M6sZFH3m6C8ZpXMkfZuPzYqQq';

const analyzer = new HashAnalyzer(hash);
analyzer.analyze();

// Tester quelques mots de passe
async function testPasswords() {
    console.log('\n🎯 === TEST DE MOTS DE PASSE ===\n');
    
    await analyzer.testPassword('admin123');
    await analyzer.testPassword('password');
    await analyzer.testPassword('123456');
    await analyzer.testPassword('admin');
    
    console.log('\n✅ Analyse terminée\n');
}

testPasswords();