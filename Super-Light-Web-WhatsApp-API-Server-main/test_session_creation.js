
const axios = require('axios');

async function testSessionCreation() {
    const API_URL = 'http://localhost:3001';
    
    try {
        // 1. Login
        console.log('Logging in...');
        const loginResponse = await axios.post(`${API_URL}/admin/login`, {
            email: 'admin',
            password: '63d2a0f16b9751e319b767f1c558bf43'
        });
        
        const cookie = loginResponse.headers['set-cookie'];
        console.log('Login successful');

        // 2. Create Session
        console.log('Creating session...');
        const sessionId = 'test-session-' + Date.now();
        const createResponse = await axios.post(`${API_URL}/api/v1/sessions`, 
            { sessionId },
            { headers: { Cookie: cookie } }
        );
        
        console.log('Session creation response:', createResponse.data);
    } catch (error) {
        console.error('Test failed:', error.response ? {
            status: error.response.status,
            data: error.response.data
        } : error.message);
    }
}

testSessionCreation();
