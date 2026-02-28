// scripts/generateSitemap.js
import mongoose from 'mongoose';
import Job from '../models/Job.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://hireme4you.vercel.app';

async function generateSitemap() {
  try {
    // 1. Connect to your MongoDB (using the same connection string as your backend)
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 2. Fetch all jobs (only need slug and updated date)
    const jobs = await Job.find({}, 'slug updatedAt').lean();

    // 3. Build the list of URLs
    const urls = [
      { loc: BASE_URL, priority: 1.0, changefreq: 'daily' },
      { loc: `${BASE_URL}/jobs`, priority: 0.9, changefreq: 'daily' },
      { loc: `${BASE_URL}/freshers`, priority: 0.8, changefreq: 'daily' },
      { loc: `${BASE_URL}/tools`, priority: 0.7, changefreq: 'weekly' },
      { loc: `${BASE_URL}/blog`, priority: 0.7, changefreq: 'weekly' },
      ...jobs.map(job => ({
        loc: `${BASE_URL}/jobs/${job.slug}`,
        lastmod: job.updatedAt ? new Date(job.updatedAt).toISOString().split('T')[0] : undefined,
        priority: 0.8,
        changefreq: 'weekly'
      }))
    ];

    // 4. Generate XML string
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map(url => `
  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('')}
</urlset>`;

    // 5. Write the file to the current directory (or you can specify a custom path)
    const outputPath = path.join(__dirname, 'sitemap.xml');
    fs.writeFileSync(outputPath, sitemap);
    console.log(`✅ Sitemap generated at ${outputPath}`);

    // 6. Close the database connection
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Sitemap generation failed:', error);
    process.exit(1);
  }
}

generateSitemap();