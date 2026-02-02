
// Testing login using built-in fetch
async function testLogin() {
    const url = 'http://localhost:3001/admin/login';
    const body = {
        email: 'admin',
        password: '63d2a0f16b9751e319b767f1c558bf43' // From .env
    };

    console.log(`Testing login at ${url}...`);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        console.log('Status:', response.status);
        const data = await response.text();
        console.log('Body:', data);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testLogin();
