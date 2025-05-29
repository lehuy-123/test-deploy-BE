const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const mongoose = require('mongoose');
const upload = require('./uploads');
const DEFAULT_RANDOM_IMAGE = () =>
  `https://picsum.photos/600/400?random=${Math.floor(Math.random() * 1000000)}`;

// POST /api/blogs - Tạo bài viết mới (chuẩn nghiệp vụ: draft, pending, approved)
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const { title, content, tags, category, status, role, userId } = req.body;
    if (!title || !content || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề, nội dung và ID người dùng là bắt buộc'
      });
    }
    let realStatus = status;
    if (status === 'draft') {
      realStatus = 'draft'; // Bản nháp, không vào hàng chờ duyệt
    } else if (role === 'admin') {
      realStatus = (status === 'approved' || status === 'public') ? 'approved' : 'pending';
    } else {
      // user thường: chỉ được pending, không thể tự approved/công khai
      realStatus = 'pending';
    }

    // Xử lý tags chuẩn
    let tagsArr = [];
   if (Array.isArray(tags)) {
  tagsArr = tags;
} else if (typeof tags === 'string') {
  try {
    tagsArr = JSON.parse(tags); // Nếu tags là chuỗi JSON thì parse, nếu lỗi thì fallback split
    if (!Array.isArray(tagsArr)) {
      tagsArr = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    }
  } catch {
    tagsArr = tags.split(',').map(tag => tag.trim()).filter(Boolean);
  }
}


    let imageUrl = '';
    if (req.file && req.file.filename) {
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.image && typeof req.body.image === 'string' && req.body.image.trim() !== '') {
      imageUrl = req.body.image;
    } else {
      imageUrl = DEFAULT_RANDOM_IMAGE();
    }

    const blog = new Blog({
      title,
      content,
      image: imageUrl,
      tags: tagsArr,
      category: category || '',
      status: realStatus,
      views: 0,
      comments: [],
      likes: [],
      bookmarks: [],
      userId
    });
    await blog.save();
    res.status(201).json({
      success: true,
      data: blog,
      message:
        realStatus === 'approved'
          ? 'Tạo bài viết thành công (đã duyệt)'
          : realStatus === 'pending'
          ? 'Tạo bài viết thành công, đang chờ duyệt'
          : 'Tạo bản nháp thành công'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/blogs - Lấy danh sách bài viết (có lọc tag + category, mặc định chỉ show approved)
router.get('/', async (req, res, next) => {
  try {
    const { tag, category, status } = req.query;
    const query = {};
    query.status = status || 'approved'; // Mặc định chỉ show bài duyệt
    if (tag) query.tags = { $in: [tag] };
    if (category) query.category = category;

    const blogs = await Blog.find(query)
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: blogs,
      message: 'Lấy danh sách bài viết thành công'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/blogs/user/:userId - Lấy tất cả bài viết của user (kể cả draft/pending/approved)
router.get('/user/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ' });
    }
    const blogs = await Blog.find({ userId: userId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: blogs,
      message: 'Lấy danh sách bài viết của người dùng thành công'
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/blogs/:id/approve - Duyệt bài
router.patch('/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID bài viết không hợp lệ' });
    }
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }
    blog.status = status;
    await blog.save();
    res.status(200).json({ success: true, message: `Bài viết đã được cập nhật trạng thái: ${status}` });
  } catch (error) {
    next(error);
  }
});

// GET /api/blogs/:id - Lấy chi tiết bài viết
router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate('userId', 'name');
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }
    res.status(200).json({ success: true, data: blog });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// GET /api/blogs/:id/related - Lấy bài viết liên quan
router.get('/:id/related', async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id).populate('userId', 'name');

    if (!blog) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    let relatedBlogs = [];
    if (blog.tags && blog.tags.length > 0) {
      relatedBlogs = await Blog.find({
        _id: { $ne: blog._id },
        tags: { $in: blog.tags }
      }).limit(5).populate('userId', 'name');
    }
    res.status(200).json({
      success: true,
      data: relatedBlogs,
      message: 'Lấy danh sách bài viết liên quan thành công'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/blogs/:id - Cập nhật bài viết
router.put('/:id', upload.single('image'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, tags, status, category } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID bài viết không hợp lệ' });
    }
    const blog = await Blog.findById(id);
    if (!blog) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });

    blog.title = title || blog.title;
    blog.content = content || blog.content;
    blog.tags = tags ? (typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags) : blog.tags;
    blog.category = category || blog.category;
    blog.status = status || blog.status;
    blog.image = req.file ? `/uploads/${req.file.filename}` : blog.image;

    await blog.save();
    res.status(200).json({ success: true, data: blog, message: 'Cập nhật bài viết thành công' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/blogs/:id - Xoá bài viết
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID bài viết không hợp lệ' });
    }
    const blog = await Blog.findByIdAndDelete(id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }
    res.status(200).json({ success: true, message: 'Xóa bài viết thành công' });
  } catch (error) {
    next(error);
  }
});

// Các API bình luận/like/bookmark giữ nguyên

router.post('/:id/comments', async (req, res, next) => {
  const { content, author } = req.body;
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID bài viết không hợp lệ' });
    }
    if (!content || !author) {
      return res.status(400).json({ success: false, message: 'Nội dung và tác giả là bắt buộc' });
    }
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }
    const comment = {
      _id: new mongoose.Types.ObjectId(),
      content,
      author
    };
    blog.comments.push(comment);
    await blog.save();
    res.status(201).json({
      success: true,
      data: comment,
      message: 'Thêm bình luận thành công'
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:blogId/comments/:commentId', async (req, res, next) => {
  const { blogId, commentId } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(blogId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ success: false, message: 'ID bài viết hoặc ID bình luận không hợp lệ' });
    }
    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }
    const commentIndex = blog.comments.findIndex(comment => comment._id.toString() === commentId);
    if (commentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận' });
    }
    blog.comments.splice(commentIndex, 1);
    await blog.save();
    res.status(200).json({ success: true, message: 'Xóa bình luận thành công' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/like', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID bài viết không hợp lệ' });
    }
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }
    const index = blog.likes.indexOf(userId);
    if (index > -1) {
      blog.likes.splice(index, 1);
    } else {
      blog.likes.push(userId);
    }
    await blog.save();
    res.status(200).json({ success: true, data: blog, message: 'Cập nhật cảm xúc thành công' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/bookmark', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID bài viết không hợp lệ' });
    }
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }
    const index = blog.bookmarks.indexOf(userId);
    if (index > -1) {
      blog.bookmarks.splice(index, 1);
    } else {
      blog.bookmarks.push(userId);
    }
    await blog.save();
    res.status(200).json({ success: true, data: blog, message: 'Cập nhật bookmark thành công' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
