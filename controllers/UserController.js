const User = require('../models/User');

// 📌 GET /api/users?search=&page=
exports.getAllUsers = async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 5;

    const query = {
      isDeleted: { $ne: true }, // Chỉ lấy user chưa bị xóa
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    };

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      users,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách người dùng' });
  }
};

// 📌 PATCH /api/users/:id/block
exports.toggleUserBlock = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({ message: user.isBlocked ? 'Đã chặn người dùng' : 'Đã mở chặn người dùng' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi chặn/mở chặn người dùng' });
  }
};

// 📌 DELETE /api/users/:id (soft delete)
exports.deleteUser = async (req, res) => {
  try {
    // Chỉ set isDeleted: true, KHÔNG xóa vật lý
    const updated = await User.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { isDeleted: true },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    res.json({ message: 'Đã xoá (mềm) người dùng thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi xoá người dùng' });
  }
};

// (Optional) Khôi phục user đã xóa
exports.restoreUser = async (req, res) => {
  try {
    const updated = await User.findOneAndUpdate(
      { _id: req.params.id, isDeleted: true },
      { isDeleted: false },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Không tìm thấy user đã xoá.' });

    res.json({ message: 'Đã khôi phục user thành công!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi khôi phục user.' });
  }
};
