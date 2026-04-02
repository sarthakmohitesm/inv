const express = require('express');
const db = require('../config/db');
const { isAuthenticated, requireRole } = require('../middleware/auth');
const router = express.Router();

// Dashboard stats
router.get('/dashboard', isAuthenticated, requireRole('warehouse'), async (req, res) => {
    try {
        const [totalProducts] = await db.query('SELECT COUNT(*) as count FROM warehouse_stock');
        const [totalStock] = await db.query('SELECT SUM(quantity) as total FROM warehouse_stock');
        const [pendingRequests] = await db.query(
            'SELECT COUNT(*) as count FROM warehouse_requests WHERE status = "pending"');
        const [completedRequests] = await db.query(
            'SELECT COUNT(*) as count FROM warehouse_requests WHERE status = "completed"');

        res.json({
            success: true,
            stats: {
                totalProducts: totalProducts[0].count,
                totalStock: totalStock[0].total || 0,
                pendingRequests: pendingRequests[0].count,
                completedRequests: completedRequests[0].count
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Error fetching dashboard' });
    }
});

// Get warehouse stock
router.get('/stock', isAuthenticated, requireRole('warehouse'), async (req, res) => {
    try {
        const [stock] = await db.query(`
            SELECT p.*, ws.quantity, ws.min_stock_level, ws.id as stock_id, ws.last_restocked,
                   CASE WHEN ws.quantity <= ws.min_stock_level THEN 1 ELSE 0 END as is_low_stock
            FROM warehouse_stock ws
            JOIN products p ON ws.product_id = p.id
            ORDER BY p.name ASC
        `);
        res.json({ success: true, stock });
    } catch (error) {
        console.error('Get stock error:', error);
        res.status(500).json({ success: false, message: 'Error fetching stock' });
    }
});

// Update warehouse stock quantity
router.put('/stock/:id', isAuthenticated, requireRole('warehouse'), async (req, res) => {
    try {
        const { quantity } = req.body;
        await db.query(
            'UPDATE warehouse_stock SET quantity = ?, last_restocked = NOW() WHERE id = ?',
            [quantity, req.params.id]
        );

        await db.query('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)',
            [req.session.user.id, 'STOCK_UPDATED', `Warehouse stock ${req.params.id} updated to ${quantity}`]);

        res.json({ success: true, message: 'Stock updated' });
    } catch (error) {
        console.error('Update stock error:', error);
        res.status(500).json({ success: false, message: 'Error updating stock' });
    }
});

// Get all incoming requests from inventory
router.get('/requests', isAuthenticated, requireRole('warehouse'), async (req, res) => {
    try {
        const [requests] = await db.query(`
            SELECT wr.*, p.name as product_name, p.sku, u.full_name as requested_by_name,
                   ws.quantity as warehouse_stock_qty,
                   o.order_number as linked_order_number
            FROM warehouse_requests wr
            JOIN products p ON wr.product_id = p.id
            JOIN users u ON wr.requested_by = u.id
            LEFT JOIN warehouse_stock ws ON wr.product_id = ws.product_id
            LEFT JOIN orders o ON wr.order_id = o.id
            ORDER BY
                CASE wr.status
                    WHEN 'pending' THEN 1
                    WHEN 'approved' THEN 2
                    WHEN 'shipped' THEN 3
                    WHEN 'completed' THEN 4
                    WHEN 'rejected' THEN 5
                END,
                wr.created_at DESC
        `);
        res.json({ success: true, requests });
    } catch (error) {
        console.error('Get requests error:', error);
        res.status(500).json({ success: false, message: 'Error fetching requests' });
    }
});

// Approve and ship stock to inventory
router.put('/requests/:id/approve', isAuthenticated, requireRole('warehouse'), async (req, res) => {
    try {
        const requestId = req.params.id;

        // Get request details
        const [requests] = await db.query('SELECT * FROM warehouse_requests WHERE id = ?', [requestId]);
        if (requests.length === 0) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }
        const request = requests[0];

        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Request is not in pending status' });
        }

        // Check warehouse stock
        const [stock] = await db.query(
            'SELECT * FROM warehouse_stock WHERE product_id = ?', [request.product_id]);

        if (stock.length === 0 || stock[0].quantity < request.quantity) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient warehouse stock',
                availableStock: stock.length > 0 ? stock[0].quantity : 0
            });
        }

        // Deduct from warehouse
        await db.query(
            'UPDATE warehouse_stock SET quantity = quantity - ? WHERE product_id = ?',
            [request.quantity, request.product_id]);

        // Add to inventory
        await db.query(
            'UPDATE inventory_stock SET quantity = quantity + ? WHERE product_id = ?',
            [request.quantity, request.product_id]);

        // Update request status
        await db.query('UPDATE warehouse_requests SET status = "completed" WHERE id = ?', [requestId]);

        // If linked to an order, try to complete it
        if (request.order_id) {
            const [linkedOrder] = await db.query('SELECT * FROM orders WHERE id = ?', [request.order_id]);
            if (linkedOrder.length > 0) {
                const order = linkedOrder[0];
                // Check if inventory now has enough stock
                const [invStock] = await db.query(
                    'SELECT quantity FROM inventory_stock WHERE product_id = ?', [order.product_id]);
                if (invStock.length > 0 && invStock[0].quantity >= order.quantity) {
                    // Auto-fulfill the order
                    await db.query(
                        'UPDATE inventory_stock SET quantity = quantity - ? WHERE product_id = ?',
                        [order.quantity, order.product_id]);
                    await db.query(
                        'UPDATE retailer_stock SET quantity = quantity + ? WHERE retailer_id = ? AND product_id = ?',
                        [order.quantity, order.retailer_id, order.product_id]);
                    await db.query('UPDATE orders SET status = "completed" WHERE id = ?', [order.id]);

                    // Notify retailer
                    await db.query(
                        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
                        [order.retailer_id, 'Order Completed', `Your order ${order.order_number} has been fulfilled!`, 'success']
                    );
                }
            }
        }

        // Notify inventory manager
        await db.query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [request.requested_by, 'Warehouse Request Approved', `Your request ${request.request_number} has been approved and stock shipped!`, 'success']
        );

        // Log
        await db.query('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)',
            [req.session.user.id, 'REQUEST_APPROVED', `Warehouse request ${request.request_number} approved`]);

        res.json({ success: true, message: 'Request approved and stock transferred to inventory!' });
    } catch (error) {
        console.error('Approve request error:', error);
        res.status(500).json({ success: false, message: 'Error approving request' });
    }
});

// Reject request
router.put('/requests/:id/reject', isAuthenticated, requireRole('warehouse'), async (req, res) => {
    try {
        const requestId = req.params.id;
        const { notes } = req.body;

        const [requests] = await db.query('SELECT * FROM warehouse_requests WHERE id = ?', [requestId]);
        if (requests.length === 0) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }
        const request = requests[0];

        await db.query('UPDATE warehouse_requests SET status = "rejected", notes = ? WHERE id = ?',
            [notes || 'Rejected by warehouse', requestId]);

        // Notify inventory manager
        await db.query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [request.requested_by, 'Request Rejected', `Your request ${request.request_number} has been rejected. ${notes || ''}`, 'error']
        );

        res.json({ success: true, message: 'Request rejected' });
    } catch (error) {
        console.error('Reject request error:', error);
        res.status(500).json({ success: false, message: 'Error rejecting request' });
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
        res.status(500).json({ success: false, message: 'Error fetching notifications' });
    }
});

module.exports = router;
