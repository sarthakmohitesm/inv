// =============================================
// Inventory Manager Dashboard JavaScript
// =============================================

let currentUser = null;

// Init
(async function init() {
    await checkAuth();
    loadDashboard();
    loadStock();
    loadOrders();
    loadWarehouseRequests();
    loadProducts();
    loadNotifications();
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
        if (!data.success || data.user.role !== 'inventory') {
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

// Dashboard
async function loadDashboard() {
    try {
        const res = await fetch('/api/inventory/dashboard');
        const data = await res.json();
        if (data.success) {
            document.getElementById('stat-total-products').textContent = data.stats.totalProducts;
            document.getElementById('stat-total-stock').textContent = data.stats.totalStock.toLocaleString();
            document.getElementById('stat-pending-orders').textContent = data.stats.pendingOrders;
            document.getElementById('stat-wh-requests').textContent = data.stats.warehouseRequests;
        }
    } catch (e) {
        console.error('Dashboard error:', e);
    }
}

// Stock
async function loadStock() {
    try {
        const res = await fetch('/api/inventory/stock');
        const data = await res.json();
        if (!data.success) return;

        const table = document.getElementById('stock-table');
        table.innerHTML = data.stock.map(s => `
            <tr>
                <td>
                    <div class="product-info">
                        <span class="product-name">${s.name}</span>
                        <span class="product-sku">${s.sku}</span>
                    </div>
                </td>
                <td>${s.category || '-'}</td>
                <td><span class="stock-qty ${s.is_low_stock ? 'low' : 'ok'}">${s.quantity}</span></td>
                <td>${s.min_stock_level}</td>
                <td>${s.is_low_stock
                    ? '<span class="badge badge-low-stock">⚠️ Low</span>'
                    : '<span class="badge badge-in-stock">✅ OK</span>'
                }</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="openWhRequestModal(${s.id}, '${s.name}', null)">
                        🏭 Request Stock
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Stock error:', e);
    }
}

// Orders
async function loadOrders() {
    try {
        const res = await fetch('/api/inventory/orders');
        const data = await res.json();
        if (!data.success) return;

        const table = document.getElementById('orders-table');
        const noOrders = document.getElementById('no-orders');

        if (data.orders.length === 0) {
            table.innerHTML = '';
            noOrders.style.display = 'block';
            return;
        }

        noOrders.style.display = 'none';
        table.innerHTML = data.orders.map(o => {
            let actions = '';
            if (o.status === 'pending') {
                actions = `
                    <div class="action-buttons">
                        <button class="btn btn-success btn-sm" onclick="approveOrder(${o.id})">✅ Approve</button>
                        <button class="btn btn-danger btn-sm" onclick="rejectOrder(${o.id})">❌ Reject</button>
                        <button class="btn btn-warning btn-sm" onclick="openWhRequestModal(${o.product_id}, '${o.product_name}', ${o.id})">🏭 WH</button>
                    </div>
                `;
            } else {
                actions = `<span class="badge badge-${o.status}">${o.status}</span>`;
            }

            return `
                <tr>
                    <td><strong>${o.order_number}</strong></td>
                    <td>${o.retailer_name}</td>
                    <td>${o.product_name}</td>
                    <td>${o.quantity}</td>
                    <td><span class="stock-qty ${(o.available_stock || 0) >= o.quantity ? 'ok' : 'low'}">${o.available_stock || 0}</span></td>
                    <td><span class="badge badge-${o.status}">${o.status}</span></td>
                    <td>${actions}</td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error('Orders error:', e);
    }
}

// Approve order
async function approveOrder(orderId) {
    if (!confirm('Approve this order and transfer stock to retailer?')) return;
    try {
        const res = await fetch(`/api/inventory/orders/${orderId}/approve`, { method: 'PUT' });
        const data = await res.json();
        if (data.success) {
            showToast('success', data.message);
            loadOrders();
            loadStock();
            loadDashboard();
        } else {
            showToast('error', data.message);
            if (data.availableStock !== undefined) {
                showToast('warning', `Available stock: ${data.availableStock}. Consider requesting from warehouse.`);
            }
        }
    } catch (e) {
        showToast('error', 'Error approving order');
    }
}

// Reject order
async function rejectOrder(orderId) {
    const notes = prompt('Reason for rejection (optional):');
    if (notes === null) return;
    try {
        const res = await fetch(`/api/inventory/orders/${orderId}/reject`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes })
        });
        const data = await res.json();
        if (data.success) {
            showToast('success', 'Order rejected');
            loadOrders();
            loadDashboard();
        } else {
            showToast('error', data.message);
        }
    } catch (e) {
        showToast('error', 'Error rejecting order');
    }
}

// Warehouse Request Modal
function openWhRequestModal(productId, productName, orderId) {
    document.getElementById('wh-product-id').value = productId;
    document.getElementById('wh-product-name').value = productName;
    document.getElementById('wh-order-id').value = orderId || '';
    document.getElementById('wh-quantity').value = '';
    document.getElementById('wh-notes').value = '';
    document.getElementById('wh-request-modal').classList.add('active');
}

function closeWhRequestModal() {
    document.getElementById('wh-request-modal').classList.remove('active');
}

async function sendWarehouseRequest(e) {
    e.preventDefault();
    try {
        const res = await fetch('/api/inventory/warehouse-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_id: document.getElementById('wh-product-id').value,
                quantity: parseInt(document.getElementById('wh-quantity').value),
                order_id: document.getElementById('wh-order-id').value || null,
                notes: document.getElementById('wh-notes').value
            })
        });
        const data = await res.json();
        if (data.success) {
            showToast('success', `Warehouse request ${data.requestNumber} sent!`);
            closeWhRequestModal();
            loadWarehouseRequests();
            loadOrders();
            loadDashboard();
        } else {
            showToast('error', data.message);
        }
    } catch (e) {
        showToast('error', 'Error sending request');
    }
}

