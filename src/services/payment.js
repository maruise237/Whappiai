const { log } = require('../utils/logger');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const SubscriptionService = require('./SubscriptionService');
const PricingService = require('./PricingService');
const CreditService = require('./CreditService');

/**
 * Crée un lien de paiement Chariow
 * @param {object} user - L'utilisateur qui achète
 * @param {string} planCode - Le code du plan (starter, pro, business)
 * @returns {string} L'URL de paiement
 */
async function createCheckoutSession(user, planCode) {
    const plan = PricingService.getPlanByCode(planCode);
    if (!plan) throw new Error('Plan invalide');

    try {
        log(`Création de lien de paiement pour ${user.email} - Plan ${planCode}`, 'PAYMENT', { plan }, 'INFO');
        
        if (!plan.payment_url) {
            throw new Error('URL de paiement non configurée pour ce plan');
        }

        // Retourne le lien direct (stocké en base)
        // Note: Pour une intégration plus poussée, on pourrait appeler l'API Chariow ici
        // pour créer une session unique, mais le lien statique fonctionne pour l'instant.
        return plan.payment_url;
    } catch (error) {
        log('Erreur lors de la création du paiement Chariow', 'PAYMENT', { error: error.message }, 'ERROR');
        throw new Error('Impossible de créer le lien de paiement');
    }
}

/**
 * Traite les événements de licence Chariow
 * @param {string} event - Nom de l'événement
 * @param {object} payload - Données de l'événement
 * @returns {object} Résultat de l'opération
 */
async function handleLicenseEvent(event, payload) {
    const { customer_email, license_key, product_id, expiry_date } = payload;
    
    // Normalisation de l'événement
    const eventName = event.toLowerCase();
    log(`Processing Chariow event: ${eventName} for ${customer_email}`, 'PAYMENT', { productId: product_id });

    if (!customer_email) {
        log('Missing email in Chariow webhook', 'SYSTEM', null, 'WARN');
        throw new Error('Missing email');
    }

    const user = User.findByEmail(customer_email);
    if (!user) {
        log(`User not found for payment event: ${customer_email}`, 'AUTH', null, 'WARN');
        return { success: false, error: 'User not found' };
    }

    // Récupération du plan associé au produit Chariow
    const plan = PricingService.getPlanByChariowId(product_id);
    const planCode = plan ? plan.code : 'unknown';

    // 1. Événement: Licence émise / activée
    if (eventName.includes('license.issued') || eventName.includes('license émise') || eventName.includes('license activée')) {
        
        // Cas A: Pack de Crédits (Achat unique)
        if (plan && plan.interval === 'one_time') {
            try {
                // Ajout des crédits
                const newBalance = CreditService.add(user.id, plan.message_limit, 'purchase', `Achat: ${plan.name}`);
                log(`Credit pack added for ${customer_email}: ${plan.message_limit} credits. New balance: ${newBalance}`, 'PAYMENT');
                
                // Mise à jour User (Legacy & Display)
                // On garde le plan actuel mais on met à jour le statut si nécessaire
                // Note: On ne change pas plan_id pour un pack de crédits
                User.updateSubscription(customer_email, {
                    planId: user.plan_id, 
                    status: user.plan_status, // Garde le statut actuel (ex: active ou free)
                    licenseKey: license_key,
                    expiry: user.subscription_expiry, // Garde l'expiration actuelle
                    messageLimit: newBalance // Met à jour l'affichage de la limite (qui est le solde pour nous)
                });

                ActivityLog.log({
                    userEmail: user.email,
                    action: 'CREDIT_PURCHASE',
                    resource: 'credits',
                    resourceId: product_id,
                    success: true,
                    details: { amount: plan.message_limit, plan: plan.name }
                });

                return { success: true, action: 'credit_added', user: user.email };

            } catch (err) {
                log(`Error adding credits: ${err.message}`, 'PAYMENT', null, 'ERROR');
                throw err;
            }
        } 
        // Cas B: Abonnement (Récurrent)
        else {
            try {
                // Activation de l'abonnement via le service dédié
                // (Gère déjà: création en base, reset crédits, notification)
                await SubscriptionService.subscribe(user.id, planCode);
                
                // Mise à jour User (Legacy & Display) pour compatibilité frontend
                User.updateSubscription(customer_email, {
                    planId: plan ? plan.id : planCode,
                    status: 'active',
                    licenseKey: license_key,
                    expiry: expiry_date || new Date(Date.now() + 30*24*60*60*1000).toISOString(),
                    messageLimit: plan ? plan.message_limit : 100
                });

                ActivityLog.log({
                    userEmail: user.email,
                    action: 'SUBSCRIPTION_START',
                    resource: 'subscription',
                    resourceId: planCode,
                    success: true,
                    details: { plan: plan ? plan.name : planCode }
                });

                log(`Subscription activated for ${customer_email}: ${planCode}`, 'PAYMENT');
                return { success: true, action: 'subscription_activated', user: user.email };

            } catch (err) {
                log(`Error activating subscription: ${err.message}`, 'PAYMENT', null, 'ERROR');
                throw err;
            }
        }
    } 
    // 2. Événement: Licence expirée / révoquée
    else if (eventName.includes('expired') || eventName.includes('expirée') || eventName.includes('revoked') || eventName.includes('révoquée')) {
        try {
            // Annulation via le service dédié
            await SubscriptionService.cancel(user.id);

            // Mise à jour User (Legacy)
            User.updateSubscription(customer_email, {
                planId: 'free',
                status: 'expired',
                licenseKey: null,
                expiry: new Date().toISOString(),
                messageLimit: 100 // Retour au plan gratuit
            });
            
            ActivityLog.log({
                userEmail: user.email,
                action: 'SUBSCRIPTION_END',
                resource: 'subscription',
                resourceId: planCode,
                success: true,
                details: { reason: eventName }
            });

            log(`Subscription ended for ${customer_email}`, 'PAYMENT');
            return { success: true, action: 'subscription_ended', user: user.email };

        } catch (err) {
            log(`Error cancelling subscription: ${err.message}`, 'PAYMENT', null, 'ERROR');
            throw err;
        }
    }

    return { success: true, action: 'ignored', event: eventName };
}

module.exports = {
    createCheckoutSession,
    handleLicenseEvent,
    handleWebhook: handleLicenseEvent
};
