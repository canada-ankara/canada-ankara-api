const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Guest = require('../models/Guest');
const { authMiddleware, requireRole } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const generateQrId = require('../utils/generateQrId');
const User = require('../models/User');
const axios = require('axios'); // axios'u burada tanımlıyoruz
require('dotenv').config(); // .env dosyasını yüklemek için

console.log('requireRole:', requireRole);

// Çeviri nesnesi
const translations = {
  en: {
    fileNotUploaded: 'Excel file not uploaded',
    emptyFile: 'Excel file is empty',
    missingColumn: 'Required column missing: {key}',
    deleteExistingFailed: 'Failed to delete existing guests',
    invalidEmail: 'Invalid or missing email address in row {row}',
    missingFirstName: 'Missing first name in row {row}',
    missingLastName: 'Missing last name in row {row}',
    missingQrId: 'Missing or invalid QR ID in row {row}',
    duplicateEmailInFile: 'This email is used in another row in the file (row: {row})',
    duplicateEmailInDb: 'This email is already registered in the database (row: {row})',
    duplicateQrIdInDb: 'QR ID is already used by another user. Edit the QR ID or remove it; if removed, a unique QR ID will be automatically generated for this user (row: {row})',
    invalidGuestType: 'Invalid or missing guest type in row {row}',
    plusOneNotAllowed: 'PlusOne guests cannot be uploaded via Excel (row: {row})',
    uploadSuccess: '{count} guests successfully uploaded',
    retryFailed: 'Retry failed',
    invalidRetryData: 'Invalid row data provided for retry',
    checkInsReset: 'All check-in statuses reset',
    participantsReset: 'All guest attendance and response statuses reset',
    resetAllSuccess: 'All data successfully deleted',
    rsvpToggled: 'RSVP system {status}',
    rsvpEnabled: 'enabled',
    rsvpDisabled: 'disabled',
    checkInFailed: 'Check-in failed',
    guestNotFound: 'Guest not found',
    qrIdMissing: 'QR ID is missing',
    invalidUsername: 'Invalid username',
    invalidPassword: 'Invalid password',
    guestAddFailed: 'Failed to add guest',
    guestUpdateFailed: 'Update failed',
    guestDeleteFailed: 'Failed to delete guest',
    invalidInviter: 'Invalid inviter selected',
    inviterHasPlusOne: 'This inviter already has a PlusOne guest',
    plusOneRequiresInviter: 'An inviter must be selected for PlusOne type',
    invalidPlusOneQrId: 'plusOneQrId must be NA or empty for Regular or PlusOne types',
    guestsFetchFailed: 'Failed to fetch guests',
    invitersFetchFailed: 'Failed to fetch inviters',
    guestAddSuccess: '{count} guest(s) added successfully',
    emptyFields: 'All fields are required',
    fetchInvitersFailed: 'Failed to fetch inviters',
    invalidUserData: 'Invalid user data provided',
    invalidRoles: 'Invalid roles provided',
    userExists: 'User already exists',
    userAddSuccess: 'User {username} added successfully',
    userAddFailed: 'Failed to add user',
    usersFetchSuccess: 'Users fetched successfully',
    usersFetchFailed: 'Failed to fetch users',
    userNotFound: 'User not found',
    userUpdateSuccess: 'User updated successfully',
    userUpdateFailed: 'Failed to update user',
    userDeleteSuccess: 'User deleted successfully',
    userDeleteFailed: 'Failed to delete user',
    resetEventSuccess: 'Event successfully reset. All guests and users deleted.',
    resetEventFailed: 'Failed to reset event.',
    confirmResetPrompt: 'To reset the event and delete all guest and user data, type "reset" below.',
    invalidResetInput: 'Invalid input. Please type "reset" to confirm.',
    checkInSuccess: 'Check-in successful', // Yeni eklenen çeviri
    telegramNotificationFailed: 'Failed to send Telegram notification' ,// Yeni eklenen çeviri
      telegramStatusFetchFailed: 'Failed to fetch Telegram status',
    telegramToggleFailed: 'Failed to toggle Telegram status',
    telegramToggled: 'Telegram notifications {status}',
    telegramEnabled: 'enabled',
    telegramDisabled: 'disabled',
        tokenRefreshFailed: 'Failed to refresh token',
    turnstileVerificationFailed: 'Turnstile verification failed'

    
  },
  tr: {
    fileNotUploaded: 'Excel dosyası yüklenmedi',
    emptyFile: 'Excel dosyası boş',
    missingColumn: 'Gerekli kolon eksik: {key}',
    deleteExistingFailed: 'Mevcut davetliler silinirken bir hata oluştu',
    invalidEmail: 'E-posta alanı eksik veya geçersiz, lütfen geçerli bir e-posta girin (satır: {row})',
    missingFirstName: 'Ad alanı eksik, lütfen doldurun (satır: {row})',
    missingLastName: 'Soyad alanı eksik, lütfen doldurun (satır: {row})',
    missingQrId: 'QR ID alanı eksik veya geçersiz, lütfen geçerli bir QR ID girin (satır: {row})',
    duplicateEmailInFile: 'Bu e-posta başka bir satırda kullanılıyor (satır: {row})',
    duplicateEmailInDb: 'Bu e-posta zaten veritabanında kayıtlı (satır: {row})',
    duplicateQrIdInDb: 'QR ID başka bir kullanıcı tarafından kullanılıyor. QR ID\'yi düzenleyin veya silin; silerseniz bu kullanıcı için otomatik olarak benzersiz bir QR ID oluşturulacaktır (satır: {row})',
    invalidGuestType: 'Geçersiz veya eksik katılımcı tipi (satır: {row})',
    plusOneNotAllowed: 'PlusOne türü misafirler Excel ile yüklenemez (satır: {row})',
    uploadSuccess: '{count} davetli başarıyla yüklendi',
    retryFailed: 'Tekrar deneme hatası',
    invalidRetryData: 'Geçerli satır verisi sağlanmadı',
    checkInsReset: 'Tüm check-in durumları sıfırlandı',
    participantsReset: 'Tüm davetlilerin katılım ve yanıt durumları sıfırlandı',
    resetAllSuccess: 'Tüm veriler başarıyla silindi',
    rsvpToggled: 'RSVP sistemi {status}',
    rsvpEnabled: 'açıldı',
    rsvpDisabled: 'kapatıldı',
    checkInFailed: 'Check-in işlemi başarısız',
    guestNotFound: 'Davetli bulunamadı',
    qrIdMissing: 'QR ID eksik',
    invalidUsername: 'Geçersiz kullanıcı adı',
    invalidPassword: 'Geçersiz şifre',
    guestAddFailed: 'Davetli eklenemedi',
    guestUpdateFailed: 'Güncelleme başarısız',
    guestDeleteFailed: 'Davetli silinemedi',
    invalidInviter: 'Geçersiz davet eden seçildi',
    inviterHasPlusOne: 'Bu davet edenin zaten bir PlusOne davetlisi var',
    plusOneRequiresInviter: 'PlusOne türü için davet eden seçilmelidir',
    invalidPlusOneQrId: 'Regular veya PlusOne türü için plusOneQrId NA veya boş olmalıdır',
    guestsFetchFailed: 'Davetliler alınamadı',
    invitersFetchFailed: 'Davet edenler alınamadı',
    guestAddSuccess: '{count} davetli başarıyla eklendi',
    emptyFields: 'Tüm alanlar doldurulmalıdır',
    fetchInvitersFailed: 'Davet edenler alınamadı',
    invalidUserData: 'Geçersiz kullanıcı verisi sağlandı',
    invalidRoles: 'Geçersiz roller sağlandı',
    userExists: 'Kullanıcı zaten mevcut',
    userAddSuccess: 'Kullanıcı {username} başarıyla eklendi',
    userAddFailed: 'Kullanıcı eklenemedi',
    usersFetchSuccess: 'Kullanıcılar başarıyla alındı',
    usersFetchFailed: 'Kullanıcılar alınamadı',
    userNotFound: 'Kullanıcı bulunamadı',
    userUpdateSuccess: 'Kullanıcı başarıyla güncellendi',
    userUpdateFailed: 'Kullanıcı güncellenemedi',
    userDeleteSuccess: 'Kullanıcı başarıyla silindi',
    userDeleteFailed: 'Kullanıcı silinemedi',
    resetEventSuccess: 'Etkinlik başarıyla sıfırlandı. Tüm davetliler ve kullanıcılar silindi.',
    resetEventFailed: 'Etkinlik sıfırlanamadı.',
    confirmResetPrompt: 'Etkinliği sıfırlamak ve tüm davetli ile kullanıcı verilerini silmek için aşağıya "sıfırla" yazın.',
    invalidResetInput: 'Geçersiz giriş. Lütfen onaylamak için "sıfırla" yazın.',
    checkInSuccess: 'Check-in işlemi başarılı', // Yeni eklenen çeviri
    telegramNotificationFailed: 'Telegram bildirimi gönderilemedi', // Yeni eklenen çeviri
        telegramStatusFetchFailed: 'Telegram durumu alınamadı',
    telegramToggleFailed: 'Telegram durumu değiştirilemedi',
    telegramToggled: 'Telegram bildirimleri {status}',
    telegramEnabled: 'açık',
    telegramDisabled: 'kapalı',
        tokenRefreshFailed: 'Token yenileme başarısız',
    turnstileVerificationFailed: 'Turnstile doğrulaması başarısız'

  },
  fr: {
    fileNotUploaded: 'Fichier Excel non téléchargé',
    emptyFile: 'Le fichier Excel est vide',
    missingColumn: 'Colonne requise manquante : {key}',
    deleteExistingFailed: 'Échec de la suppression des invités existants',
    invalidEmail: 'Adresse e-mail invalide ou manquante à la ligne {row}',
    missingFirstName: 'Prénom manquant à la ligne {row}',
    missingLastName: 'Nom de famille manquant à la ligne {row}',
    missingQrId: 'ID QR manquant ou invalide à la ligne {row}',
    duplicateEmailInFile: 'Cet e-mail est utilisé dans une autre ligne du fichier (ligne : {row})',
    duplicateEmailInDb: 'Cet e-mail est déjà enregistré dans la base de données (ligne : {row})',
    duplicateQrIdInDb: 'L’ID QR est déjà utilisé par un autre utilisateur. Modifiez l’ID QR ou supprimez-le ; s’il est supprimé, un ID QR unique sera automatiquement généré pour cet utilisateur (ligne : {row})',
    invalidGuestType: 'Type d’invité invalide ou manquant à la ligne {row}',
    plusOneNotAllowed: 'Les invités de type PlusOne ne peuvent pas être téléchargés via Excel (ligne : {row})',
    uploadSuccess: '{count} invités téléchargés avec succès',
    retryFailed: 'Nouvelle tentative échouée',
    invalidRetryData: 'Données de ligne invalides fournies pour la nouvelle tentative',
    checkInsReset: 'Tous les statuts de check-in ont été réinitialisés',
    participantsReset: 'Tous les statuts de participation et de réponse des invités ont été réinitialisés',
    resetAllSuccess: 'Toutes les données ont été supprimées avec succès',
    rsvpToggled: 'Système RSVP {status}',
    rsvpEnabled: 'activé',
    rsvpDisabled: 'désactivé',
    checkInFailed: 'Échec du check-in',
    guestNotFound: 'Invité non trouvé',
    qrIdMissing: 'ID QR manquant',
    invalidUsername: 'Nom d’utilisateur invalide',
    invalidPassword: 'Mot de passe invalide',
    guestAddFailed: 'Échec de l’ajout de l’invité',
    guestUpdateFailed: 'Échec de la mise à jour',
    guestDeleteFailed: 'Échec de la suppression de l’invité',
    invalidInviter: 'Invitant sélectionné invalide',
    inviterHasPlusOne: 'Cet invitant a déjà un invité PlusOne',
    plusOneRequiresInviter: 'Un invitant doit être sélectionné pour le type PlusOne',
    invalidPlusOneQrId: 'L’ID plusOneQrId doit être NA ou vide pour les types Regular ou PlusOne',
    guestsFetchFailed: 'Échec de la récupération des invités',
    invitersFetchFailed: 'Échec de la récupération des invitants',
    guestAddSuccess: '{count} invité(s) ajouté(s) avec succès',
    emptyFields: 'Tous les champs sont requis',
    fetchInvitersFailed: 'Échec de la récupération des invitants',
    invalidUserData: 'Données utilisateur invalides fournies',
    invalidRoles: 'Rôles invalides fournis',
    userExists: 'L’utilisateur existe déjà',
    userAddSuccess: 'Utilisateur {username} ajouté avec succès',
    userAddFailed: 'Échec de l’ajout de l’utilisateur',
    usersFetchSuccess: 'Utilisateurs récupérés avec succès',
    usersFetchFailed: 'Échec de la récupération des utilisateurs',
    userNotFound: 'Utilisateur non trouvé',
    userUpdateSuccess: 'Utilisateur mis à jour avec succès',
    userUpdateFailed: 'Échec de la mise à jour de l’utilisateur',
    userDeleteSuccess: 'Utilisateur supprimé avec succès',
    userDeleteFailed: 'Échec de la suppression de l’utilisateur',
    resetEventSuccess: 'Événement réinitialisé avec succès. Tous les invités et utilisateurs ont été supprimés.',
    resetEventFailed: 'Échec de la réinitialisation de l’événement.',
    confirmResetPrompt: 'Pour réinitialiser l’événement et supprimer toutes les données des invités et utilisateurs, tapez "réinitialiser" ci-dessous.',
    invalidResetInput: 'Entrée invalide. Veuillez taper "réinitialiser" pour confirmer.',
    checkInSuccess: 'Enregistrement réussi', // Yeni eklenen çeviri
    telegramNotificationFailed: 'Échec de l’envoi de la notification Telegram', // Yeni eklenen çeviri
    telegramStatusFetchFailed: 'Échec de la récupération du statut Telegram',
    telegramToggleFailed: 'Échec du changement de statut Telegram',
    telegramToggled: 'Notifications Telegram {status}',
    telegramEnabled: 'activées',
    telegramDisabled: 'désactivées',
        tokenRefreshFailed: 'Échec du rafraîchissement du jeton',
    turnstileVerificationFailed: 'La vérification Turnstile a échoué'

  },
};

