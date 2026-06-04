
const { db } = require('../src/config/database');
const User = require('../src/models/User');
const AIModel = require('../src/models/AIModel');
const crypto = require('crypto');
const assert = require('assert');

async function runTests() {
    console.log('Starting Security Verification Tests...');

    // Setup: Create a test user
    const testUserId = crypto.randomUUID();
    const testEmail = 'test-' + Date.now() + '@example.com';
    await User.create({
        id: testUserId,
        email: testEmail,
        name: 'Test User',
        role: 'user'
    });

    console.log('--- Testing User.update Security ---');

    // 1. Test legitimate update
    await User.update(testUserId, { name: 'Updated Name' });
    let updatedUser = User.findById(testUserId);
    assert.strictEqual(updatedUser.name, 'Updated Name', 'Legitimate update should work');

    // 2. Test malicious field injection
    try {
        // Attempt to inject a field that is NOT in allowedFields but is in the table
        // 'message_limit' is in the table but not in User.update's allowedFields
        await User.update(testUserId, {
            'message_limit" = 999 --': 999,
            'name': 'Still Secure'
        });
    } catch (e) {
        console.log('Caught expected error or ignored malicious field');
    }

    updatedUser = User.findById(testUserId);
    assert.notStrictEqual(updatedUser.message_limit, 999, 'Malicious field should not be updated');
    assert.strictEqual(updatedUser.name, 'Still Secure', 'Legitimate fields should still be updated');

    console.log('User.update Security: PASSED');

    console.log('--- Testing AIModel.update Security ---');

    // Setup: Create a test AI Model
    const model = AIModel.create({
        name: 'Test Model',
        provider: 'openai',
        endpoint: 'https://api.openai.com/v1',
        api_key: 'test-key-12345678',
        model_name: 'gpt-3.5-turbo'
    });
    const modelId = model.id;

    // 1. Test legitimate update
    AIModel.update(modelId, { name: 'Updated Model Name' });
    let updatedModel = AIModel.findById(modelId);
    assert.strictEqual(updatedModel.name, 'Updated Model Name', 'Legitimate model update should work');

    // 2. Test malicious field injection
    try {
        // Attempt to inject a field that is NOT in allowedFields
        await AIModel.update(modelId, {
            'id" = "malicious-id" --': 'malicious-id',
            'name': 'Still Secure Model'
        });
    } catch (e) {
        console.log('Caught expected error or ignored malicious field');
    }

    updatedModel = AIModel.findById(modelId);
    assert.strictEqual(updatedModel.id, modelId, 'ID should not be changed via update');
    assert.strictEqual(updatedModel.name, 'Still Secure Model', 'Legitimate fields should still be updated');

    console.log('AIModel.update Security: PASSED');

    console.log('Security Verification Tests: ALL PASSED');

    // Cleanup
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
    db.prepare('DELETE FROM ai_models WHERE id = ?').run(modelId);
}

runTests().catch(err => {
    console.error('Security Verification Tests: FAILED');
    console.error(err);
    process.exit(1);
});
