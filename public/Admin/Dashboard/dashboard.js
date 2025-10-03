const token = localStorage.getItem("token");
const userRaw = localStorage.getItem("user");
let userObj;
try { userObj = JSON.parse(userRaw); } catch {}

if (!token || !userObj || !["superadmin", "admin"].includes(userObj.role)) {
  alert("Admin access only. Redirecting.");
  window.location.href = "/SignUp/SignUp.html";
}

const el = id => document.getElementById(id);
let reqPage = 1;
let reqPages = 1;
let currentStatusFilter = "";
let currentSearch = "";
let currentReviewFilter = "";

const backdrop = el("modal-backdrop");
const editModal = el("edit-modal");
const reviewModal = el("review-modal");
const deleteModal = el("delete-modal");
const stkModal = el("stk-modal");

function showModal(modal) {
  backdrop.classList.remove("hidden");
  modal.classList.remove("hidden");
}
function hideModal(modal) {
  modal.classList.add("hidden");
  if (![editModal, reviewModal, deleteModal, stkModal].some(m => !m.classList.contains("hidden"))) {
    backdrop.classList.add("hidden");
  }
}

async function apiGet(url) {
  const res = await fetch(url, { headers: { Authorization: "Bearer " + token } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
async function apiJSON(url, method, bodyObj) {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: bodyObj ? JSON.stringify(bodyObj) : undefined
  });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function statusBadge(status) {
  return `<span class="badge badge-${status}">${status}</span>`;
}
function reviewBadge(rv) {
  return `<span class="badge-review badge-review-${rv}">${rv}</span>`;
}

/* -------- Overview + Analytics (unchanged core logic, added reviewStatus column usage) -------- */
async function loadOverview() {
  try {
    const ov = await apiGet("/api/admin/overview");
    el("ov-users").textContent = ov.counts.users;
    el("ov-requests").textContent = ov.counts.feeRequests;
    el("ov-donations").textContent = ov.counts.donations;
    el("ov-transactions").textContent = ov.counts.transactions;
    el("ov-raised").textContent = ov.totalRaised;
    el("lastUpdated").textContent = "Updated: " + new Date().toLocaleTimeString();

    const metrics = await apiGet("/api/admin/metrics");
    const tbody = el("recent-requests-body");
    tbody.innerHTML = "";
    metrics.recentRequests.forEach(r => {
      const pct = r.amountNeeded > 0 ? ((r.amountRaised / r.amountNeeded) * 100) : 0;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.course}<br><small>${r.university}</small></td>
        <td>
          <div class="progress-mini"><span style="width:${pct}%"></span></div>
          <small>${r.amountRaised} / ${r.amountNeeded} (${pct.toFixed(1)}%)</small>
        </td>
        <td>${statusBadge(r.status)} ${reviewBadge(r.reviewStatus || "unreviewed")}</td>
        <td><small>${new Date(r.createdAt).toLocaleDateString()}</small></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

async function loadAnalytics() {
  try {
    const data = await apiGet("/api/admin/metrics");
    renderDonationChart(data.donationsByDay);
    renderBucketChart(data.completionBuckets);
    renderTopActive(data.topActiveRequests);
  } catch (err) {
    console.error(err);
  }
}

function renderDonationChart(points) {
  const canvas = document.getElementById("donationChart");
  const ctx = canvas.getContext("2d");
  const w = canvas.width = canvas.clientWidth;
  const h = canvas.height = 140;
  ctx.clearRect(0,0,w,h);
  if (!points || points.length === 0) {
    ctx.fillStyle="#777";
    ctx.font="12px sans-serif";
    ctx.fillText("No recent donations", 10, 20);
    return;
  }
  const vals = points.map(p=>p.total);
  const max = Math.max(...vals);
  const pad = 10;
  const barW = (w - pad*2) / points.length;
  ctx.fillStyle="#8b6b5c";
  points.forEach((p,i)=>{
    const barH = max ? (p.total / max)*(h - pad*2) : 0;
    ctx.fillRect(pad + i*barW, h - pad - barH, barW*0.6, barH);
  });
  ctx.fillStyle="#444";
  ctx.font="10px sans-serif";
  ctx.fillText("Last 14 days", pad, 12);
}

function renderBucketChart(buckets) {
  const canvas = document.getElementById("bucketChart");
  const ctx = canvas.getContext("2d");
  const w = canvas.width = canvas.clientWidth;
  const h = canvas.height = 140;
  ctx.clearRect(0,0,w,h);
  const labels = Object.keys(buckets);
  const values = labels.map(k=>buckets[k]);
  if (values.reduce((a,b)=>a+b,0) === 0) {
    ctx.fillStyle="#777";
    ctx.font="12px sans-serif";
    ctx.fillText("No data", 10, 20);
    return;
  }
  const max = Math.max(...values);
  const pad = 10;
  const barW = (w - pad*2) / labels.length;
  labels.forEach((l,i)=>{
    const v = buckets[l];
    const barH = max ? (v/max)*(h - pad*2) : 0;
    ctx.fillStyle="#6d534a";
    ctx.fillRect(pad + i*barW, h - pad - barH, barW*0.65, barH);
    ctx.fillStyle="#222";
    ctx.font="9px sans-serif";
    ctx.fillText(l, pad + i*barW, h - 2);
    ctx.fillText(v, pad + i*barW, h - pad - barH - 4);
  });
}

function renderTopActive(list) {
  const container = document.getElementById("top-active-list");
  container.innerHTML = "";
  if (!list || list.length === 0) {
    container.innerHTML = `<p style="opacity:.6;">No active requests.</p>`;
    return;
  }
  list.forEach(r=>{
    const div = document.createElement("div");
    div.style.marginBottom="8px";
    div.innerHTML = `
      <strong>${r.course}</strong> <small>@ ${r.university}</small><br>
      <small>Raised ${r.amountRaised} / ${r.amountNeeded} (rem ${r.remaining}, ${r.pct}%)</small><br>
      ${reviewBadge(r.reviewStatus || "unreviewed")}
    `;
    container.appendChild(div);
  });
}

/* -------- Requests Management (CRUD + Review) -------- */

async function loadRequests() {
  const tbody = el("admin-requests");
  tbody.innerHTML = `<tr><td colspan="6" style="opacity:.6;">Loading...</td></tr>`;
  try {
    const qs = new URLSearchParams();
    if (currentStatusFilter) qs.set("status", currentStatusFilter);
    if (currentReviewFilter) qs.set("reviewStatus", currentReviewFilter);
    if (currentSearch) qs.set("search", currentSearch);
    qs.set("page", reqPage);
    qs.set("limit", 12);

    const data = await apiGet("/api/admin/fee-requests?" + qs.toString());
    reqPages = data.pages;
    tbody.innerHTML = "";
    if (!data.items.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="opacity:.55;">No results.</td></tr>`;
      updatePaginationInfo();
      return;
    }

    data.items.forEach(r => {
      const pct = r.amountNeeded ? (r.amountRaised / r.amountNeeded)*100 : 0;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.requester?.name || "N/A"}<br><small>${r.requester?.email || ""}</small></td>
        <td>${r.course}<br><small>${r.university}</small></td>
        <td>
          <div class="progress-mini"><span style="width:${pct}%"></span></div>
          <small>${r.amountRaised} / ${r.amountNeeded} (${pct.toFixed(1)}%)</small>
        </td>
        <td>${statusBadge(r.status)}</td>
        <td>${reviewBadge(r.reviewStatus || "unreviewed")}</td>
        <td>
          <div class="action-buttons">
            <button class="view" data-id="${r._id}">View</button>
            <button class="edit" data-id="${r._id}">Edit</button>
            <button class="review" data-id="${r._id}">Review</button>
            <button class="delete delete-btn" data-id="${r._id}">Del</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Bind actions
    tbody.querySelectorAll(".edit").forEach(btn =>
      btn.addEventListener("click", () => openEdit(btn.dataset.id)));
    tbody.querySelectorAll(".view").forEach(btn =>
      btn.addEventListener("click", () => openEdit(btn.dataset.id, true)));
    tbody.querySelectorAll(".review").forEach(btn =>
      btn.addEventListener("click", () => openReview(btn.dataset.id)));
    tbody.querySelectorAll(".delete-btn").forEach(btn =>
      btn.addEventListener("click", () => openDelete(btn.dataset.id)));

    updatePaginationInfo();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6" style="color:#c00;">${err.message}</td></tr>`;
  }
}

function updatePaginationInfo() {
  el("paginationInfo").textContent = `Page ${reqPage} / ${reqPages || 1}`;
}

async function openEdit(id, viewOnly = false) {
  try {
    const r = await apiGet(`/api/admin/fee-requests/${id}`);
    el("edit-id").value = r._id;
    el("edit-course").value = r.course;
    el("edit-university").value = r.university;
    el("edit-semester").value = r.semester;
    el("edit-amount").value = r.amountNeeded;
    el("edit-deadline").value = r.deadline ? r.deadline.substring(0,10) : "";
    el("edit-description").value = r.description;
    el("edit-status").value = r.status;

    // Toggle inputs for view mode
    editModal.querySelectorAll("input,textarea,select").forEach(inp => {
      inp.disabled = viewOnly;
    });
    editModal.querySelector("h3").textContent = viewOnly ? "View Fee Request" : "Edit Fee Request";
    editModal.querySelector("button[type=submit]").style.display = viewOnly ? "none" : "inline-block";

    showModal(editModal);
  } catch (err) {
    alert(err.message);
  }
}

function openReview(id) {
  el("review-id").value = id;
  el("review-action").value = "approve";
  el("review-notes").value = "";
  showModal(reviewModal);
}

let deleteTargetId = null;
function openDelete(id) {
  deleteTargetId = id;
  el("delete-text").textContent = `Delete request ${id}? This cannot be undone.`;
  showModal(deleteModal);
}

/* ---- Edit Form Submit ---- */
el("editForm").addEventListener("submit", async e => {
  e.preventDefault();
  const id = el("edit-id").value;
  const payload = {
    course: el("edit-course").value.trim(),
    university: el("edit-university").value.trim(),
    semester: el("edit-semester").value.trim(),
    amountNeeded: Number(el("edit-amount").value),
    deadline: el("edit-deadline").value,
    description: el("edit-description").value.trim(),
    status: el("edit-status").value
  };
  try {
    await apiJSON(`/api/admin/fee-requests/${id}`, "PATCH", payload);
    hideModal(editModal);
    loadRequests();
    loadOverview(); // Refresh KPIs maybe changed
  } catch (err) {
    alert(err.message);
  }
});

el("closeEdit").addEventListener("click", () => hideModal(editModal));

/* ---- Review Submit ---- */
el("reviewForm").addEventListener("submit", async e => {
  e.preventDefault();
  const id = el("review-id").value;
  const payload = {
    action: el("review-action").value,
    notes: el("review-notes").value.trim()
  };
  try {
    await apiJSON(`/api/admin/fee-requests/${id}/review`, "POST", payload);
    hideModal(reviewModal);
    loadRequests();
    loadOverview();
  } catch (err) {
    alert(err.message);
  }
});
el("closeReview").addEventListener("click", () => hideModal(reviewModal));

/* ---- Delete Confirm ---- */
el("confirmDelete").addEventListener("click", async () => {
  if (!deleteTargetId) return;
  try {
    await apiJSON(`/api/admin/fee-requests/${deleteTargetId}`, "DELETE");
    hideModal(deleteModal);
    deleteTargetId = null;
    loadRequests();
    loadOverview();
  } catch (err) {
    alert(err.message);
  }
});
el("closeDelete").addEventListener("click", () => {
  deleteTargetId = null;
  hideModal(deleteModal);
});

/* ---- Filters ---- */
el("filterStatus").addEventListener("change", e => {
  currentStatusFilter = e.target.value;
  reqPage = 1;
  loadRequests();
});
el("filterReview").addEventListener("change", e => {
  currentReviewFilter = e.target.value;
  reqPage = 1;
  loadRequests();
});
el("searchInput").addEventListener("keyup", debounce(e => {
  currentSearch = e.target.value.trim();
  reqPage = 1;
  loadRequests();
}, 400));

el("refreshRequestsBtn").addEventListener("click", () => loadRequests());
el("prevPageBtn").addEventListener("click", () => { if (reqPage > 1) { reqPage--; loadRequests(); } });
el("nextPageBtn").addEventListener("click", () => { if (reqPage < reqPages) { reqPage++; loadRequests(); } });

/* ---- Navigation ---- */
document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(i=>i.classList.remove("active"));
    item.classList.add("active");
    const sec = item.getAttribute("data-section");
    document.querySelectorAll(".content-section").forEach(s=>s.classList.remove("active"));
    if (sec) {
      document.getElementById("section-" + sec).classList.add("active");
      if (sec === "analytics") loadAnalytics();
    }
  });
});

/* ---- Logout ---- */
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/SignUp/SignUp.html";
});

