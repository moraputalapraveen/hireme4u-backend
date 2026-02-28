import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

async function testEmail() {
  console.log('Testing email configuration...');
  console.log('GMAIL_USER:', process.env.GMAIL_USER);
  console.log('GMAIL_APP_PASSWORD exists:', !!process.env.GMAIL_APP_PASSWORD);
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
  
  try {
    await transporter.verify();
    console.log('✅ Transporter verified successfully!');
    
    // Send test email
    const info = await transporter.sendMail({
      from: `"Test" <${process.env.GMAIL_USER}>`,
      to: 'moraputalapraveen@gmail.com',
      subject: 'Test Email',
      text: 'If you receive this, email is working!'
    });
    
    console.log('✅ Test email sent:', info.messageId);
  } catch (error) {
    console.error('❌ Email test failed:', error);
  }
}

testEmail();