// Dil seçim fonksiyonu
const getTranslation = (req, key, params = {}) => {
  const acceptLanguage = req.headers['accept-language']?.toLowerCase();
  let lang = 'tr'; // Varsayılan dil Türkçe
  if (acceptLanguage) {
    if (acceptLanguage.includes('tr')) {
      lang = 'tr';
    } else if (acceptLanguage.includes('fr')) {
      lang = 'fr';
    } else {
      lang = 'en';
    }
  }
  let message = translations[lang][key] || translations.tr[key] || translations.en[key] || key;
  Object.keys(params).forEach((param) => {
    message = message.replace(`{${param}}`, params[param]);
  });
  return message;
};

// Multer ayarları (Excel dosyası yükleme)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
});

// Başlık eşleştirme sözlüğü
const headerMapping = {
  qrId: [
    'qrid', 'qr id', 'qr-id', 'qrid', 'idqr', 'identifiant qr',
  ],
  email: [
    'email', 'e-mail', 'eposta', 'e posta', 'e-posta', 'mail', 'courriel', 'emailaddress', 'email address',
    'epostaadresi', 'adresse e-mail', 'adresse courriel',
  ],
  firstName: [
    'firstname', 'first name', 'first-name', 'name', 'isim', 'ad', 'prenom', 'prénom', 'givenname', 'given name',
    'ilk isim', 'ilkisim', 'premier nom',
  ],
  lastName: [
    'lastname', 'last name', 'last-name', 'surname', 'soyisim', 'soyad', 'nom', 'nomdefamille', 'nom de famille',
    'familyname', 'family name', 'son isim', 'sonisim',
  ],
  guestType: [
    'guesttype', 'guest type', 'type', 'tip', 'katilimcitipi', 'katılımcı tipi',
  ],
  plusOneQrId: [
    'plusoneqrid', 'plus one qr id', 'plus-one-qrid', 'plusone', 'ekqrid', 'ek qr id',
  ],
};

