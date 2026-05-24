const express = require('express');
const router = express.Router();
const {
  createGroup, getGroups, getGroup, updateGroup, deleteGroup,
  addMember, removeMember, groupValidation,
  generateInviteLink, previewInvite, joinByToken, revokeInvite,
  exportGroupPDF,
} = require('../controllers/groupController');
const { verifyJWT } = require('../middleware/authMiddleware');

// Public invite preview route (no auth)
router.get('/join/:token', previewInvite);

// All routes below require JWT
router.use(verifyJWT);

// Join via invite token (JWT required)
router.post('/join/:token', joinByToken);

router.post('/', groupValidation, createGroup);
router.get('/', getGroups);
router.get('/:id', getGroup);
router.put('/:id', groupValidation, updateGroup);
router.delete('/:id', deleteGroup);

router.post('/:id/members', addMember);
router.delete('/:id/members/:uid', removeMember);

// Invite link management
router.post('/:id/invite-link', generateInviteLink);
router.post('/:id/revoke-invite', revokeInvite);

// PDF export
router.get('/:id/export-pdf', exportGroupPDF);

module.exports = router;
