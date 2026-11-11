require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const publicDirectory = __dirname;

app.use(cors());
app.use(express.json({ limit: "32kb" }));
app.use(express.static(publicDirectory, { index: false }));

const INTERNAL_INSTRUCTIONS = [
  "You are a skilled songwriter and music producer.",
  "Create an original song blueprint based on the submitted idea.",
  "Return only a valid JSON object with these fields:",
  '{"title":"...","style_prompt":"...","lyrics":"...","metadata":{"bpm":92,"key":"A minor","theme":"..."}}',
  "Write complete, singable lyrics with labeled sections such as Verse, Chorus, and Bridge.",
  "Keep the style prompt concise and practical. Do not include markdown fences."
].join(" ");

function validateInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Invalid request.";
  }

  const { idea, moods, genre, language, keywords } = body;
  if (
    typeof idea !== "string" ||
    idea.trim().length === 0 ||
    idea.length > 4000 ||
    !Array.isArray(moods) ||
    moods.length === 0 ||
    moods.length > 7 ||
    moods.some((mood) => typeof mood !== "string") ||
    typeof genre !== "string" ||
    typeof language !== "string" ||
    typeof keywords !== "string"
  ) {
    return "Please check your song details and try again.";
  }

  return null;
}

function parseComposition(content) {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const result = JSON.parse(cleaned);

  if (
    !result ||
    typeof result.title !== "string" ||
    typeof result.style_prompt !== "string" ||
    typeof result.lyrics !== "string" ||
    !result.metadata ||
    typeof result.metadata !== "object"
  ) {
    throw new Error("Invalid composition response.");
  }

  return {
    title: result.title,
    style_prompt: result.style_prompt,
    lyrics: result.lyrics,
    metadata: {
      bpm: result.metadata.bpm ?? "—",
      key: result.metadata.key ?? "—",
      theme: result.metadata.theme ?? "—"
    }
  };
}

async function requestComposition(model, userPrompt) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL || `http://localhost:${PORT}`,
      "X-Title": "Songcraft AI"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: INTERNAL_INSTRUCTIONS },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.85
    })
  });

  if (!response.ok) {
    throw new Error(`Composition request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new Error("Composition response was empty.");
  }

  return parseComposition(content);
}

app.post("/api/compose", async (req, res) => {
  const validationMessage = validateInput(req.body);
  if (validationMessage) {
    return res.status(400).json({ error: validationMessage });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: "Something went wrong. Try once more?" });
  }

  const { idea, moods, genre, language, keywords } = req.body;
  const userPrompt = [
    `Song idea: ${idea.trim()}`,
    `Moods: ${moods.join(", ")}`,
    `Genre: ${genre}`,
    `Language: ${language}`,
    `Keywords: ${keywords.trim() || "None supplied"}`
  ].join("\n");

  try {
    let composition;
    try {
      composition = await requestComposition("openrouter/free", userPrompt);
    } catch (primaryError) {
      composition = await requestComposition("deepseek/deepseek-r1:free", userPrompt);
    }
    return res.json(composition);
  } catch (error) {
    return res.status(500).json({ error: "Something went wrong. Try once more?" });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(publicDirectory, "login.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(publicDirectory, "index.html"));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Songcraft AI is ready on port ${PORT}.`);
  });
}

module.exports = app;
