import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import Job from '../models/Job.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Helper function to generate slug
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') + '-' + Date.now() + Math.floor(Math.random() * 1000);
};

// Download CSV template
router.get('/template', (req, res) => {
  const headers = [
    'title', 'company', 'location', 'description', 
    'requirements', 'salary', 'applyLink', 'category',
    'jobType', 'experienceLevel', 'companyDescription'
  ].join(',');
  
  const sampleRow = [
    'React Developer',
    'TechCorp',
    'Bangalore',
    'We are looking for a React Developer...',
    'React experience\nJavaScript\nREST APIs',
    '₹4-8 LPA',
    'https://example.com/apply',
    'IT',
    'Full-time',
    '0-1 years',
    'TechCorp is a leading software company'
  ].map(field => `"${field}"`).join(',');
  
  const csvContent = `${headers}\n${sampleRow}`;
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=job_template.csv');
  res.send(csvContent);
});

// Bulk upload jobs
router.post('/bulk', protect, upload.single('file'), async (req, res) => {
  try {
    const results = [];
    const errors = [];
    let rowNumber = 1;
    const createdJobs = [];
    
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        // Process each row
        for (const row of results) {
          rowNumber++;
          try {
            // Validate required fields
            if (!row.title || !row.company || !row.location || !row.description) {
              errors.push(`Row ${rowNumber}: Missing required fields`);
              continue;
            }
            
            // Parse requirements (split by newline or comma)
            let requirements = [];
            if (row.requirements) {
              if (row.requirements.includes('\n')) {
                requirements = row.requirements.split('\n').filter(r => r.trim());
              } else if (row.requirements.includes(',')) {
                requirements = row.requirements.split(',').map(r => r.trim()).filter(r => r);
              } else {
                requirements = [row.requirements.trim()];
              }
            }
            
            // Generate unique slug
            const slug = generateSlug(row.title);
            
            // Create job with slug
            const jobData = {
              title: row.title,
              slug: slug,  // IMPORTANT: Add slug here
              company: row.company,
              location: row.location,
              description: row.description,
              requirements,
              salary: row.salary || undefined,
              applyLink: row.applyLink || 'https://example.com/apply',
              category: row.category || 'IT',
              jobType: row.jobType || 'Full-time',
              experienceLevel: row.experienceLevel || 'Fresher',
              companyDescription: row.companyDescription || `${row.company} is hiring through HireMe4U`,
              isFresherFriendly: ['Fresher', '0-1 years'].includes(row.experienceLevel),
              postedDate: new Date()
            };
            
            const job = await Job.create(jobData);
            createdJobs.push(job);
          } catch (err) {
            errors.push(`Row ${rowNumber}: ${err.message}`);
          }
        }
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        res.json({
          success: true,
          message: `Processed ${results.length} jobs`,
          created: createdJobs.length,
          errors: errors,
          jobs: createdJobs  // Return created jobs for reference
        });
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;