const axios = require('axios');

const verifyRecaptcha = async (req, res, next) => {
  console.log('verifyRecaptcha middleware called');
  const recaptchaToken = req.headers['x-recaptcha-token'] || req.body.recaptchaToken;
  console.log('Received reCAPTCHA Token:', recaptchaToken);
  if (!recaptchaToken) {
    console.log('reCAPTCHA Token Missing');
    return res.status(400).json({ message: 'please_complete_recaptcha' });
  }
  try {
    console.log('Sending reCAPTCHA verification request');
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: recaptchaToken,
        },
      }
    );
    console.log('reCAPTCHA API Response:', JSON.stringify(response.data, null, 2));
    const { success, score, 'error-codes': errorCodes } = response.data;
    if (!success || score < 0.5) {
      console.log('reCAPTCHA Validation Failed:', { errorCodes, score });
      return res.status(400).json({ message: 'invalid_recaptcha', details: errorCodes });
    }
    console.log('reCAPTCHA Validation Successful, Score:', score);
    next();
  } catch (error) {
    console.error('reCAPTCHA Error:', error.message);
    res.status(500).json({ message: 'serverError', error: error.message });
  }
};

module.exports = { verifyRecaptcha };