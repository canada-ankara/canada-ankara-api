const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');
const connectDB = require('./config/db');

dotenv.config();
const app = express();

// CORS ayarları
const corsOptions = {
  origin: [
    'http://localhost:3000', // Yerel geliştirme için
    'https://canada-ankara.com', // GoDaddy'deki frontend domain'i
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // İzin verilen HTTP metodları
  allowedHeaders: ['Content-Type', 'Authorization'], // İzin verilen başlıklar
  credentials: true, // Kimlik doğrulama (ör. cookie) gerekiyorsa
  optionsSuccessStatus: 200 // Eski tarayıcılar için
};

// CORS middleware'ini ekle
app.use(cors(corsOptions));

// Preflight istekleri için manuel kontrol
app.options('*', cors(corsOptions)); // Tüm yollar için OPTIONS isteklerine izin ver

app.use(express.json());

// Veritabanı bağlantısı
connectDB();

// Rotalar
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// Hata ayıklama için basit bir test endpoint'i
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend çalışıyor!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor.`));
