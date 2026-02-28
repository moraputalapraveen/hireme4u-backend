import Parser from 'rss-parser';
import Job from '../models/Job.js';

const parser = new Parser();

// Free RSS feeds
const RSS_FEEDS = [
  {
    name: 'We Work Remotely',
    url: 'https://weworkremotely.com/remote-jobs.rss',
    category: 'Remote'
  },
  {
    name: 'Stack Overflow',
    url: 'https://stackoverflow.com/jobs/feed',
    category: 'IT'
  },
  {
    name: 'Remote OK',
    url: 'https://remoteok.com/remote-jobs.rss',
    category: 'Remote'
  }
];

// Helper functions
function extractCompany(title) {
  const match = title.match(/(?:at|@)\s*([^|(]+)/i);
  return match ? match[1].trim() : 'Unknown';
}

function extractLocation(description) {
  const match = description.match(/location:?\s*([^<.]+)/i);
  return match ? match[1].trim() : 'Remote';
}

function extractSalary(text) {
  const match = text.match(/(?:₹|Rs\.?|USD|\$)\s*([\d,]+(?:\s*-\s*[\d,]+)?)/i);
  return match ? match[0] : null;
}

function detectFresherFriendly(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  return /fresher|entry|junior|trainee|0-1|graduate/.test(text);
}

function detectExperienceLevel(title) {
  if (/fresher|entry|junior|trainee/i.test(title)) return 'Fresher';
  if (/senior|lead|principal/i.test(title)) return '3-5 years';
  return '0-1 years';
}

// Main aggregator
export async function fetchAllRSSFeeds() {
  console.log('📡 Starting RSS job aggregation...');
  let totalAdded = 0;
  
  for (const feed of RSS_FEEDS) {
    try {
      console.log(`Fetching from ${feed.name}...`);
      const rssFeed = await parser.parseURL(feed.url);
      
      for (const item of rssFeed.items.slice(0, 15)) { // Limit per feed
        try {
          // Check if job exists (by link or recent title+company)
          const existing = await Job.findOne({
            $or: [
              { applyLink: item.link },
              {
                title: item.title,
                company: extractCompany(item.title),
                postedDate: { $gte: new Date(Date.now() - 7*24*60*60*1000) }
              }
            ]
          });
          
          if (existing) continue;
          
          const description = item.contentSnippet || item.content || '';
          
          const jobData = {
            title: item.title,
            company: extractCompany(item.title),
            location: extractLocation(description),
            description: description.substring(0, 500),
            requirements: [],
            salary: extractSalary(description),
            applyLink: item.link,
            category: feed.category,
            jobType: 'Full-time',
            experienceLevel: detectExperienceLevel(item.title),
            companyDescription: '',
            isFresherFriendly: detectFresherFriendly(item.title, description),
            postedDate: new Date(item.isoDate || item.pubDate || Date.now())
          };
          
          await Job.create(jobData);
          totalAdded++;
          console.log(`✅ Added: ${jobData.title}`);
          
        } catch (itemError) {
          console.error(`Error parsing item: ${itemError.message}`);
        }
      }
      
    } catch (feedError) {
      console.error(`Failed to fetch ${feed.name}: ${feedError.message}`);
    }
  }
  
  console.log(`✅ RSS aggregation complete. Added ${totalAdded} new jobs.`);
  return totalAdded;
}