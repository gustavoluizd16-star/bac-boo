/**
 * SCRAPER DE HISTÓRICO BAC BO (CONSOLE F12)
 * Este script percorre a grade de resultados e extrai os dados via atributos 'data-'.
 */

(function() {
    const TARGET_ID = 'historyGridDesktop';
    const container = document.getElementById(TARGET_ID);

    if (!container) {
        console.error(`❌ Erro: Elemento #${TARGET_ID} não encontrado.`);
        return;
    }

    // Seleciona todos os elementos de resultado (ajuste a classe se necessário)
    const resultElements = container.querySelectorAll('.history-result, [data-result]');
    
    console.log(`%c🔍 Analisando ${resultElements.length} resultados...`, "color: #4facfe; font-weight: bold;");

    const historyData = Array.from(resultElements).map((el, index) => {
        // Extrai data-result (valor da soma) e data-cor (vencedor)
        const valorRaw = el.getAttribute('data-result') || el.innerText || el.textContent;
        const corRaw = el.getAttribute('data-cor') || '';

        // Normalização da Cor/Vencedor
        let outcome = 'T'; // Default Tie
        if (corRaw.includes('A') || corRaw.toLowerCase().includes('azul') || corRaw.toLowerCase().includes('player')) {
            outcome = 'P';
        } else if (corRaw.includes('V') || corRaw.toLowerCase().includes('vermelho') || corRaw.toLowerCase().includes('banker')) {
            outcome = 'B';
        }

        return {
            id: index,
            valor: parseInt(valorRaw) || 0,
            cor: outcome,
            raw_cor: corRaw
        };
    });

    // Filtra resultados zerados (caso de divs vazias na grade)
    const filteredHistory = historyData.filter(item => item.valor > 0);

    console.log("%c✅ Extração concluída!", "color: #10b981; font-weight: bold;");
    console.table(filteredHistory.slice(0, 20)); // Mostra os 20 primeiros no console
    
    console.log("%c👇 COPIE O JSON ABAIXO:", "color: #fbbf24; font-weight: bold;");
    console.log(JSON.stringify(filteredHistory, null, 2));

    // Opcional: Sugestão para o usuário importar no App
    console.log("%c💡 Dica: Você pode copiar este JSON e colar na função de 'Importação Manual' do seu Dashboard.", "color: #8b5cf6; font-style: italic;");
})();
