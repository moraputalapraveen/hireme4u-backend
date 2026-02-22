import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import Job from '../models/Job.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// SIMPLIFIED SETUP - Hash password directly
router.post('/setup', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    // Check if admin exists
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin already exists' 
      });
    }

    // Hash password directly here
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create admin with hashed password
    const admin = new Admin({
      username,
      password: hashedPassword,
      role: 'admin'
    });

    await admin.save();

    console.log('✅ Admin created successfully:', username);

    res.json({ 
      success: true, 
      message: 'Admin created successfully',
      username: admin.username 
    });
  } catch (error) {
    console.error('❌ Setup error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error creating admin' 
    });
  }
});

// SIMPLIFIED LOGIN
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt for username:', username);

    const admin = await Admin.findOne({ username });
    
    if (!admin) {
      console.log('Admin not found');
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Compare password directly with bcrypt
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    console.log('Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      admin: { username: admin.username, role: admin.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST new job - PROTECTED
router.post('/jobs', protect, async (req, res) => {
  try {
    const jobData = {
      ...req.body,
      isFresherFriendly: req.body.experienceLevel === 'Fresher' || req.body.experienceLevel === '0-1 years'
    };
    
    // Generate slug here instead of in pre-save hook
    if (!jobData.slug) {
      jobData.slug = jobData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') + '-' + Date.now();
    }

    const job = await Job.create(jobData);
    res.status(201).json({ success: true, job });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;