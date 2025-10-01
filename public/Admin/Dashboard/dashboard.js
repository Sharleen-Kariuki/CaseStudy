const tokenA = localStorage.getItem("token");
const userRaw = localStorage.getItem("user");
let userObj;
try { userObj = JSON.parse(userRaw); } catch { }

if (!tokenA || !userObj || (userObj.role !== "superadmin" && userObj.role !== "admin")) {
  alert("Admin access only. Redirecting.");
  window.location.href = "/SignUp/SignUp.html";
}

async function loadOverview() {
  const res = await fetch("/api/admin/overview", {
    headers: { Authorization: "Bearer " + tokenA }
  });
  const data = await res.json();
  if (!res.ok) return alert(data.error || "Failed to load overview");

  document.getElementById("ov-users").textContent = data.users;
  document.getElementById("ov-requests").textContent = data.feeRequests;
  document.getElementById("ov-donations").textContent = data.donations;
  document.getElementById("ov-transactions").textContent = data.transactions;
  document.getElementById("ov-raised").textContent = "KES " + data.totalRaised;
}

async function loadRequestsAdmin() {
  const res = await fetch("/api/admin/fee-requests", {
    headers: { Authorization: "Bearer " + tokenA }
  });
  const data = await res.json();
  if (!res.ok) return;
  const tbody = document.getElementById("admin-requests");
  tbody.innerHTML = "";
  data.forEach(r => {
    const tr = document.createElement("tr");
    const pct = Math.min(100, (r.amountRaised / r.amountNeeded) * 100).toFixed(1);
    tr.innerHTML = `
      <td>${r.requester?.name || "N/A"}<br><small>${r.requester?.email || ""}</small></td>
      <td>${r.university}</td>
      <td>${r.course}</td>
      <td>${r.amountRaised} / ${r.amountNeeded} (${pct}%)</td>
      <td>${r.status}</td>
      <td>
        <select data-id="${r._id}">
          <option value="pending" ${r.status==="pending"?"selected":""}>pending</option>
          <option value="completed" ${r.status==="completed"?"selected":""}>completed</option>
          <option value="failed" ${r.status==="failed"?"selected":""}>failed</option>
        </select>
      </td>
    `;
    tr.querySelector("select").addEventListener("change", (e) => updateStatus(r._id, e.target.value));
    tbody.appendChild(tr);
  });
}

async function updateStatus(id, status) {
  const res = await fetch(`/api/fee-request/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + tokenA
    },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const d = await res.json();
    alert(d.error || "Failed");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadOverview();
  loadRequestsAdmin();
  setInterval(() => {
    loadOverview();
    loadRequestsAdmin();
  }, 20000);
});