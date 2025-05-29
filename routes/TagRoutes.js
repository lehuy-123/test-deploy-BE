const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const checkAdmin = require('../middleware/checkAdmin');
const TagController = require('../controllers/TagController');

// PUBLIC - các route lấy tag thực tế cho blog, không cần đăng nhập
router.get('/unique', TagController.getUniqueTags);
router.get('/unique-from-blogs', TagController.getUniqueTagsFromBlogs);
router.get('/all-unique', TagController.getUniqueTags);

// API đặc biệt cho dropdown filter (tag chính & phụ, nhưng chỉ còn tồn tại trong hệ thống tag chính)
router.get('/available-for-filter', TagController.getAvailableTagsForFilter);

// CRUD TAG - chỉ admin được dùng
router.get('/', authenticateToken, checkAdmin, TagController.getAllTags);
router.post('/', authenticateToken, checkAdmin, TagController.createTag);
router.put('/:id', authenticateToken, checkAdmin, TagController.updateTag);
router.delete('/:id', authenticateToken, checkAdmin, TagController.deleteTag);

// Xoá tag khỏi tất cả blog
router.delete('/remove-from-all/:tagName', authenticateToken, checkAdmin, TagController.deleteTagEverywhere);

// Thống kê số lượt tag theo tháng
router.get('/monthly', TagController.getMonthlyTags);

module.exports = router;
