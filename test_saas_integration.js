
const { db } = require('./src/config/database');
const User = require('./src/models/User');
const SubscriptionService = require('./src/services/SubscriptionService');
const CreditService = require('./src/services/CreditService');
const PricingService = require('./src/services/PricingService');
// const PaymentService = require('./src/services/payment');

async function runTest() {
    console.log('--- SaaS Integration Test ---');

    // Debug: Check notifications schema
    // const schema = db.prepare("PRAGMA table_info(notifications)").all();
    // console.log('Notifications Schema:', schema.map(c => c.name));
    
    // 1. Create Test User
    const email = 'test_saas_integration@example.com';
    let user = User.findByEmail(email);
    if (user) {
        console.log('Deleting existing test user...');
        // Delete dependent data
        try {
            db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(user.id);
            db.prepare('DELETE FROM credit_history WHERE user_id = ?').run(user.id);
            db.prepare('DELETE FROM user_notifications WHERE user_id = ?').run(user.id);
        } catch (e) {
            console.log('Cleanup error (ignoring):', e.message);
        }
        db.prepare('DELETE FROM users WHERE email = ?').run(email);
    }
    
    console.log('Creating test user...');
    user = await User.create({ email, name: 'SaaS Tester' });
    console.log('User created:', user.id, user.message_limit);

    // 2. Verify Initial Credits
    const balance = CreditService.getBalance(user.id);
    console.log('Initial Balance (should be 60 from User.create):', balance);
    
    // 3. Subscribe to Starter Plan
    console.log('Subscribing to Starter Plan...');
    await SubscriptionService.subscribe(user.id, 'starter');
    
    // 4. Verify Subscription
    const sub = SubscriptionService.getCurrentSubscription(user.id);
    console.log('Subscription active:', sub ? sub.plan_name : 'No');
    
    // 5. Verify Credits after Subscription
    // Starter plan has 2000 credits.
    // Reset logic: Should be 2000.
    const balanceAfterSub = CreditService.getBalance(user.id);
    console.log('Balance after Subscription (should be 2000):', balanceAfterSub);
    
    user = User.findById(user.id);
    console.log('User message_limit (should be 2000):', user.message_limit);

    // 6. Test Deduct
    console.log('Deducting 10 credits...');
    const success = CreditService.deduct(user.id, 10, 'Test usage');
    console.log('Deduct success:', success);
    
    const balanceAfterDeduct = CreditService.getBalance(user.id);
    console.log('Balance after Deduct (should be 1990):', balanceAfterDeduct);
    
    user = User.findById(user.id);
    console.log('User message_limit (should be 1990):', user.message_limit);

    // 7. Test Admin Exclusion
    console.log('Promoting to Admin...');
    // We update role directly in DB
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', user.id);
    
    console.log('Deducting 1000 credits as Admin...');
    const adminSuccess = CreditService.deduct(user.id, 1000, 'Admin usage');
    console.log('Admin Deduct success (should be true):', adminSuccess);
    
    const balanceAfterAdmin = CreditService.getBalance(user.id);
    console.log('Balance after Admin Deduct (should be 1990 - unchanged):', balanceAfterAdmin);

    // 8. Test Cancellation
    console.log('Cancelling Subscription...');
    const cancelResult = await SubscriptionService.cancel(user.id);
    console.log('Cancel result:', cancelResult);
    
    const subCancelled = SubscriptionService.getCurrentSubscription(user.id); 
    console.log('Subscription after cancel (should be null):', subCancelled);

    // 9. Cleanup
    console.log('Cleaning up...');
    try {
        db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(user.id);
        db.prepare('DELETE FROM credit_history WHERE user_id = ?').run(user.id);
        db.prepare('DELETE FROM user_notifications WHERE user_id = ?').run(user.id);
        db.prepare('DELETE FROM users WHERE email = ?').run(email);
    } catch (e) {
        console.log('Cleanup error:', e.message);
    }
    
    console.log('Test Complete');
}

runTest().catch(console.error);
