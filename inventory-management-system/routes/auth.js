const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { full_name, email, password, role, phone } = req.body;

        // Validate
        if (!full_name || !email || !password || !role) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const validRoles = ['retailer', 'inventory', 'warehouse'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        // Check if email exists
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user
        const [result] = await db.query(
            'INSERT INTO users (full_name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
            [full_name, email, hashedPassword, role, phone || null]
        );

        // If retailer, assign all products with default stock
        if (role === 'retailer') {
            const [products] = await db.query('SELECT id FROM products');
            for (const product of products) {
                await db.query(
                    'INSERT INTO retailer_stock (retailer_id, product_id, quantity, low_stock_threshold) VALUES (?, ?, 0, 3)',
                    [result.insertId, product.id]
                );
            }
        }

        res.json({ success: true, message: 'Registration successful! Please login.' });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Server error during registration' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        // Find user
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const user = users[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // Set session
        req.session.user = {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role
        };

        // Determine redirect
        let redirect = '/';
        switch (user.role) {
            case 'retailer': redirect = '/retailer-dashboard.html'; break;
            case 'inventory': redirect = '/inventory-dashboard.html'; break;
            case 'warehouse': redirect = '/warehouse-dashboard.html'; break;
        }

        // Log activity
        await db.query('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)',
            [user.id, 'LOGIN', `${user.full_name} logged in`]);

        res.json({
            success: true,
            message: 'Login successful',
            user: req.session.user,
            redirect
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// Get current user
router.get('/me', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ success: true, user: req.session.user });
    } else {
        res.status(401).json({ success: false, message: 'Not authenticated' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error logging out' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

module.exports = router;
