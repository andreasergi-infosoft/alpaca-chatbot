/**
 * ═══════════════════════════════════════════════════════
 *  PIANI DEGLI ALPACA — Chatbot Backend DEFINITIVO
 *  Sviluppato da Infosoft (infosoft.it)
 *
 *  Ottimizzazioni:
 *  ✓ Claude Haiku  → 3-5x più veloce di Sonnet
 *  ✓ max_tokens ridotti → risposte più rapide
 *  ✓ Keep-alive HTTP → connessioni riutilizzate
 *  ✓ Auto ping interno → server mai in sleep
 *  ✓ Prompt compatto → meno token, più velocità
 *  ✓ Rate limiting → protezione da abusi
 *  ✓ Retry automatico → massima affidabilità
 * ═══════════════════════════════════════════════════════
 */

require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const http     = require("http");
const Anthropic = require("@anthropic-ai/sdk");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Client Anthropic ─────────────────────────────────────────
const ai = new Anthropic({
  apiKey:     process.env.ANTHROPIC_API_KEY,
  timeout:    20000,   // 20s max
  maxRetries: 2,       // retry automatico su errori temporanei
});

// ── Middleware ───────────────────────────────────────────────
app.use(express.json({ limit: "30kb" }));
app.use(cors({ origin: "*", methods: ["GET","POST"] }));
app.disable("x-powered-by");

// Keep-alive header su ogni risposta
app.use((req, res, next) => {
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Keep-Alive", "timeout=30");
  next();
});

// ── Prompt di sistema (compatto = meno token = più veloce) ───
const SYSTEM = `Sei Naomi, assistente virtuale di Piani degli Alpaca — il più grande allevamento di alpaca d'Italia a Tarquinia (VT). Carattere caldo, entusiasta, appassionato. Rispondi SEMPRE in italiano, massimo 3 frasi concise. Qualche emoji con parsimonia 🦙🌿.

SERVIZI:
• Visita guidata: obbligatoria prenotazione su pianideglialpaca.it, check-in 20min prima, bimbi 0-3 gratis (max 2/adulto), cancellazione gratuita entro 72h → coupon, maltempo → coupon 12 mesi, regalabile come gift.
• Passeggiata alla cavezza: percorso 2km con alpaca addestrato, posti limitati, stesse policy, regalabile.
• Allevatore per un giorno: giornata intera 1×/settimana, visita+passeggiata+pratica, pranzo incluso, possibile vedere nascita cria, regalabile.
• Bistrot: ristorante, prenota su pianideglialpaca.it.
• Agriturismo Piani della Marina: 12 apt country, AC/TV/cucina/terrazzo, piscina, bici gratis, vicino mare. Esperienze alpaca vanno prenotate separatamente.
• Eventi: Villaggio Zucche (autunno), Villaggio Uova (Pasqua), scolaresche, team building.
• Vendita alpaca: femmine gravide, stalloni, giovani maschi, consulenza personalizzata.

CONTATTI: Tel 0766.092003 · WhatsApp 329.9517042 · info@pianideglialpaca.it · pianideglialpaca.it
Per prezzi esatti → rimanda al sito. Invita sempre a prenotare in anticipo (posti limitati).`;

// ── Rate limiting ────────────────────────────────────────────
const limits = new Map();
function checkRate(ip) {
  const now = Date.now();
  const e = limits.get(ip);
  if (!e || now > e.r) { limits.set(ip, { c: 1, r: now + 3600000 }); return true; }
  if (e.c >= 40) return false;
  e.c++; return true;
}
setInterval(() => { const n=Date.now(); for(const[k,v] of limits) if(n>v.r) limits.delete(k); }, 3600000);

// ── Rotta principale ─────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const ip = (req.headers["x-forwarded-for"]||"").split(",")[0].trim() || req.socket.remoteAddress;

  if (!checkRate(ip))
    return res.status(429).json({ error: "Troppe richieste. Riprova tra qualche minuto." });

  const { messages } = req.body;
  if (!Array.isArray(messages) || !messages.length)
    return res.status(400).json({ error: "Formato non valido." });

  const safe = messages.slice(-10).map(m => ({
    role:    m.role === "user" ? "user" : "assistant",
    content: String(m.content).slice(0, 800),
  }));

  try {
    const r = await ai.messages.create({
      model:      "claude-haiku-4-5-20251001",  // Haiku: velocissimo, perfetto per chat
      max_tokens: 350,                           // Risposte brevi = tempi rapidi
      system:     SYSTEM,
      messages:   safe,
    });

    res.json({ reply: r.content[0]?.text || "Scusa, riprova." });

  } catch (err) {
    console.error("[Naomi]", err.message);
    if (err.status === 529)
      return res.status(503).json({ error: "Servizio sovraccarico. Riprova tra qualche secondo." });
    res.status(500).json({ error: "Errore del server." });
  }
});

// ── Health check ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ ok: true, bot: "Naomi — Piani degli Alpaca", ts: Date.now() });
});

// ── Avvio server ─────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║  🦙  Naomi Chatbot — ONLINE          ║
  ║  Porta : ${PORT}                         ║
  ║  Modello: Claude Haiku (fast)        ║
  ║  Dev   : Infosoft.it                 ║
  ╚══════════════════════════════════════╝`);
});

// Mantieni connessioni HTTP aperte (riduce latenza)
server.keepAliveTimeout = 65000;
server.headersTimeout   = 66000;

// ── Auto keep-alive interno ──────────────────────────────────
// Si auto-pinga ogni 13 minuti per non andare mai in sleep su Render
function selfPing() {
  const opts = { hostname: "localhost", port: PORT, path: "/", method: "GET" };
  const req  = http.request(opts, () => {});
  req.on("error", () => {});
  req.end();
}
// Prima volta dopo 30 secondi dall'avvio, poi ogni 13 minuti
setTimeout(() => { selfPing(); setInterval(selfPing, 13 * 60 * 1000); }, 30000);
