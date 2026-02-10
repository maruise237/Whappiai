import { putsch } from "./putsch-adapter";
import { PutschNotification } from "./putsch-types";

/**
 * Système de tests unitaires simplifié pour l'adaptateur PUTSCH.
 * Étant donné l'absence de framework de test (Jest/Vitest), 
 * ce script simule des tests et valide les comportements attendus.
 */
export async function runPutschTests() {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: [] as string[]
  };

  const assert = (condition: boolean, message: string) => {
    results.total++;
    if (condition) {
      results.passed++;
      console.log(`✅ PASS: ${message}`);
    } else {
      results.failed++;
      console.error(`❌ FAIL: ${message}`);
      results.errors.push(message);
    }
  };

  console.log("🚀 Démarrage des tests PUTSCH...");

  // 1. Test des préférences par défaut
  const prefs = putsch.getPreferences();
  assert(prefs !== undefined, "Les préférences doivent être définies");
  assert(prefs.enabled === true, "Le système doit être activé par défaut");
  assert(prefs.soundEnabled === true, "Le son doit être activé par défaut");

  // 2. Test de notification (Mode Silencieux)
  putsch.updatePreferences({ soundEnabled: false });
  const silentResult = await putsch.notify({
    title: "Test Unit",
    message: "Mode silencieux",
    priority: "low"
  });
  assert(silentResult === true, "Notification silencieuse doit être acceptée");

  // 3. Test de désactivation globale
  putsch.updatePreferences({ enabled: false });
  const disabledResult = await putsch.notify({
    title: "Test Unit",
    message: "Système désactivé",
    priority: "high"
  });
  assert(disabledResult === false, "Notification doit être refusée quand le système est désactivé");

  // Restaurer
  putsch.updatePreferences({ enabled: true, soundEnabled: true });

  // 4. Test de filtrage par priorité
  putsch.updatePreferences({ 
    priorities: { low: false, medium: true, high: true, critical: true } 
  });
  const filteredResult = await putsch.notify({
    title: "Test Unit",
    message: "Priorité basse filtrée",
    priority: "low"
  });
  assert(filteredResult === false, "Notification de priorité basse doit être filtrée");

  // 5. Test de file d'attente (simulation)
  const q1 = putsch.notify({ title: "Q1", message: "Msg 1", priority: "high" });
  const q2 = putsch.notify({ title: "Q2", message: "Msg 2", priority: "high" });
  assert(await q1 === true && await q2 === true, "Les notifications multiples doivent être mises en file d'attente");

  console.log(`\n📊 Résultats des tests: ${results.passed}/${results.total} réussis.`);
  
  return results;
}