// Başlıkları eşleştirme fonksiyonu
const mapHeaders = (headers) => {
  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[-_\s]/g, ''));
  const mappedHeaders = {};
  Object.keys(headerMapping).forEach((key) => {
    const variations = headerMapping[key].map(v => v.toLowerCase().replace(/[-_\s]/g, ''));
    const matchedHeader = normalizedHeaders.find((header, index) => {
      if (variations.includes(header)) {
        mappedHeaders[key] = headers[index];
        return true;
      }
      return false;
    });
    if (!matchedHeader && key !== 'qrId' && key !== 'plusOneQrId') {
      throw new Error(getTranslation({ headers: { 'accept-language': 'tr' } }, 'missingColumn', { key }));
    }
  });
  return mappedHeaders;
};

// Telegram durumu için global değişken
let telegramEnabled = true;

// Telegram bildirim gönderme fonksiyonu (güncellenmiş)
async function sendTelegramNotification(guest) {
  if (!telegramEnabled) {
    console.log('Telegram notifications are disabled');
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error('Telegram bot token or chat ID is missing');
    return;
  }

  const message = `*New Check-In:*\n🟧 *Name*: ${guest.firstName} ${guest.lastName}\n🟧 *QR ID*: ${guest.qrId}\n🟧 *Type*: ${guest.guestType}\n🟧 *Check-In Time*: ${new Date(guest.checkInTime).toLocaleString('en-GB')}`;

  const maxRetries = 3;
  const retryDelay = 1000; // 1 saniye

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_notification: false
      }, {
        timeout: 5000 // 5 saniye zaman aşımı
      });
      return; // Başarılıysa döngüden çık
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`Telegram notification failed after ${maxRetries} attempts: ${error.message}`);
        return;
      }
      // Rate limit hatası (429) için daha uzun bekleme
      if (error.response && error.response.status === 429) {
        const retryAfter = error.response.data.parameters?.retry_after || 5;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      } else {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
}


