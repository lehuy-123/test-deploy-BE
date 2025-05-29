const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Tạo JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Đăng ký tài khoản
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Kiểm tra email đã tồn tại chưa (chỉ user chưa bị xóa)
    const existedUser = await User.findOne({ email, isDeleted: { $ne: true } });
    if (existedUser) {
      return res.status(400).json({ success: false, message: 'Email đã được sử dụng' });
    }

    // Hash password trước khi lưu
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: 'user', // Có thể điều chỉnh role nếu cần
      isBlocked: false,
      isDeleted: false
    });

    await newUser.save();

    const token = generateToken(newUser);
    res.status(201).json({ 
      success: true, 
      message: 'Đăng ký thành công', 
      token, 
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar,
        role: newUser.role,
        isBlocked: newUser.isBlocked,
        isDeleted: newUser.isDeleted
      }
    });
  } catch (err) {
    console.error('Đăng ký thất bại:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Đăng nhập tài khoản thường (email/password)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Chỉ lấy user chưa bị xóa
    const user = await User.findOne({ email, isDeleted: { $ne: true } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    // Kiểm tra tài khoản bị chặn
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Tài khoản đã bị chặn bởi admin.' });
    }

    // Kiểm tra tài khoản đã bị xóa
    if (user.isDeleted) {
      return res.status(403).json({ success: false, message: 'Tài khoản đã bị xóa.' });
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Sai mật khẩu' });
    }

    const token = generateToken(user);
    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        isBlocked: user.isBlocked,
        isDeleted: user.isDeleted
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
