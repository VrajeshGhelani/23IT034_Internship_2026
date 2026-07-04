require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('./config/passport');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const balanceRoutes = require('./routes/balanceRoutes');
const chatRoutes = require('./routes/chatRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const errorHandler = require('./middleware/errorHandler');
const { verifyJWT } = require('./middleware/authMiddleware');
const { getDashboard } = require('./controllers/balanceController');
const { getDashboardAnalytics } = require('./controllers/analyticsController');
const { uploadReceipt } = require('./middleware/upload');
const { replaceReceipt } = require('./controllers/expenseController');
const socketHandler = require('./socket/socketHandler');

const app = express();
const httpServer = http.createServer(app);

// CORS
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'https://expense-splitter-app-psi.vercel.app', // production frontend
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

// Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Initialize socket handler
socketHandler(io);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Session (required for Passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'expense-splitter-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);

// Group-scoped expense & balance routes
app.use('/api/groups/:id/expenses', expenseRoutes);
app.use('/api/groups/:id', balanceRoutes);

// Chat routes (group-scoped)
app.use('/api/groups/:id/messages', chatRoutes);

// Analytics routes
app.use('/api/groups/:id/analytics', analyticsRoutes);

// Payment routes
app.use('/api/payment', paymentRoutes);

// Standalone expense edit/delete
const { updateExpense, deleteExpense } = require('./controllers/expenseController');
app.put('/api/expenses/:id', verifyJWT, uploadReceipt, updateExpense);
app.delete('/api/expenses/:id', verifyJWT, deleteExpense);

// Replace receipt on expense
app.put('/api/expenses/:id/receipt', verifyJWT, uploadReceipt, replaceReceipt);

// Dashboard
app.get('/api/dashboard', verifyJWT, getDashboard);

// Dashboard analytics (cross-group)
app.get('/api/dashboard/analytics', verifyJWT, getDashboardAnalytics);

// Health check
app.get('/api/health', (req, res) => res.json({ success: true, message: 'Server is healthy' }));

// 404
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});

module.exports = app;
