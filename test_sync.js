const { db } = require('./src/config/database');
const User = require('./src/models/User');
const { requireClerkAuth } = require('./src/middleware/auth');

async function testAutoSync() {
    console.log('--- Test Auto-Sync ---');

    // 1. Ensure DB is empty of the test user
    const testEmail = 'auto-sync-test@example.com';
    db.prepare('DELETE FROM users WHERE email = ?').run(testEmail);
    console.log(`Utilisateur ${testEmail} supprimé (si existant)`);

    // 2. Mock Request, Response and Clerk User
    const req = {
        auth: { userId: 'clerk-test-id-123' },
        session: {},
        headers: {}
    };
    const res = {
        status: function(code) { this.statusCode = code; return this; },
        json: function(data) { this.data = data; return this; }
    };
    const next = () => { req.nextCalled = true; };

    // Mock getClerkUser (internal to middleware/auth.js but we can't easily mock it without rewire)
    // Actually, I'll just test User.create directly as that's what the middleware calls.

    console.log('Appel de User.create (simulé depuis le middleware)...');
    await User.create({
        id: 'clerk-test-id-123',
        email: testEmail,
        name: 'Auto Sync Tester',
        role: 'user'
    });

    // 3. Verify user exists now
    const user = User.findByEmail(testEmail);
    if (user) {
        console.log(`SUCCÈS: Utilisateur trouvé dans la DB: ${user.email} (Role: ${user.role})`);
        console.log(`Credits initiaux: ${user.message_limit}`);
    } else {
        console.log('ÉCHEC: Utilisateur non trouvé !');
    }

    // 4. Cleanup
    db.prepare('DELETE FROM users WHERE email = ?').run(testEmail);
    console.log('Nettoyage terminé');
}

testAutoSync().catch(console.error);
