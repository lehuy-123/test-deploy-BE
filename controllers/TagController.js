const Tag = require('../models/Tag');
const Blog = require('../models/Blog');

// 📌 GET /api/tags?search=...  - Lấy tất cả tags từ collection Tag (CRUD riêng)
const getAllTags = async (req, res) => {
  try {
    const search = req.query.search || '';
    const tags = await Tag.find({ name: { $regex: search, $options: 'i' } }).sort({ createdAt: -1 });
    res.json({ tags });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách tag', error: err.message });
  }
};

// 📌 POST /api/tags - Tạo mới một tag
const createTag = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Tên tag không được bỏ trống' });

    const existing = await Tag.findOne({ name: name.trim().toLowerCase() });
    if (existing) return res.status(409).json({ message: 'Tag đã tồn tại' });

    const newTag = await Tag.create({ name: name.trim().toLowerCase() });
    res.status(201).json({ message: 'Đã tạo tag mới', tag: newTag });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi tạo tag', error: err.message });
  }
};

// 📌 PUT /api/tags/:id - Cập nhật tên tag
const updateTag = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Tên tag không được bỏ trống' });

    const duplicate = await Tag.findOne({ name: name.trim().toLowerCase(), _id: { $ne: req.params.id } });
    if (duplicate) return res.status(409).json({ message: 'Tag đã tồn tại' });

    const updated = await Tag.findByIdAndUpdate(req.params.id, { name: name.trim().toLowerCase() }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Không tìm thấy tag' });
    res.json({ message: 'Đã cập nhật tag', tag: updated });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi cập nhật tag', error: err.message });
  }
};

