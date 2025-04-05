// Forum API testing script
const axios = require('axios');
const baseURL = 'http://localhost:5000/api';

// Function to test forum endpoints
async function testForumAPI() {
  try {
    console.log('\n======== TESTING FORUM ENDPOINTS ========\n');
    
    // 1. Create a forum category
    console.log('1. Creating a forum category...');
    const categoryResponse = await axios.post(`${baseURL}/forum/categories`, {
      name: 'Physics Discussion',
      description: 'Discussion about physics topics',
      color: '#3498db',
      gradientFrom: '#3498db',
      gradientTo: '#2980b9',
      icon: 'atom'
    });
    
    console.log('✅ Forum category created successfully');
    const categoryId = categoryResponse.data.data._id;
    console.log(`   Category ID: ${categoryId}\n`);
    
    // 2. Get all categories
    console.log('2. Getting all forum categories...');
    const categoriesResponse = await axios.get(`${baseURL}/forum/categories`);
    console.log(`✅ Retrieved ${categoriesResponse.data.data.length} categories\n`);
    
    // 3. Create a forum topic
    console.log('3. Creating a forum topic...');
    const topicResponse = await axios.post(`${baseURL}/forum/topics`, {
      title: 'Understanding Newton\'s Laws',
      content: 'Can someone explain Newton\'s Third Law in simpler terms?',
      category: categoryId
    });
    
    console.log('✅ Forum topic created successfully');
    const topicId = topicResponse.data.data._id;
    console.log(`   Topic ID: ${topicId}\n`);
    
    // 4. Get topics in a category
    console.log(`4. Getting topics for category (${categoryId})...`);
    const topicsResponse = await axios.get(`${baseURL}/forum/categories/${categoryId}/topics`);
    console.log(`✅ Retrieved ${topicsResponse.data.data.length} topics\n`);
    
    // 5. Get a topic by ID
    console.log(`5. Getting topic by ID (${topicId})...`);
    const topicByIdResponse = await axios.get(`${baseURL}/forum/topics/${topicId}`);
    console.log(`✅ Retrieved topic: ${topicByIdResponse.data.data.topic.title}\n`);
    
    // 6. Add a reply to a topic
    console.log(`6. Adding a reply to topic (${topicId})...`);
    const replyResponse = await axios.post(`${baseURL}/forum/topics/${topicId}/replies`, {
      content: 'Newton\'s Third Law states that for every action, there is an equal and opposite reaction.'
    });
    
    console.log('✅ Reply added successfully');
    const replyId = replyResponse.data.data._id;
    console.log(`   Reply ID: ${replyId}\n`);
    
    // 7. Mark reply as best answer
    console.log(`7. Marking reply (${replyId}) as best answer...`);
    const bestAnswerResponse = await axios.patch(`${baseURL}/forum/replies/${replyId}/best`);
    console.log('✅ Reply marked as best answer\n');
    
    // 8. Vote on a reply
    console.log(`8. Upvoting reply (${replyId})...`);
    const voteResponse = await axios.post(`${baseURL}/forum/replies/${replyId}/vote`, {
      vote: 'up'
    });
    
    console.log('✅ Vote registered successfully');
    console.log(`   Upvotes: ${voteResponse.data.data.upvotes}, Downvotes: ${voteResponse.data.data.downvotes}\n`);
    
    console.log('\n✅ ALL FORUM TESTS PASSED SUCCESSFULLY! ✅\n');
    
  } catch (error) {
    console.error('\n❌ ERROR: Test failed');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(error);
    }
  }
}

// Run the tests
testForumAPI();
