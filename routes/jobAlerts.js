import express from 'express';
import crypto from 'crypto';
import JobAlert from '../models/JobAlert.js';
import { sendVerificationEmail } from '../services/emailService.js';
import { protect } from '../middleware/auth.js';  // ← ADD THIS IMPORT\
import { sendCustomEmail } from '../services/emailService.js';


const router = express.Router();

// Subscribe to job alerts
router.post('/subscribe', async (req, res) => {
  try {
    console.log('📧 Subscribe request received:', req.body);
    
    const { email, categories, keywords, frequency } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required' });
    }
    
    // Generate tokens
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const unsubscribeToken = crypto.randomBytes(32).toString('hex');
    
    // Check if exists
    let alert = await JobAlert.findOne({ email });
    
    if (alert) {
      alert.categories = categories || [];
      alert.keywords = keywords || [];
      alert.frequency = frequency || 'daily';
      alert.verified = false;
      alert.verificationToken = verificationToken;
      alert.unsubscribeToken = unsubscribeToken;
    } else {
      alert = new JobAlert({
        email,
        categories: categories || [],
        keywords: keywords || [],
        frequency: frequency || 'daily',
        verificationToken,
        unsubscribeToken
      });
    }
    
    await alert.save();
    
    // Send verification email
    await sendVerificationEmail(email, verificationToken);
    
    res.json({ 
      success: true, 
      message: 'Verification email sent. Please check your inbox.' 
    });
    
  } catch (error) {
    console.error('❌ Subscribe error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify email
router.get('/verify/:token', async (req, res) => {
  try {
    const alert = await JobAlert.findOne({ verificationToken: req.params.token });
    
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Invalid or expired link' });
    }
    
    alert.verified = true;
    alert.verificationToken = null;
    await alert.save();
    
res.redirect('https://hireme4you.vercel.app/alerts/verified');
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Unsubscribe
router.get('/unsubscribe/:token', async (req, res) => {
  try {
    const alert = await JobAlert.findOne({ unsubscribeToken: req.params.token });
    
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Invalid link' });
    }
    
    await alert.deleteOne();
    
    res.redirect('https://hireme4you.vercel.app/alerts/unsubscribed');

    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


router.get('/subscribers', protect, async (req, res) => {
  try {
    const subscribers = await JobAlert.find().sort({ createdAt: -1 });
    res.json({ success: true, data: subscribers });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send bulk emails (admin only) - PROTECTED
router.post('/send-bulk', protect, async (req, res) => {
  try {
    const { recipients, subject, body } = req.body;
    
    if (!recipients || !recipients.length) {
      return res.status(400).json({ success: false, message: 'No recipients specified' });
    }

    if (!subject || !body) {
      return res.status(400).json({ success: false, message: 'Subject and body are required' });
    }

    // Send emails using your existing email service
    for (const email of recipients) {
      await sendCustomEmail(email, subject, body);
    }

    res.json({ 
      success: true, 
      message: `Emails sent to ${recipients.length} recipients` 
    });
  } catch (error) {
    console.error('Error sending bulk emails:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk delete subscribers (admin only) - PROTECTED
router.post('/bulk-delete', protect, async (req, res) => {
  try {
    const { emails } = req.body;
    
    if (!emails || !emails.length) {
      return res.status(400).json({ success: false, message: 'No emails specified' });
    }

    const result = await JobAlert.deleteMany({ email: { $in: emails } });
    
    res.json({ 
      success: true, 
      message: `Deleted ${result.deletedCount} subscribers` 
    });
  } catch (error) {
    console.error('Error deleting subscribers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;