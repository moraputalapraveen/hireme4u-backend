import crypto from 'crypto';
import Analytics from '../models/Analytics.js';
import {UAParser} from 'ua-parser-js';

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
}, 60 * 60 * 1000);

export const trackVisitor = async (req, eventData = {}) => {
  try {
    // Generate visitor ID from IP + User Agent (anonymized)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Create anonymous visitor ID (hash of IP + UA)
    const visitorHash = crypto
      .createHash('sha256')
      .update(ip + userAgent)
      .digest('hex')
      .substring(0, 16); // Shorten for readability
    
    // Parse user agent for device info
    const parser = new UAParser(userAgent);
    const deviceInfo = parser.getResult();
    
    const device = deviceInfo.device.type || 'desktop';
    const browser = deviceInfo.browser.name || 'unknown';
    const os = deviceInfo.os.name || 'unknown';
    
    // Check if this is a new visitor
    const isNewVisitor = !visitorCache.has(visitorHash);
    
    // Get or create session ID
    let sessionId = req.headers['session-id'];
    if (!sessionId) {
      sessionId = crypto.randomBytes(16).toString('hex');
    }
    
    // Track the visit
    const visitEvent = new Analytics({
      eventType: isNewVisitor ? 'first_visit' : 'return_visit',
      eventData: JSON.stringify(eventData),
      url: req.url,
      sessionId,
      visitorId: visitorHash,
      isNewVisitor,
      device,
      referrer: req.headers.referer || 'direct',
      userAgent,
      ipAddress: ip.split(',')[0].trim(), // Take first IP if multiple
      visitCount: visitorCache.has(visitorHash) ? 2 : 1
    });
    
    await visitEvent.save();
    
    // Update cache
    visitorCache.set(visitorHash, Date.now());
    
    // Also track page view
    const pageViewEvent = new Analytics({
      eventType: 'page_view',
      eventData: req.url,
      url: req.url,
      sessionId,
      visitorId: visitorHash,
      isNewVisitor,
      device,
      referrer: req.headers.referer || 'direct'
    });
    
    await pageViewEvent.save();
    
    return {
      visitorId: visitorHash,
      isNewVisitor,
      sessionId,
      visitCount: visitorCache.has(visitorHash) ? 2 : 1
    };
    
  } catch (error) {
    console.error('Error tracking visitor:', error);
    return null;
  }
};

// Get visitor statistics
export const getVisitorStats = async (days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const [totalVisitors, newVisitors, returningVisitors, dailyStats] = await Promise.all([
      // Total unique visitors
      Analytics.distinct('visitorId', { 
        timestamp: { $gte: startDate },
        eventType: { $in: ['first_visit', 'return_visit'] }
      }).count(),
      
      // New visitors
      Analytics.countDocuments({
        timestamp: { $gte: startDate },
        eventType: 'first_visit'
      }),
      
      // Returning visitors
      Analytics.countDocuments({
        timestamp: { $gte: startDate },
        eventType: 'return_visit'
      }),
      
      // Daily stats
      Analytics.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate },
            eventType: { $in: ['first_visit', 'return_visit'] }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              type: '$eventType'
            },
            count: { $sum: 1 },
            uniqueVisitors: { $addToSet: '$visitorId' }
          }
        },
        {
          $group: {
            _id: '$_id.date',
            newVisits: {
              $sum: {
                $cond: [{ $eq: ['$_id.type', 'first_visit'] }, '$count', 0]
              }
            },
            returnVisits: {
              $sum: {
                $cond: [{ $eq: ['$_id.type', 'return_visit'] }, '$count', 0]
              }
            },
            uniqueVisitorCount: { $size: { $setUnion: ['$uniqueVisitors'] } }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 30 }
      ])
    ]);
    
    // Calculate conversion rates
    const conversionRate = totalVisitors > 0 
      ? ((await Analytics.countDocuments({
          timestamp: { $gte: startDate },
          eventType: 'application_click'
        })) / totalVisitors * 100).toFixed(2)
      : 0;
    
    return {
      totalUniqueVisitors: totalVisitors,
      newVisitors,
      returningVisitors,
      returningRate: totalVisitors > 0 
        ? ((returningVisitors / totalVisitors) * 100).toFixed(2) 
        : 0,
      conversionRate,
      dailyStats
    };
    
  } catch (error) {
    console.error('Error getting visitor stats:', error);
    return null;
  }
};