const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const checkAdmin = require('../middleware/checkAdmin');
const User = require('../models/User');
const Blog = require('../models/Blog');
const Comment = require('../models/Comment'); // Thay Tag bằng Comment

// 📊 Route thống kê dashboard





// 📊 Route thống kê dashboard
router.get('/stats', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Blog.countDocuments();
    const totalComments = await Comment.countDocuments();
    const totalViews = 0;

    // Thống kê số lượng bài viết theo tháng
    const monthlyBlogs = await Blog.aggregate([
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    // Thống kê số lượng bình luận theo tháng
    const monthlyComments = await Comment.aggregate([
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    // Thống kê số lượng người dùng theo tháng
    const monthlyUsers = await User.aggregate([
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      totalUsers,
      totalPosts,
      totalComments,
      totalViews,
      monthlyBlogs,
      monthlyComments,
      monthlyUsers // <== Đẩy về cho FE dùng
    });
  } catch (err) {
    console.error('Lỗi thống kê:', err);
    res.status(500).json({ message: 'Lỗi server thống kê' });
  }
});






// 📄 Lấy danh sách bài viết theo trạng thái (pending, rejected,...)
router.get('/posts/:status', authenticateToken, checkAdmin, async (req, res) => {
  const status = req.params.status;
  try {
    // Nếu status là "approved", trả về cả approved và draft
    let query = {};
    if (status === 'approved') {
      query.status = { $in: ['approved', 'draft'] };
    } else {
      query.status = status;
    }
    const posts = await Blog.find(query)
      .populate('userId', 'name')
      .sort({ updatedAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy bài viết' });
  }
});

// ✅ Duyệt/bỏ ẩn bài viết (status: approved)
router.put('/posts/:id/approve', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const post = await Blog.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi duyệt bài viết' });
  }
});

// ❌ Từ chối bài viết (status: rejected)
router.put('/posts/:id/reject', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const post = await Blog.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi từ chối bài viết' });
  }
});

// 🗑️ Xoá bài viết
router.delete('/posts/:id', authenticateToken, checkAdmin, async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xoá bài viết' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xoá bài viết' });
  }
});

// Ẩn bài viết (status: draft)
router.put('/posts/:id/draft', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const post = await Blog.findByIdAndUpdate(req.params.id, { status: 'draft' }, { new: true });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi ẩn bài viết' });
  }
});

module.exports = router;
