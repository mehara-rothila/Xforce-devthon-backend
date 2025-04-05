// Forum model 
// Forum Category Schema
const forumCategorySchema = new mongoose.Schema({
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true
    },
    description: String,
    color: {
      type: String,
      default: '#4a5568'
    },
    gradientFrom: String,
    gradientTo: String,
    icon: String,
    topicsCount: {
      type: Number,
      default: 0
    },
    postsCount: {
      type: Number,
      default: 0
    }
  }, { timestamps: true });
  
  // Forum Topic Schema
  const forumTopicSchema = new mongoose.Schema({
    title: {
      type: String,
      required: [true, 'Topic title is required']
    },
    content: {
      type: String,
      required: [true, 'Content is required']
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: 'ForumCategory',
      required: true
    },
    author: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    views: {
      type: Number,
      default: 0
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    isHot: {
      type: Boolean,
      default: false
    },
    lastReplyAt: Date
  }, { timestamps: true });
  
  // Forum Reply Schema
  const forumReplySchema = new mongoose.Schema({
    content: {
      type: String,
      required: [true, 'Reply content is required']
    },
    topic: {
      type: mongoose.Schema.ObjectId,
      ref: 'ForumTopic',
      required: true
    },
    author: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    isBestAnswer: {
      type: Boolean,
      default: false
    },
    upvotes: [{
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }],
    downvotes: [{
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }]
  }, { timestamps: true });