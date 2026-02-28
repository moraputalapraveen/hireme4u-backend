// routes/seo.js
router.get('/keywords/:category', async (req, res) => {
  const { category } = req.params;
  
  // Get top keywords from job descriptions
  const jobs = await Job.find({ category });
  const keywordFrequency = {};
  
  jobs.forEach(job => {
    const words = job.title.toLowerCase().split(' ');
    words.forEach(word => {
      if (word.length > 3) {
        keywordFrequency[word] = (keywordFrequency[word] || 0) + 1;
      }
    });
  });
  
  const topKeywords = Object.entries(keywordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
    
  res.json({ success: true, keywords: topKeywords });
});