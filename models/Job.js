import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  slug: { 
    type: String 
  },
  company: { 
    type: String, 
    required: true 
  },
  location: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  requirements: [{ 
    type: String 
  }],
  salary: String,
  applyLink: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    enum: ['IT', 'Non-IT', 'Remote', 'Freshers'],
    default: 'IT'
  },
  jobType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Remote', 'Internship'],
    default: 'Full-time'
  },
  experienceLevel: {
    type: String,
    enum: ['Fresher', '0-1 years', '1-3 years', '3-5 years', '5+ years'],
    default: 'Fresher'
  },
  companyDescription: String,
  isFresherFriendly: { 
    type: Boolean, 
    default: false 
  },
  postedDate: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true 
});

// NO PRE-SAVE HOOK - we'll generate slug in the route

const Job = mongoose.model('Job', jobSchema);
export default Job;