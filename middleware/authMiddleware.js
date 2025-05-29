const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Không có token' });
  }

  // ✅ SỬA ĐÚNG DÒNG NÀY: dùng biến môi trường
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token không hợp lệ' });
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role || 'user'
    };

    next();
  });
};

module.exports = authenticateToken;
