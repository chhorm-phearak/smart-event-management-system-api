const express = require('express');
const {
  create,
  update,
  remove,
  getById,
  getAll,
  getManagedSummary,
  getAllRegistered,
  getAllByGroup,
  uploadEventImage,
  getImages,
  removeImage,
  getStaffList,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  registerForEvent,
  processCheckIn,
  getQRCodeImage,
  checkInByRegistration,
  removeUserFromEvent,
} = require('../controllers/eventController');
const {
  getAll: getAgendaList,
  getById: getAgendaById,
  create: createAgenda,
  update: updateAgenda,
  remove: deleteAgenda,
} = require('../controllers/agendaController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// All event routes require authentication
router.get('/', authMiddleware, getAll);
router.get('/managed/summary', authMiddleware, getManagedSummary);
router.get('/registered', authMiddleware, getAllRegistered);
router.get('/group/:group_id', authMiddleware, getAllByGroup);
router.post('/', authMiddleware, create);
router.get('/:id', authMiddleware, getById);
router.put('/:id', authMiddleware, update);
router.delete('/:id', authMiddleware, remove);
// Register logged-in user for event (no body needed)
router.post('/:id/register', authMiddleware, registerForEvent);
// Remove user from event by registration ID (organizer only)
router.delete('/registrations/:registrationId', authMiddleware, removeUserFromEvent);
// Event images
router.get('/:id/images', authMiddleware, getImages);
router.post('/:id/images', authMiddleware, uploadEventImage);
router.delete('/:id/images/:imageId', authMiddleware, removeImage);
// Event agenda CRUD
router.get('/:id/agenda', authMiddleware, getAgendaList);
router.get('/:id/agenda/:agendaId', authMiddleware, getAgendaById);
router.post('/:id/agenda', authMiddleware, createAgenda);
router.put('/:id/agenda/:agendaId', authMiddleware, updateAgenda);
router.delete('/:id/agenda/:agendaId', authMiddleware, deleteAgenda);
// Event staff CRUD
router.get('/:id/staff', authMiddleware, getStaffList);
router.get('/:id/staff/:staffId', authMiddleware, getStaffById);
router.post('/:id/staff', authMiddleware, createStaff);
router.put('/:id/staff/:staffId', authMiddleware, updateStaff);
router.delete('/:id/staff/:staffId', authMiddleware, deleteStaff);

// QR Code and Check-in routes
router.post('/checkin', authMiddleware, processCheckIn);
router.post('/checkin/:registration_id', authMiddleware, checkInByRegistration);
router.get('/qr/:registration_id', authMiddleware, getQRCodeImage);

module.exports = router;

