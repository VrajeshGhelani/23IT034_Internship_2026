const express = require('express');
const router = express.Router({ mergeParams: true });
const { addExpense, getExpenses, updateExpense, deleteExpense, replaceReceipt, expenseValidation } = require('../controllers/expenseController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { uploadReceipt } = require('../middleware/upload');

router.use(verifyJWT);

// Group-scoped
router.post('/', uploadReceipt, addExpense);
router.get('/', getExpenses);

// Global expense routes (mounted at /api/expenses)
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