/* ---- Debounce Helper ---- */
function debounce(fn, delay=300) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(()=>fn.apply(this,args), delay);
  };
}

/* ---- Improved Admin STK Push Modal ---- */
document.getElementById("openStkBtn").addEventListener("click", () => {
  el("stk-requestId").value = "";
  el("stk-phone").value = "";
  el("stk-amount").value = "";
  el("stk-reference").value = "ADMIN-" + Date.now();
  el("stk-donorUserId").value = "";
  el("stk-status").textContent = "";
  showModal(stkModal);
});
el("closeStk").addEventListener("click", () => hideModal(stkModal));

el("stkFormAdmin").addEventListener("submit", async e => {
  e.preventDefault();
  const requestId = el("stk-requestId").value.trim();
  const phone = el("stk-phone").value.trim();
  const amount = Number(el("stk-amount").value);
  const reference = el("stk-reference").value.trim();
  const donorUserId = el("stk-donorUserId").value.trim() || undefined;

  if (!/^2547\d{8}$/.test(phone)) {
    el("stk-status").textContent = "Invalid phone format.";
    el("stk-status").style.color = "#c0392b";
    return;
  }
  if (!amount || amount < 1) {
    el("stk-status").textContent = "Invalid amount.";
    el("stk-status").style.color = "#c0392b";
    return;
  }
  el("stk-status").textContent = "Sending...";
  el("stk-status").style.color = "#555";

  try {
    const payload = { phone, amount, reference, requestId };
    if (donorUserId) payload.donorUserId = donorUserId;
    const resp = await apiJSON("/api/mpesa/admin/stkpush", "POST", payload);
    el("stk-status").textContent = "STK Push initiated. Gateway response processed.";
    el("stk-status").style.color = "#2c7a3f";
    setTimeout(()=>{
      hideModal(stkModal);
      loadRequests();
      loadOverview();
    }, 1500);
  } catch (err) {
    el("stk-status").textContent = err.message;
    el("stk-status").style.color = "#c0392b";
  }
});

/* ---- Initial Loads ---- */
loadOverview();
loadRequests();
setInterval(loadOverview, 30000);