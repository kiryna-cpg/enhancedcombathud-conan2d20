import { resetCombatActionStates } from "../services/action-economy-service.js";
import {
  resetCombatTacticalStates,
  clearReadyState
} from "../services/tactical-state-service.js";

async function refreshArgonHud() {
  if (!ui.ARGON?._actor) return;
  await ui.ARGON.refresh?.();
}

export function registerCombatHooks() {
  Hooks.on("combatStart", async (combat) => {
    await resetCombatActionStates(combat, Number(combat.round ?? 1));
    await resetCombatTacticalStates(combat);
    await refreshArgonHud();
  });

  Hooks.on("updateCombat", async (combat, changed) => {
    let shouldRefresh = false;

    if ("round" in changed) {
      await resetCombatActionStates(combat, Number(combat.round ?? 0));
      shouldRefresh = true;
    }

    if ("turn" in changed) {
      if (combat.combatant) {
        await clearReadyState(combat.combatant);
      }
      shouldRefresh = true;
    }

    if (shouldRefresh) {
      await refreshArgonHud();
    }
  });

  Hooks.on("deleteCombat", async (combat) => {
    await resetCombatTacticalStates(combat);
    await refreshArgonHud();
  });
}