router.post('/verify-turnstile', async (req, res) => {
  try {
    const response = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      `secret=${encodeURIComponent(process.env.TURNSTILE_SECRET_KEY)}&response=${encodeURIComponent(token)}`,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    if (response.data.success) {
      res.status(200).json({ success: true });
    } else {
      res.status(400).json({ messageKey: 'turnstileVerificationFailed', params: {}, error: response.data['error-codes'] });
    }
  } catch (error) {
    console.error('Turnstile verification error:', error);
    res.status(500).json({ messageKey: 'turnstileVerificationFailed', params: {}, error: error.message });
  }
});



// Telegram durumu alma
router.get('/telegram-status', async (req, res) => {
  try {
    res.status(200).json({ telegramEnabled });
  } catch (error) {
    console.error('Telegram durumu alma hatası:', error);
    res.status(500).json({ messageKey: 'telegramStatusFetchFailed', params: {}, error: error.message });
  }
});

// Telegram bildirimlerini açma/kapama
router.post('/toggle-telegram', authMiddleware, requireRole(['Admin', 'Editor']), async (req, res) => {
  try {
    telegramEnabled = !telegramEnabled;
    res.status(200).json({
      telegramEnabled,
      messageKey: 'telegramToggled',
      params: {
        status: telegramEnabled ? getTranslation(req, 'telegramEnabled') : getTranslation(req, 'telegramDisabled'),
      },
    });
  } catch (error) {
    console.error('Telegram durumu değiştirme hatası:', error);
    res.status(500).json({
      messageKey: 'telegramToggleFailed',
      params: {},
      error: error.message,
    });
  }
});


// Telegram bildirim gönderme fonksiyonu
async function sendTelegramNotification(guest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error('Telegram bot token or chat ID is missing');
    return;
  }

  const message = `*New Check-In:*\n🟧 *Name*: ${guest.firstName} ${guest.lastName}\n🟧 *QR ID*: ${guest.qrId}\n🟧 *Type*: ${guest.guestType}\n🟧 *Check-In Time*: ${new Date(guest.checkInTime).toLocaleString('en-GB')}`;

  const maxRetries = 3;
  const retryDelay = 1000; // 1 saniye

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_notification: false
      }, {
        timeout: 5000 // 5 saniye zaman aşımı
      });
      return; // Başarılıysa döngüden çık
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`Telegram notification failed after ${maxRetries} attempts: ${error.message}`);
        return;
      }
      // Rate limit hatası (429) için daha uzun bekleme
      if (error.response && error.response.status === 429) {
        const retryAfter = error.response.data.parameters?.retry_after || 5;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      } else {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
}

router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    const { username, roles } = req.user;
    const newToken = jwt.sign({ username, roles }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token: newToken, roles });
  } catch (error) {
    console.error('Token yenileme hatası:', error);
    res.status(500).json({ messageKey: 'tokenRefreshFailed', params: {}, error: error.message });
  }
});


// Admin login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Admin kullanıcısı için kontrol
  if (username === process.env.ADMIN_USERNAME) {
    const isMatch = await bcrypt.compare(password, process.env.ADMIN_PASSWORD);
    if (!isMatch) {
      return res.status(401).json({ messageKey: 'invalidPassword', params: {} });
    }
    const token = jwt.sign({ username, roles: ['Admin'] }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token, roles: ['Admin'] });
  }

  // Diğer kullanıcılar için kontrol
  const user = await User.findOne({ username });
  if (!user) {
    return res.status(401).json({ messageKey: 'invalidUsername', params: {} });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ messageKey: 'invalidPassword', params: {} });
  }

  const token = jwt.sign({ username, roles: user.roles }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, roles: user.roles });
});

// Eventi sıfırlama endpoint'i
router.delete('/event/end', authMiddleware, requireRole(['Admin']), async (req, res) => {
  try {
    await Promise.all([
      Guest.deleteMany({}),
      User.deleteMany({})
    ]);
    res.status(200).json({ messageKey: 'resetEventSuccess', params: {} });
  } catch (error) {
    console.error('Etkinlik sonlandırma hatası:', error);
    res.status(500).json({ messageKey: 'resetEventFailed', params: {}, error: error.message });
  }
});

// Davetli ekleme
router.post('/guests', authMiddleware, requireRole(['Admin', 'Editor', 'ParticipantEditor','GuestEditor']), async (req, res) => {
  try {
    const { firstName, lastName, email, guestType, selectedInviterId } = req.body;
    if (!firstName || !lastName || !email || !guestType) {
      return res.status(400).json({ messageKey: 'emptyFields', params: {} });
    }
    if (guestType === 'PLUSONE' && !selectedInviterId) {
      return res.status(400).json({ messageKey: 'plusOneRequiresInviter', params: {} });
    }

    let qrId = await generateQrId();

    if (guestType === 'PLUSONE') {
      const inviter = await Guest.findById(selectedInviterId);
      if (!inviter || !['EMPLOYEE', 'VIP'].includes(inviter.guestType)) {
        return res.status(400).json({ messageKey: 'invalidInviter', params: {} });
      }
      if (inviter.plusOneQrId) {
        return res.status(400).json({ messageKey: 'inviterHasPlusOne', params: {} });
      }

      const guestId = new mongoose.Types.ObjectId();
      const guest = new Guest({
        _id: guestId,
        firstName: firstName.toUpperCase(),
        lastName: lastName.toUpperCase(),
        email: email.toLowerCase(),
        guestType,
        qrId,
        plusOneQrId: null,
        selectedInviterId,
        responded: true, // PLUSONE için responded true
        willAttend: true, // PLUSONE için willAttend true
        isCheckedIn: false,
        checkInTime: null,
      });
      await guest.save();

      await Guest.findByIdAndUpdate(
        selectedInviterId,
        { 
          plusOneQrId: qrId, // Davet edenin plusOneQrId'si yeni qrId ile güncelleniyor
          responded: true, // Davet eden için responded true
          willAttend: true, // Davet eden için willAttend true
          isCheckedIn: false, 
          checkInTime: null 
        },
        { new: true }
      );

      res.status(201).json({ guest, messageKey: 'guestAddSuccess', params: { count: 1 } });
    } else {
      const guestId = new mongoose.Types.ObjectId();
      const guest = new Guest({
        _id: guestId,
        firstName: firstName.toUpperCase(),
        lastName: lastName.toUpperCase(),
        email: email.toLowerCase(),
        guestType,
        qrId,
        plusOneQrId: null,
        selectedInviterId: null,
        responded: false,
        willAttend: false,
        isCheckedIn: false,
        checkInTime: null,
      });
      await guest.save();
      res.status(201).json({ guest, messageKey: 'guestAddSuccess', params: { count: 1 } });
    }
  } catch (error) {
    console.error('Davetli ekleme hatası:', error);
    res.status(400).json({ messageKey: 'guestAddFailed', params: {}, error: error.message });
  }
});

