const axios = require('axios');
const { db } = require('../config/database');
const { log } = require('../utils/logger');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

const CHARIOW_API_URL = 'https://api.chariow.com/v1'; // À vérifier
const API_KEY = process.env.CHARIOW_API_KEY;
const SECRET_KEY = process.env.CHARIOW_SECRET_KEY;

// Définition des plans (IDs configurables via .env ou valeurs par défaut)
const PLANS = {
    'starter': {
        name: 'Starter',
        price: 2500,
        message_limit: 2000,
        url: 'https://esaystor.online/prd_jx0jkk',
        chariow_product_id: process.env.CHARIOW_PRODUCT_STARTER_ID || 'prd_jx0jkk'
    },
    'pro': {
        name: 'Pro',
        price: 5000,
        message_limit: 10000,
        url: 'https://esaystor.online/prd_l2es24',
        chariow_product_id: process.env.CHARIOW_PRODUCT_PRO_ID || 'prd_l2es24'
    },
    'business': {
        name: 'Business',
        price: 10000,
        message_limit: 100000,
        url: 'https://esaystor.online/prd_twafj6',
        chariow_product_id: process.env.CHARIOW_PRODUCT_BUSINESS_ID || 'prd_twafj6'
    }
};

/**
 * Helper to get plan ID from Chariow product ID
 */
function getPlanByProductId(productId) {
    for (const [key, plan] of Object.entries(PLANS)) {
        if (plan.chariow_product_id === productId) {
            return { id: key, ...plan };
        }
    }
    return null;
}

/**
 * Crée un lien de paiement Chariow
 * @param {object} user - L'utilisateur qui achète
 * @param {string} planId - L'ID du plan (starter, pro, business)
 * @returns {string} L'URL de paiement
 */
async function createCheckoutSession(user, planId) {
    const plan = PLANS[planId];
    if (!plan) throw new Error('Plan invalide');

    try {
        log(`Création de lien de paiement pour ${user.email} - Plan ${planId}`, 'PAYMENT', { plan }, 'INFO');
        
        // Retourne le lien direct Esaystor
        // On essaie d'ajouter l'email en paramètre si supporté par la plateforme, 
        // sinon l'utilisateur devra le saisir.
        // Format hypothétique: ?email=user@example.com ou ?customer_email=...
        // Pour l'instant on retourne le lien brut.
        return plan.url;
    } catch (error) {
        log('Erreur lors de la création du paiement Chariow', 'PAYMENT', { error: error.message }, 'ERROR');
        throw new Error('Impossible de créer le lien de paiement');
    }
}

/**
 * Traite les événements de licence Chariow
 * @param {object} event - Nom de l'événement
 * @param {object} payload - Données de l'événement
 * @returns {object} Résultat de l'opération
 */
async function handleLicenseEvent(event, payload) {
    const { customer_email, license_key, product_id, expiry_date } = payload;
    
    // Find plan based on product_id
    const planInfo = getPlanByProductId(product_id);
    const planId = planInfo ? planInfo.id : 'free';
    
    const eventName = event.toLowerCase();
    log(`Processing Chariow event: ${eventName} for ${customer_email}`, 'PAYMENT', { planId, productId: product_id });

    if (eventName.includes('license.issued') || eventName.includes('license émise') || eventName.includes('license activée')) {
        if (!customer_email) {
            log('Missing email in Chariow webhook', 'SYSTEM', null, 'WARN');
            throw new Error('Missing email');
        }

        const user = User.findByEmail(customer_email);
        
        if (user) {
            User.updateSubscription(customer_email, {
                planId,
                status: 'active',
                licenseKey: license_key,
                expiry: expiry_date,
                messageLimit: planInfo ? planInfo.message_limit : 100 // Use plan limit or default
            });
            
            ActivityLog.log({
                userEmail: user.email,
                action: 'SUBSCRIPTION_UPDATE',
                resource: 'user',
                resourceId: user.email,
                success: true,
                details: { event: eventName, plan: product_id, planId }
            });
            
            log(`Subscription updated for ${customer_email}: ${planId}`, 'PAYMENT');
            return { success: true, action: 'updated', user: user.email };
        } else {
            log(`User not found for subscription update: ${customer_email}`, 'AUTH', null, 'WARN');
            return { success: false, error: 'User not found' };
        }
    } else if (eventName.includes('expired') || eventName.includes('expirée') || eventName.includes('revoked') || eventName.includes('révoquée')) {
        if (customer_email) {
            const user = User.findByEmail(customer_email);
            if (user) {
                User.updateSubscription(customer_email, {
                    planId: 'free',
                    status: 'expired',
                    licenseKey: null,
                    expiry: new Date().toISOString(),
                    messageLimit: 100 // Reset to free limit
                });
                
                ActivityLog.log({
                    userEmail: user.email,
                    action: 'SUBSCRIPTION_REVOKE',
                    resource: 'user',
                    resourceId: user.email,
                    success: true,
                    details: { event: eventName, plan: product_id }
                });

                log(`Subscription expired/revoked for ${customer_email}`, 'AUTH');
                return { success: true, action: 'revoked', user: user.email };
            }
        }
    }

    return { success: true, action: 'ignored', event: eventName };
}

module.exports = {
    createCheckoutSession,
    handleLicenseEvent,
    PLANS
};
