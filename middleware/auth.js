const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Token doğrulama middleware'i
const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Admin kullanıcısı için kontrol
    if (decoded.username === process.env.ADMIN_USERNAME) {
      req.user.roles = ['Admin'];
      return next();
    }

    // Diğer kullanıcılar için rollerini çek
    const user = await User.findOne({ username: decoded.username });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user.roles = user.roles;
    next();
  } catch (error) {
    console.error('Token doğrulama hatası:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Rol tabanlı yetkilendirme middleware'i
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({ message: 'Access denied: No roles found' });
    }

    const hasRole = req.user.roles.some(role => roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ message: `Access denied: Requires one of the following roles: ${roles.join(', ')}` });
    }
    next();
  };
};

// Doğru dışa aktarma
module.exports = { authMiddleware, requireRole };