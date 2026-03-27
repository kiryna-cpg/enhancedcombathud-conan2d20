import { MODULE_ID, FLAGS } from "../constants.js";

export function createDefaultTacticalState() {
  return {
    brace: {
      active: false,
      weaponUuid: null,
      weaponName: "",
      round: null,
      turn: null
    },
    ready: {
      active: false,
      actionId: null,
      actionLabel: "",
      triggerText: "",
      round: null,
      turn: null
    }
  };
}

export function getTacticalState(combatant) {
  if (!combatant) return createDefaultTacticalState();

  const state = combatant.getFlag(MODULE_ID, FLAGS.TACTICAL_STATE);
  return foundry.utils.mergeObject(createDefaultTacticalState(), state ?? {});
}

export async function setTacticalState(combatant, state) {
  if (!combatant) return;
  await combatant.setFlag(MODULE_ID, FLAGS.TACTICAL_STATE, state);
}

export async function resetCombatantTacticalState(combatant) {
  if (!combatant) return;
  await setTacticalState(combatant, createDefaultTacticalState());
}

export async function resetCombatTacticalStates(combat) {
  if (!combat) return;
  for (const combatant of combat.combatants) {
    await resetCombatantTacticalState(combatant);
  }
}

export async function armBraceState(combatant, { weaponUuid = null, weaponName = "", round = null, turn = null } = {}) {
  const state = foundry.utils.deepClone(getTacticalState(combatant));
  state.brace = {
    active: !!weaponUuid,
    weaponUuid,
    weaponName,
    round,
    turn
  };
  await setTacticalState(combatant, state);
  return state;
}

export async function clearBraceState(combatant) {
  const state = foundry.utils.deepClone(getTacticalState(combatant));
  state.brace = createDefaultTacticalState().brace;
  await setTacticalState(combatant, state);
  return state;
}

export async function setReadyState(combatant, {
  actionId = null,
  actionLabel = "",
  triggerText = "",
  round = null,
  turn = null
} = {}) {
  const state = foundry.utils.deepClone(getTacticalState(combatant));
  state.ready = {
    active: !!actionId,
    actionId,
    actionLabel,
    triggerText,
    round,
    turn
  };
  await setTacticalState(combatant, state);
  return state;
}

export async function clearReadyState(combatant) {
  const state = foundry.utils.deepClone(getTacticalState(combatant));
  state.ready = createDefaultTacticalState().ready;
  await setTacticalState(combatant, state);
  return state;
}