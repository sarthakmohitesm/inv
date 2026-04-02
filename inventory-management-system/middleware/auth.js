// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(401).json({ success: false, message: 'Please login first' });
}

// Middleware to check specific role
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: 'Please login first' });
        }
        if (!roles.includes(req.session.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
}

module.exports = { isAuthenticated, requireRole };
