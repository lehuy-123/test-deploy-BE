const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  image: { type: String, default: '' }, // Phải có trường image (kiểu String)
  status: {
    type: String,
    enum: ['draft', 'approved', 'rejected', 'pending'],
    default: 'pending',
  },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Post', PostSchema);
