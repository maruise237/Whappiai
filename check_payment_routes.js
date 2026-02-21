
try {
    const paymentRoutes = require('./src/routes/payments');
    console.log('Payment routes loaded successfully');
} catch (e) {
    console.error('Error loading payment routes:', e);
}
