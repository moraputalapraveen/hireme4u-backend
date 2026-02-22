import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  eventType: {
    type: String,
    enum: ['page_view', 'search', 'application_click', 'bookmark', 'share'],
    required: true
  },
  eventData: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  url: String,
  userId: String, // Optional, if you implement user tracking
  sessionId: String,
  device: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet']
  }
}, { timestamps: true });

// Index for faster queries
analyticsSchema.index({ eventType: 1, timestamp: -1 });

const Analytics = mongoose.model('Analytics', analyticsSchema);
export default Analytics;