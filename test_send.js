const axios = require('axios');

async function testSendMessage() {
    const sessionId = 'kamtech';
    const token = 'aac51508-aa83-4ec6-8c0b-c491fa0598d4'; // Token from DB
    const url = `http://localhost:3001/api/v1/messages?sessionId=${sessionId}`;
    
    const payload = {
        to: '221774133405', // A number to test
        type: 'text',
        text: { body: 'Test message from API' },
        recipient_type: 'individual'
    };

    try {
        console.log(`Sending message to ${payload.to} using session ${sessionId}...`);
        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('Response:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('Error response:', error.response.status, error.response.data);
        } else {
            console.error('Error message:', error.message);
        }
    }
}

testSendMessage();
