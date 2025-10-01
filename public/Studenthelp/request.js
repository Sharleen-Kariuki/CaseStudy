const token2 = localStorage.getItem("token");
if (!token2) {
  alert("Please login first");
  window.location.href = "/SignUp/SignUp.html";
}

document.getElementById("submitRequestBtn")?.addEventListener("click", async () => {
  const amountNeeded = Number(document.getElementById("feeBalance").value);
  const description = document.getElementById("description").value;
  const course = document.getElementById("program").value;
  const university = document.getElementById("institution").value;
  const semester = document.getElementById("year").value;
  const deadline = document.getElementById("deadline").value;

  if (!amountNeeded || !description || !course || !deadline || !university) {
    return alert("Fill all fields");
  }

  try {
    const res = await fetch("/api/fee-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token2
      },
      body: JSON.stringify({
        amountNeeded,
        course,
        university,
        semester,
        deadline,
        description
      })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Failed");
    alert("Request created!");
    window.location.href = "/HelpComrade/Help_Comrade.html";
  } catch (err) {
    alert(err.message);
  }
});