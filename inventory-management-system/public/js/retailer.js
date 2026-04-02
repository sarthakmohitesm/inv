// =============================================
// Retailer Dashboard JavaScript
// =============================================

let currentUser = null;

// Init
(async function init() {
    await checkAuth();
    loadDashboard();
    loadProducts();
    loadOrders();
    loadNotifications();
    // Refresh every 30 seconds
    setInterval(() => {
        loadNotifications();
        loadDashboard();
    }, 30000);
})();

// Auth check
async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!data.success || data.user.role !== 'retailer') {
            window.location.href = '/';
            return;
        }
        currentUser = data.user;
        document.getElementById('user-name').textContent = currentUser.full_name;
        document.getElementById('user-avatar').textContent = currentUser.full_name.charAt(0).toUpperCase();
    } catch (e) {
        window.location.href = '/';
    }
}

// Load Dashboard Stats
async function loadDashboard() {
    try {
        const res = await fetch('/api/retailer/dashboard');
        const data = await res.json();
        if (data.success) {
            document.getElementById('stat-total-products').textContent = data.stats.totalProducts;
            document.getElementById('stat-low-stock').textContent = data.stats.lowStockItems;
            document.getElementById('stat-pending').textContent = data.stats.pendingOrders;
            document.getElementById('stat-completed').textContent = data.stats.completedOrders;
        }
    } catch (e) {
        console.error('Dashboard load error:', e);
    }
}

