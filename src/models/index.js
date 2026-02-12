/**
 * Model Index
 * Export all models from a single location
 */

const User = require('./User');
const Session = require('./Session');
const ActivityLog = require('./ActivityLog');
const AIModel = require('./AIModel');

module.exports = {
    User,
    Session,
    ActivityLog,
    AIModel
};
