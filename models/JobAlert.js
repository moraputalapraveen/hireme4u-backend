import mongoose from 'mongoose';

const jobAlertSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  categories: [{
    type: String,
    enum: ['IT', 'Non-IT', 'Remote', 'Freshers']
  }],
  keywords: [String],
  frequency: {
    type: String,
    enum: ['daily', 'weekly'],
    default: 'daily'
  },
  verified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  unsubscribeToken: String,
  lastSentAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for faster queries
jobAlertSchema.index({ email: 1 });
jobAlertSchema.index({ verificationToken: 1 });
jobAlertSchema.index({ unsubscribeToken: 1 });
jobAlertSchema.index({ lastSentAt: 1 });

const JobAlert = mongoose.model('JobAlert', jobAlertSchema);
export default JobAlert;