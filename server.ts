import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import fs from "fs";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(process.cwd(), "results_history.json");

// Local DB Helper
function saveResult(result: any) {
  try {
    let history = [];
    if (fs.existsSync(DB_FILE)) {
      history = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    }
    history.push(result);
    if (history.length > 500) history.shift();
    fs.writeFileSync(DB_FILE, JSON.stringify(history, null, 2));
  } catch (e) {
    console.error("[DB] Erro ao salvar:", e);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS for all origins to allow external scripts/robots to connect
  app.use(cors());
  app.use(express.json({ limit: '20mb' })); // Increased limit for base64 images

  // Store connected SSE clients
  let clients: any[] = [];

  // API to Analyze Board Screenshot via IA
  app.post("/api/analyze-board", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) return res.status(400).json({ error: "Sua imagem não chegou ao servidor." });

      // Busca a chave em múltiplos locais comuns
      const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
      
      if (!apiKey || apiKey.length < 10) {
        console.error("[AI ERROR] API Key missing or too short.");
        return res.status(500).json({ 
           error: "Configuração Pendente: A chave GEMINI_API_KEY não foi encontrada. Vá em 'Settings' (ícone de engrenagem) -> 'Secrets' e adicione GEMINI_API_KEY com sua chave do Google AI Studio." 
        });
      }

      // Initialize Gemini lazily
      const genAI = new GoogleGenerativeAI(apiKey);
      const visionModel = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      });

      console.log("[AI VISION] Analisando placa com Gemini...");
      const base64Data = image.split(",")[1];
      
      const prompt = `Analise a grade de bolinhas de resultados de Bac Bo.
Identifique cada bolinha na ordem de leitura (esquerda para direita, linha por linha).
Bolinha AZUL: {"outcome": "P", "sum": número}
Bolinha VERMELHA: {"outcome": "B", "sum": número}
Bolinha AMARELA/DOURADA: {"outcome": "T", "sum": número}
Retorne exclusivamente o array JSON: [{"outcome":"P","sum":5},...] sem explicações.`;

      const result = await visionModel.generateContent([
        { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
        prompt
      ]);
      
      const response = await result.response;
      const text = response.text();
      
      // Extração robusta de JSON (procura pelo primeiro [ e último ])
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
         console.error("[AI ERROR] Resposta da IA não contém JSON válido:", text);
         return res.status(500).json({ error: "A IA não conseguiu ler os dados. Tente tirar uma foto melhor da grade." });
      }

      const results = JSON.parse(jsonMatch[0]);
      console.log(`[AI VISION] Sucesso: ${results.length} resultados sincronizados.`);

      // Broadcast the batch update
      const payload = JSON.stringify({ type: "batch_update", results });
      clients.forEach(c => {
        try {
          c.res.write(`data: ${payload}\n\n`);
        } catch (e) { /* ignore */ }
      });

      res.json({ status: "success", count: results.length });
    } catch (err: any) {
      console.error("[AI ERROR DETAIL]", err);
      const msg = (err.message || "").toLowerCase();
      const isKeyError = msg.includes("key") || msg.includes("api_key") || msg.includes("403") || msg.includes("401");
      
      res.status(500).json({ 
        error: isKeyError 
          ? "Erro de Autenticação: Sua API KEY do Gemini parece inválida ou não foi configurada corretamente em Settings > Secrets." 
          : "Falha na IA: " + (err.message?.slice(0, 100) || "Erro ao processar imagem.")
      });
    }
  });

  // API Route for the Python Robot
  app.post("/api/results", (req, res) => {
    // Normalização ultra-flexível
    let rawCor = (req.body.cor || req.body.outcome || req.body.result || "").toString().toUpperCase();
    let valor = req.body.valor !== undefined ? req.body.valor : (req.body.sum || req.body.value);
    
    // Mapeamento expandido para evitar erros de tradução/captcha do Robô
    let cor: "P" | "B" | "T" | "" = "";
    if (["P", "PLAYER", "JOGADOR", "AZUL", "BLUE", "1"].includes(rawCor)) cor = "P";
    else if (["B", "BANKER", "BANCA", "VERMELHO", "RED", "2"].includes(rawCor)) cor = "B";
    else if (["T", "TIE", "EMPATE", "DOURADO", "GOLD", "0"].includes(rawCor)) cor = "T";

    if (!cor || valor === undefined) {
      console.error("[ROBOT ERROR] Dados Inválidos:", req.body);
      return res.status(400).json({ status: "error", message: "Formato inválido. Use cor (P/B/T) e valor." });
    }

    const numericValue = Number(valor);
    console.log(`[ROBOT] SINAL RECEBIDO: ${cor} | SOMA: ${numericValue}`);

    const apiTimestamp = req.body.timestamp || req.body.time || Date.now();
    const currentId = req.body.id || `robot-${cor}-${numericValue}-${apiTimestamp}`;

    const resultObject = { 
      outcome: cor, 
      sum: numericValue, 
      timestamp: Date.now(), 
      isRobot: true,
      id: currentId
    };

    // 1. SALVAR NO "BANCO DE DADOS" (Arquivo JSON)
    saveResult(resultObject);

    // 2. BROADCAST EM TEMPO REAL PARA O FRONTEND
    const payload = JSON.stringify(resultObject);
    clients.forEach(client => {
      try {
        client.res.write(`data: ${payload}\n\n`);
      } catch (e) { /* ignore stale client */ }
    });

    res.json({ status: "success", data: resultObject });
  });

  // API Route for Robot Status
  app.post("/api/robot/status", (req, res) => {
    const { status, message } = req.body;
    
    console.log(`[ROBOT STATUS] ${status}: ${message}`);
    
    const payload = JSON.stringify({ 
      type: "robot_status", 
      status, 
      message, 
      timestamp: Date.now() 
    });

    clients.forEach(client => {
      try {
        client.res.write(`data: ${payload}\n\n`);
      } catch (e) { /* ignore */ }
    });

    res.json({ status: "success" });
  });

  // Proxy for external Bac Bo API (Bypasses CORS)
  app.get("/api/proxy/bacbo", async (req, res) => {
    try {
      const { cookie } = req.query;
      const targetUrl = "https://www.bacboclub.com.br/php/bacbo_history_proxy.php?page=1&limit=100";
      
      console.log(`[PROXY] Sincronizando com Bac Bo Club...`);
      
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          "Referer": "https://www.bacboclub.com.br/",
          "X-Requested-With": "XMLHttpRequest",
          "Cookie": (cookie as string) || EXTERNAL_COOKIE
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({ 
          error: "Erro na API Externa (Talvez Sessão Expirada)", 
          status: response.status 
        });
      }

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error("[PROXY ERROR]", err.message);
      res.status(500).json({ error: "Falha na Rede", detail: err.message });
    }
  });

  // BACKGROUND POLLING (Sincronização Automática no Servidor)
  let recentResultsIds = new Set<string>(); // Cache para evitar duplicados
  let lastExternalResultId = "";
  const EXTERNAL_COOKIE = "PHPSESSID=c2bjls3ad1mc99k7soe9u02bc2";
  
  setInterval(async () => {
    try {
      const targetUrl = "https://www.bacboclub.com.br/php/bacbo_history_proxy.php?page=1&limit=100";
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Cookie": EXTERNAL_COOKIE,
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest"
        }
      });

      if (!response.ok) return;

      const data = await response.json();
      const results = data.results || data.data || (Array.isArray(data) ? data : []);
      
      if (results.length > 0) {
        // Processa os últimos resultados encontrados em lote pequeno (FIFO de 20 para evitar sobrecarga de broadcast)
        const batch = results.slice(0, 20).reverse();
        
        for (const latest of batch) {
          let outcome: "P" | "B" | "T" = "T";
          const resStr = (latest.color || latest.result || latest.outcome || latest.venc || latest.vencedor || latest.res || latest.cor || "").toString().toUpperCase();
          if (["BLUE", "P", "AZUL", "1", "A"].includes(resStr)) outcome = "P";
          else if (["RED", "B", "VERMELHO", "2", "V"].includes(resStr)) outcome = "B";
          else if (["TIE", "T", "GOLD", "0", "3", "E"].includes(resStr)) outcome = "T";

          let sumValue = Number(latest.value || latest.sum || latest.total || latest.soma || latest.s || latest.val || latest.v || latest.result_value || latest.resultado || 0);
          
          if (sumValue === 0) {
             for (const key in latest) {
                const val = Number(latest[key]);
                if (!isNaN(val) && val > 0 && val <= 25 && key !== 'id') {
                   sumValue = val;
                   break;
                }
             }
          }

          const apiTimestamp = latest.timestamp || latest.time || latest.created_at || "no-time";
          const currentId = latest.id || `${outcome}-${sumValue}-${apiTimestamp}`;
          
          const isGarbage = sumValue === 0 && (outcome === "T" || !outcome) && !latest.id;
          
          if (!recentResultsIds.has(currentId) && !isGarbage) {
            console.log(`[REAL-TIME] Sync Result: ${outcome} | Sum: ${sumValue}`);
            
            recentResultsIds.add(currentId);
            if (recentResultsIds.size > 150) {
              const first = recentResultsIds.values().next().value;
              if (first !== undefined) recentResultsIds.delete(first);
            }

            const resultObject = {
              id: currentId,
              sum: sumValue,
              outcome,
              timestamp: Date.now(),
              isRobot: true
            };

            saveResult(resultObject);

            const payload = JSON.stringify(resultObject);
            clients.forEach(c => {
              try {
                c.res.write(`data: ${payload}\n\n`);
              } catch (e) { /* ignore */ }
            });
          }
        }
      }
    } catch (e: any) {
      // Falha silenciosa
    }
  }, 3000); // 3 SEGUNDOS DE INTERVALO


  // Rota para baixar o Banco de Dados
  app.get("/api/results/history", (req, res) => {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      res.json(JSON.parse(data));
    } else {
      res.json([]);
    }
  });

  // Rota de Teste Manual (Abra no navegador para testar o App)
  app.get("/api/test-sync", (req, res) => {
    const payload = JSON.stringify({ outcome: 'P', sum: 10, timestamp: Date.now(), isRobot: true });
    clients.forEach(client => client.res.write(`data: ${payload}\n\n`));
    res.send("<h1>Sinal de Teste Enviado para o App!</h1><p>Verifique se apareceu uma bolinha Azul com soma 10.</p>");
  });

  // SSE Endpoint for the Frontend to receive updates
  app.get("/api/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Prevent proxy buffering
    res.flushHeaders();

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    clients.push(newClient);

    // Heartbeat to keep connection alive
    const keepAlive = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: "ping" })}\n\n`);
    }, 15000);

    req.on("close", () => {
      clearInterval(keepAlive);
      clients = clients.filter(c => c.id !== clientId);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API Endpoint: http://localhost:${PORT}/api/results`);
    console.log(`SSE Endpoint: http://localhost:${PORT}/api/events`);
  });
}

startServer();