// Warehouse Requests List
async function loadWarehouseRequests() {
    try {
        const res = await fetch('/api/inventory/warehouse-requests');
        const data = await res.json();
        if (!data.success) return;

        const table = document.getElementById('wh-requests-table');
        const noReqs = document.getElementById('no-wh-requests');

        if (data.requests.length === 0) {
            table.innerHTML = '';
            noReqs.style.display = 'block';
            return;
        }

        noReqs.style.display = 'none';
        table.innerHTML = data.requests.map(r => `
            <tr>
                <td><strong>${r.request_number}</strong></td>
                <td>${r.product_name}</td>
                <td>${r.quantity}</td>
                <td><span class="badge badge-${r.status}">${r.status}</span></td>
                <td>${formatDate(r.created_at)}</td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('WH requests error:', e);
    }
}

// Products CRUD
async function loadProducts() {
    try {
        const res = await fetch('/api/inventory/stock');
        const data = await res.json();
        if (!data.success) return;

        const table = document.getElementById('products-table');
        table.innerHTML = data.stock.map(s => `
            <tr>
                <td>
                    <div class="product-info">
                        <span class="product-name">${s.name}</span>
                    </div>
                </td>
                <td>${s.sku}</td>
                <td>${s.category || '-'}</td>
                <td>₹${Number(s.price).toLocaleString()}</td>
                <td><span class="stock-qty ${s.is_low_stock ? 'low' : 'ok'}">${s.quantity}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-outline btn-sm" onclick="editProduct(${s.id}, '${s.name}', '${s.sku}', '${s.category || ''}', ${s.price}, '${s.description || ''}')">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${s.id})">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Products error:', e);
    }
}

function openAddProductModal() {
    document.getElementById('product-id').value = '';
    document.getElementById('product-name').value = '';
    document.getElementById('product-sku').value = '';
    document.getElementById('product-category').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-description').value = '';
    document.getElementById('product-modal-title').textContent = 'Add Product';
    document.getElementById('product-modal').classList.add('active');
}

function editProduct(id, name, sku, category, price, description) {
    document.getElementById('product-id').value = id;
    document.getElementById('product-name').value = name;
    document.getElementById('product-sku').value = sku;
    document.getElementById('product-category').value = category;
    document.getElementById('product-price').value = price;
    document.getElementById('product-description').value = description;
    document.getElementById('product-modal-title').textContent = 'Edit Product';
    document.getElementById('product-modal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('active');
}

async function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('product-id').value;
    const productData = {
        name: document.getElementById('product-name').value,
        sku: document.getElementById('product-sku').value,
        category: document.getElementById('product-category').value,
        price: parseFloat(document.getElementById('product-price').value) || 0,
        description: document.getElementById('product-description').value
    };

    try {
        let res;
        if (id) {
            res = await fetch(`/api/inventory/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });
        } else {
            res = await fetch('/api/inventory/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });
        }

        const data = await res.json();
        if (data.success) {
            showToast('success', data.message);
            closeProductModal();
            loadProducts();
            loadStock();
            loadDashboard();
        } else {
            showToast('error', data.message);
        }
    } catch (e) {
        showToast('error', 'Error saving product');
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product? This cannot be undone.')) return;
    try {
        const res = await fetch(`/api/inventory/products/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showToast('success', 'Product deleted');
            loadProducts();
            loadStock();
            loadDashboard();
        } else {
            showToast('error', data.message);
        }
    } catch (e) {
        showToast('error', 'Error deleting product');
    }
}

// Notifications
async function loadNotifications() {
    try {
        const res = await fetch('/api/inventory/notifications');
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
    document.getElementById('notification-panel').classList.toggle('active');
}

// Section Navigation
function showSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const section = document.getElementById(`section-${name}`);
    if (section) section.classList.add('active');

    const navMap = {
        'dashboard': 'nav-dashboard',
        'stock': 'nav-stock',
        'orders': 'nav-orders',
        'warehouse-requests': 'nav-wh-requests',
        'products': 'nav-products'
    };

    const nav = document.getElementById(navMap[name]);
    if (nav) nav.classList.add('active');

    const titles = {
        'dashboard': ['Dashboard', 'Inventory management overview'],
        'stock': ['Inventory Stock', 'Current stock levels in inventory'],
        'orders': ['Retailer Orders', 'Orders received from retailers'],
        'warehouse-requests': ['Warehouse Requests', 'Stock requests sent to warehouse'],
        'products': ['Product Management', 'Add, edit, or delete products']
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
    } catch (e) { /* silent */ }
    window.location.href = '/';
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
