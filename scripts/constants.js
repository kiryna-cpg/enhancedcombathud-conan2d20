export const MODULE_ID = "enhancedcombathud-conan2d20";

export const FLAGS = {
  ACTION_STATE: "actionState",
  TACTICAL_STATE: "tacticalState"
};

export const SETTING_KEYS = {
  ENABLE_HOUSE_RULES: "enableHouseRules",
  ENABLE_STRESS_BONUS_DICE: "enableStressBonusDice",
  ENABLE_MOMENTUM_BONUS_DICE: "enableMomentumBonusDice",
  ENABLE_DOOM_BONUS_DICE: "enableDoomBonusDice",
  BONUS_DICE_PRIORITY: "bonusDicePriority",
  AUTO_OPEN_BONUS_DICE: "autoOpenBonusDice",
  AUTO_OPEN_MOMENTUM: "autoOpenMomentum",
  AUTO_PROMPT_DEFENSE: "autoPromptDefense",
  SHOW_DOOM_TO_PLAYERS: "showDoomToPlayers",
  ASSIST_MODE: "assistMode",
  MOVEMENT_ECONOMY_MODE: "movementEconomyMode",
  DEBUG: "debug"
};

export const BONUS_DICE_PRIORITY = {
  MANUAL: "manual",
  STRESS_FIRST: "stress-first",
  MOMENTUM_FIRST: "momentum-first",
  DOOM_FIRST: "doom-first"
};

export const ASSIST_MODES = {
  NORMAL: "normal",
  HOUSE_RULE: "house-rule"
};

export const MOVEMENT_ECONOMY_MODES = {
  OFF: "off",
  ONE_PER_ROUND: "one-per-round"
};

export const ACTION_ECONOMY = {
  STANDARD: "standard",
  MINOR: "minor",
  REACTION: "reaction",
  FREE: "free",
  UTILITY: "utility"
};

export const ACTION_PANELS = {
  STANDARD: "standard",
  MINOR: "minor",
  REACTION: "reaction",
  UTILITY: "utility",
  MORE: "more"
};

export const ACTION_IDS = {
  ATTACK: "attack.active",
  ATTACK_MELEE: "attack.melee",
  ATTACK_RANGED: "attack.ranged",
  ATTACK_THREATEN: "attack.threaten",

  ASSIST: "action.assist",
  BRACE: "action.brace",
  CLEAR: "action.clear",
  DRAW_ITEM: "action.drawItem",
  EXPLOIT: "action.exploit",
  MOVEMENT: "action.movement",
  PASS: "action.pass",
  READY: "action.ready",
  REGAIN_GUARD: "action.regainGuard",
  RECOVER: "action.recover",
  RESET_ACTIONS: "action.resetActions",
  SKILL_TEST: "action.skillTest",
  SPRINT: "action.sprint",
  STAND: "action.stand",
  TREATMENT: "action.treatment",
  WITHDRAW: "action.withdraw",

  DEFEND: "reaction.defend",
  PROTECT: "reaction.protect",
  RETALIATE: "reaction.retaliate",

  END_TURN: "turn.end",
  OPEN_RESOURCES: "utility.resources",
  OPEN_MOMENTUM: "utility.momentum"
};

export const ROLL_DOMAINS = {
  PHYSICAL: "physical",
  MENTAL: "mental",
  OTHER: "other"
};

export const DEFAULT_RULES = {
  maxDice: 5,
  baseDice: 2
};