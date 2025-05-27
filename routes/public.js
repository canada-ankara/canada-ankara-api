const express = require('express');
const router = express.Router();
const Guest = require('../models/Guest');
const generateQrId = require('../utils/generateQrId');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// RSVP durum modülünü içe aktar
let rsvpStatusModule = null;
const rsvpStatusPath = path.join(__dirname, '..', 'utils', 'rsvpStatus.js');
console.log('rsvpStatus dosya yolu:', rsvpStatusPath);

if (fs.existsSync(rsvpStatusPath)) {
  try {
    rsvpStatusModule = require('../utils/rsvpStatus');
    console.log('rsvpStatus modülü başarıyla yüklendi:', rsvpStatusModule);
    if (!rsvpStatusModule.getRsvpStatus || typeof rsvpStatusModule.getRsvpStatus !== 'function') {
      throw new Error('getRsvpStatus fonksiyonu rsvpStatus modülünde tanımlı değil');
    }
    if (!rsvpStatusModule.setRsvpStatus || typeof rsvpStatusModule.setRsvpStatus !== 'function') {
      throw new Error('setRsvpStatus fonksiyonu rsvpStatus modülünde tanımlı değil');
    }
  } catch (error) {
    console.error('HATA: rsvpStatus modülü yüklenirken hata oluştu:', error.message);
    console.error('Dosya yolu:', rsvpStatusPath);
  }
} else {
  console.error('HATA: rsvpStatus.js dosyası bulunamadı:', rsvpStatusPath);
}

const getRsvpStatus = rsvpStatusModule && rsvpStatusModule.getRsvpStatus
  ? rsvpStatusModule.getRsvpStatus
  : () => {
      console.warn('getRsvpStatus kullanılamıyor, varsayılan değer dönülüyor');
      return true; // Varsayılan olarak RSVP açık
    };

const setRsvpStatus = rsvpStatusModule && rsvpStatusModule.setRsvpStatus
  ? rsvpStatusModule.setRsvpStatus
  : (newStatus) => {
      console.warn('setRsvpStatus kullanılamıyor, varsayılan davranış uygulanıyor');
      return newStatus; // Varsayılan olarak yeni durumu döndür
    };

// Admin veya GuestEditor yetkisi kontrolü için middleware
const restrictToAdminOrGuestEditor = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
  if (!token) {
    console.error('Yetkilendirme tokenı eksik');
    return res.status(401).json({ message: 'Yetkilendirme tokenı eksik', messageKey: 'noAuthToken' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.roles || !decoded.roles.some(role => ['Admin', 'GuestEditor'].includes(role))) {
      console.error('Yetkisiz erişim: Admin veya GuestEditor rolü gerekli');
      return res.status(403).json({ message: 'Yalnızca Admin veya GuestEditor bu işlemi yapabilir', messageKey: 'adminOnly' });
    }
    req.user = decoded; // Token içeriğini req.user'a ekle
    next();
  } catch (error) {
    console.error('JWT doğrulama hatası:', error.message);
    res.status(401).json({ message: 'Geçersiz token', messageKey: 'invalidToken' });
  }
};

// E-posta formatı doğrulama yardımcı fonksiyonu
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// RSVP durumunu kontrol etme
router.get('/rsvp-status', async (req, res) => {
  try {
    if (typeof getRsvpStatus !== 'function') {
      throw new Error('getRsvpStatus fonksiyonu tanımlı değil. utils/rsvpStatus.js dosyasını kontrol edin.');
    }
    const rsvpEnabled = getRsvpStatus();
    console.log('RSVP durumu alındı:', rsvpEnabled);
    res.status(200).json({
      rsvpEnabled,
      messageKey: 'rsvpStatusFetchSuccess',
      params: {},
    });
  } catch (error) {
    console.error('RSVP durumu alma hatası:', error.message);
    res.status(500).json({
      message: 'RSVP durumu alınamadı',
      error: error.message,
      messageKey: 'rsvpStatusFetchFailed',
    });
  }
});