// Davetli listeleme (sayfalama ve arama)
router.get('/guests', authMiddleware, requireRole(['Admin', 'Editor', 'ParticipantEditor','CheckInEditor','GuestEditor']), async (req, res) => {
  const { page = 1, limit = 10, search = '', attending } = req.query;
  const query = {
    ...(search && {
      $or: [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ],
    }),
    ...(attending === 'true' && { willAttend: true }),
  };

  try {
    if (!Guest || typeof Guest.find !== 'function') {
      throw new Error(getTranslation(req, 'guestsFetchFailed'));
    }

    if (limit === 'all') {
      const guests = await Guest.find(query)
        .sort({ firstName: 1 })
        .exec();
      return res.json({ guests, totalPages: 1, currentPage: 1, messageKey: 'guestsFetchSuccess', params: {} });
    }

    const guests = await Guest.find(query)
      .sort({ firstName: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    const count = await Guest.countDocuments(query);
    res.json({
      guests,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      messageKey: 'guestsFetchSuccess',
      params: {},
    });
  } catch (error) {
    console.error('Davetli listeleme hatası:', error);
    res.status(500).json({ messageKey: 'guestsFetchFailed', params: {}, error: error.message });
  }
});

// Davet edenleri listeleme (VIP ve EMPLOYEE, plusOneQrId null olanlar)
router.get('/guests/employee-vip', authMiddleware, requireRole(['Admin', 'Editor', 'ParticipantEditor', 'GuestEditor']), async (req, res) => {
  try {
    const { search } = req.query;
    console.log('Davet edenleri listeleme isteği alındı, search:', search); // Hata ayıklama

    // Sorgu koşulları
    const query = {
      guestType: { $in: ['EMPLOYEE', 'VIP'] },
      $or: [
        { plusOneQrId: null },
        { plusOneQrId: '' },
        { plusOneQrId: { $exists: false } }
      ]
    };

    // Arama parametresi varsa ekle
    if (search && search.trim() !== '') {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    console.log('Oluşturulan sorgu:', JSON.stringify(query)); // Sorguyu logla
    const inviters = await Guest.find(query).select('firstName lastName email guestType');
    console.log('Bulunan davet edenler:', inviters); // Sonuçları logla

    if (inviters.length === 0) {
      console.log('Hiçbir davet eden bulunamadı. Veritabanı kontrol edilmeli.');
    }

    res.json({ inviters, messageKey: 'invitersFetchSuccess', params: {} });
  } catch (error) {
    console.error('Davet eden listeleme hatası:', error.message, error.stack);
    res.status(500).json({ messageKey: 'fetchInvitersFailed', params: {}, error: error.message });
  }
});

// Davetli güncelleme
router.put('/guests/:id', authMiddleware, requireRole(['Admin', 'Editor', 'ParticipantEditor', 'CheckInEditor', 'GuestEditor']), async (req, res) => {
  try {
    const { firstName, lastName, email, guestType, plusOneQrId, selectedInviterId } = req.body;
    
    const guest = await Guest.findById(req.params.id);
    if (!guest) {
      return res.status(404).json({ messageKey: 'guestNotFound', params: {} });
    }

    // Sadece gönderilen alanları güncelle
    const updatedFields = {};
    if (firstName !== undefined) updatedFields.firstName = firstName.toUpperCase();
    if (lastName !== undefined) updatedFields.lastName = lastName.toUpperCase();
    if (email !== undefined) updatedFields.email = email.toLowerCase();
    if (guestType !== undefined) updatedFields.guestType = guestType;
    if (plusOneQrId !== undefined) {
      if (['REGULAR', 'PLUSONE'].includes(guestType || guest.guestType) && plusOneQrId && plusOneQrId !== 'NA') {
        return res.status(400).json({ messageKey: 'invalidPlusOneQrId', params: {} });
      }
      updatedFields.plusOneQrId = plusOneQrId;
    }
    if (selectedInviterId !== undefined) {
      updatedFields.selectedInviterId = guestType === 'PLUSONE' ? selectedInviterId : null;
    }
    if (guestType === 'PLUSONE') {
      updatedFields.responded = true;
      updatedFields.willAttend = true;
    }

    // Güncelleme işlemini gerçekleştir
    const updatedGuest = await Guest.findByIdAndUpdate(
      req.params.id,
      { $set: updatedFields },
      { new: true }
    );

    // Eğer guestType PLUSONE ise ve selectedInviterId gönderildiyse, davet edenin durumunu güncelle
    if (guestType === 'PLUSONE' && selectedInviterId) {
      const inviter = await Guest.findById(selectedInviterId);
      if (!inviter || !['EMPLOYEE', 'VIP'].includes(inviter.guestType)) {
        return res.status(400).json({ messageKey: 'invalidInviter', params: {} });
      }
      await Guest.findByIdAndUpdate(selectedInviterId, { responded: true, willAttend: true }, { new: true });
    }

    res.json({ guest: updatedGuest, messageKey: 'guestUpdateSuccess', params: {} });
  } catch (error) {
    console.error('Davetli güncelleme hatası:', error.message, error.stack);
    res.status(500).json({ messageKey: 'guestUpdateFailed', params: {}, error: error.message });
  }
});

// Davetli silme
router.delete('/guests/:id', authMiddleware, requireRole(['Admin', 'Editor', 'ParticipantEditor','GuestEditor']), async (req, res) => {
  try {
    const guest = await Guest.findById(req.params.id);
    if (!guest) {
      return res.status(404).json({ messageKey: 'guestNotFound', params: {} });
    }

    await Guest.findByIdAndDelete(req.params.id);

    if (guest.plusOneQrId && guest.plusOneQrId !== 'NA') {
      const plusOneGuest = await Guest.findOne({ qrId: guest.plusOneQrId, guestType: 'PLUSONE' });
      if (plusOneGuest) {
        await Guest.findByIdAndDelete(plusOneGuest._id);
      }
    }

    if (guest.guestType === 'PLUSONE') {
      const inviter = await Guest.findOne({ plusOneQrId: guest.qrId });
      if (inviter) {
        await Guest.findByIdAndUpdate(inviter._id, { plusOneQrId: null }, { new: true });
      }
    }

    res.json({ messageKey: 'guestDeleteSuccess', params: {} });
  } catch (error) {
    console.error('Davetli silme hatası:', error);
    res.status(500).json({ messageKey: 'guestDeleteFailed', params: {}, error: error.message });
  }
});

// Excel ile Guest yükleme
router.post('/guests/upload', authMiddleware, requireRole(['Admin', 'Editor', 'ParticipantEditor',]), upload.single('file'), async (req, res) => {
  try {
    const { deleteExisting } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: getTranslation(req, 'fileNotUploaded') });
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: false });

    if (data.length === 0) {
      return res.status(400).json({ message: getTranslation(req, 'emptyFile') });
    }

    const headers = Object.keys(data[0]);
    const mappedHeaders = mapHeaders(headers);

    const shouldDeleteExisting = deleteExisting === 'true' || deleteExisting === true;
    if (shouldDeleteExisting) {
      try {
        const deleteResult = await Guest.deleteMany({});
        console.log(`Mevcut davetliler silindi. Silinen kayıt sayısı: ${deleteResult.deletedCount}`);
      } catch (deleteError) {
        console.error('Mevcut davetlileri silme hatası:', deleteError);
        return res.status(500).json({ message: getTranslation(req, 'deleteExistingFailed') });
      }
    }

    const guests = [];
    const errors = [];
    const emailSet = new Set();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowErrors = [];
      const errorFields = [];
      let qrId;

      try {
        const emailKey = mappedHeaders.email.toLowerCase().replace(/[-_\s]/g, '');
        const firstNameKey = mappedHeaders.firstName.toLowerCase().replace(/[-_\s]/g, '');
        const lastNameKey = mappedHeaders.lastName.toLowerCase().replace(/[-_\s]/g, '');
        const guestTypeKey = mappedHeaders.guestType ? mappedHeaders.guestType.toLowerCase().replace(/[-_\s]/g, '') : null;
        const qrIdKey = mappedHeaders.qrId ? mappedHeaders.qrId.toLowerCase().replace(/[-_\s]/g, '') : null;

        const email = row[mappedHeaders.email]?.toString().trim() || '';
        const firstName = row[mappedHeaders.firstName]?.toString().trim();
        const lastName = row[mappedHeaders.lastName]?.toString().trim();
        const guestType = guestTypeKey ? row[mappedHeaders.guestType]?.toString().trim() : null;
        qrId = qrIdKey ? row[mappedHeaders.qrId]?.toString().trim() : '';

        console.log(`Row ${i + 2} - Raw email value:`, row[mappedHeaders.email], 'Processed email:', email);

        // Tüm hata kontrollerini sırayla yapalım
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          rowErrors.push(getTranslation(req, 'invalidEmail', { row: i + 2 }));
          errorFields.push('email');
        }
        if (!firstName) {
          rowErrors.push(getTranslation(req, 'missingFirstName', { row: i + 2 }));
          errorFields.push('firstName');
        }
        if (!lastName) {
          rowErrors.push(getTranslation(req, 'missingLastName', { row: i + 2 }));
          errorFields.push('lastName');
        }
        if (email && emailSet.has(email.toLowerCase())) {
          rowErrors.push(getTranslation(req, 'duplicateEmailInFile', { row: i + 2 }));
          errorFields.push('email');
        }
        if (email && await Guest.findOne({ email: email.toLowerCase() })) {
          rowErrors.push(getTranslation(req, 'duplicateEmailInDb', { row: i + 2 }));
          errorFields.push('email');
        }
        // guestType kontrolü: Enum değerleriyle eşleşmiyorsa hata ver
        const validGuestTypes = ['REGULAR', 'VIP', 'EMPLOYEE'];
        if (!guestType || !validGuestTypes.includes(guestType.toUpperCase())) {
          rowErrors.push(getTranslation(req, 'invalidGuestType', { row: i + 2 }));
          errorFields.push('guestType');
        }
        if (guestType && guestType.toUpperCase() === 'PLUSONE') {
          rowErrors.push(getTranslation(req, 'plusOneNotAllowed', { row: i + 2 }));
          errorFields.push('guestType');
        }
        if (qrId && (await Guest.findOne({ qrId }))) {
          rowErrors.push(getTranslation(req, 'duplicateQrIdInDb', { row: i + 2 }));
          errorFields.push('qrId');
        }

        // Eğer hata varsa, hata mesajlarını ve alanları kaydet
        if (rowErrors.length > 0) {
          throw new Error('Multiple errors');
        }

        // Eğer qrId boşsa, otomatik olarak üret
        if (!qrId) {
          qrId = await generateQrId();
        }

        emailSet.add(email.toLowerCase());
        guests.push({
          qrId,
          email: email.toLowerCase(),
          firstName: firstName.toUpperCase(),
          lastName: lastName.toUpperCase(),
          guestType: guestType.toUpperCase(),
          plusOneQrId: null,
          responded: false,
          willAttend: false,
          isCheckedIn: false,
          checkInTime: null,
        });
      } catch (error) {
        errors.push({
          row: i + 2,
          data: {
            [mappedHeaders.qrId || 'qrId']: row[mappedHeaders.qrId] || '',
            [mappedHeaders.email || 'E-mail']: row[mappedHeaders.email] || '', // Zorla ekleme
            [mappedHeaders.firstName || 'First Name']: row[mappedHeaders.firstName] || '',
            [mappedHeaders.lastName || 'Last Name']: row[mappedHeaders.lastName] || '',
            [mappedHeaders.guestType || 'Guest Type']: row[mappedHeaders.guestType] || '',
          },
          errors: rowErrors,
          errorFields: errorFields,
        });
      }
    }

    let insertedCount = 0;
    if (guests.length > 0) {
      await Guest.insertMany(guests);
      insertedCount = guests.length;
    }

    res.status(200).json({
      message: getTranslation(req, 'uploadSuccess', { count: insertedCount }),
      errors: errors.length > 0 ? errors : null,
    });
  } catch (error) {
    console.error('Katılımcı Excel yükleme hatası:', error);
    res.status(500).json({ message: getTranslation(req, 'retryFailed') });
  }
});

