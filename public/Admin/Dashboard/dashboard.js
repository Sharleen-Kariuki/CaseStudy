const token = localStorage.getItem("token");
const userRaw = localStorage.getItem("user");
let userObj;
try { userObj = JSON.parse(userRaw); } catch {}

if (!token || !userObj || !["superadmin", "admin"].includes(userObj.role)) {
  alert("Admin access only. Redirecting.");
  window.location.href = "/SignUp/SignUp.html";
}

const el = (id) => document.getElementById(id);

let reqPage = 1;
let reqPages = 1;
let currentStatusFilter = "";
let currentSearch = "";

async function apiGet(url) {
  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + token }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function loadOverview() {
  try {
    const ov = await apiGet("/api/admin/overview");
    el("ov-users").textContent = ov.counts.users;
    el("ov-requests").textContent = ov.counts.feeRequests;
    el("ov-donations").textContent = ov.counts.donations;
    el("ov-transactions").textContent = ov.counts.transactions;
    el("ov-raised").textContent = ov.totalRaised;
    el("lastUpdated").textContent = "Updated: " + new Date().toLocaleTimeString();

    // Also load recent requests for overview table
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
        <td>${statusBadge(r.status)}</td>
        <td><small>${new Date(r.createdAt).toLocaleDateString()}</small></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

function statusBadge(status) {
  return `<span class="badge badge-${status}">${status}</span>`;
}

async function loadRequests() {
  const tbody = el("admin-requests");
  tbody.innerHTML = `<tr><td colspan="5" style="opacity:.6;">Loading...</td></tr>`;
  try {
    const qs = new URLSearchParams();
    if (currentStatusFilter) qs.set("status", currentStatusFilter);
    if (currentSearch) qs.set("search", currentSearch);
    qs.set("page", reqPage);
    qs.set("limit", 12);

    const data = await apiGet("/api/admin/fee-requests?" + qs.toString());
    reqPages = data.pages;

    tbody.innerHTML = "";
    if (data.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="opacity:.6;">No results.</td></tr>`;
      updatePaginationInfo();
      return;
    }

    data.items.forEach(r => {
      const pct = r.amountNeeded ? (r.amountRaised / r.amountNeeded) * 100 : 0;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.requester?.name || "N/A"}<br><small>${r.requester?.email || ""}</small></td>
        <td>${r.course}<br><small>${r.university}</small></td>
        <td>
          <div class="progress-mini"><span style="width:${pct}%"></span></div>
          <small>${r.amountRaised} / ${r.amountNeeded} (${pct.toFixed(1)}%)</small>
        </td>
        <td>${statusBadge(r.status)}</td>
        <td>
          <select data-id="${r._id}">
            <option value="pending" ${r.status==="pending"?"selected":""}>pending</option>
            <option value="completed" ${r.status==="completed"?"selected":""}>completed</option>
            <option value="failed" ${r.status==="failed"?"selected":""}>failed</option>
          </select>
        </td>
      `;
      const sel = tr.querySelector("select");
      sel.addEventListener("change", (e) => updateStatus(r._id, e.target.value, tr));
      tbody.appendChild(tr);
    });
    updatePaginationInfo();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5" style="color:#c00;">${err.message}</td></tr>`;
  }
}

function updatePaginationInfo() {
  el("paginationInfo").textContent = `Page ${reqPage} / ${reqPages || 1}`;
}

async function updateStatus(id, status, row) {
  const selectEl = row.querySelector("select");
  const oldVal = selectEl.getAttribute("data-prev") || selectEl.value;
  selectEl.disabled = true;
  try {
    const res = await fetch(`/api/fee-request/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ status })
    });
    const d = await res.json();
    if (!res.ok) {
      alert(d.error || "Failed to update");
      selectEl.value = oldVal;
      return;
    }
    // Replace badge cell
    row.querySelectorAll("td")[3].innerHTML = statusBadge(d.request.status);
    selectEl.setAttribute("data-prev", status);
  } catch (err) {
    alert(err.message);
    selectEl.value = oldVal;
  } finally {
    selectEl.disabled = false;
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

// Simple sparkline-like area / bar charts without external libs
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
  const values = points.map(p=>p.total);
  const max = Math.max(...values);
  const pad = 10;
  const barW = (w - pad*2) / points.length;

  ctx.fillStyle="#8b6b5c";
  points.forEach((p,i) => {
    const val = p.total;
    const barH = max ? (val / max) * (h - pad*2) : 0;
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

  labels.forEach((l,i) => {
    const v = buckets[l];
    const barH = max ? (v / max) * (h - pad*2) : 0;
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
  list.forEach(r => {
    const div = document.createElement("div");
    div.style.marginBottom = "8px";
    div.innerHTML = `
      <strong>${r.course}</strong> <small>@ ${r.university}</small><br>
      <small>Raised ${r.amountRaised} / ${r.amountNeeded} (rem ${r.remaining}, ${r.pct}%)</small>
    `;
    container.appendChild(div);
  });
}

// Navigation
document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(i=>i.classList.remove("active"));
    item.classList.add("active");
    const sec = item.getAttribute("data-section");
    document.querySelectorAll(".content-section").forEach(s=>{
      s.classList.remove("active");
    });
    if (sec) {
      document.getElementById("section-" + sec).classList.add("active");
      if (sec === "analytics") loadAnalytics();
    }
  });
});

// Filters & events
el("filterStatus").addEventListener("change", e => {
  currentStatusFilter = e.target.value;
  reqPage = 1;
  loadRequests();
});
el("searchInput").addEventListener("keyup", debounce(e => {
  currentSearch = e.target.value.trim();
  reqPage = 1;
  loadRequests();
}, 400));

el("refreshRequestsBtn").addEventListener("click", () => loadRequests());
el("prevPageBtn").addEventListener("click", () => {
  if (reqPage > 1) {
    reqPage--;
    loadRequests();
  }
});
el("nextPageBtn").addEventListener("click", () => {
  if (reqPage < reqPages) {
    reqPage++;
    loadRequests();
  }
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/SignUp/SignUp.html";
});

// Debounce helper
function debounce(fn, delay=300) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(()=>fn.apply(this,args), delay);
  };
}

// Initial loads
loadOverview();
loadRequests();
setInterval(loadOverview, 30000); // periodic refresh