// RSVP durumunu değiştirme (Admin veya GuestEditor endpoint'i)
router.post('/admin/toggle-rsvp', restrictToAdminOrGuestEditor, async (req, res) => {
  try {
    const currentStatus = getRsvpStatus();
    const newStatus = !currentStatus;
    setRsvpStatus(newStatus);
    console.log('RSVP durumu değiştirildi:', newStatus);
    res.status(200).json({
      rsvpEnabled: newStatus,
      messageKey: 'rsvpToggled',
      params: { status: newStatus ? 'rsvpEnabled' : 'rsvpDisabled' },
    });
  } catch (error) {
    console.error('RSVP durumu değiştirme hatası:', error.message);
    res.status(500).json({
      message: 'RSVP durumu değiştirilemedi',
      error: error.message,
      messageKey: 'rsvpToggleFailed',
    });
  }
});

// QR ID ile davetli bilgisi alma
router.get('/guest/:qrId', async (req, res) => {
  try {
    const guest = await Guest.findOne({ qrId: req.params.qrId });
    if (!guest) {
      console.error('Davetli bulunamadı, qrId:', req.params.qrId);
      return res.status(404).json({ message: 'Davetli bulunamadı', messageKey: 'guestNotFound' });
    }
    console.log('Davetli bilgisi alındı:', guest);
    res.json({
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      guestType: guest.guestType,
      responded: guest.responded,
      willAttend: guest.willAttend,
      plusOneQrId: guest.plusOneQrId,
    });
  } catch (error) {
    console.error('Davetli alma hatası:', error.message);
    res.status(500).json({ message: 'Davetli bilgisi alınamadı', error: error.message, messageKey: 'guestFetchFailed' });
  }
});

// RSVP işlemi
router.post('/guest/:qrId', async (req, res) => {
  try {
    const { willAttend } = req.body;
    const guest = await Guest.findOne({ qrId: req.params.qrId });
    if (!guest) {
      console.error('Davetli bulunamadı, qrId:', req.params.qrId);
      return res.status(404).json({ message: 'Davetli bulunamadı', messageKey: 'guestNotFound' });
    }

    guest.responded = true;
    guest.willAttend = willAttend;
    if (!willAttend) {
      guest.plusOneQrId = null;
    }

    await guest.save();
    console.log('RSVP kaydedildi:', guest);

    if (willAttend && guest.plusOneQrId) {
      const plusOne = await Guest.findOne({ qrId: guest.plusOneQrId, guestType: 'PLUSONE' });
      if (plusOne) {
        plusOne.responded = true;
        plusOne.willAttend = true;
        await plusOne.save();
        console.log('PlusOne RSVP kaydedildi:', plusOne);
      }
    }

    res.json({ message: 'RSVP başarıyla kaydedildi', guest, messageKey: 'rsvpSuccess' });
  } catch (error) {
    console.error('RSVP hatası:', error.message);
    res.status(500).json({ message: 'RSVP işlemi başarısız', error: error.message, messageKey: 'rsvpFailed' });
  }
});

