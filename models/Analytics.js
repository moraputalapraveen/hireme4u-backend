import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  eventType: {
    type: String,
    enum: [
      'page_view', 
      'search', 
      'application_click', 
      'bookmark', 
      'share', 
      'category_click',
      'job_view',
      'filter_apply',
      'first_visit',        // New visitor
      'return_visit'         // Returning visitor
    ],
    required: true
  },
  eventData: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  url: String,
  sessionId: String,
  visitorId: String,        // Unique visitor identifier
  isNewVisitor: Boolean,    // Flag for new visitors
  device: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet'],
    default: 'desktop'
  },
  referrer: String,         // Where they came from
  userAgent: String,        // Browser info
  ipAddress: String,        // IP address (anonymized)
  country: String,          // Approximate location
  visitCount: {             // How many times this visitor has visited
    type: Number,
    default: 1
  }
}, { timestamps: true });

// Indexes for faster queries
analyticsSchema.index({ eventType: 1, timestamp: -1 });
analyticsSchema.index({ visitorId: 1 });
analyticsSchema.index({ timestamp: -1 });

const Analytics = mongoose.model('Analytics', analyticsSchema);
export default Analytics;