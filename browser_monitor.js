/**
 * MONITOR DE RESULTADOS ULTRARRÁPIDO - BAC BO (CONSOLE F12)
 * Alvo: #historyGridDesktop > .history-result
 */

(function() {
    const API_URL = 'http://localhost:3000/api/results'; // Rota do seu app
    const TARGET_ID = 'historyGridDesktop';
    const RESULT_CLASS = 'history-result';
    
    // Array local para histórico da sessão no console
    window.matrixHistory = [];

    console.log("%c🚀 MATRIX OBSERVADOR ATIVADO", "color: #00ff00; font-weight: bold; background: #000; padding: 5px;");

    const processAddedNode = (node) => {
        // Verifica se o nó é um Elemento e se tem a classe correta
        if (node.nodeType !== 1) return;
        
        const element = node.classList.contains(RESULT_CLASS) ? node : node.querySelector(`.${RESULT_CLASS}`);
        if (!element) return;

        // 1. Captura o Número (Soma)
        const valText = element.innerText || element.textContent;
        const valor = parseInt(valText.trim());

        // 2. Identifica a Cor (Padrão: cor-A = Azul/Player, cor-V = Vermelho/Banker)
        let cor = 'T'; // Default: Tie
        const classes = Array.from(element.classList);
        
        if (classes.some(c => c.endsWith('cor-A'))) cor = 'P';
        else if (classes.some(c => c.endsWith('cor-V'))) cor = 'B';

        if (!isNaN(valor)) {
            const data = { cor, valor, timestamp: new Date().toLocaleTimeString() };
            
            // Salva no array local
            window.matrixHistory.push(data);
            
            console.log(`%c🎲 [CAPTURA] ${cor} | SOMA: ${valor}`, 
                cor === 'P' ? "color: #4facfe" : cor === 'B' ? "color: #f43f5e" : "color: #fbbf24"
            );

            // 3. Envio para o seu Dashboard
            fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).then(r => {
                if(r.ok) console.log("%c   -> Sincronizado", "color: #10b981; font-size: 8px;");
            }).catch(err => {
                console.warn("   -> Dashboard offline ou erro de rede.");
            });
        }
    };

    // --- MutationObserver Config ---
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach(processAddedNode);
        }
    });

    const target = document.getElementById(TARGET_ID);
    if (target) {
        observer.observe(target, { childList: true, subtree: true });
        console.log(`%c✅ Monitorando div #${TARGET_ID}`, "color: #10b981");
    } else {
        console.error(`%c❌ ERRO: Div #${TARGET_ID} não encontrada na página.`, "color: #ff4b2b");
    }

})();
