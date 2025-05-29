const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

// Middleware kiểm tra token
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Không có token' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token không hợp lệ' });
    }
    req.user = decoded;
    next();
  });
};

// Cấu hình lưu ảnh avatar
const multer = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Thư mục lưu avatar
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// Lấy thông tin user hiện tại
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }
    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (err) {
    console.error('❌ Lỗi /api/auth/me:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
});

// Đăng nhập Facebook
router.post('/facebook', async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'Thiếu access token' });
    }

    const fbRes = await axios.get(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`);
    const fbUser = fbRes.data;

    if (!fbUser || !fbUser.id) {
      return res.status(403).json({ success: false, message: 'Token không hợp lệ' });
    }

    let user = await User.findOne({ facebookId: fbUser.id });
    if (!user) {
      user = await User.create({
        facebookId: fbUser.id,
        name: fbUser.name,
        email: fbUser.email || '',
        provider: 'facebook',
        role: 'user'
      });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role || 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role || 'user'
      }
    });
  } catch (err) {
    console.error('❌ Lỗi /api/auth/facebook:', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
});

// Đăng ký user thường
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email đã tồn tại.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      provider: 'local',
      role: 'user'
    });

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error('❌ Lỗi /api/auth/register:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
});








// Đăng nhập user thường – CHẶN login khi isBlocked: true
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu.' });
    }

    const user = await User.findOne({ email, provider: 'local' });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    // BỔ SUNG KIỂM TRA CHẶN Ở ĐÂY:
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Tài khoản đã bị chặn bởi admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu không đúng.' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role || 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role || 'user',
        isBlocked: user.isBlocked
      }
    });
  } catch (err) {
    console.error('❌ Lỗi /api/auth/login:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
});


// Cập nhật thông tin user
router.put('/update-profile', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.userId;
    let avatar = req.file ? `/uploads/${req.file.filename}` : undefined;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Tên và email là bắt buộc.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, email, ...(avatar && { avatar }) },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin thành công.',
      data: updatedUser
    });
  } catch (err) {
    console.error('❌ Lỗi /api/auth/update-profile:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
});





module.exports = router;