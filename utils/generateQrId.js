const { v4: uuidv4 } = require('uuid');
const Guest = require('../models/Guest');

const generateQrId = async () => {
  const maxAttempts = 10;
  let attempts = 0;
  let qrId;
  let isUnique = false;

  while (!isUnique && attempts < maxAttempts) {
    qrId = uuidv4().replace(/-/g, '').slice(0, 10).toUpperCase();
    // Hem Guest hem Participant koleksiyonlarında qrId'yi kontrol et
    const existingGuest = await Guest.findOne({ qrId });
    if (!existingGuest) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Benzersiz QR ID oluşturulamadı, lütfen tekrar deneyin.');
  }

  return qrId;
};

module.exports = generateQrId;