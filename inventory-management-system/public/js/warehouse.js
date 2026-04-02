// =============================================
// Warehouse Manager Dashboard JavaScript
// =============================================

let currentUser = null;

// Init
(async function init() {
    await checkAuth();
    loadDashboard();
    loadStock();
    loadRequests();
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
        if (!data.success || data.user.role !== 'warehouse') {
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
        const res = await fetch('/api/warehouse/dashboard');
        const data = await res.json();
        if (data.success) {
            document.getElementById('stat-total-products').textContent = data.stats.totalProducts;
            document.getElementById('stat-total-stock').textContent = data.stats.totalStock.toLocaleString();
            document.getElementById('stat-pending-requests').textContent = data.stats.pendingRequests;
            document.getElementById('stat-completed').textContent = data.stats.completedRequests;
        }
    } catch (e) {
        console.error('Dashboard error:', e);
    }
}

// Stock
async function loadStock() {
    try {
        const res = await fetch('/api/warehouse/stock');
        const data = await res.json();
        if (!data.success) return;

        const table = document.getElementById('stock-table');
        table.innerHTML = data.stock.map(s => `
            <tr>
                <td>
                    <div class="product-info">
                        <span class="product-name">${s.name}</span>
                    </div>
                </td>
                <td>${s.sku}</td>
                <td>${s.category || '-'}</td>
                <td><span class="stock-qty ${s.is_low_stock ? 'low' : 'ok'}">${s.quantity}</span></td>
                <td>${s.min_stock_level}</td>
                <td>${s.is_low_stock
                    ? '<span class="badge badge-low-stock">⚠️ Low</span>'
                    : '<span class="badge badge-in-stock">✅ OK</span>'
                }</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="openStockModal(${s.stock_id}, '${s.name}', ${s.quantity})">
                        ✏️ Update
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Stock error:', e);
    }
}

// Stock Modal
function openStockModal(stockId, name, qty) {
    document.getElementById('stock-id').value = stockId;
    document.getElementById('stock-product-name').value = name;
    document.getElementById('stock-quantity').value = qty;
    document.getElementById('stock-modal').classList.add('active');
}

function closeStockModal() {
    document.getElementById('stock-modal').classList.remove('active');
}

async function updateStock(e) {
    e.preventDefault();
    const stockId = document.getElementById('stock-id').value;
    const quantity = parseInt(document.getElementById('stock-quantity').value);

    try {
        const res = await fetch(`/api/warehouse/stock/${stockId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity })
        });
        const data = await res.json();
        if (data.success) {
            showToast('success', 'Stock updated!');
            closeStockModal();
            loadStock();
            loadDashboard();
        } else {
            showToast('error', data.message);
        }
    } catch (e) {
        showToast('error', 'Error updating stock');
    }
}

// Requests
async function loadRequests() {
    try {
        const res = await fetch('/api/warehouse/requests');
        const data = await res.json();
        if (!data.success) return;

        const table = document.getElementById('requests-table');
        const noReqs = document.getElementById('no-requests');

        if (data.requests.length === 0) {
            table.innerHTML = '';
            noReqs.style.display = 'block';
            return;
        }

        noReqs.style.display = 'none';
        table.innerHTML = data.requests.map(r => {
            let actions = '';
            if (r.status === 'pending') {
                actions = `
                    <div class="action-buttons">
                        <button class="btn btn-success btn-sm" onclick="approveRequest(${r.id})">✅ Approve & Ship</button>
                        <button class="btn btn-danger btn-sm" onclick="rejectRequest(${r.id})">❌ Reject</button>
                    </div>
                `;
            } else {
                actions = '-';
            }

            return `
                <tr>
                    <td><strong>${r.request_number}</strong></td>
                    <td>
                        <div class="product-info">
                            <span class="product-name">${r.product_name}</span>
                            <span class="product-sku">${r.sku}</span>
                        </div>
                    </td>
                    <td>${r.quantity}</td>
                    <td><span class="stock-qty ${(r.warehouse_stock_qty || 0) >= r.quantity ? 'ok' : 'low'}">${r.warehouse_stock_qty || 0}</span></td>
                    <td>${r.requested_by_name}</td>
                    <td><span class="badge badge-${r.status}">${r.status}</span></td>
                    <td>${actions}</td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error('Requests error:', e);
    }
}

// Approve request
async function approveRequest(requestId) {
    if (!confirm('Approve this request and ship stock to inventory?')) return;
    try {
        const res = await fetch(`/api/warehouse/requests/${requestId}/approve`, { method: 'PUT' });
        const data = await res.json();
        if (data.success) {
            showToast('success', data.message);
            loadRequests();
            loadStock();
            loadDashboard();
        } else {
            showToast('error', data.message);
            if (data.availableStock !== undefined) {
                showToast('warning', `Available stock: ${data.availableStock}`);
            }
        }
    } catch (e) {
        showToast('error', 'Error approving request');
    }
}

// Reject request
async function rejectRequest(requestId) {
    const notes = prompt('Reason for rejection (optional):');
    if (notes === null) return;
    try {
        const res = await fetch(`/api/warehouse/requests/${requestId}/reject`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes })
        });
        const data = await res.json();
        if (data.success) {
            showToast('success', 'Request rejected');
            loadRequests();
            loadDashboard();
        } else {
            showToast('error', data.message);
        }
    } catch (e) {
        showToast('error', 'Error rejecting request');
    }
}

// Notifications
async function loadNotifications() {
    try {
        const res = await fetch('/api/warehouse/notifications');
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
        'requests': 'nav-requests'
    };

    const nav = document.getElementById(navMap[name]);
    if (nav) nav.classList.add('active');

    const titles = {
        'dashboard': ['Dashboard', 'Warehouse management overview'],
        'stock': ['Warehouse Stock', 'Main storage stock levels'],
        'requests': ['Incoming Requests', 'Stock requests from inventory manager']
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
