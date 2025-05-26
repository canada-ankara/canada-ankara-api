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
    'https://canada-ankara.com/', // GoDaddy'deki frontend domain'i (alan adını buraya ekle)
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // İzin verilen HTTP metodları
  allowedHeaders: ['Content-Type', 'Authorization'], // İzin verilen başlıklar
  credentials: true, // Kimlik doğrulama (ör. cookie) gerekiyorsa
  optionsSuccessStatus: 200 // Eski tarayıcılar için
};

app.use(cors(corsOptions));
app.use(express.json());

// Veritabanı bağlantısı
connectDB();

// Rotalar
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor.`));
