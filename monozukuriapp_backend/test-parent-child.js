const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER_TOKEN = 'your-test-token'; // Replace with actual token

async function testParentChildFeature() {
console.log('Testing Parent/Child Thread Feature...\n');

  try {
    // 1. Create parent thread
    console.log('1. Creating parent thread...');
    const parentThread = await axios.post(`${BASE_URL}/threads`, {
      problem: {
        title: 'Test Parent Thread',
        description: 'This is a test parent thread',
        language: 'ja'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Parent thread created:', parentThread.data);
    const parentId = parentThread.data.thread_id;

    // 2. Create child thread
    console.log('\n2. Creating child thread...');
    const childThread = await axios.post(`${BASE_URL}/threads`, {
      problem: {
        title: 'Test Child Thread',
        description: 'This is a test child thread',
        language: 'ja'
      },
      parent_id: parentId
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Child thread created:', childThread.data);

    // 3. Get threads (should only show parent threads)
    console.log('\n3. Getting threads (should show only parents)...');
    const threads = await axios.get(`${BASE_URL}/threads`, {
      headers: {
        'Authorization': `Bearer ${TEST_USER_TOKEN}`
      }
    });
    
    console.log('Threads retrieved:', threads.data);

    // 4. Get child threads
    console.log('\n4. Getting child threads...');
    const childThreads = await axios.get(`${BASE_URL}/threads/${parentId}/children`, {
      headers: {
        'Authorization': `Bearer ${TEST_USER_TOKEN}`
      }
    });
    
    console.log('Child threads retrieved:', childThreads.data);

    console.log('\nAll tests passed!');

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

// Run test
testParentChildFeature();
