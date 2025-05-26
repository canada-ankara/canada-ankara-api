// utils/rsvpStatus.js
let rsvpEnabled = true;

const getRsvpStatus = () => rsvpEnabled;
const setRsvpStatus = (status) => {
  rsvpEnabled = status;
};

module.exports = { getRsvpStatus, setRsvpStatus };