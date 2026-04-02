const express = require('express');
const db = require('../config/db');
const { isAuthenticated, requireRole } = require('../middleware/auth');
const router = express.Router();

// Get retailer's products with stock
router.get('/products', isAuthenticated, requireRole('retailer'), async (req, res) => {
    try {
        const userId = req.session.user.id;
        const [products] = await db.query(`
            SELECT p.*, rs.quantity as stock_quantity, rs.low_stock_threshold,
                   CASE WHEN rs.quantity <= rs.low_stock_threshold THEN 1 ELSE 0 END as is_low_stock
            FROM retailer_stock rs
            JOIN products p ON rs.product_id = p.id
            WHERE rs.retailer_id = ?
            ORDER BY is_low_stock DESC, p.name ASC
        `, [userId]);
        res.json({ success: true, products });
    } catch (error) {
        console.error('Get retailer products error:', error);
        res.status(500).json({ success: false, message: 'Error fetching products' });
    }
});

// Get dashboard stats
router.get('/dashboard', isAuthenticated, requireRole('retailer'), async (req, res) => {
    try {
        const userId = req.session.user.id;

        const [totalProducts] = await db.query(
            'SELECT COUNT(*) as count FROM retailer_stock WHERE retailer_id = ?', [userId]);

        const [lowStock] = await db.query(
            'SELECT COUNT(*) as count FROM retailer_stock WHERE retailer_id = ? AND quantity <= low_stock_threshold',
            [userId]);

        const [pendingOrders] = await db.query(
            'SELECT COUNT(*) as count FROM orders WHERE retailer_id = ? AND status IN ("pending", "processing")',
            [userId]);

        const [completedOrders] = await db.query(
            'SELECT COUNT(*) as count FROM orders WHERE retailer_id = ? AND status = "completed"',
            [userId]);

        res.json({
            success: true,
            stats: {
                totalProducts: totalProducts[0].count,
                lowStockItems: lowStock[0].count,
                pendingOrders: pendingOrders[0].count,
                completedOrders: completedOrders[0].count
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Error fetching dashboard' });
    }
});

// Create order request
router.post('/orders', isAuthenticated, requireRole('retailer'), async (req, res) => {
    try {
        const { product_id, quantity, notes } = req.body;
        const userId = req.session.user.id;

        if (!product_id || !quantity || quantity < 1) {
            return res.status(400).json({ success: false, message: 'Product and quantity are required' });
        }

        // Generate order number
        const orderNumber = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        const [result] = await db.query(
            'INSERT INTO orders (order_number, retailer_id, product_id, quantity, notes) VALUES (?, ?, ?, ?, ?)',
            [orderNumber, userId, product_id, quantity, notes || null]
        );

        // Notify inventory managers
        const [inventoryUsers] = await db.query('SELECT id FROM users WHERE role = "inventory"');
        for (const user of inventoryUsers) {
            await db.query(
                'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
                [user.id, 'New Order Request', `New order ${orderNumber} from ${req.session.user.full_name} for ${quantity} units`, 'info']
            );
        }

        // Log
        await db.query('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)',
            [userId, 'ORDER_CREATED', `Order ${orderNumber} created for product ${product_id}`]);

        res.json({ success: true, message: 'Order request sent!', orderNumber });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ success: false, message: 'Error creating order' });
    }
});

// Get retailer's orders
router.get('/orders', isAuthenticated, requireRole('retailer'), async (req, res) => {
    try {
        const userId = req.session.user.id;
        const [orders] = await db.query(`
            SELECT o.*, p.name as product_name, p.sku
            FROM orders o
            JOIN products p ON o.product_id = p.id
            WHERE o.retailer_id = ?
            ORDER BY o.created_at DESC
        `, [userId]);
        res.json({ success: true, orders });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ success: false, message: 'Error fetching orders' });
    }
});

// Get notifications
router.get('/notifications', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const [notifications] = await db.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [userId]
        );
        res.json({ success: true, notifications });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Error fetching notifications' });
    }
});

// Mark notification as read
router.put('/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
        await db.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
            [req.params.id, req.session.user.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating notification' });
    }
});

// Mark all notifications as read
router.put('/notifications/read-all', isAuthenticated, async (req, res) => {
    try {
        await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?',
            [req.session.user.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating notifications' });
    }
});

module.exports = router;
