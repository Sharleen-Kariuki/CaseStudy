const express = require('express');
const router = express.Router();
const userController = require('../Controllers/userController.js');

// Get user by ID
router.get('/:id', userController.getUserById);

module.exports = router;