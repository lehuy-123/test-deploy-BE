const Comment = require('../models/Comment');
const Blog = require('../models/Blog');
const User = require('../models/User');

// Lấy tất cả bình luận (kèm blog & user), chỉ dành cho admin
exports.getAllComments = async (req, res) => {
  try {
    const comments = await Comment.find({})
      .populate('user', 'name email')
      .populate('blog', 'title')    // <-- Đổi 'post' thành 'blog'
      .sort({ createdAt: -1 });
    res.status(200).json(comments);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách bình luận', error: err.message });
  }
};



// controllers/commentController.js

exports.createComment = async (req, res) => {
  try {
    console.log('BODY:', req.body);           // Xem data gửi lên
    console.log('REQ.USER:', req.user);        // Xem user qua middleware

    // Đảm bảo req.user tồn tại và có userId
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'User chưa đăng nhập hoặc token không hợp lệ' });
    }

    // Đảm bảo FE gửi đúng tên biến là blogId (hoặc postId, hoặc gì đó)
    const { blogId, content } = req.body;
    if (!blogId || !content) {
      return res.status(400).json({ message: 'Thiếu blogId hoặc nội dung' });
    }

    // Tạo comment mới
    const comment = new Comment({
      content,
      blog: blogId,
      user: req.user.userId,   // Chỉ lấy từ token
    });

    await comment.save();

    res.status(201).json({ success: true, comment });
  } catch (error) {
    console.error('Error tạo comment:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};




// Xoá bình luận theo id (admin hoặc chủ comment)
exports.deleteComment = async (req, res) => {
  try {
    await Comment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Xoá bình luận thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xoá bình luận', error: err.message });
  }
};
