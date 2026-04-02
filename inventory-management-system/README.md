# 📦 InvenTrack — Inventory Management System

A full-stack **Inventory Management System** built with HTML/CSS/JavaScript on the frontend and Node.js/Express/MySQL on the backend. It features **3 user roles** (Retailer, Inventory Manager, Warehouse Manager) with separate dashboards, an order workflow system, stock management, and real-time notifications.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Database Setup](#-database-setup)
- [Installation & Running](#-installation--running)
- [User Roles & Access](#-user-roles--access)
- [System Workflow](#-system-workflow)
- [API Endpoints](#-api-endpoints)
- [Order Statuses](#-order-statuses)
- [Screenshots](#-screenshots)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Separate login & registration for 3 roles with hashed passwords (bcrypt) |
| 📊 **Role-based Dashboards** | Each role gets a unique dashboard with relevant stats and actions |
| 📦 **Product Management** | Full CRUD (Create, Read, Update, Delete) for products |
| 📉 **Low Stock Alerts** | Retailers see real-time alerts when stock drops below threshold |
| 🛒 **Order System** | Retailers create orders → Inventory Manager approves/rejects |
| 🏭 **Warehouse Requests** | Inventory Manager can request stock from Warehouse when inventory is low |
| 🔔 **Notifications** | Real-time notification system for order updates and status changes |
| 📋 **Order Tracking** | Track orders through: Pending → Approved → Processing → Completed |
| 🎨 **Modern UI** | Dark glassmorphism theme with animations, responsive design |
| 🔄 **Auto-refresh** | Dashboards auto-refresh every 30 seconds for live updates |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3 (Vanilla), JavaScript (ES6+) |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL |
| **Auth** | bcryptjs (password hashing), express-session (sessions) |
| **DB Driver** | mysql2 (promise-based) |
| **Dev Tool** | nodemon (auto-restart on file changes) |
| **Design** | Inter font (Google Fonts), Glassmorphism, Dark theme |

---

## 📁 Project Structure

```
inventory-management-system/
│
├── server.js                        # Express server entry point (Port 3000)
├── package.json                     # Dependencies & scripts
├── SQL_Queries.md                   # All database table creation queries
├── README.md                        # This file
│
├── config/
│   └── db.js                        # MySQL connection pool configuration
│
├── middleware/
│   └── auth.js                      # Authentication & role-based access middleware
│
├── routes/
│   ├── auth.js                      # POST /api/auth/login, register, logout, GET /me
│   ├── retailer.js                  # Retailer APIs (products, orders, notifications)
│   ├── inventory.js                 # Inventory APIs (stock, orders, warehouse requests, CRUD)
│   └── warehouse.js                 # Warehouse APIs (stock, requests, approve/reject)
│
└── public/                          # Static frontend files
    ├── index.html                   # Login & Registration page
    ├── retailer-dashboard.html      # Retailer Dashboard
    ├── inventory-dashboard.html     # Inventory Manager Dashboard
    ├── warehouse-dashboard.html     # Warehouse Manager Dashboard
    │
    ├── css/
    │   └── style.css                # Complete design system & styles
    │
    └── js/
        ├── auth.js                  # Login/Register page logic
        ├── retailer.js              # Retailer dashboard logic
        ├── inventory.js             # Inventory dashboard logic
        └── warehouse.js             # Warehouse dashboard logic
```

---

## ⚙ Prerequisites

Make sure you have the following installed on your system:

1. **Node.js** (v16 or higher) — [Download here](https://nodejs.org/)
2. **MySQL Server** (v8.0+) — [Download here](https://dev.mysql.com/downloads/mysql/)
3. **MySQL Workbench** (optional, for GUI) — [Download here](https://dev.mysql.com/downloads/workbench/)

Verify installation:
```bash
node -v       # Should show v16+ 
npm -v        # Should show 8+
mysql --version   # Should show MySQL 8+
```

---

## 🗄 Database Setup

### Step 1: Open MySQL Workbench

Connect with:
| Property | Value |
|----------|-------|
| Host | `localhost` |
| Port | `3306` |
| User | `root` |
| Password | `Pass@123` |

### Step 2: Run the SQL Queries

Open the file `SQL_Queries.md` and run **ALL queries** in order in MySQL Workbench:

1. **Create database** — `inventory_management`
2. **Create tables** (10 tables):
   - `users` — stores all user accounts with roles
   - `products` — product catalog
   - `warehouse_stock` — main warehouse storage quantities
   - `inventory_stock` — inventory manager's stock levels
   - `retailer_stock` — stock assigned to each retailer
   - `orders` — retailer order requests
   - `warehouse_requests` — inventory-to-warehouse stock requests
   - `notifications` — user notification messages
   - `activity_log` — system activity tracking
3. **Insert sample data** — 10 products, warehouse stock, and inventory stock

> ⚠️ **Important:** You must run the database setup BEFORE starting the server, otherwise the app won't work.

---

## 🚀 Installation & Running

### Step 1: Clone the Repository (if applicable)

```bash
git clone https://github.com/DARSHAN120806/inventory_management_system.git
cd inventory_management_system
```

Or navigate to the project folder:
```bash
cd D:\Darshan\inventory-management-system
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs: `express`, `mysql2`, `bcryptjs`, `express-session`, `cors`, `nodemon`

### Step 3: Start the Server

**Development mode** (auto-restarts on file changes):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

You should see:
```
🚀 Inventory Management System running at http://localhost:3000
📦 Server started on port 3000
✅ MySQL Database connected successfully
```

### Step 4: Open in Browser

```
http://localhost:3000
```

### Step 5: Register Users

Register at least one user for each role to test the full workflow:

| Role | Suggested Email | Password |
|------|----------------|----------|
| Retailer | `retailer@test.com` | `pass123` |
| Inventory Manager | `inventory@test.com` | `pass123` |
| Warehouse Manager | `warehouse@test.com` | `pass123` |

---

## 👤 User Roles & Access

### 🛒 Retailer
- **Dashboard**: View total products, low stock alerts, pending orders, completed orders
- **My Products**: See all assigned products with current stock levels and status
- **Low Stock Alerts**: Automatic alerts when stock quantity ≤ threshold (default: 3)
- **New Order Request**: Request stock from Inventory Manager
- **My Orders**: Track all order requests and their statuses
- **Notifications**: Receive updates when orders are approved/rejected/completed

### 📦 Inventory Manager
- **Dashboard**: Total products, total stock, pending retailer orders, warehouse requests
- **Inventory Stock**: View all product stock levels in inventory
- **Retailer Orders**: View and process (Approve/Reject) orders from retailers
- **Warehouse Requests**: Send & track stock requests to Warehouse Manager
- **Product Management**: Full CRUD — Add, Edit, Delete products
- **Order Logic**:
  - If inventory stock ≥ order quantity → **Approve** (auto-transfers stock to retailer)
  - If inventory stock < order quantity → Send **Warehouse Request**

### 🏭 Warehouse Manager
- **Dashboard**: Total products, total stock units, pending requests, completed requests
- **Warehouse Stock**: View and **update** main storage quantities
- **Incoming Requests**: View requests from Inventory Manager
- **Approve & Ship**: Deduct from warehouse stock → Add to inventory stock
- **Auto-fulfill**: If approved request is linked to a retailer order and inventory now has enough stock, the system **automatically fulfills** the retailer's order

---

## 🔄 System Workflow

### Complete Order Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        ORDER FLOW                                │
│                                                                  │
│  🛒 RETAILER                                                    │
│  │  Sees low stock → Creates Order Request                      │
│  │                                                              │
│  ▼                                                              │
│  📦 INVENTORY MANAGER                                           │
│  │  Receives notification → Reviews order                       │
│  │                                                              │
│  ├── IF stock available ──→ ✅ APPROVE                          │
│  │   (Deducts from inventory, adds to retailer)                 │
│  │   → Retailer gets "Order Completed" notification             │
│  │                                                              │
│  ├── IF stock NOT available ──→ 🏭 WAREHOUSE REQUEST            │
│  │   → Order status changes to "Processing"                     │
│  │                                                              │
│  ▼                                                              │
│  🏭 WAREHOUSE MANAGER                                           │
│  │  Receives notification → Reviews request                     │
│  │                                                              │
│  ├── ✅ APPROVE & SHIP                                          │
│  │   (Deducts from warehouse, adds to inventory)                │
│  │   → System auto-fulfills linked retailer order               │
│  │   → Retailer gets "Order Completed" notification             │
│  │                                                              │
│  └── ❌ REJECT                                                  │
│      → Inventory Manager gets rejection notification            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Example Walkthrough

1. **Rahul (Retailer)** sees Apple AirPods Pro has 0 stock (below threshold of 3)
2. Rahul creates an order request for **20 units** of AirPods Pro
3. **Amit (Inventory Manager)** gets a notification: "New order from Rahul"
4. Amit sees inventory only has 25 AirPods → He **approves** the order
5. System automatically: deducts 20 from inventory stock, adds 20 to Rahul's stock
6. Rahul receives notification: "Order Completed!"
7. Now if inventory stock is getting low, Amit sends a **Warehouse Request** for 100 units
8. **Suresh (Warehouse Manager)** gets notification, approves and ships 100 units
9. Inventory stock is replenished

---

## 🔗 API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current logged-in user |
| POST | `/api/auth/logout` | Logout user |

### Retailer (`/api/retailer`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/retailer/dashboard` | Get retailer dashboard stats |
| GET | `/api/retailer/products` | Get retailer's products with stock |
| POST | `/api/retailer/orders` | Create new order request |
| GET | `/api/retailer/orders` | Get all retailer orders |
| GET | `/api/retailer/notifications` | Get notifications |
| PUT | `/api/retailer/notifications/:id/read` | Mark notification as read |

### Inventory Manager (`/api/inventory`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory/dashboard` | Dashboard stats |
| GET | `/api/inventory/stock` | All inventory stock levels |
| GET | `/api/inventory/orders` | All retailer orders |
| PUT | `/api/inventory/orders/:id/approve` | Approve & fulfill order |
| PUT | `/api/inventory/orders/:id/reject` | Reject order |
| POST | `/api/inventory/warehouse-request` | Request stock from warehouse |
| GET | `/api/inventory/warehouse-requests` | View all warehouse requests |
| POST | `/api/inventory/products` | Add new product |
| PUT | `/api/inventory/products/:id` | Update product |
| DELETE | `/api/inventory/products/:id` | Delete product |

### Warehouse Manager (`/api/warehouse`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/warehouse/dashboard` | Dashboard stats |
| GET | `/api/warehouse/stock` | All warehouse stock |
| PUT | `/api/warehouse/stock/:id` | Update stock quantity |
| GET | `/api/warehouse/requests` | Incoming requests |
| PUT | `/api/warehouse/requests/:id/approve` | Approve & ship stock |
| PUT | `/api/warehouse/requests/:id/reject` | Reject request |

---

## 📊 Order Statuses

| Status | Meaning | Used In |
|--------|---------|---------|
| `pending` | Awaiting review by manager | Orders, Warehouse Requests |
| `approved` | Approved by manager | Orders, Warehouse Requests |
| `processing` | Waiting for warehouse stock to arrive | Orders |
| `completed` | Fully fulfilled, stock transferred | Orders, Warehouse Requests |
| `rejected` | Denied by manager with optional reason | Orders, Warehouse Requests |

---

## 🖼 Screenshots

### Login Page
- Beautiful dark glassmorphism card
- Sign In / Sign Up tabbed forms
- Role selector (Retailer, Inventory, Warehouse)

### Retailer Dashboard
- Stats cards: Total Products, Low Stock, Pending Orders, Completed
- Low Stock Alerts table with "Order Stock" buttons
- Products list with stock levels and status badges
- Order tracking with status indicators

### Inventory Dashboard
- Stock management table
- Pending retailer orders with Approve/Reject/Warehouse Request actions
- Product CRUD (Add/Edit/Delete)
- Warehouse request tracking

### Warehouse Dashboard
- Warehouse stock levels with Update buttons
- Incoming requests from Inventory with Approve/Reject actions
- Dashboard stats overview

---

## ❗ Troubleshooting

### "EADDRINUSE: address already in use :::3000"
Another instance is already running on port 3000. Kill it first:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or simply close the other terminal running the server
```

### "Cannot find module 'express'"
You forgot to install dependencies:
```bash
cd D:\Darshan\inventory-management-system
npm install
```

### "ER_ACCESS_DENIED_ERROR"
MySQL password mismatch. Open `config/db.js` and update the password to match your MySQL root password.

### "ER_BAD_DB_ERROR"
Database doesn't exist. Run the `CREATE DATABASE inventory_management;` query in MySQL Workbench first.

### "npm run dev" shows "Missing script: dev"
You are in the wrong directory. Make sure you are inside the project folder:
```bash
cd D:\Darshan\inventory-management-system
npm run dev
```

---

## 📄 License

This project is for educational purposes.

---

## 👨‍💻 Author

**Darshan**

---

> **Quick Start:** Set up MySQL → Run SQL queries → `npm install` → `npm run dev` → Open `http://localhost:3000`
