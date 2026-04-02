CREATE DATABASE IF NOT EXISTS inventory_management;
USE inventory_management;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('retailer', 'inventory', 'warehouse') NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE warehouse_stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    min_stock_level INT NOT NULL DEFAULT 10,
    last_restocked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE inventory_stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    min_stock_level INT NOT NULL DEFAULT 5,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE retailer_stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    retailer_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 3,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (retailer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_retailer_product (retailer_id, product_id)
);

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    retailer_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'processing', 'completed') NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (retailer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE warehouse_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_number VARCHAR(50) NOT NULL UNIQUE,
    order_id INT,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'shipped', 'completed') NOT NULL DEFAULT 'pending',
    notes TEXT,
    requested_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'error') NOT NULL DEFAULT 'info',
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(200) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO products (name, sku, description, category, price) VALUES
('Laptop Dell Inspiron 15', 'DELL-INS-15', 'Dell Inspiron 15 inch laptop with 8GB RAM', 'Electronics', 45999.00),
('Samsung Galaxy S24', 'SAM-GS24', 'Samsung Galaxy S24 128GB Smartphone', 'Electronics', 69999.00),
('HP Wireless Mouse', 'HP-WM-001', 'HP Wireless Mouse with USB Receiver', 'Accessories', 599.00),
('Logitech Keyboard K380', 'LOG-KB-380', 'Logitech Multi-Device Bluetooth Keyboard', 'Accessories', 2999.00),
('Canon Pixma Printer', 'CAN-PIX-01', 'Canon Pixma All-in-One Inkjet Printer', 'Peripherals', 4999.00),
('JBL Flip 6 Speaker', 'JBL-FLP-6', 'JBL Flip 6 Portable Bluetooth Speaker', 'Audio', 8999.00),
('Apple AirPods Pro', 'APL-APP-2', 'Apple AirPods Pro 2nd Generation', 'Audio', 24999.00),
('Seagate 1TB HDD', 'SEA-1TB-01', 'Seagate Barracuda 1TB External Hard Drive', 'Storage', 3499.00),
('Kingston 16GB RAM', 'KNG-16GB', 'Kingston Fury 16GB DDR4 3200MHz RAM', 'Components', 3299.00),
('TP-Link WiFi Router', 'TPL-WR-01', 'TP-Link Archer AX21 WiFi 6 Router', 'Networking', 4499.00);

INSERT INTO warehouse_stock (product_id, quantity, min_stock_level) VALUES
(1, 500, 50),
(2, 300, 30),
(3, 1000, 100),
(4, 800, 80),
(5, 200, 20),
(6, 400, 40),
(7, 250, 25),
(8, 600, 60),
(9, 700, 70),
(10, 350, 35);

INSERT INTO inventory_stock (product_id, quantity, min_stock_level) VALUES
(1, 50, 10),
(2, 30, 5),
(3, 100, 20),
(4, 80, 15),
(5, 20, 5),
(6, 40, 10),
(7, 25, 5),
(8, 60, 10),
(9, 70, 15),
(10, 35, 8);



-- Show all users
SELECT * FROM users;

-- Show all products
SELECT * FROM products;

-- Show warehouse stock
SELECT * FROM warehouse_stock;

-- Show inventory stock
SELECT * FROM inventory_stock;

-- Show retailer stock
SELECT * FROM retailer_stock;

-- Show orders
SELECT * FROM orders;

-- Show warehouse requests
SELECT * FROM warehouse_requests;

-- Show notifications
SELECT * FROM notifications;

-- Show activity logs
SELECT * FROM activity_log;