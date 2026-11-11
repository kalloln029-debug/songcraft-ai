import { auth, authReady } from "./auth.js";

const form = document.getElementById("composeForm");
const ideaInput = document.getElementById("ideaInput");
const ideaCount = document.getElementById("ideaCount");
const moodButtons = Array.from(document.querySelectorAll(".mood-chip"));
const selectedMoods = new Set();
const composeButton = document.getElementById("composeBtn");
const loadingState = document.getElementById("loadingState");
const resultsSection = document.getElementById("resultsSection");
const formError = document.getElementById("formError");

if (ideaInput && ideaCount) {
  ideaInput.addEventListener("input", () => {
    ideaCount.textContent = `${ideaInput.value.length} / 4000`;
  });
}

moodButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const mood = button.dataset.mood;
    if (!mood) return;

    if (selectedMoods.has(mood)) {
      selectedMoods.delete(mood);
      button.setAttribute("aria-pressed", "false");
    } else {
      selectedMoods.add(mood);
      button.setAttribute("aria-pressed", "true");
    }
    if (formError) formError.textContent = "";
  });
});

function renderComposition(result) {
  document.getElementById("resultTitle").textContent = result.title;
  document.getElementById("stylePrompt").textContent = result.style_prompt;
  document.getElementById("lyricsText").textContent = result.lyrics;
  document.getElementById("metadataBpm").textContent = result.metadata?.bpm ?? "—";
  document.getElementById("metadataKey").textContent = result.metadata?.key ?? "—";
  document.getElementById("metadataTheme").textContent = result.metadata?.theme ?? "—";
  resultsSection.hidden = false;
  resultsSection.classList.remove("results");
  void resultsSection.offsetWidth;
  resultsSection.classList.add("results");
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (formError) formError.textContent = "";
  resultsSection.hidden = true;

  const idea = ideaInput.value.trim();
  if (!idea) {
    formError.textContent = "Add a song idea to get started.";
    ideaInput.focus();
    return;
  }
  if (selectedMoods.size === 0) {
    formError.textContent = "Choose at least one mood for your song.";
    document.querySelector(".mood-chip")?.focus();
    return;
  }

  const user = await authReady;
  if (!user || auth.currentUser === null) {
    window.location.replace("/login.html");
    return;
  }

  composeButton.disabled = true;
  loadingState.hidden = false;

  try {
    const response = await fetch("/api/compose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idea,
        moods: Array.from(selectedMoods),
        genre: document.getElementById("genreSelect").value,
        language: document.getElementById("languageSelect").value,
        keywords: document.getElementById("keywordsInput").value.trim()
      })
    });

    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error("Composition request failed.");
    }
    renderComposition(result);
  } catch (error) {
    formError.textContent = "Something went wrong. Please try again.";
  } finally {
    loadingState.hidden = true;
    composeButton.disabled = false;
  }
});

async function copyBlock(id, button) {
  const text = document.getElementById(id)?.textContent;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    const originalText = button.textContent;
    button.textContent = "Copied ✓";
    window.setTimeout(() => { button.textContent = originalText; }, 1500);
  } catch (error) {
    if (formError) formError.textContent = "Couldn’t copy that text. Please select and copy it manually.";
  }
}

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", () => {
    copyBlock(button.dataset.copy, button);
  });
});

authReady.then((user) => {
  if (!user || auth.currentUser === null) {
    window.location.replace("/login.html");
  }
});
