const token = localStorage.getItem("token");
const listContainer = document.getElementById("requestsList");

const backdrop = document.getElementById("donation-backdrop");
const modal = document.getElementById("donation-modal");
const closeBtn = document.getElementById("donationClose");
const cancelBtn = document.getElementById("donationCancel");
const form = document.getElementById("donationForm");
const amountInput = document.getElementById("donationAmount");
const phoneInput = document.getElementById("donationPhone");
const refInput = document.getElementById("donationReference");
const submitBtn = document.getElementById("donationSubmit");
const spinner = document.getElementById("donationSpinner");
const statusArea = document.getElementById("donationStatus");
const summaryEl = document.getElementById("donationSummary");
const progressFill = document.getElementById("donationProgressFill");
const progressText = document.getElementById("donationProgressText");
const toastContainer = document.getElementById("toast-container");

let currentRequest = null;
let requestsCache = [];

function showToast(message, type = "info", timeout = 4000) {
  const div = document.createElement("div");
  div.className = "toast " + (type === "success" ? "success" : type === "error" ? "error" : "");
  div.textContent = message;
  toastContainer.appendChild(div);
  setTimeout(() => {
    div.style.opacity = "0";
    setTimeout(() => div.remove(), 350);
  }, timeout);
}

function showModal() {
  backdrop.classList.remove("hidden");
  modal.classList.remove("hidden");
}
function hideModal() {
  modal.classList.add("hidden");
  backdrop.classList.add("hidden");
  form.reset();
  statusArea.textContent = "";
  spinner.classList.add("hidden");
  submitBtn.disabled = false;
  submitBtn.querySelector(".btn-label").textContent = "Send STK Push";
}

function generateReference(req) {
  return "REQ-" + req._id.slice(-6).toUpperCase() + "-" + Date.now().toString().slice(-5);
}

function updateModalProgress(req) {
  const pct = req.amountNeeded ? Math.min(100, (req.amountRaised / req.amountNeeded) * 100) : 0;
  progressFill.style.width = pct.toFixed(1) + "%";
  progressText.textContent = `${req.amountRaised} / ${req.amountNeeded} (${pct.toFixed(1)}%)`;
}

function openDonation(request) {
  if (!token) {
    alert("Please login first.");
    window.location.href = "/SignUp/SignUp.html";
    return;
  }
  currentRequest = request;
  summaryEl.innerHTML = `
    <strong>${request.course}</strong> @ ${request.university}<br>
    <small>Deadline: ${request.deadline ? new Date(request.deadline).toLocaleDateString() : "—"}</small><br>
    <small>Needed: KES ${request.amountNeeded} &middot; Raised: ${request.amountRaised}</small>
  `;
  refInput.value = generateReference(request);
  updateModalProgress(request);
  statusArea.textContent = "";
  showModal();
}

document.querySelectorAll(".quick-buttons button")?.forEach(btn => {
  btn.addEventListener("click", () => {
    amountInput.value = btn.getAttribute("data-amt");
  });
});

closeBtn.addEventListener("click", hideModal);
cancelBtn.addEventListener("click", hideModal);
backdrop.addEventListener("click", (e) => {
  if (e.target === backdrop) hideModal();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentRequest) return;

  const amount = Number(amountInput.value);
  const phone = phoneInput.value.trim();
  const reference = refInput.value.trim();
  if (!amount || amount < 1) {
    statusArea.textContent = "Enter a valid amount.";
    statusArea.style.color = "#b33";
    return;
  }
  if (!/^2547\d{8}$/.test(phone)) {
    statusArea.textContent = "Phone must match 2547XXXXXXXX pattern.";
    statusArea.style.color = "#b33";
    return;
  }

  submitBtn.disabled = true;
  spinner.classList.remove("hidden");
  statusArea.textContent = "Sending STK Push...";
  statusArea.style.color = "#555";

  try {
    const res = await fetch("/api/mpesa/stkpush", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({
        phone,
        amount,
        reference,
        requestId: currentRequest._id
      })
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
    }
    statusArea.textContent = "STK Push initiated. Complete on your phone. Auto-updating...";
    statusArea.style.color = "#2c7a3f";
    showToast("STK initiated. Awaiting completion...", "success");

    // Poll update after demo auto-completion (12s in backend; wait 15s)
    setTimeout(async () => {
      try {
        await loadRequests(true);
        // Find updated request by id
        const updated = requestsCache.find(r => r._id === currentRequest._id);
        if (updated) {
          updateModalProgress(updated);
          if (updated.amountRaised > currentRequest.amountRaised) {
            statusArea.textContent = "Donation recorded! Thank you.";
            showToast("Donation completed!", "success");
          }
        }
      } catch {}
    }, 15000);

  } catch (err) {
    statusArea.textContent = err.message;
    statusArea.style.color = "#b33";
    showToast("Failed: " + err.message, "error");
    submitBtn.disabled = false;
    spinner.classList.add("hidden");
    submitBtn.querySelector(".btn-label").textContent = "Retry STK Push";
    return;
  }

  // Keep button disabled but allow closing
  spinner.classList.add("hidden");
  submitBtn.querySelector(".btn-label").textContent = "Sent";
});

/* Existing loadRequests improved: store cache, include deadline if present */
async function loadRequests(silent = false) {
  try {
    const res = await fetch("/api/fee-request");
    const data = await res.json();
    requestsCache = data;
    if (!silent) {
      listContainer.innerHTML = "";
    }
    if (!silent) {
      data.forEach(r => {
        const pct = Math.min(100, (r.amountRaised / r.amountNeeded) * 100).toFixed(1);
        const div = document.createElement("div");
        div.className = "card";
        div.innerHTML = `
          <h2>${r.university}</h2>
          <p>${r.course} (${r.semester})</p>
          <p>Raised KES ${r.amountRaised} / ${r.amountNeeded} (${pct}%)</p>
          <progress value="${pct}" max="100"></progress>
          <button data-id="${r._id}" class="donate-btn">Help Now</button>
        `;
        div.querySelector("button").addEventListener("click", () => openDonation(r));
        listContainer.appendChild(div);
      });
      if (data.length === 0) {
        listContainer.innerHTML = `<p style="opacity:.6;">No fee requests yet.</p>`;
      }
    }
  } catch (err) {
    console.error(err);
    if (!silent) {
      listContainer.innerHTML = `<p style="color:#b33;">Failed to load requests.</p>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadRequests();
  // Optional: periodic refresh (without resetting UI)
  setInterval(() => loadRequests(true), 30000);
});