const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  roles: [{ 
    type: String, 
    enum: ['Admin', 'Editor', 'UserEditor', 'GuestEditor', 'ParticipantEditor', 'CheckInEditor'],
    default: [] 
  }],
  createdAt: { type: Date, default: Date.now },
});

// Şifre hashleme middleware'i
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const bcrypt = require('bcryptjs');
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);