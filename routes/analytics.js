import express from 'express';
import Analytics from '../models/Analytics.js';

const router = express.Router();

// Track event
router.post('/track', async (req, res) => {
  try {
    const { eventType, eventData, url } = req.body;
    
    // Detect device type from user-agent
    const userAgent = req.headers['user-agent'] || '';
    let device = 'desktop';
    if (/mobile/i.test(userAgent)) device = 'mobile';
    if (/tablet/i.test(userAgent)) device = 'tablet';

    const analytics = new Analytics({
      eventType,
      eventData,
      url,
      device,
      sessionId: req.headers['session-id'] || 'anonymous'
    });

    await analytics.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get analytics stats
router.get('/stats', async (req, res) => {
  try {
    const [totalViews, totalSearches, popularCategories] = await Promise.all([
      Analytics.countDocuments({ eventType: 'page_view' }),
      Analytics.countDocuments({ eventType: 'search' }),
      Analytics.aggregate([
        { $match: { eventType: 'search' } },
        { $group: { _id: '$eventData', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    res.json({
      totalViews,
      totalSearches,
      popularCategories: popularCategories.map(c => ({ name: c._id, count: c.count }))
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get detailed analytics (protected - admin only)
router.get('/detailed', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {};
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const analytics = await Analytics.find(query)
      .sort({ timestamp: -1 })
      .limit(100);

    res.json({ success: true, analytics });
  } catch (error) {
    console.error('Error fetching detailed analytics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;