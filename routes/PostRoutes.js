const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const authenticateToken = require('../middleware/authenticateToken');

// 📌 Lấy danh sách bài viết (lọc theo status, search, phân trang)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search = '', page = 1, status } = req.query;
    const limit = 10;
    const skip = (page - 1) * limit;

    const keyword = search
      ? {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { content: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    const filter = { ...keyword };
    if (status) filter.status = status.toLowerCase(); // ✅ đảm bảo lowercase

    const posts = await Post.find(filter)
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(filter);

    res.status(200).json({
      success: true,
      posts,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy danh sách bài viết:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy bài viết' });
  }
});

// 📌 Tạo bài viết mới
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Tiêu đề và nội dung là bắt buộc' });
    }

    const user = req.user;

    const post = new Post({
      title,
      content,
      status: 'pending', // ✅ mặc định là pending
      author: user.id
    });

    await post.save();

    res.status(201).json({
      success: true,
      message: 'Tạo bài viết thành công',
      post
    });
  } catch (error) {
    console.error('❌ Lỗi khi tạo bài viết:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi tạo bài viết' });
  }
});

// 📌 Lấy bài viết theo ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'name email');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    res.status(200).json({ success: true, post });
  } catch (error) {
    console.error('❌ Lỗi khi lấy bài viết:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy bài viết' });
  }
});

// 📌 Cập nhật trạng thái bài viết
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    const user = req.user;
    if (user.role !== 'admin' && post.author.toString() !== user.id) {
      return res.status(403).json({ success: false, message: 'Không có quyền cập nhật trạng thái' });
    }

    post.status = status.toLowerCase(); // ✅ đảm bảo lowercase
    await post.save();

    res.status(200).json({
      success: true,
      message: 'Đã cập nhật trạng thái bài viết',
      post
    });
  } catch (error) {
    console.error('❌ Lỗi cập nhật trạng thái:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật bài viết' });
  }
});

// 📌 Xoá bài viết
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    res.status(200).json({ success: true, message: 'Đã xoá bài viết' });
  } catch (error) {
    console.error('❌ Lỗi khi xoá bài viết:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi xoá bài viết' });
  }
});

module.exports = router;