// Load Products
async function loadProducts() {
    try {
        const res = await fetch('/api/retailer/products');
        const data = await res.json();
        if (!data.success) return;

        const products = data.products;

        // Products table
        const productsTable = document.getElementById('products-table');
        productsTable.innerHTML = products.map(p => `
            <tr>
                <td>
                    <div class="product-info">
                        <span class="product-name">${p.name}</span>
                        <span class="product-sku">${p.sku}</span>
                    </div>
                </td>
                <td>${p.category || '-'}</td>
                <td>₹${Number(p.price).toLocaleString()}</td>
                <td><span class="stock-qty ${p.is_low_stock ? 'low' : 'ok'}">${p.stock_quantity}</span></td>
                <td>${p.is_low_stock
                    ? '<span class="badge badge-low-stock">⚠️ Low Stock</span>'
                    : '<span class="badge badge-in-stock">✅ In Stock</span>'
                }</td>
                <td>
                    ${p.is_low_stock
                        ? `<button class="btn btn-primary btn-sm" onclick="quickOrder(${p.id}, '${p.name}')">Order Stock</button>`
                        : '-'
                    }
                </td>
            </tr>
        `).join('');

        // Low stock table
        const lowStockItems = products.filter(p => p.is_low_stock);
        const lowStockTable = document.getElementById('low-stock-table');
        const noLowStock = document.getElementById('no-low-stock');

        if (lowStockItems.length === 0) {
            lowStockTable.innerHTML = '';
            noLowStock.style.display = 'block';
        } else {
            noLowStock.style.display = 'none';
            lowStockTable.innerHTML = lowStockItems.map(p => `
                <tr>
                    <td>
                        <div class="product-info">
                            <span class="product-name">${p.name}</span>
                            <span class="product-sku">${p.sku}</span>
                        </div>
                    </td>
                    <td><span class="stock-qty low">${p.stock_quantity}</span></td>
                    <td>${p.low_stock_threshold}</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="quickOrder(${p.id}, '${p.name}')">
                            Order Stock
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        // Populate order product selector
        const orderSelect = document.getElementById('order-product');
        orderSelect.innerHTML = '<option value="">-- Select Product --</option>' +
            products.map(p => `<option value="${p.id}">${p.name} (Stock: ${p.stock_quantity})</option>`).join('');

    } catch (e) {
        console.error('Products load error:', e);
    }
}

// Load Orders
async function loadOrders() {
    try {
        const res = await fetch('/api/retailer/orders');
        const data = await res.json();
        if (!data.success) return;

        const orders = data.orders;
        const noOrders = document.getElementById('no-orders');

        // All orders
        const ordersTable = document.getElementById('orders-table');
        if (orders.length === 0) {
            ordersTable.innerHTML = '';
            noOrders.style.display = 'block';
        } else {
            noOrders.style.display = 'none';
            ordersTable.innerHTML = orders.map(o => `
                <tr>
                    <td><strong>${o.order_number}</strong></td>
                    <td>${o.product_name}</td>
                    <td>${o.quantity}</td>
                    <td><span class="badge badge-${o.status}">${o.status}</span></td>
                    <td>${formatDate(o.created_at)}</td>
                </tr>
            `).join('');
        }

        // Recent orders (max 5)
        const recentTable = document.getElementById('recent-orders-table');
        recentTable.innerHTML = orders.slice(0, 5).map(o => `
            <tr>
                <td><strong>${o.order_number}</strong></td>
                <td>${o.product_name}</td>
                <td>${o.quantity}</td>
                <td><span class="badge badge-${o.status}">${o.status}</span></td>
                <td>${formatDate(o.created_at)}</td>
            </tr>
        `).join('');

        if (orders.length === 0) {
            recentTable.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No orders yet</td></tr>';
        }

    } catch (e) {
        console.error('Orders load error:', e);
    }
}

// Quick Order
function quickOrder(productId, productName) {
    showSection('new-order');
    document.getElementById('order-product').value = productId;
    document.getElementById('order-quantity').focus();
}

// Create Order
async function createOrder(e) {
    e.preventDefault();
    try {
        const res = await fetch('/api/retailer/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_id: document.getElementById('order-product').value,
                quantity: parseInt(document.getElementById('order-quantity').value),
                notes: document.getElementById('order-notes').value
            })
        });

        const data = await res.json();

        if (data.success) {
            showToast('success', `Order ${data.orderNumber} created!`);
            document.getElementById('new-order-form').reset();
            loadOrders();
            loadDashboard();
            showSection('orders');
        } else {
            showToast('error', data.message);
        }
    } catch (e) {
        showToast('error', 'Error creating order');
    }
}

// Notifications
async function loadNotifications() {
    try {
        const res = await fetch('/api/retailer/notifications');
        const data = await res.json();
        if (!data.success) return;

        const list = document.getElementById('notif-list');
        const countEl = document.getElementById('notif-count');
        const unread = data.notifications.filter(n => !n.is_read);

        if (unread.length > 0) {
            countEl.textContent = unread.length;
            countEl.style.display = 'flex';
        } else {
            countEl.style.display = 'none';
        }

        if (data.notifications.length === 0) {
            list.innerHTML = '<div class="notif-empty">No notifications yet</div>';
            return;
        }

        list.innerHTML = data.notifications.map(n => `
            <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markNotifRead(${n.id}, this)">
                <div class="notif-title">${n.title}</div>
                <div class="notif-message">${n.message}</div>
                <div class="notif-time">${formatDate(n.created_at)}</div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Notifications error:', e);
    }
}

async function markNotifRead(id, el) {
    try {
        await fetch(`/api/retailer/notifications/${id}/read`, { method: 'PUT' });
        el.classList.remove('unread');
        loadNotifications();
    } catch (e) { /* silent */ }
}

function toggleNotifications() {
    const panel = document.getElementById('notification-panel');
    panel.classList.toggle('active');
}

// Section Navigation
function showSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const section = document.getElementById(`section-${name}`);
    if (section) section.classList.add('active');

    const nav = document.getElementById(`nav-${name}`);
    if (nav) nav.classList.add('active');

    const titles = {
        'dashboard': ['Dashboard', 'Welcome back! Here\'s your overview.'],
        'products': ['My Products', 'View your assigned products and stock levels.'],
        'orders': ['My Orders', 'Track all your order requests.'],
        'new-order': ['New Order Request', 'Request stock from inventory manager.']
    };

    if (titles[name]) {
        document.getElementById('page-title').textContent = titles[name][0];
        document.getElementById('page-subtitle').textContent = titles[name][1];
    }
}

// Logout
async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (e) {
        window.location.href = '/';
    }
}

// Helpers
function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function showToast(type, message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
