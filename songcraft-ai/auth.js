import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = window.firebaseConfig;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const pageName = window.location.pathname.split("/").pop();
const isLoginPage = pageName === "" || pageName === "login.html";
const authError = document.getElementById("authError");
const authButtons = ["googleBtn", "microsoftBtn", "appleBtn"]
  .map((id) => document.getElementById(id))
  .filter(Boolean);

let resolveAuthReady;
const authReady = new Promise((resolve) => {
  resolveAuthReady = resolve;
});

function showAuthError() {
  if (authError) {
    authError.textContent = "We couldn’t sign you in. Please try again.";
  }
}

async function signIn(provider) {
  if (authError) authError.textContent = "";
  authButtons.forEach((button) => { button.disabled = true; });
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    showAuthError();
  } finally {
    authButtons.forEach((button) => { button.disabled = false; });
  }
}

document.getElementById("googleBtn")?.addEventListener("click", () => {
  signIn(new GoogleAuthProvider());
});
document.getElementById("microsoftBtn")?.addEventListener("click", () => {
  signIn(new OAuthProvider("microsoft.com"));
});
document.getElementById("appleBtn")?.addEventListener("click", () => {
  signIn(new OAuthProvider("apple.com"));
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.replace("/login.html");
  } catch (error) {
    const formError = document.getElementById("formError");
    if (formError) formError.textContent = "We couldn’t sign you out. Please try again.";
  }
});

onAuthStateChanged(auth, (user) => {
  resolveAuthReady(user);

  if (isLoginPage && user) {
    window.location.replace("/index.html");
    return;
  }
  if (!isLoginPage && !user) {
    window.location.replace("/login.html");
    return;
  }

  if (!isLoginPage && user) {
    const name = document.getElementById("userName");
    const avatar = document.getElementById("userAvatar");
    if (name) name.textContent = user.displayName || user.email || "Songwriter";
    if (avatar && user.photoURL) {
      avatar.src = user.photoURL;
      avatar.alt = `${user.displayName || "Your"} profile`;
      avatar.hidden = false;
    }
  }
}, (error) => {
  showAuthError();
  resolveAuthReady(null);
});

export { auth, authReady };
