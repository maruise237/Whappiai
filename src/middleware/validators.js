/**
 * Middleware de Validation Centralisé
 * Fournit des validateurs réutilisables pour les routes API
 */

const validator = require('validator');
const { isValidId } = require('../utils/validation');

/**
 * Middleware pour valider un ID de session dans les params
 */
function validateSessionId(req, res, next) {
    const sessionId = req.params.sessionId;
    
    if (!sessionId) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Session ID est requis' 
        });
    }
    
    if (!isValidId(sessionId)) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Format de Session ID invalide' 
        });
    }
    
    next();
}

/**
 * Middleware pour valider un email
 */
function validateEmail(req, res, next) {
    const email = req.body.email || req.query.email;
    
    if (!email) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Email est requis' 
        });
    }
    
    if (!validator.isEmail(email)) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Format d\'email invalide' 
        });
    }
    
    next();
}

/**
 * Middleware pour valider un numéro de téléphone (format WhatsApp)
 */
function validatePhoneNumber(req, res, next) {
    const phone = req.body.phone || req.body.phoneNumber || req.query.phone;
    
    if (!phone) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Numéro de téléphone est requis' 
        });
    }
    
    // Nettoyage du numéro
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
    
    // Doit contenir uniquement des chiffres et commencer par un chiffre
    if (!/^\d{8,15}$/.test(cleaned)) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Numéro de téléphone invalide. Doit contenir 8-15 chiffres.' 
        });
    }
    
    // Stocker le numéro nettoyé pour utilisation ultérieure
    req.cleanedPhone = cleaned;
    next();
}

/**
 * Middleware pour valider une URL webhook
 */
function validateWebhookUrl(req, res, next) {
    const url = req.body.url || req.query.url;
    
    if (!url) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'URL webhook est requise' 
        });
    }
    
    if (!validator.isURL(url, { 
        require_protocol: true, 
        protocols: ['http', 'https'],
        require_tld: false 
    })) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'URL webhook invalide. Doit commencer par http:// ou https://' 
        });
    }
    
    next();
}

/**
 * Middleware pour valider un corps de requête JSON non vide
 */
function validateNotEmptyBody(req, res, next) {
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Le corps de la requête ne peut pas être vide' 
        });
    }
    
    next();
}

/**
 * Middleware pour valider des champs requis dynamiquement
 * @param {string[]} fields - Liste des champs requis
 */
function validateRequiredFields(...fields) {
    return (req, res, next) => {
        const missing = [];
        
        for (const field of fields) {
            const value = req.body[field] || req.query[field] || req.params[field];
            
            if (value === undefined || value === null || value === '') {
                missing.push(field);
            }
        }
        
        if (missing.length > 0) {
            return res.status(400).json({ 
                status: 'error', 
                message: `Champs requis manquants: ${missing.join(', ')}` 
            });
        }
        
        next();
    };
}

/**
 * Middleware pour limiter la taille des tableaux
 * @param {number} max - Nombre maximum d'éléments
 * @param {string} fieldName - Nom du champ tableau à vérifier
 */
function validateArrayLimit(max, fieldName) {
    return (req, res, next) => {
        const array = req.body[fieldName];
        
        if (!Array.isArray(array)) {
            return res.status(400).json({ 
                status: 'error', 
                message: `${fieldName} doit être un tableau` 
            });
        }
        
        if (array.length > max) {
            return res.status(400).json({ 
                status: 'error', 
                message: `${fieldName} ne peut pas dépasser ${max} éléments` 
            });
        }
        
        next();
    };
}

/**
 * Middleware pour valider une chaîne de caractères avec longueur min/max
 * @param {string} fieldName - Nom du champ
 * @param {number} min - Longueur minimale
 * @param {number} max - Longueur maximale
 */
function validateStringLength(fieldName, min, max) {
    return (req, res, next) => {
        const value = req.body[fieldName] || req.query[fieldName];
        
        if (!value || typeof value !== 'string') {
            return res.status(400).json({ 
                status: 'error', 
                message: `${fieldName} est requis et doit être une chaîne de caractères` 
            });
        }
        
        if (value.length < min || value.length > max) {
            return res.status(400).json({ 
                status: 'error', 
                message: `${fieldName} doit contenir entre ${min} et ${max} caractères` 
            });
        }
        
        next();
    };
}

module.exports = {
    validateSessionId,
    validateEmail,
    validatePhoneNumber,
    validateWebhookUrl,
    validateNotEmptyBody,
    validateRequiredFields,
    validateArrayLimit,
    validateStringLength
};
