import express from 'express';
import Analytics from '../models/Analytics.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Track page view (public)
router.post('/track', async (req, res) => {
  try {
    const { eventType, eventData, url, visitorId, isNewVisitor, referrer, country } = req.body;
    
    const userAgent = req.headers['user-agent'] || '';
    let device = 'desktop';
    if (/mobile/i.test(userAgent)) device = 'mobile';
    if (/tablet/i.test(userAgent)) device = 'tablet';

    const analytics = new Analytics({
      eventType,
      eventData,
      url,
      device,
      sessionId: req.headers['session-id'] || 'anonymous',
      visitorId: visitorId || `visitor_${Date.now()}`,
      isNewVisitor: isNewVisitor || false,
      referrer: referrer || req.headers.referer || 'direct',
      userAgent,
      ipAddress: req.ip || req.connection.remoteAddress,
      country: country || 'unknown',
      visitCount: 1
    });

    await analytics.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get dashboard data (protected)
router.get('/dashboard', protect, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Get all data in parallel
    const [
      activeNow,
      todayVisits,
      totalPageViews,
      totalVisitors,
      dailyStats,
      deviceStats,
      referrers,
      countries
    ] = await Promise.all([
      // Active now (last 15 minutes)
      Analytics.distinct('visitorId', {
        timestamp: { $gte: fifteenMinsAgo }
      }).countDocuments(),
      
      // Today's visits
      Analytics.countDocuments({
        timestamp: { $gte: today }
      }),
      
      // Total page views (30 days)
      Analytics.countDocuments({
        timestamp: { $gte: thirtyDaysAgo },
        eventType: 'page_view'
      }),
      
      // Unique visitors (30 days)
      Analytics.distinct('visitorId', {
        timestamp: { $gte: thirtyDaysAgo }
      }).countDocuments(),
      
      // Daily stats
      Analytics.aggregate([
        {
          $match: {
            timestamp: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
            },
            views: { $sum: 1 },
            visitors: { $addToSet: '$visitorId' },
            newVisitors: {
              $sum: { $cond: ['$isNewVisitor', 1, 0] }
            }
          }
        },
        {
          $project: {
            _id: 0,
            date: '$_id.date',
            views: 1,
            visitors: { $size: '$visitors' },
            newVisitors: 1
          }
        },
        { $sort: { date: -1 } },
        { $limit: 30 }
      ]),
      
      // Device stats
      Analytics.aggregate([
        {
          $match: {
            timestamp: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: '$device',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Top referrers
      Analytics.aggregate([
        {
          $match: {
            timestamp: { $gte: thirtyDaysAgo },
            referrer: { $ne: 'direct', $exists: true }
          }
        },
        {
          $group: {
            _id: '$referrer',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      
      // Top countries
      Analytics.aggregate([
        {
          $match: {
            timestamp: { $gte: thirtyDaysAgo },
            country: { $ne: 'unknown' }
          }
        },
        {
          $group: {
            _id: '$country',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    // Process device stats
    const devices = {
      desktop: deviceStats.find(d => d._id === 'desktop')?.count || 0,
      mobile: deviceStats.find(d => d._id === 'mobile')?.count || 0,
      tablet: deviceStats.find(d => d._id === 'tablet')?.count || 0
    };

    // Calculate new vs returning
    const newVisitors = await Analytics.countDocuments({
      timestamp: { $gte: thirtyDaysAgo },
      isNewVisitor: true
    });

    const returningVisitors = totalVisitors - newVisitors;

    res.json({
      success: true,
      data: {
        activeNow,
        todayVisits,
        totalPageViews,
        totalVisitors,
        avgTimeOnSite: '2m 30s',
        dailyStats,
        newVisitors,
        returningVisitors,
        returningRate: totalVisitors > 0 
          ? Math.round((returningVisitors / totalVisitors) * 100) 
          : 0,
        devices,
        topReferrers: referrers.map(r => ({ source: r._id, count: r.count })),
        topCountries: countries.map(c => ({ country: c._id, count: c.count }))
      }
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// Get dashboard data (protected)
router.get('/dashboard', protect, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Get all data in parallel
    const [
      activeNow,
      todayVisits,
      totalPageViews,
      totalVisitors,
      dailyStats,
      deviceStats,
      referrers,
      countries
    ] = await Promise.all([
      // Active now (last 15 minutes)
      Analytics.distinct('visitorId', {
        timestamp: { $gte: fifteenMinsAgo }
      }).countDocuments(),
      
      // Today's visits
      Analytics.countDocuments({
        timestamp: { $gte: today }
      }),
      
      // Total page views (30 days)
      Analytics.countDocuments({
        timestamp: { $gte: thirtyDaysAgo },
        eventType: 'page_view'
      }),
      
      // Unique visitors (30 days)
      Analytics.distinct('visitorId', {
        timestamp: { $gte: thirtyDaysAgo }
      }).countDocuments(),
      
      // Daily stats
      Analytics.aggregate([
        {
          $match: {
            timestamp: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
            },
            views: { $sum: 1 },
            visitors: { $addToSet: '$visitorId' },
            newVisitors: {
              $sum: { $cond: ['$isNewVisitor', 1, 0] }
            }
          }
        },
        {
          $project: {
            _id: 0,
            date: '$_id.date',
            views: 1,
            visitors: { $size: '$visitors' },
            newVisitors: 1
          }
        },
        { $sort: { date: -1 } },
        { $limit: 30 }
      ]),
      
      // Device stats
      Analytics.aggregate([
        {
          $match: {
            timestamp: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: '$device',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // ✅ FIX: Top referrers - include direct visits
      Analytics.aggregate([
        {
          $match: {
            timestamp: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: { $ifNull: ['$referrer', 'direct'] },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      
      // Top countries
      Analytics.aggregate([
        {
          $match: {
            timestamp: { $gte: thirtyDaysAgo },
            country: { $ne: 'unknown' }
          }
        },
        {
          $group: {
            _id: '$country',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    // Process device stats
    const devices = {
      desktop: deviceStats.find(d => d._id === 'desktop')?.count || 0,
      mobile: deviceStats.find(d => d._id === 'mobile')?.count || 0,
      tablet: deviceStats.find(d => d._id === 'tablet')?.count || 0
    };

    // Calculate new vs returning
    const newVisitors = await Analytics.countDocuments({
      timestamp: { $gte: thirtyDaysAgo },
      isNewVisitor: true
    });

    const returningVisitors = totalVisitors - newVisitors;

    // Format referrers
    const formattedReferrers = referrers.map(r => ({ 
      source: r._id === 'direct' ? 'Direct Visit' : r._id, 
      count: r.count 
    }));

    res.json({
      success: true,
      data: {
        activeNow,
        todayVisits,
        totalPageViews,
        totalVisitors,
        avgTimeOnSite: '2m 30s', // You can calculate this from session data
        dailyStats,
        newVisitors,
        returningVisitors,
        returningRate: totalVisitors > 0 
          ? Math.round((returningVisitors / totalVisitors) * 100) 
          : 0,
        devices,
        topReferrers: formattedReferrers,
        topCountries: countries.map(c => ({ country: c._id, count: c.count }))
      }
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;