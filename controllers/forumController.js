// Forum controller 
// Get All Categories
exports.getCategories = async (req, res) => {
    try {
      const categories = await ForumCategory.find();
      res.status(200).json({ success: true, data: categories });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  };
  
  // Create Topic
  exports.createTopic = async (req, res) => {
    try {
      const { title, content, category } = req.body;
      const topic = await ForumTopic.create({
        title,
        content,
        category,
        author: req.user.id
      });
  
      // Update category stats
      await ForumCategory.findByIdAndUpdate(category, {
        $inc: { topicsCount: 1 }
      });
  
      res.status(201).json({ success: true, data: topic });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  };
  
  // Get Topics in Category
  exports.getTopicsByCategory = async (req, res) => {
    try {
      const topics = await ForumTopic.find({ category: req.params.categoryId })
        .populate('author', 'name')
        .sort('-createdAt');
  
      res.status(200).json({ success: true, data: topics });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  };
  
  // Add Reply to Topic
  exports.addReply = async (req, res) => {
    try {
      const reply = await ForumReply.create({
        content: req.body.content,
        topic: req.params.topicId,
        author: req.user.id
      });
  
      // Update topic stats
      await ForumTopic.findByIdAndUpdate(req.params.topicId, {
        $inc: { repliesCount: 1 },
        lastReplyAt: Date.now()
      });
  
      res.status(201).json({ success: true, data: reply });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  };