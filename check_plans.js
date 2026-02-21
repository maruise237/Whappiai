
const { db } = require('./src/config/database');

const plans = db.prepare('SELECT * FROM pricing_plans').all();
console.log('Plans:', plans);
