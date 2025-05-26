const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  guestType: { 
    type: String, 
    required: true, 
    enum: ['EMPLOYEE', 'REGULAR', 'VIP', 'PLUSONE'],
  },
  qrId: { type: String, required: true, unique: true },
  plusOneQrId: { type: String, default: null },
  responded: { type: Boolean, default: false },
  willAttend: { type: Boolean, default: false },
  isCheckedIn: { type: Boolean, default: false },
  checkInTime: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

// Kayıt öncesi dönüşüm middleware'i
guestSchema.pre('save', function (next) {
  if (this.firstName) this.firstName = this.firstName.toUpperCase();
  if (this.lastName) this.lastName = this.lastName.toUpperCase();
  if (this.email) this.email = this.email.toLowerCase();
  next();
});

// Kaydetmeden önce plusOneQrId kontrolü
guestSchema.pre('save', function (next) {
  if (this.guestType === 'Regular' || this.guestType === 'PlusOne') {
    this.plusOneQrId = null;
  }
  next();
});

module.exports = mongoose.model('Guest', guestSchema);