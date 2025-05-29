const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// ✅ Route kiểm tra token
router.get('/test-token', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Không có token' });
    }

    jwt.verify(token, 'secret_key_blog_app', (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Token không hợp lệ' });
        }
        return res.status(200).json({ success: true, message: 'Token hợp lệ ✅', user });
    });
});

module.exports = router;
