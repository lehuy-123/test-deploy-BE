const User = require('../models/User');

const checkAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Bạn không có quyền admin' });
  }
  next();
};

module.exports = checkAdmin;

