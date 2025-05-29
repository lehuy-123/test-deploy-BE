const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Đã kết nối MongoDB Atlas');
}).catch(err => {
  console.error('❌ Lỗi kết nối MongoDB:', err);
});