// Düzenlenmiş satırları tekrar deneme
router.post('/guests/upload/retry', authMiddleware, requireRole(['Admin', 'Editor', 'ParticipantEditor']), async (req, res) => {
  try {
    const { rows } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: getTranslation(req, 'invalidRetryData') });
    }

    console.log('Received rows for retry:', rows);

    const guests = [];
    const errors = [];
    const emailSet = new Set();
    const successfulRows = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowErrors = [];
      const errorFields = [];
      let qrId = row.qrId;

      try {
        const { email, firstName, lastName, row: rowNumber, guestType } = row;

        // Tüm hata kontrollerini sırayla yapalım
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          rowErrors.push(getTranslation(req, 'invalidEmail', { row: rowNumber }));
          errorFields.push('email');
        }
        if (!firstName) {
          rowErrors.push(getTranslation(req, 'missingFirstName', { row: rowNumber }));
          errorFields.push('firstName');
        }
        if (!lastName) {
          rowErrors.push(getTranslation(req, 'missingLastName', { row: rowNumber }));
          errorFields.push('lastName');
        }
        if (emailSet.has(email.toLowerCase())) {
          rowErrors.push(getTranslation(req, 'duplicateEmailInFile', { row: rowNumber }));
          errorFields.push('email');
        }
        const existingGuest = await Guest.findOne({ email: email.toLowerCase() });
        if (existingGuest) {
          rowErrors.push(getTranslation(req, 'duplicateEmailInDb', { row: rowNumber }));
          errorFields.push('email');
        }
        // guestType kontrolü: Enum değerleriyle eşleşmiyorsa hata ver
        const validGuestTypes = ['REGULAR', 'VIP', 'EMPLOYEE'];
        if (!guestType || !validGuestTypes.includes(guestType.toUpperCase())) {
          rowErrors.push(getTranslation(req, 'invalidGuestType', { row: rowNumber }));
          errorFields.push('guestType');
        }
        if (guestType && guestType.toUpperCase() === 'PLUSONE') {
          rowErrors.push(getTranslation(req, 'plusOneNotAllowed', { row: rowNumber }));
          errorFields.push('guestType');
        }
        if (qrId && (await Guest.findOne({ qrId }))) {
          rowErrors.push(getTranslation(req, 'duplicateQrIdInDb', { row: rowNumber }));
          errorFields.push('qrId');
        }

        // Eğer hata varsa, hata mesajlarını ve alanları kaydet
        if (rowErrors.length > 0) {
          throw new Error('Multiple errors');
        }

        // Eğer qrId boşsa, otomatik olarak üret
        if (!qrId) {
          qrId = await generateQrId();
        }

        emailSet.add(email.toLowerCase());
        guests.push({
          qrId,
          email: email.toLowerCase(),
          firstName: firstName.toUpperCase(),
          lastName: lastName.toUpperCase(),
          guestType: guestType.toUpperCase(),
          plusOneQrId: null,
          responded: false,
          willAttend: false,
          isCheckedIn: false,
          checkInTime: null,
        });
        successfulRows.push({ index: i, row: rowNumber });
      } catch (error) {
        errors.push({
          row: row.row,
          data: {
            qrId: row.qrId || '',
            email: row.email || '',
            firstName: row.firstName || '',
            lastName: row.lastName || '',
            guestType: row.guestType || '',
          },
          errors: rowErrors,
          errorFields: errorFields,
        });
      }
    }

    let insertedCount = 0;
    if (guests.length > 0) {
      await Guest.insertMany(guests);
      insertedCount = guests.length;
    }

    console.log('Retry result - Successful:', successfulRows, 'Errors:', errors);

    res.status(200).json({
      message: getTranslation(req, 'uploadSuccess', { count: insertedCount }),
      successfulRows,
      errors: errors.length > 0 ? errors : null,
    });
  } catch (error) {
    console.error('Katılımcı tekrar deneme hatası:', error);
    res.status(500).json({ message: getTranslation(req, 'retryFailed') });
  }
});

