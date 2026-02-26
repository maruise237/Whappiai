/**
 * User Management Routes
 * Admin CRUD operations for users
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { requireAuth, requireAdmin, getCurrentUser } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const response = require('../utils/response');

/**
 * GET /admin/users
 * Get all users (admin or regular user creating collaborateurs)
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
    const currentUser = getCurrentUser(req);
    let users = User.getAll();
    
    // Non-admins only see users they created
    if (currentUser.role !== 'admin') {
        users = users.filter(u => u.created_by === currentUser.email);
    }
    
    return response.success(res, users);
}));

/**
 * GET /profile
 * Get current user profile and WhatsApp/AI status
 */
router.get('/profile', requireAuth, asyncHandler(async (req, res) => {
    const currentUser = getCurrentUser(req);
    const user = User.findById(currentUser.id);
    
    if (!user) {
        const { log } = require('../utils/logger');
        log(`Profil non trouvé pour ID=${currentUser?.id}`, 'SYSTEM', { email: currentUser?.email }, 'WARN');
        return response.error(res, 'Utilisateur non trouvé. Veuillez vous reconnecter.', 404);
    }
    
    return response.success(res, user);
}));

/**
 * PUT /profile
 * Update current user profile (password)
 */
router.put('/profile', requireAuth, asyncHandler(async (req, res) => {
    const currentUser = getCurrentUser(req);
    const updates = req.body;

    const { log } = require('../utils/logger');
    log(`Tentative de mise à jour profil pour ID: ${currentUser?.id}, Email: ${currentUser?.email}`, 'SYSTEM', { updates: Object.keys(updates) }, 'DEBUG');

    // Only allow updating email, password, name, bio, location, website and phone from this endpoint for security
    const allowedUpdates = [
        'email', 'password', 'name', 'bio', 'location', 'website', 'phone',
        'timezone', 'address', 'organization_name', 'sound_notifications'
    ];
    const filteredUpdates = {};
    
    for (const key of allowedUpdates) {
        if (updates[key] !== undefined) {
            filteredUpdates[key] = updates[key];
        }
    }

    if (Object.keys(filteredUpdates).length === 0) {
        return response.error(res, 'No valid fields to update', 400);
    }

    // Validate email format if provided
    if (filteredUpdates.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(filteredUpdates.email)) {
            return response.validationError(res, ['Format d\'email invalide']);
        }

        // Check if email is already taken by another user
        const existingUser = User.findByEmail(filteredUpdates.email);
        if (existingUser && existingUser.id !== currentUser.id) {
            return response.error(res, 'Cette adresse email est déjà utilisée', 409);
        }
    }

    try {
        const user = await User.update(currentUser.id, filteredUpdates);

        await ActivityLog.log({
            userEmail: currentUser.email,
            action: 'PROFILE_UPDATE',
            resource: 'user',
            resourceId: currentUser.id,
            details: { updates: Object.keys(filteredUpdates) },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        return response.success(res, user);
    } catch (err) {
        log(`Erreur lors de la mise à jour du profil: ${err.message}`, 'SYSTEM', { error: err.message, userId: currentUser.id }, 'ERROR');
        return response.error(res, err.message, 404);
    }
}));

/**
 * POST /profile/ai
 * Update AI configuration for current user
 */
router.post('/profile/ai', requireAuth, asyncHandler(async (req, res) => {
    const currentUser = getCurrentUser(req);
    const { enabled, prompt, model } = req.body;

    const user = User.updateAIConfig(currentUser.id, {
        enabled: !!enabled,
        prompt,
        model: model || 'deepseek-chat'
    });

    await ActivityLog.log({
        userEmail: currentUser.email,
        action: 'AI_CONFIG_UPDATE',
        resource: 'user',
        resourceId: currentUser.id,
        details: { ai_enabled: !!enabled, ai_model: model || 'deepseek-chat' },
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });

    return response.success(res, user);
}));

/**
 * POST /admin/users
 * Create a new user (admin for any role, user for collaborateur only)
 */
router.post('/', requireAuth, asyncHandler(async (req, res) => {
    const { email, password, role } = req.body;
    const currentUser = getCurrentUser(req);

    if (!email || !password) {
        return response.validationError(res, ['Email and password are required']);
    }

    // Role restriction: regular users can only create 'collaborateur'
    let finalRole = role || 'user';
    if (currentUser.role !== 'admin') {
        finalRole = 'collaborateur';
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return response.validationError(res, ['Invalid email format']);
    }

    try {
        const user = await User.create({
            email,
            password,
            role: finalRole,
            createdBy: currentUser.email
        });

        await ActivityLog.log({
            userEmail: currentUser.email,
            action: 'USER_CREATE',
            resource: 'user',
            resourceId: user.id,
            details: { newUserEmail: email, role: finalRole },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        return response.success(res, user, 201);
    } catch (err) { 
        if (err.message === 'User already exists') {
            return response.error(res, 'User with this email already exists', 409);
        }
        throw err;
    }
}));

/**
 * PUT /admin/users/:email
 * Update a user (admin for any, user for their created collaborateurs)
 */
router.put('/:email', requireAuth, asyncHandler(async (req, res) => {
    const { email } = req.params;
    const updates = req.body;
    const currentUser = getCurrentUser(req);

    const existingUser = User.findByEmail(email);
    if (!existingUser) {
        return response.notFound(res, 'User not found');
    }

    // Security check: non-admins can only update users they created
    if (currentUser.role !== 'admin' && existingUser.createdBy !== currentUser.email) {
        return response.forbidden(res, 'You can only update users you created');
    }

    // Security check: non-admins cannot promote anyone to admin or change roles to anything but collaborateur
    if (currentUser.role !== 'admin') {
        if (updates.role && updates.role !== 'collaborateur') {
            updates.role = 'collaborateur';
        }
    }

    try {
        const user = await User.update(existingUser.id, updates);

        await ActivityLog.log({
            userEmail: currentUser.email,
            action: 'USER_UPDATE',
            resource: 'user',
            resourceId: existingUser.id,
            details: { targetEmail: email, updates: Object.keys(updates) },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        return response.success(res, user);
    } catch (err) {
        return response.error(res, err.message, 404);
    }
}));

/**
 * DELETE /admin/users/:email
 * Delete a user (admin for any, user for their created collaborateurs)
 */
router.delete('/:email', requireAuth, asyncHandler(async (req, res) => {
    const { email } = req.params;
    const currentUser = getCurrentUser(req);

    const existingUser = User.findByEmail(email);
    if (!existingUser) {
        return response.notFound(res, 'User not found');
    }

    // Security check: non-admins can only delete users they created
    if (currentUser.role !== 'admin' && existingUser.createdBy !== currentUser.email) {
        return response.forbidden(res, 'You can only delete users you created');
    }

    // Prevent self-deletion
    if (email.toLowerCase() === currentUser.email.toLowerCase()) {
        return response.error(res, 'Cannot delete your own account', 400);
    }

    try {
        User.delete(existingUser.id);

        await ActivityLog.log({
            userEmail: currentUser.email,
            action: 'USER_DELETE',
            resource: 'user',
            resourceId: existingUser.id,
            details: { deletedEmail: email },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        return response.success(res, { message: 'User deleted successfully' });
    } catch (err) {
        return response.error(res, err.message, 404);
    }
}));

module.exports = router;
