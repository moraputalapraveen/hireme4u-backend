import mongoose from 'mongoose';

const visitorSchema = new mongoose.Schema({
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  page: {
    type: String,
    required: true
  },
  referrer: {
    type: String,
    default: 'direct'
  },
  device: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet'],
    default: 'desktop'
  },
  browser: String,
  os: String,
  country: String,
  city: String,
  visitedAt: {
    type: Date,
    default: Date.now
  },
  sessionId: String,
  visitCount: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

// Create indexes for faster queries
visitorSchema.index({ visitedAt: -1 });
visitorSchema.index({ ipAddress: 1, visitedAt: -1 });

const Visitor = mongoose.model('Visitor', visitorSchema);
export default Visitor;