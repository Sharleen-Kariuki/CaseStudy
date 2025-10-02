const API_BASE = "/api/auth";

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignupLink = document.getElementById('showSignup');
const showLoginLink = document.getElementById('showLogin');

function saveAuth(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

function getToken() {
  return localStorage.getItem("token");
}

// Safe JSON reader
async function readJsonSafe(res) {
  const text = await res.text(); // body can be empty or non-JSON
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  let data = null;
  if (ct.includes("application/json") && text) {
    try { data = JSON.parse(text); } catch { /* ignore */ }
  }
  return { data, text };
}

showSignupLink.addEventListener('click', e => {
  e.preventDefault();
  signupForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
});

showLoginLink.addEventListener('click', e => {
  e.preventDefault();
  signupForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

signupForm.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    name: document.getElementById('signupName').value.trim(),
    email: document.getElementById('signupEmail').value.trim(),
    phone: document.getElementById('signupPhone').value.trim(),
    password: document.getElementById('signupPassword').value
  };
  try {
    const res = await fetch("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    });
    const { data, text } = await readJsonSafe(res);
    if (!res.ok) {
      return alert((data && (data.error || data.message)) || text || `Signup failed (${res.status})`);
    }
    if (!data) return alert("Unexpected empty response from server.");
    saveAuth(data.token, data.user);
    alert("Signup successful!");
    window.location.href = "/Studenthelp/Student_Help.html";
  } catch (err) {
    alert(err.message || "Network error");
  }
});

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    email: document.getElementById('loginEmail').value.trim(),
    password: document.getElementById('loginPassword').value
  };
  try {
    const res = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    });
    const { data, text } = await readJsonSafe(res);
    if (!res.ok) {
      return alert((data && (data.error || data.message)) || text || `Login failed (${res.status})`);
    }
    if (!data) return alert("Unexpected empty response from server.");
    saveAuth(data.token, data.user);
    if (data.user.role === "superadmin" || data.user.role === "admin") {
      window.location.href = "public/Admin/Dashboard/Dashboard.html";
    } else {
      window.location.href = "/Studenthelp/Student_Help.html";
    }
  } catch (err) {
    alert(err.message || "Network error");
  }
});