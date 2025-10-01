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
    phone: prompt("Enter phone (format 2547XXXXXXXX):", "2547"),
    password: document.getElementById('signupPassword').value
  };
  try {
    const res = await fetch(`${API_BASE}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Signup failed");
    saveAuth(data.token, data.user);
    alert("Signup successful!");
    window.location.href = "/Studenthelp/Student_Help.html";
  } catch (err) {
    alert(err.message);
  }
});

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    email: document.getElementById('loginEmail').value.trim(),
    password: document.getElementById('loginPassword').value
  };
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Login failed");
    saveAuth(data.token, data.user);
    if (data.user.role === "superadmin" || data.user.role === "admin") {
      window.location.href = "/Admin/Dashboard/Dashboard.html";
    } else {
      window.location.href = "/Studenthelp/Student_Help.html";
    }
  } catch (err) {
    alert(err.message);
  }
});