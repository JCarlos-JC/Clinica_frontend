/**
 * Monitor de localStorage para debug
 * Detecta qualquer mudança no localStorage e registra no console
 */

// Salvar referências originais
const originalSetItem = localStorage.setItem;
const originalRemoveItem = localStorage.removeItem;
const originalClear = localStorage.clear;

// Sobrescrever setItem
localStorage.setItem = function(key, value) {
    console.log(`📝 [localStorage.setItem] Key: "${key}"`);
    
    if (key === 'user') {
        console.log(`👤 [localStorage.setItem USER] Value:`, value);
        try {
            const userData = JSON.parse(value);
            console.log(`👤 [localStorage.setItem USER] roles:`, userData.roles);
            console.log(`👤 [localStorage.setItem USER] tipo_usuario:`, userData.tipo_usuario);
        } catch (e) {
            console.error('❌ Erro ao parsear user:', e);
        }
        
        // Stack trace para ver quem chamou
        console.trace('📍 Stack trace do setItem user:');
    }
    
    // Chamar método original
    return originalSetItem.apply(this, arguments);
};

// Sobrescrever removeItem
localStorage.removeItem = function(key) {
    console.log(`🗑️ [localStorage.removeItem] Key: "${key}"`);
    
    if (key === 'user') {
        console.warn(`⚠️ [localStorage.removeItem USER] User sendo removido!`);
        console.trace('📍 Stack trace do removeItem user:');
    }
    
    // Chamar método original
    return originalRemoveItem.apply(this, arguments);
};

// Sobrescrever clear
localStorage.clear = function() {
    console.warn(`🗑️ [localStorage.clear] Todo o localStorage sendo limpo!`);
    console.trace('📍 Stack trace do clear:');
    
    // Chamar método original
    return originalClear.apply(this, arguments);
};

console.log('✅ LocalStorage monitor ativado!');

// export default {
//     enable: () => {
//         console.log('✅ LocalStorage monitor já está ativado!');
//     },
//     disable: () => {
//         localStorage.setItem = originalSetItem;
//         localStorage.removeItem = originalRemoveItem;
//         localStorage.clear = originalClear;
//         console.log('❌ LocalStorage monitor desativado!');
//     }
// };
