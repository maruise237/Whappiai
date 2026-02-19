const axios = require('axios');
const { db } = require('../config/database');
const { log } = require('../utils/logger');
const User = require('../models/User');

const CHARIOW_API_URL = 'https://api.chariow.com/v1'; // À vérifier
const API_KEY = process.env.CHARIOW_API_KEY;
const SECRET_KEY = process.env.CHARIOW_SECRET_KEY;

// Définition des plans (IDs à remplacer par ceux de Chariow)
const PLANS = {
    'starter': {
        name: 'Starter',
        price: 2500,
        message_limit: 500,
        chariow_product_id: process.env.CHARIOW_PRODUCT_STARTER_ID
    },
    'pro': {
        name: 'Pro',
        price: 5000,
        message_limit: 2000,
        chariow_product_id: process.env.CHARIOW_PRODUCT_PRO_ID
    },
    'business': {
        name: 'Business',
        price: 10000,
        message_limit: 10000,
        chariow_product_id: process.env.CHARIOW_PRODUCT_BUSINESS_ID
    }
};

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
        // --- PRODUCTION LOGIC START ---
        // Une fois vos clés API configurées dans .env, décommentez ce bloc :
        /*
        const response = await axios.post(`${CHARIOW_API_URL}/checkout`, {
            api_key: API_KEY,
            amount: plan.price,
            currency: 'XAF',
            description: `Abonnement Whappi ${plan.name}`,
            customer_email: user.email,
            customer_name: user.name,
            metadata: {
                user_id: user.id,
                plan_id: planId
            },
            redirect_url: `${process.env.FRONTEND_URL}/dashboard/billing/success`, // Créez cette page si nécessaire
            cancel_url: `${process.env.FRONTEND_URL}/dashboard/billing`,
            webhook_url: `${process.env.API_URL}/api/v1/payments/webhook`
        });
        return response.data.payment_url;
        */
        // --- PRODUCTION LOGIC END ---

        
        // --- MOCK LOGIC (Simulation) ---
        log(`[MOCK] Simulation de création de lien de paiement pour ${user.email} - Plan ${planId}`, 'PAYMENT', { plan }, 'INFO');
        // Simule une URL de paiement qui redirige vers une page de succès fictive (ou Google pour l'instant)
        return `https://checkout.chariow.com/pay/mock-session-${Date.now()}?plan=${planId}&email=${encodeURIComponent(user.email)}`;
    } catch (error) {
        log('Erreur lors de la création du paiement Chariow', 'PAYMENT', { error: error.message }, 'ERROR');
        throw new Error('Impossible de créer le lien de paiement');
    }
}

/**
 * Traite le webhook de Chariow
 * @param {object} payload - Données reçues du webhook
 * @param {string} signature - Signature de sécurité
 */
async function handleWebhook(payload, signature) {
    // Vérifier la signature (TODO: Implémenter la vérification HMAC si Chariow le supporte)
    
    const { status, metadata, license_key } = payload;
    
    if (status === 'completed' || status === 'paid') {
        const userId = metadata.user_id;
        const planId = metadata.plan_id;
        
        if (userId && planId) {
            await activateSubscription(userId, planId, license_key);
        }
    }
}

/**
 * Active l'abonnement pour un utilisateur
 * @param {string} userId 
 * @param {string} planId 
 * @param {string} licenseKey 
 */
async function activateSubscription(userId, planId, licenseKey) {
    const plan = PLANS[planId];
    if (!plan) return;

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1); // +1 mois

    try {
        const stmt = db.prepare(`
            UPDATE users 
            SET plan_id = ?, 
                plan_status = 'active',
                message_limit = ?,
                subscription_expiry = ?,
                chariow_license_key = ?
            WHERE id = ?
        `);
        
        stmt.run(planId, plan.message_limit, expiryDate.toISOString(), licenseKey, userId);
        
        log(`Abonnement activé pour l'utilisateur ${userId} - Plan ${planId}`, 'PAYMENT', { planId }, 'INFO');
    } catch (error) {
        log('Erreur lors de l\'activation de l\'abonnement', 'PAYMENT', { error: error.message, userId }, 'ERROR');
        throw error;
    }
}

module.exports = {
    createCheckoutSession,
    handleWebhook,
    activateSubscription,
    PLANS
};
