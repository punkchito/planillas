// generate-passwords.js
const bcrypt = require('bcryptjs');

async function generatePasswords() {
    try {
        console.log('Generando contraseñas hash...\n');
        
        // Generar hash para admin123
        const adminPassword = 'admin123';
        const adminHash = await bcrypt.hash(adminPassword, 10);
        console.log(`admin123 -> ${adminHash}`);
        
        // Generar hash para user123
        const userPassword = 'user123';
        const userHash = await bcrypt.hash(userPassword, 10);
        console.log(`user123 -> ${userHash}`);
        
        console.log('\n--- SQL para actualizar usuarios ---');
        console.log(`UPDATE users SET password = '${adminHash}' WHERE email = 'admin@instituto.edu.pe';`);
        console.log(`UPDATE users SET password = '${userHash}' WHERE email = 'usuario@instituto.edu.pe';`);
        
        // Verificar que los hashes son correctos
        console.log('\n--- Verificación ---');
        const adminCheck = await bcrypt.compare('admin123', adminHash);
        const userCheck = await bcrypt.compare('user123', userHash);
        
        console.log(`admin123 coincide: ${adminCheck}`);
        console.log(`user123 coincide: ${userCheck}`);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

generatePasswords();