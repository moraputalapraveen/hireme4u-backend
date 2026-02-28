// Create transporter immediately (not lazy)
import nodemailer from 'nodemailer';
import Job from '../models/Job.js';
import JobAlert from '../models/JobAlert.js';

let transporter = null;

// Initialize transporter function
const initializeTransporter = () => {
  if (!transporter) {
    console.log('📧 Initializing email transporter...');
    console.log('GMAIL_USER:', process.env.GMAIL_USER);
    console.log('GMAIL_APP_PASSWORD exists:', !!process.env.GMAIL_APP_PASSWORD);
    
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('❌ Email credentials missing in .env file');
      return false;
    }
    
    try {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });
      
      // Verify connection
      transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Transporter verification failed:', error);
          transporter = null;
        } else {
          console.log('✅ Email transporter ready');
        }
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to create transporter:', error);
      return false;
    }
  }
  return true;
};

// Initialize transporter on module load
initializeTransporter();

// Send verification email
export const sendVerificationEmail = async (email, token) => {
  try {
    console.log(`📧 Sending verification email to ${email}`);
    
    if (!transporter && !initializeTransporter()) {
      throw new Error('Email service not available');
    }
    
const verificationLink = `https://13.51.197.202.nip.io/api/job-alerts/verify/${token}`;
    
    const mailOptions = {
      from: `"HireMe4U" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Job Alert Subscription',
      text: `Please click this link to verify your email: ${verificationLink}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Verify Your Job Alert Subscription</h2>
          <p>Thank you for subscribing to HireMe4U job alerts!</p>
          <p>Please click the button below to verify your email address:</p>
          <a href="${verificationLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verify Email</a>
          <p>Or copy this link: ${verificationLink}</p>
          <hr>
          <p style="color: #6b7280; font-size: 12px;">© 2026 HireMe4U</p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent: ${info.messageId}`);
    return true;
    
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    throw error;
  }
};

// Send daily job alerts
export const sendDailyJobAlerts = async () => {
  try {
    console.log('📧 Sending daily job alerts...');
    
    if (!transporter && !initializeTransporter()) {
      throw new Error('Email service not available');
    }
    
    const alerts = await JobAlert.find({ 
      verified: true, 
      frequency: 'daily' 
    });
    
    let sentCount = 0;
    
    for (const alert of alerts) {
      // Build query based on user preferences
      const query = {};
      
      if (alert.categories && alert.categories.length > 0) {
        query.category = { $in: alert.categories };
      }
      
      if (alert.keywords && alert.keywords.length > 0) {
        query.$or = alert.keywords.map(keyword => ({
          $or: [
            { title: { $regex: keyword, $options: 'i' } },
            { description: { $regex: keyword, $options: 'i' } },
            { company: { $regex: keyword, $options: 'i' } }
          ]
        }));
      }
      
      // Get jobs posted in last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      query.postedDate = { $gte: oneDayAgo };
      
      const jobs = await Job.find(query)
        .sort({ postedDate: -1 })
        .limit(10);
      
      if (jobs.length > 0) {
const unsubscribeLink = `https://13.51.197.202.nip.io/api/job-alerts/unsubscribe/${alert.unsubscribeToken}`;
        
        let jobsHtml = '';
        jobs.forEach(job => {
          jobsHtml += `
            <div style="border: 1px solid #e5e7eb; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
              <h3 style="margin: 0 0 5px 0; color: #2563eb;">${job.title}</h3>
              <p style="margin: 0 0 5px 0;"><strong>${job.company}</strong> • ${job.location}</p>
              <p style="margin: 0 0 10px 0;">${job.description.substring(0, 150)}...</p>
              <a href="${job.applyLink}" style="background-color: #10b981; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">Apply Now</a>
            </div>
          `;
        });
        
        const mailOptions = {
          from: `"HireMe4U" <${process.env.GMAIL_USER}>`,
          to: alert.email,
          subject: `Your Daily Job Alerts - ${jobs.length} new jobs`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Your Daily Job Alerts</h2>
              <p>Here are ${jobs.length} new jobs matching your preferences:</p>
              ${jobsHtml}
              <hr>
              <p style="font-size: 12px; color: #6b7280;">
                <a href="${unsubscribeLink}" style="color: #6b7280;">Unsubscribe</a> • 
                <a href="https://hireme4you.vercel.app" style="color: #6b7280;">Visit HireMe4U</a>
              </p>
            </div>
          `
        };
        
        await transporter.sendMail(mailOptions);
        alert.lastSentAt = new Date();
        await alert.save();
        sentCount++;
        console.log(`✅ Alert sent to ${alert.email}`);
      }
    }
    
    console.log(`📧 Sent ${sentCount} daily alerts`);
    return sentCount;
    
  } catch (error) {
    console.error('❌ Failed to send daily alerts:', error);
    throw error;
  }
};

// Send custom email
export const sendCustomEmail = async (to, subject, body) => {
  try {
    console.log(`📧 Sending custom email to ${to}`);
    
    if (!transporter && !initializeTransporter()) {
      throw new Error('Email service not available');
    }
    
    const mailOptions = {
      from: `"HireMe4U" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br/>')
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Custom email sent to ${to}: ${info.messageId}`);
    return true;
    
  } catch (error) {
    console.error('❌ Failed to send custom email:', error);
    throw error;
  }
};