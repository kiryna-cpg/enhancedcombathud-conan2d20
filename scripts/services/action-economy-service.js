import { MODULE_ID, FLAGS, ACTION_ECONOMY, SETTING_KEYS, MOVEMENT_ECONOMY_MODES } from "../constants.js";

export function createDefaultActionState(round = 0) {
  return {
    round,
    standardSpent: 0,
    minorSpent: 0,
    reactionSpent: 0,
    movementSpent: 0,
    extraStandardGained: 0,
    extraStandardSpent: 0,
    guardDeclared: false,
    defendUsed: false,
    retaliateUsed: false,
    lastActionId: null
  };
}

export function getActionState(combatant) {
  if (!combatant) return createDefaultActionState(0);

  const state = combatant.getFlag(MODULE_ID, FLAGS.ACTION_STATE);
  return foundry.utils.mergeObject(createDefaultActionState(Number(combatant.combat?.round ?? 0)), state ?? {});
}

export async function setActionState(combatant, state) {
  if (!combatant) return;
  await combatant.setFlag(MODULE_ID, FLAGS.ACTION_STATE, state);
}

export async function resetCombatantActionState(combatant, round = 0) {
  if (!combatant) return;
  await setActionState(combatant, createDefaultActionState(Number(round ?? 0)));
}

export async function resetCombatActionStates(combat, round = 0) {
  if (!combat) return;
  for (const combatant of combat.combatants) {
    await resetCombatantActionState(combatant, round);
  }
}

export function getEconomyAvailability(state) {
  const standardMax = 1 + Math.max(0, Number(state.extraStandardGained ?? 0));
  const standardSpent = Number(state.standardSpent ?? 0) + Number(state.extraStandardSpent ?? 0);
  const minorMax = 1;
  const reactionMax = 1;

  return {
    standard: {
      max: standardMax,
      spent: standardSpent,
      remaining: Math.max(0, standardMax - standardSpent),
      available: standardSpent < standardMax
    },
    minor: {
      max: minorMax,
      spent: Number(state.minorSpent ?? 0),
      remaining: Math.max(0, minorMax - Number(state.minorSpent ?? 0)),
      available: Number(state.minorSpent ?? 0) < minorMax
    },
    reaction: {
      max: reactionMax,
      spent: Number(state.reactionSpent ?? 0),
      remaining: Math.max(0, reactionMax - Number(state.reactionSpent ?? 0)),
      available: Number(state.reactionSpent ?? 0) < reactionMax
    }
  };
}

export function canSpendEconomy(state, economy) {
  if (!economy || economy === ACTION_ECONOMY.FREE || economy === ACTION_ECONOMY.UTILITY) return true;

  const availability = getEconomyAvailability(state);

  if (economy === ACTION_ECONOMY.STANDARD) return availability.standard.available;
  if (economy === ACTION_ECONOMY.MINOR) return availability.minor.available;
  if (economy === ACTION_ECONOMY.REACTION) return availability.reaction.available;

  return true;
}

const MOVEMENT_ACTION_IDS = new Set([
  "action.movement",
  "action.sprint",
  "action.withdraw"
]);

export function isMovementEconomyEnabled() {
  return game.settings.get(MODULE_ID, SETTING_KEYS.MOVEMENT_ECONOMY_MODE) === MOVEMENT_ECONOMY_MODES.ONE_PER_ROUND;
}

export function canSpendMovement(state, actionId) {
  if (!MOVEMENT_ACTION_IDS.has(actionId)) return true;
  if (!isMovementEconomyEnabled()) return true;
  return Number(state?.movementSpent ?? 0) < 1;
}

export async function spendEconomy(combatant, economy, actionId = null) {
  if (!combatant || !economy || economy === ACTION_ECONOMY.FREE || economy === ACTION_ECONOMY.UTILITY) {
    return getActionState(combatant);
  }

  const state = foundry.utils.deepClone(getActionState(combatant));

  if (economy === ACTION_ECONOMY.STANDARD) state.standardSpent += 1;
  if (economy === ACTION_ECONOMY.MINOR) state.minorSpent += 1;
  if (economy === ACTION_ECONOMY.REACTION) state.reactionSpent += 1;

  if (MOVEMENT_ACTION_IDS.has(actionId) && isMovementEconomyEnabled()) {
    state.movementSpent += 1;
  }

  if (actionId) state.lastActionId = actionId;
  if (actionId === "action.guard") state.guardDeclared = true;
  if (actionId === "reaction.parry" || actionId === "reaction.dodge") state.defendUsed = true;

  await setActionState(combatant, state);
  return state;
}