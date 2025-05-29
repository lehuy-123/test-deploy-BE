const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const User = require('../models/User');
const fbAuth = require('../middleware/fbAuth');
const authenticateToken = require('../middleware/authMiddleware');
const checkAdmin = require('../middleware/checkAdmin');

// Cấu hình lưu ảnh avatar
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// GET /api/users - Lấy danh sách người dùng (admin dashboard)
router.get('/', authenticateToken, checkAdmin, async (req, res, next) => {
  try {
    const keyword = req.query.search
      ? {
          $or: [
            { name: { $regex: req.query.search, $options: 'i' } },
            { email: { $regex: req.query.search, $options: 'i' } },
          ],
        }
      : {};

    const page = Number(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // Chỉ lấy user chưa bị xóa mềm
    const users = await User.find({ ...keyword, isDeleted: { $ne: true } }).skip(skip).limit(limit);
    const total = await User.countDocuments({ ...keyword, isDeleted: { $ne: true } });

    res.status(200).json({
      success: true,
      users,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id - Lấy thông tin người dùng (không cần check admin)
router.get('/:id', fbAuth, async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ' });
    }

    // Không lấy user đã xóa
    const user = await User.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id - Cập nhật thông tin người dùng (theo fbAuth, tự sửa mình)
router.put('/:id', fbAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ' });
    }

    // Chỉ sửa user chưa bị xóa
    const currentUser = await User.findOne({ fbId: req.user.fbId, isDeleted: { $ne: true } });

    if (!currentUser || currentUser._id.toString() !== id.toString()) {
      return res.status(403).json({ success: false, message: 'Không có quyền chỉnh sửa' });
    }

    currentUser.name = name || currentUser.name;
    currentUser.email = email || currentUser.email;
    await currentUser.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật hồ sơ thành công',
      user: currentUser,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/avatar - Upload avatar
router.post('/avatar', fbAuth, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Không có ảnh được gửi' });
    }

    // Không sửa user đã xóa
    const currentUser = await User.findOne({ fbId: req.user.fbId, isDeleted: { $ne: true } });
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    currentUser.avatar = `/uploads/${req.file.filename}`;
    await currentUser.save();

    res.status(200).json({
      success: true,
      message: 'Upload avatar thành công',
      avatarUrl: currentUser.avatar,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/block - Chặn/mở chặn người dùng
router.patch('/:id/block', authenticateToken, checkAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.userId === id) {
      return res.status(403).json({ message: 'Không thể chặn chính tài khoản của bạn' });
    }

    // Chỉ chặn user chưa bị xóa
    const user = await User.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Không thể chặn tài khoản admin khác!' });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.status(200).json({
      success: true,
      message: user.isBlocked ? 'Người dùng đã bị chặn' : 'Đã mở chặn người dùng',
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id - Xoá mềm user (soft delete)
router.delete('/:id', authenticateToken, checkAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.userId === id) {
      return res.status(403).json({ message: 'Không thể xoá tài khoản của chính bạn' });
    }

    // Chỉ xóa mềm user chưa bị xóa
    const user = await User.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Không thể xoá tài khoản admin khác!' });
    }

    // XÓA MỀM: chỉ update isDeleted: true
    user.isDeleted = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Xoá (mềm) người dùng thành công',
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/info - Admin cập nhật tên/email người dùng
router.patch('/:id/info', authenticateToken, checkAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    if (req.user.userId === id) {
      return res.status(403).json({ message: 'Không thể chỉnh sửa hồ sơ chính bạn tại đây' });
    }

    if (!name && !email) {
      return res.status(400).json({ message: 'Không có dữ liệu cập nhật' });
    }

    // Chỉ sửa user chưa bị xóa
    const user = await User.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    user.name = name || user.name;
    user.email = email || user.email;

    await user.save();

    res.status(200).json({ success: true, message: 'Đã cập nhật thông tin người dùng' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/role - Thay đổi vai trò user <=> admin
router.patch('/:id/role', authenticateToken, checkAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (req.user.userId === id) {
      return res.status(403).json({ message: 'Không thể thay đổi vai trò của chính bạn' });
    }

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Vai trò không hợp lệ' });
    }

    // Chỉ đổi role user chưa bị xóa
    const user = await User.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Đã cập nhật vai trò thành "${role}"`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
