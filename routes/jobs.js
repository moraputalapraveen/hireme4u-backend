import express from 'express';
import Job from '../models/Job.js';

const router = express.Router();

// GET all jobs with advanced filtering - ALL FILTERS IN BACKEND
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      category, 
      jobType, 
      experienceLevel,
      location,
      datePosted,
      isFresherFriendly,
      sortBy = 'postedDate',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    // Build filter query
    let query = {};

    // Search filter (title, company, description, location)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Job type filter
    if (jobType) {
      query.jobType = jobType;
    }

    // Experience level filter
    if (experienceLevel) {
      query.experienceLevel = experienceLevel;
    }

    // Location filter (exact match or partial)
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    // Fresher friendly filter
    if (isFresherFriendly === 'true') {
      query.isFresherFriendly = true;
    }

    // Date posted filter
    if (datePosted) {
      const date = new Date();
      switch(datePosted) {
        case 'today':
          date.setDate(date.getDate() - 1);
          break;
        case '3days':
          date.setDate(date.getDate() - 3);
          break;
        case '7days':
          date.setDate(date.getDate() - 7);
          break;
        case '30days':
          date.setDate(date.getDate() - 30);
          break;
        default:
          // If it's a number (like 1,3,7,30) - handle it
          if (!isNaN(parseInt(datePosted))) {
            date.setDate(date.getDate() - parseInt(datePosted));
          }
      }
      query.postedDate = { $gte: date };
    }

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Execute query
    const jobs = await Job.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await Job.countDocuments(query);

    // Get distinct values for filter options (for frontend dropdowns)
    const distinctCategories = await Job.distinct('category');
    const distinctJobTypes = await Job.distinct('jobType');
    const distinctExperienceLevels = await Job.distinct('experienceLevel');
    const distinctLocations = await Job.distinct('location');

    res.json({ 
      success: true, 
      jobs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      filterOptions: {
        categories: distinctCategories,
        jobTypes: distinctJobTypes,
        experienceLevels: distinctExperienceLevels,
        locations: distinctLocations.slice(0, 20) // Limit to 20 locations
      }
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single job by slug
router.get('/:slug', async (req, res) => {
  try {
    const job = await Job.findOne({ slug: req.params.slug });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET filter options only (for populating filter dropdowns)
router.get('/filters/options', async (req, res) => {
  try {
    const distinctCategories = await Job.distinct('category');
    const distinctJobTypes = await Job.distinct('jobType');
    const distinctExperienceLevels = await Job.distinct('experienceLevel');
    const distinctLocations = await Job.distinct('location');

    res.json({
      success: true,
      filters: {
        categories: distinctCategories,
        jobTypes: distinctJobTypes,
        experienceLevels: distinctExperienceLevels,
        locations: distinctLocations.slice(0, 20)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;