const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(express.json());
app.use(cors({ origin: "*" }));

const SYSTEM = `Sei Lana, l'assistente virtuale di Piani degli Alpaca — l'allevamento di alpaca più grande d'Italia, a Tarquinia (VT).

Sei calda, entusiasta e genuinamente appassionata degli alpaca. Parli come una persona che ama questo posto. Usi qualche emoji con parsimonia (🦙 🌿 🌄). Rispondi sempre in italiano, max 3-4 frasi.

ATTIVITÀ:
1. VISITA GUIDATA - prenotazione obbligatoria su pianideglialpaca.it, check-in 20 min prima, bambini 0-3 gratis (max 2 per adulto), annullamento gratuito entro 72h con coupon, maltempo = coupon 12 mesi, regalabile come gift.
2. PASSEGGIATA CON ALPACA ALLA CAVEZZA - percorso 2km con il proprio alpaca addestrato, posti limitati, stesse politiche annullamento, regalabile.
3. ALLEVATORE PER UN GIORNO - giornata intera, 1 volta a settimana, include visita+passeggiata+attività pratiche, pausa pranzo inclusa, possibile vedere nascita di un cria, regalabile.
4. BISTROT - ristorante prenotabile online su pianideglialpaca.it.
5. AGRITURISMO PIANI DELLA MARINA - 12 appartamenti country, aria condizionata, TV, cucina, terrazzo, piscina, bici gratuite, a pochi km dal mare. Le esperienze alpaca NON sono incluse, vanno prenotate separatamente.
6. EVENTI - Villaggio delle Zucche (autunno), Villaggio delle Uova (Pasqua), scolaresche e team aziendali.
7. VENDITA ALPACA - femmine gravide, stalloni, giovani maschi, consulenza personalizzata.

CONTATTI: Tel 0766.092003 · WhatsApp 329.9517042 · info@pianideglialpaca.it · pianideglialpaca.it`;

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Formato non valido" });
  }
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: SYSTEM,
      messages: messages.slice(-20).map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: String(m.content).slice(0, 2000)
      }))
    });
    res.json({ reply: response.content[0].text });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Errore server" });
  }
});

app.get("/", (req, res) => res.send("🦙 Alpaca Chatbot online!"));

app.listen(process.env.PORT || 3000, () => console.log("Server avviato!"));
