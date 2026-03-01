import Analytics from '../models/Analytics.js';
import { UAParser } from 'ua-parser-js';

// Simple in-memory cache for recent visitors (last 24 hours)
const visitorCache = new Map();

// Clean cache every hour
setInterval(() => {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  for (const [visitorId, timestamp] of visitorCache.entries()) {
    if (timestamp < oneDayAgo) {
      visitorCache.delete(visitorId);
    }
  }
  console.log(`🧹 Cleaned visitor cache. Current unique visitors: ${visitorCache.size}`);
}, 60 * 60 * 1000);

// Generate a consistent visitor ID
const generateVisitorId = (req) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // Create a hash of IP + User Agent for anonymous tracking
  const crypto = require('crypto');
  return crypto
    .createHash('sha256')
    .update(ip + userAgent)
    .digest('hex')
    .substring(0, 16);
};

// Parse device info from user agent
const parseDeviceInfo = (userAgent) => {
  const parser = new UAParser(userAgent);
  const deviceInfo = parser.getResult();
  
  return {
    device: deviceInfo.device.type || 'desktop',
    browser: deviceInfo.browser.name || 'unknown',
    os: deviceInfo.os.name || 'unknown'
  };
};

// Main analytics tracking middleware
export const visitorMiddleware = async (req, res, next) => {
  // Skip tracking for API calls and static files
  if (req.url.startsWith('/api/') || req.url.includes('.')) {
    return next();
  }

  try {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const visitorId = generateVisitorId(req);
    const { device, browser, os } = parseDeviceInfo(userAgent);
    
    // Check if this is a new visitor (not in cache)
    const isNewVisitor = !visitorCache.has(visitorId);
    
    // Get or create session ID
    let sessionId = req.headers['session-id'];
    if (!sessionId) {
      sessionId = require('crypto').randomBytes(16).toString('hex');
    }

    // Update cache
    visitorCache.set(visitorId, Date.now());

    // Track the page view
    const analytics = new Analytics({
      eventType: 'page_view',
      eventData: req.url,
      url: req.url,
      sessionId,
      visitorId,
      isNewVisitor,
      device,
      referrer: req.headers.referer || 'direct',
      userAgent,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      country: 'unknown', // You can integrate with geolocation API if needed
      visitCount: 1
    });

    await analytics.save();

    // Attach visitor info to request for use in routes
    req.visitorInfo = {
      visitorId,
      isNewVisitor,
      sessionId,
      device
    };

    // Set session header for client
    res.setHeader('X-Session-ID', sessionId);
    res.setHeader('X-Visitor-ID', visitorId);

  } catch (error) {
    console.error('❌ Analytics middleware error:', error);
  }

  next();
};

// Track custom events
export const trackEvent = async (req, eventType, eventData = {}) => {
  try {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const visitorId = generateVisitorId(req);
    const { device } = parseDeviceInfo(userAgent);

    const analytics = new Analytics({
      eventType,
      eventData: JSON.stringify(eventData),
      url: req.url,
      sessionId: req.headers['session-id'],
      visitorId,
      device,
      referrer: req.headers.referer || 'direct',
      userAgent,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    });

    await analytics.save();
    return true;
  } catch (error) {
    console.error('❌ Error tracking custom event:', error);
    return false;
  }
};

// Get visitor statistics
export const getVisitorStats = async (days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalVisitors, newVisitors, returningVisitors, deviceStats, pageStats, referrerStats] = await Promise.all([
      // Total unique visitors
      Analytics.distinct('visitorId', {
        timestamp: { $gte: startDate }
      }).countDocuments(),

      // New visitors
      Analytics.countDocuments({
        timestamp: { $gte: startDate },
        isNewVisitor: true
      }),

      // Returning visitors
      Analytics.countDocuments({
        timestamp: { $gte: startDate },
        isNewVisitor: false
      }),

      // Device breakdown
      Analytics.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: '$device',
            count: { $sum: 1 }
          }
        }
      ]),

      // Page views
      Analytics.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: '$url',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),

      // Referrers
      Analytics.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate },
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
      ])
    ]);

    // Process device stats
    const devices = {
      desktop: deviceStats.find(d => d._id === 'desktop')?.count || 0,
      mobile: deviceStats.find(d => d._id === 'mobile')?.count || 0,
      tablet: deviceStats.find(d => d._id === 'tablet')?.count || 0
    };

    return {
      totalVisitors,
      newVisitors,
      returningVisitors,
      returningRate: totalVisitors > 0 
        ? Math.round((returningVisitors / totalVisitors) * 100) 
        : 0,
      devices,
      topPages: pageStats.map(p => ({ path: p._id, count: p.count })),
      topReferrers: referrerStats.map(r => ({ source: r._id, count: r.count }))
    };

  } catch (error) {
    console.error('❌ Error getting visitor stats:', error);
    return null;
  }
};

export default visitorMiddleware;