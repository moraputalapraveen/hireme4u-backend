import express from 'express';
import Visitor from '../models/Visitor.js';
import { protect } from '../middleware/auth.js';
import requestIp from 'request-ip';
import { UAParser } from 'ua-parser-js';  // Changed this line

const router = express.Router();

// Track visitor (public endpoint - called from frontend)
router.post('/track', async (req, res) => {
  try {
    const { page, referrer } = req.body;
    const ipAddress = requestIp.getClientIp(req) || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Parse user agent
    const parser = new UAParser(userAgent);
    const deviceInfo = parser.getResult();
    
    const device = deviceInfo.device.type || 'desktop';
    const browser = deviceInfo.browser.name || 'unknown';
    const os = deviceInfo.os.name || 'unknown';
    
    // Generate session ID (simple approach - use IP + date)
    const today = new Date().toDateString();
    const sessionId = `${ipAddress}-${today}`;
    
    // Check if this visitor was already counted today
    const existingVisit = await Visitor.findOne({
      sessionId,
      page
    });
    
    if (existingVisit) {
      // Increment visit count for existing session
      existingVisit.visitCount += 1;
      existingVisit.visitedAt = new Date();
      await existingVisit.save();
    } else {
      // Create new visitor record
      const visitor = new Visitor({
        ipAddress,
        userAgent,
        page,
        referrer: referrer || 'direct',
        device,
        browser,
        os,
        sessionId
      });
      
      await visitor.save();
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking visitor:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get visitor stats (protected - admin only)
router.get('/stats', protect, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch(period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'all':
        startDate.setFullYear(2020);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }
    
    // Total visitors
    const totalVisitors = await Visitor.countDocuments({
      visitedAt: { $gte: startDate }
    });
    
    // Unique visitors (by IP)
    const uniqueVisitors = await Visitor.aggregate([
      { $match: { visitedAt: { $gte: startDate } } },
      { $group: { _id: '$ipAddress' } },
      { $count: 'count' }
    ]);
    
    // Visitors by day
    const visitorsByDay = await Visitor.aggregate([
      { $match: { visitedAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitedAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Visitors by page
    const visitorsByPage = await Visitor.aggregate([
      { $match: { visitedAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$page',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Visitors by device
    const visitorsByDevice = await Visitor.aggregate([
      { $match: { visitedAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$device',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Visitors by browser
    const visitorsByBrowser = await Visitor.aggregate([
      { $match: { visitedAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$browser',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // Referrers
    const topReferrers = await Visitor.aggregate([
      { $match: { visitedAt: { $gte: startDate }, referrer: { $ne: 'direct' } } },
      {
        $group: {
          _id: '$referrer',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    res.json({
      success: true,
      stats: {
        period,
        total: totalVisitors,
        unique: uniqueVisitors[0]?.count || 0,
        byDay: visitorsByDay,
        byPage: visitorsByPage,
        byDevice: visitorsByDevice,
        byBrowser: visitorsByBrowser,
        topReferrers
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get recent visitors (protected - admin only)
router.get('/recent', protect, async (req, res) => {
  try {
    const recent = await Visitor.find()
      .sort({ visitedAt: -1 })
      .limit(50)
      .select('-__v');
    
    res.json({ success: true, visitors: recent });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;