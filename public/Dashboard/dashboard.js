const token = localStorage.getItem("token");
const listContainer = document.getElementById("urgentCards");

async function loadRequests() {
  try {
    console.log("Fetching from /api/fee-request...");
      const res = await fetch("http://localhost:3000/api/fee-request");
    console.log("Response status:", res.status);
    console.log("Response OK:", res.ok);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("Error response:", errorText);
      throw new Error(`Failed to fetch requests: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log("Data received:", data);
    
    listContainer.innerHTML = "";
    
    if (!data || data.length === 0) {
      listContainer.innerHTML = "<p style='opacity:.6;'>No requests available at the moment.</p>";
      return;
    }
    
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
    console.error("Full error:", err);
    listContainer.innerHTML = `<p style='color:red;'>Error loading requests: ${err.message}</p>`;
  }
}

function openDonation(request) {
  
  const amount = prompt("Enter donation amount (KES):");
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    alert("Please enter a valid donation amount.");
    return;
  }
  
const phone = prompt("Enter M-Pesa phone (2541XXXXXXXX or 2547XXXXXXXX):");
if (!phone || !/^254[17]\d{8}$/.test(phone)) {
    alert("Please enter a valid M-Pesa phone number (2541XXXXXXXX or 2547XXXXXXXX).");
    return;
}
  
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