// PlusOne ekleme
router.post('/add-plusone/:qrId', async (req, res) => {
  const { firstName, lastName, email } = req.body;

  try {
    // Girdi doğrulama
    if (!firstName || !lastName || !email) {
      console.error('Eksik giriş bilgileri:', { firstName, lastName, email });
      return res.status(400).json({ message: 'Ad, soyad ve e-posta zorunludur', messageKey: 'missingFields' });
    }

    // E-posta formatını doğrula
    if (!isValidEmail(email)) {
      console.error('Geçersiz e-posta formatı:', email);
      return res.status(400).json({ message: 'Geçersiz e-posta adresi', messageKey: 'invalidEmail' });
    }

    const inviter = await Guest.findOne({ qrId: req.params.qrId });
    if (!inviter) {
      console.error('Davet eden bulunamadı, qrId:', req.params.qrId);
      return res.status(404).json({ message: 'Davet eden bulunamadı', messageKey: 'inviterNotFound' });
    }

    if (!['EMPLOYEE', 'VIP'].includes(inviter.guestType)) {
      console.error('Yetkisiz davetli tipi:', inviter.guestType);
      return res.status(400).json({ message: 'Sadece EMPLOYEE veya VIP davetliler misafir ekleyebilir', messageKey: 'invalidGuestType' });
    }

    if (inviter.plusOneQrId) {
      console.error('Davet edenin zaten bir misafiri var:', inviter);
      return res.status(400).json({ message: 'Bu davet edenin zaten bir misafiri var', messageKey: 'plusOneAlreadyExists' });
    }

    const qrId = await generateQrId();
    const guestId = new mongoose.Types.ObjectId();
    const plusOne = new Guest({
      _id: guestId,
      qrId,
      firstName: firstName.toUpperCase(),
      lastName: lastName.toUpperCase(),
      email: email.toLowerCase(),
      guestType: 'PLUSONE',
      plusOneQrId: null,
      selectedInviterId: inviter._id,
      responded: true,
      willAttend: true,
      isCheckedIn: false,
      checkInTime: null,
    });

    await plusOne.save();
    console.log('Misafir kaydedildi:', plusOne);

    inviter.plusOneQrId = qrId;
    inviter.responded = true;
    inviter.willAttend = true;
    await inviter.save();
    console.log('Davet eden güncellendi:', inviter);

    res.status(201).json({
      message: 'Misafir başarıyla eklendi',
      plusOne: {
        firstName: plusOne.firstName,
        lastName: plusOne.lastName,
        email: plusOne.email,
        guestType: plusOne.guestType,
        qrId: plusOne.qrId,
        responded: plusOne.responded,
        willAttend: plusOne.willAttend,
      },
      messageKey: 'plusOneSuccess',
    });
  } catch (error) {
    console.error('Misafir ekleme hatası:', error.message);
    if (error.message.includes('Benzersiz QR ID oluşturulamadı')) {
      return res.status(500).json({
        message: 'Benzersiz QR ID oluşturulamadı, lütfen tekrar deneyin',
        messageKey: 'qrIdGenerationFailed',
      });
    }
    if (error.name === 'MongoError' && error.code === 11000) {
      return res.status(400).json({
        message: 'Bu e-posta adresi veya QR ID zaten kullanımda',
        messageKey: 'duplicateGuest',
      });
    }
    res.status(500).json({
      message: 'Misafir eklenemedi, lütfen tekrar deneyin veya iletişime geçin',
      error: error.message,
      messageKey: 'plusOneFailed',
    });
  }
});

// RSVP işlemi
router.post('/rsvp/:qrId', async (req, res) => {
  try {
    const { willAttend } = req.body;
    const { qrId } = req.params;

    const guest = await Guest.findOne({ qrId });
    if (!guest) {
      console.error('Davetli bulunamadı, qrId:', qrId);
      return res.status(404).json({ message: 'Davetli bulunamadı', messageKey: 'guestNotFound', params: {} });
    }

    guest.willAttend = willAttend;
    guest.responded = true;
    if (!willAttend) {
      guest.plusOneQrId = null; // Katılmıyorsa PlusOne sıfırlanır
    }
    await guest.save();
    console.log('RSVP güncellendi:', guest);

    res.status(200).json({ message: 'RSVP başarıyla güncellendi', messageKey: 'guestUpdateSuccess', params: {} });
  } catch (error) {
    console.error('RSVP hatası:', error.message);
    res.status(500).json({ message: 'RSVP işlemi başarısız', messageKey: 'guestUpdateFailed', params: {}, error: error.message });
  }
});

module.exports = router;
