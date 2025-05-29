const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');

// ✅ Đăng nhập với Facebook: POST /api/auth/facebook
router.post('/facebook', async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'Thiếu accessToken' });
    }

    // ✅ Gọi Facebook Graph API để lấy thông tin user
    const fbRes = await axios.get(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`);
    const fbUser = fbRes.data;

    if (!fbUser || !fbUser.id) {
      return res.status(403).json({ success: false, message: 'Token Facebook không hợp lệ' });
    }

    // ✅ Kiểm tra user đã tồn tại trong MongoDB chưa
    let user = await User.findOne({ fbId: fbUser.id });

    if (!user) {
      user = new User({
        fbId: fbUser.id,
        name: fbUser.name,
        email: fbUser.email || '',
        avatar: '',
      });
      await user.save();
    }

    // ✅ Tạo JWT token từ _id MongoDB
    const token = jwt.sign({ userId: user._id }, 'secret_key_blog_app', { expiresIn: '7d' });

    res.status(200).json({
      success: true,
      message: 'Đăng nhập Facebook thành công',
      token,
      user,
    });
  } catch (err) {
    console.error('❌ Lỗi /api/auth/facebook:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
});

module.exports = router;
