import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jobRoutes from './routes/jobs.js';
import adminRoutes from './routes/admin.js';
import visitorRoutes from './routes/visitor.js';

dotenv.config();

const app = express();

// Update CORS for production
app.use(cors({
  origin: [
    'https://hireme4u.vercel.app',  // Your Vercel URL (will update after frontend deploy)
    'http://localhost:5173'
  ],
  credentials: true
}));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

app.use('/api/jobs', jobRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/visitor', visitorRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'HireMe4U API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});