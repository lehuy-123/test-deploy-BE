const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token không hợp lệ!' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    // Truy xuất user từ DB
    const user = await User.findById(decoded.userId);

    if (!user || user.isDeleted) {
      return res.status(401).json({ message: 'User không tồn tại hoặc đã bị xóa!' });
    }

    // ⛔ KIỂM TRA CHẶN USER Ở MỌI API
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Tài khoản đã bị chặn bởi admin.' });
    }

    // Lưu thông tin user vào req để các API khác sử dụng
    req.user = {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token hết hạn hoặc không hợp lệ!' });
  }
};

module.exports = authenticateToken;