// 📌 DELETE /api/tags/:id - Xóa một tag
const deleteTag = async (req, res) => {
  try {
    const deleted = await Tag.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Không tìm thấy tag' });
    res.json({ message: 'Đã xoá tag' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi xoá tag', error: err.message });
  }
};

// 📌 GET /api/tags/unique-from-blogs - Lấy danh sách tag từ blogs (KHÔNG lọc tag đã bị xoá)
const getUniqueTagsFromBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({}, 'tags');
    const tagSet = new Set();

    blogs.forEach(blog => {
      if (Array.isArray(blog.tags)) {
        blog.tags.forEach(tag => {
          if (typeof tag === 'string') {
            let realTag = tag.trim();
            if (realTag.startsWith('["') && realTag.endsWith('"]')) {
              try {
                const arr = JSON.parse(realTag);
                if (Array.isArray(arr) && arr[0]) {
                  realTag = arr[0].trim();
                }
              } catch (e) {}
            }
            if (realTag) tagSet.add(realTag.replace(/["']/g, ''));
          } else if (Array.isArray(tag)) {
            tag.forEach(subTag => {
              if (typeof subTag === 'string' && subTag.trim())
                tagSet.add(subTag.trim().replace(/["']/g, ''));
            });
          }
        });
      }
    });

    res.json({ tags: Array.from(tagSet).filter(Boolean) });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy tag từ blogs', error: err.message });
  }
};

/**
 * 📌 GET /api/tags/unique - Lấy danh sách tag thực tế từ các blog, chuẩn hóa và loại trùng (KHÔNG lọc tag đã bị xoá)
 */
const getUniqueTags = async (req, res) => {
  try {
    const blogs = await Blog.find({}, 'tags');
    const tagSet = new Set();

    const normalizeTag = (tag) => {
      if (typeof tag === 'string') {
        let realTag = tag.trim();
        if (realTag.startsWith('["') && realTag.endsWith('"]')) {
          try {
            const arr = JSON.parse(realTag);
            if (Array.isArray(arr) && arr[0]) {
              realTag = arr[0].trim();
            }
          } catch {}
        }
        return realTag.replace(/[\[\]"']/g, '').trim().toLowerCase();
      }
      return '';
    };

    blogs.forEach(blog => {
      if (Array.isArray(blog.tags)) {
        blog.tags.forEach(tag => {
          if (typeof tag === 'string') {
            const norm = normalizeTag(tag);
            if (norm) tagSet.add(norm);
          } else if (Array.isArray(tag)) {
            tag.forEach(subTag => {
              if (typeof subTag === 'string') {
                const norm = normalizeTag(subTag);
                if (norm) tagSet.add(norm);
              }
            });
          }
        });
      }
    });

    res.json({ tags: Array.from(tagSet).filter(Boolean) });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy tag thực tế', error: err.message });
  }
};

// 📌 API ĐẶC BIỆT: Lấy tag cho dropdown filter (cả tag chính & phụ, nhưng CHỈ giữ tag chưa bị xóa khỏi hệ thống tag chính)
const getAvailableTagsForFilter = async (req, res) => {
  try {
    // 1. Lấy tag thực tế trong blog (unique, normalize)
    const blogs = await Blog.find({}, 'tags');
    const tagSet = new Set();
    const normalizeTag = (tag) => {
      if (typeof tag === 'string') {
        let realTag = tag.trim();
        if (realTag.startsWith('["') && realTag.endsWith('"]')) {
          try {
            const arr = JSON.parse(realTag);
            if (Array.isArray(arr) && arr[0]) {
              realTag = arr[0].trim();
            }
          } catch {}
        }
        return realTag.replace(/[\[\]"']/g, '').trim().toLowerCase();
      }
      return '';
    };
    blogs.forEach(blog => {
      if (Array.isArray(blog.tags)) {
        blog.tags.forEach(tag => {
          if (typeof tag === 'string') {
            const norm = normalizeTag(tag);
            if (norm) tagSet.add(norm);
          } else if (Array.isArray(tag)) {
            tag.forEach(subTag => {
              if (typeof subTag === 'string') {
                const norm = normalizeTag(subTag);
                if (norm) tagSet.add(norm);
              }
            });
          }
        });
      }
    });

    // 2. Lấy danh sách tag chính hiện tại (collection Tag)
    const tagMainList = await Tag.find({});
    const mainTagSet = new Set(tagMainList.map(t => t.name.trim().toLowerCase()));

    // 3. Lọc, chỉ lấy tag xuất hiện trong cả blog và còn tồn tại ở tag chính
    const filterTags = Array.from(tagSet).filter(tag => mainTagSet.has(tag));

    res.json({ tags: filterTags });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy tag filter', error: err.message });
  }
};

// Xoá tag khỏi toàn bộ hệ thống
const deleteTagEverywhere = async (req, res) => {
  try {
    let { tagName } = req.params;
    if (!tagName) return res.status(400).json({ message: 'Thiếu tên tag.' });

    const normTag = tagName.replace(/[\[\]"']/g, '').trim().toLowerCase();
    const blogs = await Blog.find({ tags: { $exists: true, $ne: [] } });

    let affected = 0;
    for (const blog of blogs) {
      const originalLength = blog.tags.length;
      blog.tags = blog.tags.filter(t => {
        let realTag = '';
        if (typeof t === 'string') {
          realTag = t;
          if (realTag.startsWith('["') && realTag.endsWith('"]')) {
            try {
              const arr = JSON.parse(realTag);
              if (Array.isArray(arr) && arr[0]) realTag = arr[0].trim();
            } catch {}
          }
          realTag = realTag.replace(/[\[\]"']/g, '').trim().toLowerCase();
        }
        return realTag !== normTag;
      });
      if (blog.tags.length !== originalLength) {
        await blog.save();
        affected++;
      }
    }
    res.json({ message: `Đã xoá tag "${normTag}" khỏi toàn bộ hệ thống (${affected} blog bị ảnh hưởng).` });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi xoá tag.', error: err.message });
  }
};

// 📌 GET /api/tags/monthly - Thống kê số lượt tag được sử dụng trên blog theo từng tháng năm hiện tại
const getMonthlyTags = async (req, res) => {
  try {
    const year = new Date().getFullYear();

    const monthlyTags = await Blog.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${year}-01-01T00:00:00.000Z`),
            $lte: new Date(`${year}-12-31T23:59:59.999Z`)
          }
        }
      },
      { $unwind: "$tags" },
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          month: "$_id.month",
          count: 1
        }
      },
      { $sort: { month: 1 } }
    ]);

    const result = Array(12).fill(0);
    monthlyTags.forEach(item => {
      result[item.month - 1] = item.count;
    });

    res.json({ monthlyTags: result });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi thống kê tag theo tháng', error: err.message });
  }
};

module.exports = {
  getAllTags,
  createTag,
  updateTag,
  deleteTag,
  getUniqueTags,
  getUniqueTagsFromBlogs,
  getAvailableTagsForFilter, // API mới cho dropdown filter!
  deleteTagEverywhere,
  getMonthlyTags,
};
