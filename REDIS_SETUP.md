# Configuration Redis - Guide Rapide

## 📦 Installation de Redis

### macOS (Homebrew)
```bash
brew install redis
brew services start redis
```

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
```

### Docker
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

### Windows (WSL2 recommandé)
```bash
# Via WSL2 Ubuntu
sudo apt-get install redis-server
sudo service redis-server start
```

## ⚙️ Configuration

### 1. Ajouter à `.env`
```bash
REDIS_URL=redis://localhost:6379
```

### 2. Variables optionnelles
```bash
# Pour Redis avec authentification
REDIS_URL=redis://:motdepasse@localhost:6379

# Pour Redis Cloud ou distant
REDIS_URL=redis://user:password@host:port
```

## 🧪 Vérification

### Tester la connexion Redis
```bash
redis-cli ping
# Doit répondre: PONG
```

### Tester l'intégration dans l'app
```bash
npm test -- tests/redis.test.js
```

## 📊 Monitoring

### Voir les statistiques Redis
```bash
redis-cli info stats
```

### Surveiller les opérations en temps réel
```bash
redis-cli monitor
```

### Vider le cache (développement)
```bash
redis-cli FLUSHDB
```

## 🔧 Utilisation dans le Code

### Service Redis direct
```javascript
const redisService = require('./src/services/redis');

// Mettre en cache
await redisService.set('key', { data: 'value' }, 3600);

// Récupérer du cache
const value = await redisService.get('key');

// Supprimer du cache
await redisService.delete('key');

// Vérifier l'existence
const exists = await redisService.exists('key');
```

### Middleware Clerk Cache
```javascript
const { cacheClerkAuth } = require('./src/middleware/clerk-cache');

// Utiliser dans une route
router.get('/protected', 
    cacheClerkAuth(300), // Cache 5 minutes
    authMiddleware,
    (req, res) => { ... }
);
```

## 🎯 Bénéfices

- **Performance** : Réduction des appels API Clerk (~90% de cache hits)
- **Coût** : Moins d'appels API payants vers Clerk
- **Latence** : Réponse plus rapide (<1ms vs ~100ms pour Clerk)
- **Fiabilité** : Graceful degradation si Redis est indisponible

## 🚨 Dépannage

### Redis ne démarre pas
```bash
# Vérifier si Redis est déjà en cours d'exécution
ps aux | grep redis

# Vérifier les logs
sudo tail -f /var/log/redis/redis-server.log
```

### Connexion refusée
```bash
# Vérifier que Redis écoute sur le bon port
netstat -tlnp | grep 6379

# Tester la connectivité
telnet localhost 6379
```

### Mémoire pleine
```bash
# Configurer la politique d'éviction dans redis.conf
maxmemory-policy allkeys-lru
```

---

**Documentation complète :** https://redis.io/documentation
