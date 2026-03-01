import dotenv from 'dotenv';
dotenv.config();

console.log('✅ Environment loaded');
console.log('GMAIL_USER:', process.env.GMAIL_USER);
console.log('GMAIL_APP_PASSWORD exists:', !!process.env.GMAIL_APP_PASSWORD);


import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import jobRoutes from './routes/jobs.js';
import adminRoutes from './routes/admin.js';
import visitorRoutes from './routes/visitor.js';
import analyticsRoutes from './routes/analytics.js';
import uploadRoutes from './routes/upload.js';
import scheduleJobCleanup from './services/cleanupService.js'; // ADD THIS
import jobAlertRoutes from './routes/jobAlerts.js';
import { sendDailyJobAlerts } from './services/emailService.js';


import cron from 'node-cron';
import { visitorMiddleware } from './middleware/VisitorMiddleware.js';


const app = express();

// Update CORS for production
app.use(cors({
  origin: [
    'https://hireme4you.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true
}));


app.use(express.json());


mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    
    // START THE CLEANUP SERVICE AFTER DATABASE CONNECTION
    scheduleJobCleanup();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

app.use('/api/jobs', jobRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/visitor', visitorRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/job-alerts', jobAlertRoutes);

app.use(visitorMiddleware);


app.get('/', (req, res) => {
  res.json({ message: 'HireMe4U API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});




cron.schedule('0 8 * * *', async () => {
  console.log('📧 Sending daily job alerts...');
  await sendDailyJobAlerts();
}, {
  timezone: "Asia/Kolkata"
});
