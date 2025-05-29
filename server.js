const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Kết nối MongoDB & biến môi trường
require('./db');
dotenv.config();

const BlogRoutes = require('./routes/blogRoutes');
const postRoutes = require('./routes/PostRoutes');
const UserRoutes = require('./routes/UserRoutes');
const AuthRoutes = require('./routes/AuthRoutes');
const adminRoutes = require('./routes/AdminRoutes');
const TestRoutes = require('./routes/TestRoutes');
const UploadRoutes = require('./routes/UploadRoutes');
const authenticateToken = require('./middleware/authenticateToken'); // Chỉ dùng authenticateToken, KHÔNG import authMiddleware nữa!
const tagRoutes = require('./routes/TagRoutes');
const commentRoutes = require('./routes/CommentRoutes'); // Route này phải mount CHUẨN

const app = express();

// CORS (chuẩn cho cả FE ở 3000 & 3001)
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Đảm bảo folder uploads tồn tại
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static('uploads'));

// Mount routes
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);   // <-- Quan trọng: Đúng route comment!
app.use('/api/users', authenticateToken, UserRoutes);
app.use('/api', UploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/auth', AuthRoutes);
app.use('/api', TestRoutes); // route test token
app.use('/api/blogs', BlogRoutes); // route public blog

// Passport Facebook cấu hình
app.use(passport.initialize());
if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    console.error('❌ Thiếu FACEBOOK_APP_ID hoặc FACEBOOK_APP_SECRET trong .env');
    process.exit(1);
}

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: 'http://localhost:5001/auth/facebook/callback', // Nhớ check trùng với hệ thống local
    profileFields: ['id', 'displayName', 'email', 'photos']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const User = require('./models/User');
        let user = await User.findOne({ facebookId: profile.id });
        if (!user) {
            user = new User({
                facebookId: profile.id,
                name: profile.displayName,
                email: profile.emails?.[0]?.value || '',
                avatar: profile.photos?.[0]?.value || ''
            });
            await user.save();
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '24h' });
        return done(null, { user, token });
    } catch (err) {
        return done(err, null);
    }
}));

// Route Facebook login
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));
app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { session: false }),
    (req, res) => {
        const { user, token } = req.user;
        // Redirect chuẩn tới đúng local FE
        res.redirect(`http://localhost:3001/login?token=${token}&user=${encodeURIComponent(JSON.stringify({
            id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar
        }))}`);
    }
);

// Route test server
app.get('/test', (req, res) => {
    res.status(200).json({ message: 'Server đang hoạt động' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Lỗi:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ nội bộ',
        error: err.message
    });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
