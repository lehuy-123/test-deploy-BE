const express = require('express');
const router = express.Router();

const Comment = require('../models/Comment');
const Blog = require('../models/Blog');
const authenticateToken = require('../middleware/authenticateToken'); // ✅ Dùng đúng middleware này

// [1] Tạo bình luận mới vào collection 'comments'
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { content, blogId } = req.body;
    if (!content || !blogId) {
      return res.status(400).json({ success: false, message: 'Thiếu nội dung hoặc blogId' });
    }

    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    // Log ra để kiểm tra!
    console.log('req.user:', req.user);

    const comment = new Comment({
      content,
      blog: blogId,
      user: req.user.userId
    });
    await comment.save();

    res.status(201).json({ success: true, message: 'Bình luận thành công', comment });
  } catch (error) {
    next(error);
  }
});

// [2] Lấy tất cả bình luận (chỉ admin)
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
    }
    const comments = await Comment.find({})
      .populate('user', 'name email')
      .populate('blog', 'title')
      .sort({ createdAt: -1 });
    res.status(200).json(comments);
  } catch (error) {
    next(error);
  }
});

// [3] Lấy bình luận theo bài viết
router.get('/blog/:blogId', async (req, res, next) => {
  try {
    const comments = await Comment.find({ blog: req.params.blogId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, comments });
  } catch (error) {
    next(error);
  }
});

// [4] Xoá bình luận (admin hoặc chủ sở hữu)
// [4] Xoá bình luận (admin hoặc chủ sở hữu)
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận' });
    }

    // LOG kiểm tra (có thể bỏ sau khi test xong)
    console.log('Comment.user:', comment.user?.toString(), 'Req.user.userId:', req.user.userId.toString());

    const isOwner = comment.user && comment.user.toString() === req.user.userId.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xoá bình luận này' });
    }
    await comment.deleteOne();
    res.status(200).json({ success: true, message: 'Xoá bình luận thành công' });
  } catch (error) {
    next(error);
  }
});


module.exports = router;
