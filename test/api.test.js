// This is a simple test script to manually test API endpoints
// You can run this with: node test/api.test.js

const axios = require('axios');
const baseURL = 'http://localhost:5000/api';

// Function to test the API
async function testAPI() {
  try {
    console.log('\n======== TESTING SUBJECT ENDPOINTS ========\n');
    
    // 1. Create a subject
    console.log('1. Creating a subject...');
    const subjectResponse = await axios.post(`${baseURL}/subjects`, {
      name: 'Chemistry',
      description: 'Study of matter, its properties, and reactions',
      color: '#27ae60',
      gradientFrom: '#27ae60',
      gradientTo: '#2ecc71',
      icon: 'flask',
      topics: [
        {
          name: 'Periodic Table',
          description: 'Classification of elements',
          order: 1
        },
        {
          name: 'Chemical Bonds',
          description: 'Study of atomic bonding',
          order: 2
        }
      ]
    });
    
    console.log('✅ Subject created successfully');
    const subjectId = subjectResponse.data.data.subject._id;
    console.log(`   Subject ID: ${subjectId}\n`);
    
    // 2. Get all subjects
    console.log('2. Getting all subjects...');
    const subjectsResponse = await axios.get(`${baseURL}/subjects`);
    console.log(`✅ Retrieved ${subjectsResponse.data.results} subjects\n`);
    
    // 3. Get subject by ID
    console.log(`3. Getting subject by ID (${subjectId})...`);
    const subjectByIdResponse = await axios.get(`${baseURL}/subjects/${subjectId}`);
    console.log(`✅ Retrieved subject: ${subjectByIdResponse.data.data.subject.name}\n`);
    
    // 4. Get topics for a subject
    console.log(`4. Getting topics for subject (${subjectId})...`);
    const topicsResponse = await axios.get(`${baseURL}/subjects/${subjectId}/topics`);
    console.log(`✅ Retrieved ${topicsResponse.data.results} topics\n`);
    
    // 5. Add a topic to a subject
    console.log(`5. Adding a new topic to subject (${subjectId})...`);
    const addTopicResponse = await axios.post(`${baseURL}/subjects/${subjectId}/topics`, {
      name: 'Acids and Bases',
      description: 'Study of pH and reactions',
      order: 3
    });
    console.log('✅ Added new topic successfully\n');
    const topicId = addTopicResponse.data.data.topic._id;
    
    // 6. Update a topic
    console.log(`6. Updating topic (${topicId})...`);
    const updateTopicResponse = await axios.patch(`${baseURL}/subjects/${subjectId}/topics/${topicId}`, {
      description: 'Study of pH, acids, bases, and neutralization reactions'
    });
    console.log('✅ Updated topic successfully\n');
    
    console.log('\n======== TESTING QUIZ ENDPOINTS ========\n');
    
    // 7. Create a quiz
    console.log('7. Creating a quiz...');
    const quizResponse = await axios.post(`${baseURL}/quizzes`, {
      title: 'Chemistry Basics Quiz',
      description: 'Test your knowledge of basic chemistry concepts',
      subject: subjectId,
      difficulty: 'medium',
      timeLimit: 15,
      questions: [
        {
          text: 'What is the chemical symbol for Gold?',
          options: [
            { text: 'Go', isCorrect: false },
            { text: 'Au', isCorrect: true },
            { text: 'Ag', isCorrect: false },
            { text: 'Gd', isCorrect: false }
          ],
          explanation: 'Gold\'s symbol Au comes from the Latin word "aurum"',
          difficulty: 'easy',
          points: 5
        },
        {
          text: 'What is the pH of a neutral solution?',
          options: [
            { text: '0', isCorrect: false },
            { text: '7', isCorrect: true },
            { text: '14', isCorrect: false },
            { text: '1', isCorrect: false }
          ],
          explanation: 'A neutral solution has a pH of 7, while acidic solutions have pH < 7 and basic solutions have pH > 7',
          difficulty: 'easy',
          points: 5
        }
      ]
    });
    
    console.log('✅ Quiz created successfully');
    const quizId = quizResponse.data.data.quiz._id;
    console.log(`   Quiz ID: ${quizId}\n`);
    
    // 8. Get all quizzes
    console.log('8. Getting all quizzes...');
    const quizzesResponse = await axios.get(`${baseURL}/quizzes`);
    console.log(`✅ Retrieved ${quizzesResponse.data.results} quizzes\n`);
    
    // 9. Get quiz by ID
    console.log(`9. Getting quiz by ID (${quizId})...`);
    const quizByIdResponse = await axios.get(`${baseURL}/quizzes/${quizId}`);
    console.log(`✅ Retrieved quiz: ${quizByIdResponse.data.data.quiz.title}\n`);
    
    // 10. Get quizzes for a subject
    console.log(`10. Getting quizzes for subject (${subjectId})...`);
    const subjectQuizzesResponse = await axios.get(`${baseURL}/subjects/${subjectId}/quizzes`);
    console.log(`✅ Retrieved ${subjectQuizzesResponse.data.results} quizzes for the subject\n`);
    
    // 11. Submit a quiz attempt
    console.log(`11. Submitting a quiz attempt for quiz (${quizId})...`);
    
    // Get the question IDs from the quiz
    const questions = quizByIdResponse.data.data.quiz.questions;
    const questionId1 = questions[0]._id;
    const questionId2 = questions[1]._id;
    const option1Id = questions[0].options[1]._id; // Correct answer "Au"
    const option2Id = questions[1].options[1]._id; // Correct answer "7"
    
    const attemptResponse = await axios.post(`${baseURL}/quizzes/${quizId}/attempts`, {
      answers: [
        { questionId: questionId1, answerId: option1Id },
        { questionId: questionId2, answerId: option2Id }
      ]
    });
    
    console.log('✅ Quiz attempt submitted successfully');
    console.log(`   Score: ${attemptResponse.data.data.score}/${attemptResponse.data.data.totalPoints}`);
    console.log(`   Percentage: ${attemptResponse.data.data.percentageScore}%`);
    console.log(`   Passed: ${attemptResponse.data.data.passed ? 'Yes' : 'No'}\n`);
    
    console.log('\n✅ ALL TESTS PASSED SUCCESSFULLY! ✅\n');
    
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
testAPI();