// Check-in durumlarını sıfırlama
router.post('/participants/reset-checkins', authMiddleware, requireRole(['Admin', 'Editor', 'CheckInEditor']), async (req, res) => {
  try {
    await Guest.updateMany({}, { isCheckedIn: false, checkInTime: null });
    res.status(200).json({ messageKey: 'checkInsReset', params: {} });
  } catch (error) {
    console.error('Check-in sıfırlama hatası:', error);
    res.status(500).json({ messageKey: 'checkInFailed', params: {}, error: error.message });
  }
});

// Tüm davetlileri silme
router.delete('/participants', authMiddleware, requireRole(['Admin', 'Editor', 'ParticipantEditor']), async (req, res) => {
  try {
    await Guest.updateMany({}, { willAttend: false, responded: false });
    res.status(200).json({ messageKey: 'participantsReset', params: {} });
  } catch (error) {
    console.error('Davetli durum sıfırlama hatası:', error);
    res.status(500).json({ messageKey: 'guestDeleteFailed', params: {}, error: error.message });
  }
});

// QR kod ile check-in
router.post('/checkin', authMiddleware, requireRole(['Admin', 'Editor', 'CheckInEditor']), async (req, res) => {
  const { qrId } = req.body;
  console.log('Gelen QR ID:', qrId);
  if (!qrId) {
    return res.status(400).json({ messageKey: 'qrIdMissing', params: {} });
  }
  try {
    const guest = await Guest.findOne({ qrId });
    console.log('Bulunan davetli:', guest);
    if (!guest || !guest.willAttend) {
      return res.status(404).json({ messageKey: 'guestNotFound', params: {} });
    }
    const alreadyCheckedIn = guest.isCheckedIn === true;
    if (!alreadyCheckedIn) {
      guest.isCheckedIn = true;
      guest.checkInTime = new Date();
      await guest.save();
      if(telegramEnabled){
        await sendTelegramNotification(guest);
        }
    }
    console.log('Yanıt gönderiliyor:', { guest, alreadyCheckedIn });
    res.status(200).json({ 
      guest: {
        _id: guest._id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        guestType: guest.guestType,
        isCheckedIn: guest.isCheckedIn,
        checkInTime: guest.checkInTime,
        qrId: guest.qrId,
        email: guest.email
      }, 
      alreadyCheckedIn, 
      messageKey: 'checkInSuccess', 
      params: {} 
    });
  } catch (error) {
    console.error('Check-in hatası:', error);
    res.status(500).json({ messageKey: 'checkInFailed', params: {}, error: error.message });
  }
});

