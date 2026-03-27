import { CombatContext } from "../models/combat-context.js";
import {
  MODULE_ID,
  DEFAULT_RULES,
  SETTING_KEYS,
  MOVEMENT_ECONOMY_MODES,
  ASSIST_MODES
} from "../constants.js";
import { getActionState, getEconomyAvailability } from "./action-economy-service.js";
import { getTacticalState } from "./tactical-state-service.js";
import { readMomentumPool, readDoomPool } from "./pool-tracker-service.js";
import {
  getActorResource,
  getEquippedMeleeWeapons,
  getEquippedRangedWeapons,
  getEquippedShields,
  getActiveWeaponSetData,
  getInventoryItems,
  getWeaponType,
  getAttackMode,
  getStandardAttackItems,
  getThreatenAttackItems,
  getDefaultStandardAttackItem,
  getDefaultThreatenAttackItem,
  getPrimaryAttackItemFromSet,
  getSecondaryAttackItemFromSet,
  hasActorStatus,
  hasClearableConditions,
  isShield,
  isUnwieldyWeapon
} from "../integrations/conan/actor-access.js";

function getCombatantForActor(actor) {
  const combat = game.combat;
  if (!combat || !actor) return null;
  return combat.combatants.find((combatant) => combatant.actor?.id === actor.id) ?? null;
}

