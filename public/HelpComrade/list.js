const token = localStorage.getItem("token");
const listContainer = document.getElementById("requestsList");

async function loadRequests() {
  try {
    const res = await fetch("http://localhost:3000/api/fee-request");
    if (!res.ok) throw new Error(`Failed to fetch requests: ${res.statusText}`);
    const data = await res.json();
    listContainer.innerHTML = "";
    data.forEach(r => {
      const pct = Math.min(100, (r.amountRaised / r.amountNeeded) * 100).toFixed(1);
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        <h2>${r.university}</h2>
        <p>${r.course} (${r.semester})</p>
        <p>Raised KES ${r.amountRaised} / ${r.amountNeeded} (${pct}%)</p>
        <progress value="${pct}" max="100"></progress>
        <button data-id="${r._id}">Help Now</button>
      `;
      div.querySelector("button").addEventListener("click", () => openDonation(r));
      listContainer.appendChild(div);
    });
  } catch (err) {
    console.error(err);
  }
}

function openDonation(request) {
  if (!token) {
    alert("Please login first.");
    window.location.href = "/SignUp/SignUp.html";
    return;
  }
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    alert("Please enter a valid donation amount.");
    return;
  }
  if (!phone || !/^2547\d{8}$/.test(phone)) {
    alert("Please enter a valid M-Pesa phone number (2547XXXXXXXX).");
    return;
  }

  // Option 1: STK push (preferred)
  const phone = prompt("Enter M-Pesa phone (2547XXXXXXXX):");
  if (!phone) return;

  const reference = "REQ-" + request._id + "-" + Date.now();
  fetch("/api/mpesa/stkpush", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({
      phone,
      amount: Number(amount),
      reference,
      requestId: request._id
    })
  })
    .then(r => r.json())
    .then(d => {
      if (d.error) return alert(JSON.stringify(d.error));
      alert("STK Push initiated. You will receive a prompt. This will auto-complete in demo mode.");
      setTimeout(loadRequests, 15000);
    })
    .catch(e => alert(e.message));
}

document.addEventListener("DOMContentLoaded", loadRequests);