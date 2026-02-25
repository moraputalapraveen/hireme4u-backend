import cron from 'node-cron';
import Job from '../models/Job.js';

// Schedule job to run every day at midnight (00:00)
const scheduleJobCleanup = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('🧹 Running job cleanup service...');
    
    try {
      // Calculate date 10 days ago
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      
      // Find and delete jobs older than 10 days
      const result = await Job.deleteMany({
        postedDate: { $lt: tenDaysAgo },
        // Optional: Add condition to not delete certain jobs
        // isPermanent: { $ne: true } 
      });
      
      console.log(`✅ Deleted ${result.deletedCount} jobs older than 10 days`);
      
      // Optional: Log to a file or database for tracking
      if (result.deletedCount > 0) {
        console.log(`📅 Deleted jobs posted before: ${tenDaysAgo.toLocaleDateString()}`);
      }
      
    } catch (error) {
      console.error('❌ Error in job cleanup service:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata" // Set to Indian timezone
  });
  
  console.log('⏰ Job cleanup service scheduled to run daily at midnight');
};

export default scheduleJobCleanup;