export async function buildCombatContext(actor, token = null) {
  const ctx = new CombatContext();

  ctx.actor = actor ?? null;
  ctx.token = token ?? actor?.getActiveTokens?.()?.[0] ?? null;

  ctx.combat = game.combat ?? null;
  ctx.combatant = getCombatantForActor(actor);
  ctx.inCombat = !!ctx.combatant;
  ctx.isTurnOwner = !!ctx.combatant && game.combat?.combatant?.id === ctx.combatant.id;
  ctx.actionState = getActionState(ctx.combatant);
  ctx.tacticalState = getTacticalState(ctx.combatant);

  const availability = getEconomyAvailability(ctx.actionState);
  ctx.actionEconomy = {
    standardAvailable: availability.standard.available,
    minorAvailable: availability.minor.available,
    reactionAvailable: availability.reaction.available,
    standardRemaining: availability.standard.remaining,
    minorRemaining: availability.minor.remaining,
    reactionRemaining: availability.reaction.remaining,
    standardMax: availability.standard.max,
    minorMax: availability.minor.max,
    reactionMax: availability.reaction.max
  };

  ctx.targets = Array.from(game.user?.targets ?? []);
  ctx.primaryTarget = ctx.targets[0] ?? null;

  ctx.rules.baseDice = DEFAULT_RULES.baseDice;
  ctx.rules.maxDice = DEFAULT_RULES.maxDice;
  ctx.rules.stressBonusDiceEnabled = game.settings.get(MODULE_ID, SETTING_KEYS.ENABLE_STRESS_BONUS_DICE);
  ctx.rules.momentumBonusDiceEnabled = game.settings.get(MODULE_ID, SETTING_KEYS.ENABLE_MOMENTUM_BONUS_DICE);
  ctx.rules.doomBonusDiceEnabled = game.settings.get(MODULE_ID, SETTING_KEYS.ENABLE_DOOM_BONUS_DICE);
  ctx.rules.assistMode = game.settings.get(MODULE_ID, SETTING_KEYS.ASSIST_MODE) ?? ASSIST_MODES.NORMAL;
  ctx.rules.movementEconomyMode = game.settings.get(MODULE_ID, SETTING_KEYS.MOVEMENT_ECONOMY_MODE) ?? MOVEMENT_ECONOMY_MODES.OFF;

  ctx.resources.vigor = {
    value: getActorResource(actor, "system.health.physical.value", 0),
    max: getActorResource(actor, "system.health.physical.max", 0),
    fatigue: getActorResource(actor, "system.health.physical.fatigue", 0)
  };

  ctx.resources.resolve = {
    value: getActorResource(actor, "system.health.mental.value", 0),
    max: getActorResource(actor, "system.health.mental.max", 0),
    despair: getActorResource(actor, "system.health.mental.despair", 0)
  };

  ctx.resources.momentum = {
    value: readMomentumPool(),
    max: null
  };

  ctx.resources.doom = {
    value: readDoomPool(),
    visible: game.user?.isGM || game.settings.get(MODULE_ID, SETTING_KEYS.SHOW_DOOM_TO_PLAYERS)
  };

  ctx.equipped.meleeWeapons = getEquippedMeleeWeapons(actor);
  ctx.equipped.rangedWeapons = getEquippedRangedWeapons(actor);
  ctx.equipped.shields = getEquippedShields(actor);

  const activeSetData = await getActiveWeaponSetData(actor);
  const standardAttackItems = getStandardAttackItems(actor);
  const threatenAttackItems = getThreatenAttackItems(actor);
  const defaultStandardItem = getDefaultStandardAttackItem(actor, activeSetData);
  const defaultThreatenItem = getDefaultThreatenAttackItem(actor);

  const rawPrimaryAttackItem = getPrimaryAttackItemFromSet(activeSetData.activeSet);
  const rawSecondaryAttackItem = getSecondaryAttackItemFromSet(activeSetData.activeSet);
  const primaryAttackItem = rawPrimaryAttackItem ?? defaultStandardItem ?? null;
  const secondaryAttackItem =
    rawSecondaryAttackItem && rawSecondaryAttackItem.id !== primaryAttackItem?.id
      ? rawSecondaryAttackItem
      : null;

  ctx.equipped.weaponSets = activeSetData.sets;
  ctx.equipped.activeSetId = activeSetData.active;
  ctx.equipped.activeSet = activeSetData.activeSet;
  ctx.equipped.activePrimary = activeSetData.primary;
  ctx.equipped.activeSecondary = activeSetData.secondary;
  ctx.equipped.activeAttackWeapon = primaryAttackItem;
  ctx.equipped.threatenAttack = defaultThreatenItem;

  ctx.attacks.standardItems = standardAttackItems;
  ctx.attacks.threatenItems = threatenAttackItems;
  ctx.attacks.defaultStandardItem = primaryAttackItem ?? defaultStandardItem ?? null;
  ctx.attacks.defaultThreatenItem = defaultThreatenItem;

  ctx.weaponSet.sets = activeSetData.sets;
  ctx.weaponSet.active = activeSetData.active;
  ctx.weaponSet.activeSet = activeSetData.activeSet;
  ctx.weaponSet.primary = activeSetData.primary;
  ctx.weaponSet.secondary = activeSetData.secondary;
  ctx.weaponSet.primaryAttackItem = primaryAttackItem;
  ctx.weaponSet.secondaryAttackItem = secondaryAttackItem;
  ctx.weaponSet.hasSecondaryAttack = !!secondaryAttackItem;
  ctx.weaponSet.secondaryIsShield = isShield(secondaryAttackItem);
  ctx.weaponSet.attackItem = primaryAttackItem ?? null;
  ctx.weaponSet.attackMode = getAttackMode(primaryAttackItem);

  ctx.inventoryItems = getInventoryItems(actor);

  ctx.status.guardBroken = hasActorStatus(actor, "guardBroken");
  ctx.status.prone = hasActorStatus(actor, "prone");
  ctx.status.noGuard = hasActorStatus(actor, "c2mq-no-guard");

  const activeAttackWeapon = ctx.weaponSet.primaryAttackItem ?? ctx.attacks.defaultStandardItem ?? null;
  const braceState = ctx.tacticalState?.brace ?? {};
  const readyState = ctx.tacticalState?.ready ?? {};
  const braceAppliesToActiveWeapon =
    !!braceState?.active &&
    !!activeAttackWeapon?.uuid &&
    braceState.weaponUuid === activeAttackWeapon.uuid;

  ctx.weaponSet.canBrace =
    !!ctx.combatant &&
    !!activeAttackWeapon &&
    isUnwieldyWeapon(activeAttackWeapon) &&
    !braceAppliesToActiveWeapon;

  ctx.capabilities.canAttackMelee = standardAttackItems.some((item) => getAttackMode(item) === "melee");
  ctx.capabilities.canAttackRanged = standardAttackItems.some((item) => getAttackMode(item) === "ranged");
  ctx.capabilities.canThreaten = threatenAttackItems.length > 0;

  // Reactions are handled in miniqol, not in the Argon HUD.
  ctx.capabilities.canDefend = false;
  ctx.capabilities.canProtect = false;
  ctx.capabilities.canRetaliate = false;

  ctx.capabilities.canAssist = true;
  ctx.capabilities.canRecover = true;
  ctx.capabilities.canRegainGuard = ctx.status.guardBroken;
  ctx.capabilities.canStand = ctx.status.prone;
  ctx.capabilities.canDrawItem = false;
  ctx.capabilities.canMovement = false;
  ctx.capabilities.canClear = hasClearableConditions(actor);
  ctx.capabilities.canBrace =
    !!ctx.combatant &&
    !!activeAttackWeapon &&
    isUnwieldyWeapon(activeAttackWeapon) &&
    !braceAppliesToActiveWeapon;
  ctx.capabilities.canExploit = true;
  ctx.capabilities.canReady = !!ctx.combatant && !readyState?.active;
  ctx.capabilities.canSkillTest = true;
  ctx.capabilities.canSprint = true;
  ctx.capabilities.canTreatment = true;
  ctx.capabilities.canWithdraw = true;
  ctx.capabilities.canPass = false;
  ctx.capabilities.canInventory = ctx.inventoryItems.length > 0;

  Hooks.callAll(`${MODULE_ID}:postContext`, ctx);

  return ctx;
}