// Etkinlik sonunda tüm verileri silme
router.delete('/reset-all', authMiddleware, requireRole(['Admin', 'GuestEditor']), async (req, res) => {
  try {
    await Guest.deleteMany({});
    res.status(200).json({ messageKey: 'resetAllSuccess', params: {} });
  } catch (error) {
    console.error('Tüm veri silme hatası:', error);
    res.status(500).json({ messageKey: 'guestDeleteFailed', params: {}, error: error.message });
  }
});

// Katılacak - Katılmayacak End Pointi
router.put('/guests/:id/toggle-attend', authMiddleware, requireRole(['Admin', 'Editor', 'ParticipantEditor','GuestEditor']), async (req, res) => {
  try {
    const guest = await Guest.findById(req.params.id);
    if (!guest) {
      return res.status(404).json({ messageKey: 'guestNotFound', params: {} });
    }

    guest.willAttend = !guest.willAttend;
    await guest.save();

    res.json({ guest, messageKey: 'guestUpdateSuccess', params: {} });
  } catch (error) {
    console.error('Davetli katılım durumu güncelleme hatası:', error);
    res.status(500).json({ messageKey: 'guestUpdateFailed', params: {}, error: error.message });
  }
});

// Kullanıcı oluşturma
router.post('/users', authMiddleware, requireRole(['Admin', 'UserEditor']), async (req, res) => {
  try {
    const { username, password, roles } = req.body;
    if (!username || !password || !roles || !Array.isArray(roles)) {
      return res.status(400).json({ messageKey: 'invalidUserData', params: {} });
    }
    const validRoles = ['Admin', 'Editor', 'UserEditor', 'GuestEditor', 'ParticipantEditor', 'CheckInEditor'];
    if (!roles.every(role => validRoles.includes(role))) {
      return res.status(400).json({ messageKey: 'invalidRoles', params: {} });
    }
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ messageKey: 'userExists', params: {} });
    }
    const user = new User({ username, password, roles });
    await user.save();
    res.status(201).json({ messageKey: 'userAddSuccess', params: { username } });
  } catch (error) {
    console.error('Kullanıcı ekleme hatası:', error);
    res.status(500).json({ messageKey: 'userAddFailed', params: {}, error: error.message });
  }
});

// Kullanıcı listeleme
router.get('/users', authMiddleware, requireRole(['Admin', 'UserEditor']), async (req, res) => {
  try {
    const users = await User.find().select('username roles createdAt');
    res.json({ users, messageKey: 'usersFetchSuccess', params: {} });
  } catch (error) {
    console.error('Kullanıcı listeleme hatası:', error);
    res.status(500).json({ messageKey: 'usersFetchFailed', params: {}, error: error.message });
  }
});

// Kullanıcı güncelleme
router.put('/users/:id', authMiddleware, requireRole(['Admin', 'UserEditor']), async (req, res) => {
  try {
    const { username, password, roles } = req.body;
    const validRoles = ['Admin', 'Editor', 'UserEditor', 'GuestEditor', 'ParticipantEditor', 'CheckInEditor'];
    if (roles && !roles.every(role => validRoles.includes(role))) {
      return res.status(400).json({ messageKey: 'invalidRoles', params: {} });
    }
    const updateData = {};
    if (username) updateData.username = username;
    if (password) updateData.password = password;
    if (roles) updateData.roles = roles;
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!user) {
      return res.status(404).json({ messageKey: 'userNotFound', params: {} });
    }
    res.json({ user, messageKey: 'userUpdateSuccess', params: {} });
  } catch (error) {
    console.error('Kullanıcı güncelleme hatası:', error);
    res.status(500).json({ messageKey: 'userUpdateFailed', params: {}, error: error.message });
  }
});

// Kullanıcı silme
router.delete('/users/:id', authMiddleware, requireRole(['Admin', 'UserEditor']), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ messageKey: 'userNotFound', params: {} });
    }
    res.json({ messageKey: 'userDeleteSuccess', params: {} });
  } catch (error) {
    console.error('Kullanıcı silme hatası:', error);
    res.status(500).json({ messageKey: 'userDeleteFailed', params: {}, error: error.message });
  }
});

// E-posta kontrolü için yeni endpoint
router.get('/check-email', async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ messageKey: 'invalidEmail', params: {} });
  }
  try {
    const existingGuest = await Guest.findOne({ email: email.toLowerCase() });
    if (existingGuest) {
      return res.status(400).json({ messageKey: 'duplicateEmailInDb', params: {} });
    }
    res.status(200).json({ isAvailable: true });
  } catch (error) {
    console.error('E-posta kontrol hatası:', error);
    res.status(500).json({ messageKey: 'error', params: {}, error: error.message });
  }
});



module.exports = router;
