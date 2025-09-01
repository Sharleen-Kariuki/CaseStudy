const User = require('../models/User');

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id; // Get user ID from the request parameters
    const user = await User.findById(userId); // Fetch user data from MongoDB
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user); // Send user data as JSON
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// // Mock logged-in user ID (replace this with the actual user ID from your login system)
// const userId = "64a1234567890abcdef12345"; // Example MongoDB ObjectId

// Fetch user data from the backend
async function fetchUserData() {
  try {
    const response = await fetch(`http://localhost:3000/api/user/${userId}`);
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    const user = await response.json();

    // Populate the dashboard with user data
    document.getElementById("user-name").textContent = user.name;
    document.getElementById("user-balance").textContent = `KES ${user.balance.toLocaleString()}`;
    document.getElementById("students-helped").textContent = user.studentsHelped;
    document.getElementById("total-donated").textContent = `KES ${user.totalDonated.toLocaleString()}`;
    document.getElementById("total-received").textContent = `KES ${user.totalReceived.toLocaleString()}`;
  } catch (error) {
    console.error("Failed to fetch user data:", error);
  }
}

// Logout function
function logout() {
  // Clear user session or token (if applicable)
  console.log("Logging out...");
  window.location.href = "index.html"; // Redirect to the login page
}

// Call the function when the page loads
document.addEventListener("DOMContentLoaded", fetchUserData);