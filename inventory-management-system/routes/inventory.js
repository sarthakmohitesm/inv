const express = require('express');
const db = require('../config/db');
const { isAuthenticated, requireRole } = require('../middleware/auth');
const router = express.Router();

// Dashboard stats
router.get('/dashboard', isAuthenticated, requireRole('inventory'), async (req, res) => {
    try {
        const [totalProducts] = await db.query('SELECT COUNT(*) as count FROM products');
        const [totalStock] = await db.query('SELECT SUM(quantity) as total FROM inventory_stock');
        const [pendingOrders] = await db.query(
            'SELECT COUNT(*) as count FROM orders WHERE status IN ("pending")');
        const [warehouseRequests] = await db.query(
            'SELECT COUNT(*) as count FROM warehouse_requests WHERE status IN ("pending", "approved")');

        res.json({
            success: true,
            stats: {
                totalProducts: totalProducts[0].count,
                totalStock: totalStock[0].total || 0,
                pendingOrders: pendingOrders[0].count,
                warehouseRequests: warehouseRequests[0].count
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Error fetching dashboard' });
    }
});

// Get all inventory stock
router.get('/stock', isAuthenticated, requireRole('inventory'), async (req, res) => {
    try {
        const [stock] = await db.query(`
            SELECT p.*, ist.quantity, ist.min_stock_level, ist.id as stock_id,
                   CASE WHEN ist.quantity <= ist.min_stock_level THEN 1 ELSE 0 END as is_low_stock
            FROM inventory_stock ist
            JOIN products p ON ist.product_id = p.id
            ORDER BY is_low_stock DESC, p.name ASC
        `);
        res.json({ success: true, stock });
    } catch (error) {
        console.error('Get stock error:', error);
        res.status(500).json({ success: false, message: 'Error fetching stock' });
    }
});

// Get all orders from retailers
router.get('/orders', isAuthenticated, requireRole('inventory'), async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT o.*, p.name as product_name, p.sku, u.full_name as retailer_name,
                   ist.quantity as available_stock
            FROM orders o
            JOIN products p ON o.product_id = p.id
            JOIN users u ON o.retailer_id = u.id
            LEFT JOIN inventory_stock ist ON o.product_id = ist.product_id
            ORDER BY
                CASE o.status
                    WHEN 'pending' THEN 1
                    WHEN 'processing' THEN 2
                    WHEN 'approved' THEN 3
                    WHEN 'completed' THEN 4
                    WHEN 'rejected' THEN 5
                END,
                o.created_at DESC
        `);
        res.json({ success: true, orders });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ success: false, message: 'Error fetching orders' });
    }
});

// Approve order (fulfill from inventory stock)
router.put('/orders/:id/approve', isAuthenticated, requireRole('inventory'), async (req, res) => {
    try {
        const orderId = req.params.id;

        // Get order details
        const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        const order = orders[0];

        if (order.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Order is not in pending status' });
        }

        // Check inventory stock
        const [stock] = await db.query(
            'SELECT * FROM inventory_stock WHERE product_id = ?', [order.product_id]);

        if (stock.length === 0 || stock[0].quantity < order.quantity) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient inventory stock. Please request from warehouse.',
                availableStock: stock.length > 0 ? stock[0].quantity : 0
            });
        }

        // Deduct from inventory stock
        await db.query(
            'UPDATE inventory_stock SET quantity = quantity - ? WHERE product_id = ?',
            [order.quantity, order.product_id]);

        // Add to retailer stock
        await db.query(
            'UPDATE retailer_stock SET quantity = quantity + ? WHERE retailer_id = ? AND product_id = ?',
            [order.quantity, order.retailer_id, order.product_id]);

        // Update order status
        await db.query('UPDATE orders SET status = "completed" WHERE id = ?', [orderId]);

        // Notify retailer
        await db.query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [order.retailer_id, 'Order Approved', `Your order ${order.order_number} has been approved and fulfilled!`, 'success']
        );

        // Log
        await db.query('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)',
            [req.session.user.id, 'ORDER_APPROVED', `Order ${order.order_number} approved and fulfilled`]);

        res.json({ success: true, message: 'Order approved and stock transferred!' });
    } catch (error) {
        console.error('Approve order error:', error);
        res.status(500).json({ success: false, message: 'Error approving order' });
    }
});

// Reject order
router.put('/orders/:id/reject', isAuthenticated, requireRole('inventory'), async (req, res) => {
    try {
        const orderId = req.params.id;
        const { notes } = req.body;

        const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        const order = orders[0];

        await db.query('UPDATE orders SET status = "rejected", notes = ? WHERE id = ?',
            [notes || 'Rejected by inventory manager', orderId]);

        // Notify retailer
        await db.query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [order.retailer_id, 'Order Rejected', `Your order ${order.order_number} has been rejected. ${notes || ''}`, 'error']
        );

        res.json({ success: true, message: 'Order rejected' });
    } catch (error) {
        console.error('Reject order error:', error);
        res.status(500).json({ success: false, message: 'Error rejecting order' });
    }
});

// Request stock from warehouse
router.post('/warehouse-request', isAuthenticated, requireRole('inventory'), async (req, res) => {
    try {
        const { product_id, quantity, order_id, notes } = req.body;
        const userId = req.session.user.id;

        if (!product_id || !quantity || quantity < 1) {
            return res.status(400).json({ success: false, message: 'Product and quantity are required' });
        }

        const requestNumber = 'WRQ-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        await db.query(
            'INSERT INTO warehouse_requests (request_number, order_id, product_id, quantity, requested_by, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [requestNumber, order_id || null, product_id, quantity, userId, notes || null]
        );

        // If linked to an order, set it to processing
        if (order_id) {
            await db.query('UPDATE orders SET status = "processing" WHERE id = ?', [order_id]);
        }

        // Notify warehouse managers
        const [warehouseUsers] = await db.query('SELECT id FROM users WHERE role = "warehouse"');
        for (const user of warehouseUsers) {
            await db.query(
                'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
                [user.id, 'New Stock Request', `New warehouse request ${requestNumber} for ${quantity} units`, 'info']
            );
        }

        // Log
        await db.query('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)',
            [userId, 'WAREHOUSE_REQUEST', `Warehouse request ${requestNumber} created`]);

        res.json({ success: true, message: 'Warehouse request sent!', requestNumber });
    } catch (error) {
        console.error('Warehouse request error:', error);
        res.status(500).json({ success: false, message: 'Error creating warehouse request' });
    }
});

// Get warehouse requests made by inventory
router.get('/warehouse-requests', isAuthenticated, requireRole('inventory'), async (req, res) => {
    try {
        const [requests] = await db.query(`
            SELECT wr.*, p.name as product_name, p.sku, u.full_name as requested_by_name
            FROM warehouse_requests wr
            JOIN products p ON wr.product_id = p.id
            JOIN users u ON wr.requested_by = u.id
            ORDER BY wr.created_at DESC
        `);
        res.json({ success: true, requests });
    } catch (error) {
        console.error('Get warehouse requests error:', error);
        res.status(500).json({ success: false, message: 'Error fetching requests' });
    }
});

// CRUD: Add product
router.post('/products', isAuthenticated, requireRole('inventory'), async (req, res) => {
    try {
        const { name, sku, description, category, price } = req.body;

        if (!name || !sku) {
            return res.status(400).json({ success: false, message: 'Name and SKU are required' });
        }

        const [result] = await db.query(
            'INSERT INTO products (name, sku, description, category, price) VALUES (?, ?, ?, ?, ?)',
            [name, sku, description || null, category || null, price || 0]
        );

        // Add to inventory stock and warehouse stock
        await db.query('INSERT INTO inventory_stock (product_id, quantity) VALUES (?, 0)', [result.insertId]);
        await db.query('INSERT INTO warehouse_stock (product_id, quantity) VALUES (?, 0)', [result.insertId]);

        // Add to all retailers
        const [retailers] = await db.query('SELECT id FROM users WHERE role = "retailer"');
        for (const retailer of retailers) {
            await db.query(
                'INSERT INTO retailer_stock (retailer_id, product_id, quantity) VALUES (?, ?, 0)',
                [retailer.id, result.insertId]
            );
        }

        res.json({ success: true, message: 'Product added successfully', productId: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'SKU already exists' });
        }
        console.error('Add product error:', error);
        res.status(500).json({ success: false, message: 'Error adding product' });
    }
});

// CRUD: Update product
router.put('/products/:id', isAuthenticated, requireRole('inventory'), async (req, res) => {
    try {
        const { name, sku, description, category, price } = req.body;
        await db.query(
            'UPDATE products SET name = ?, sku = ?, description = ?, category = ?, price = ? WHERE id = ?',
            [name, sku, description, category, price, req.params.id]
        );
        res.json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ success: false, message: 'Error updating product' });
    }
});

// CRUD: Delete product
router.delete('/products/:id', isAuthenticated, requireRole('inventory'), async (req, res) => {
    try {
        await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ success: false, message: 'Error deleting product' });
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
