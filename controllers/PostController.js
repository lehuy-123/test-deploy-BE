






const Post = require('../models/Post');


const DEFAULT_RANDOM_IMAGE = () =>
  `https://picsum.photos/600/400?random=${Math.floor(Math.random() * 1000000)}`;





// Lấy danh sách bài viết (có phân trang, tìm kiếm, lọc trạng thái)
exports.getPosts = async (req, res) => {
  try {
    const { search = '', page = 1, status } = req.query;
    const limit = 10;
    const skip = (page - 1) * limit;

    // Tìm kiếm theo từ khóa (title hoặc content)
    const keyword = search
      ? {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { content: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    // Lọc trạng thái bài viết (nếu có)
    const filter = status ? { ...keyword, status } : { ...keyword };

    // Lấy danh sách bài viết
    const posts = await Post.find(filter)
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Tổng số bài viết để phân trang
    const total = await Post.countDocuments(filter);

    res.status(200).json({
      success: true,
      posts,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Lỗi khi lấy bài viết:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy bài viết' });
  }
};

// Duyệt bài viết (set trạng thái sang 'approved')
exports.approvePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    post.status = 'approved';
    await post.save();

    res.status(200).json({ message: 'Bài viết đã được duyệt', post });
  } catch (error) {
    console.error('Lỗi server khi duyệt bài viết:', error);
    res.status(500).json({ message: 'Lỗi server khi duyệt bài viết', error: error.message });
  }
};




exports.createPost = async (req, res) => {
  try {
    const { title, content, image, tags = [], ...otherFields } = req.body;

    // Làm phẳng tags về mảng các chuỗi string
    let cleanTags = [];
    // Đệ quy phẳng mảng lồng (nếu có)
    const flatten = (tag) => {
      if (typeof tag === 'string') {
        cleanTags.push(tag.trim());
      } else if (Array.isArray(tag)) {
        tag.forEach(flatten);
      }
    };
    if (Array.isArray(tags)) {
      tags.forEach(flatten);
    }

    // Xác định đúng imageUrl
    let imageUrl = '';
    if (req.file && req.file.filename) {
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (image && typeof image === 'string' && image.trim() !== '') {
      imageUrl = image;
    } else {
      imageUrl = `https://picsum.photos/600/400?random=${Math.floor(Math.random() * 1000000)}`;
    }

    const post = new Post({
      title,
      content,
      image: imageUrl,
      tags: Array.from(new Set(cleanTags.filter(Boolean))), // loại trùng, loại rỗng
      ...otherFields
    });

    await post.save();

    res.status(201).json({
      success: true,
      message: 'Tạo bài viết thành công',
      post
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi tạo bài viết' });
  }
};








// Lấy tất cả bài viết có chứa tag bất kỳ (dù là tag chính hay phụ)
const Blog = require('../models/Blog'); // Đảm bảo đã import Blog model

exports.getBlogsByTag = async (req, res) => {
  try {
    const tag = req.query.tag?.trim();
    if (!tag) return res.status(400).json({ message: 'Thiếu tag' });
    const blogs = await Blog.find({ tags: tag }).sort({ createdAt: -1 });
    res.json({ data: blogs });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi lấy blog theo tag', error: err.message });
  }
};