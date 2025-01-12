// app.js
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const QRCode = require('qrcode');
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

const app = express();

// Cấu hình view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Cấu hình multer cho việc upload logo
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Route hiển thị form nhập URL
app.get('/', (req, res) => {
  res.render('index');
});

// Route xử lý tạo QR code
app.post('/generate', upload.single('logo'), async (req, res) => {
    const { url, color, size } = req.body;
    // Chuyển size về kiểu number, đồng thời kiểm tra nếu không nhập
    const qrSize = parseInt(size, 10) || 300;
    const logoPath = req.file ? path.join(__dirname, req.file.path) : null;
  
    try {
      // Tạo QR code thành buffer với các tùy chọn
      // Lưu ý: Thư viện 'qrcode' hỗ trợ 'width' từ phiên bản 2.x trở lên
      const qrBuffer = await QRCode.toBuffer(url, {
        color: {
          dark: color || '#000000', // Màu QR code
          light: '#FFFFFF' // Màu nền
        },
        errorCorrectionLevel: 'H', // Cấp độ sửa lỗi cao để có thể chèn logo
        width: qrSize           // Thêm tùy chọn width
      });
  
      // Đọc ảnh QR code bằng Jimp để xử lý logo (nếu có)
      let qrImage = await Jimp.read(qrBuffer);
  
      if (logoPath) {
        const logo = await Jimp.read(logoPath);
        const qrWidth = qrImage.bitmap.width;
        const qrHeight = qrImage.bitmap.height;
  
        // Kích thước logo (ví dụ: 20% so với QR code)
        const logoWidth = qrWidth * 0.2;
        logo.resize(logoWidth, Jimp.AUTO);
  
        // Tính vị trí để chèn logo
        const x = (qrWidth - logo.bitmap.width) / 2;
        const y = (qrHeight - logo.bitmap.height) / 2;
  
        // Chèn logo vào QR code
        qrImage.composite(logo, x, y, {
          mode: Jimp.BLEND_SOURCE_OVER,
          opacitySource: 1,
          opacityDest: 1
        });
      }
  
      // Lưu QR code đã hoàn thiện vào thư mục uploads
      const qrFileName = `qr_${Date.now()}.png`;
      const qrFilePath = path.join(__dirname, 'uploads', qrFileName);
      await qrImage.writeAsync(qrFilePath);
  
      // Xóa logo gốc nếu đã upload (tùy ý)
      if (logoPath) {
        fs.unlinkSync(logoPath);
      }
  
      res.render('result', { qrImage: `/uploads/${qrFileName}` });
    } catch (err) {
      console.error(err);
      res.send('Đã xảy ra lỗi khi tạo QR code.');
    }
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});