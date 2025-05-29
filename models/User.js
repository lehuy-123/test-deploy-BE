const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  facebookId: {
    type: String,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String
  },
  provider: {
    type: String,
    enum: ['facebook', 'local'],
    default: 'facebook'
  },
  avatar: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  isBlocked: {        // Trường chặn user
    type: Boolean,
    default: false
  },
  isDeleted: {        // Bổ sung trường soft delete
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
