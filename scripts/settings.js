import { MODULE_ID, SETTING_KEYS, BONUS_DICE_PRIORITY, ASSIST_MODES, MOVEMENT_ECONOMY_MODES } from "./constants.js";

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTING_KEYS.ENABLE_HOUSE_RULES, {
    name: game.i18n.localize("ARGONC2D20.Settings.EnableHouseRules.Name"),
    hint: game.i18n.localize("ARGONC2D20.Settings.EnableHouseRules.Hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.ENABLE_STRESS_BONUS_DICE, {
    name: game.i18n.localize("ARGONC2D20.Settings.EnableStressBonusDice.Name"),
    hint: game.i18n.localize("ARGONC2D20.Settings.EnableStressBonusDice.Hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.ENABLE_MOMENTUM_BONUS_DICE, {
    name: game.i18n.localize("ARGONC2D20.Settings.EnableMomentumBonusDice.Name"),
    hint: game.i18n.localize("ARGONC2D20.Settings.EnableMomentumBonusDice.Hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.ENABLE_DOOM_BONUS_DICE, {
    name: game.i18n.localize("ARGONC2D20.Settings.EnableDoomBonusDice.Name"),
    hint: game.i18n.localize("ARGONC2D20.Settings.EnableDoomBonusDice.Hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.BONUS_DICE_PRIORITY, {
    name: game.i18n.localize("ARGONC2D20.Settings.BonusDicePriority.Name"),
    hint: game.i18n.localize("ARGONC2D20.Settings.BonusDicePriority.Hint"),
    scope: "world",
    config: true,
    type: String,
    choices: {
      [BONUS_DICE_PRIORITY.MANUAL]: game.i18n.localize("ARGONC2D20.Settings.BonusDicePriority.Manual"),
      [BONUS_DICE_PRIORITY.STRESS_FIRST]: game.i18n.localize("ARGONC2D20.Settings.BonusDicePriority.StressFirst"),
      [BONUS_DICE_PRIORITY.MOMENTUM_FIRST]: game.i18n.localize("ARGONC2D20.Settings.BonusDicePriority.MomentumFirst"),
      [BONUS_DICE_PRIORITY.DOOM_FIRST]: game.i18n.localize("ARGONC2D20.Settings.BonusDicePriority.DoomFirst")
    },
    default: BONUS_DICE_PRIORITY.MANUAL
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.AUTO_OPEN_BONUS_DICE, {
    name: game.i18n.localize("ARGONC2D20.Settings.AutoOpenBonusDice.Name"),
    hint: game.i18n.localize("ARGONC2D20.Settings.AutoOpenBonusDice.Hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.AUTO_OPEN_MOMENTUM, {
    name: game.i18n.localize("ARGONC2D20.Settings.AutoOpenMomentum.Name"),
    hint: game.i18n.localize("ARGONC2D20.Settings.AutoOpenMomentum.Hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.AUTO_PROMPT_DEFENSE, {
    name: game.i18n.localize("ARGONC2D20.Settings.AutoPromptDefense.Name"),
    hint: game.i18n.localize("ARGONC2D20.Settings.AutoPromptDefense.Hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.SHOW_DOOM_TO_PLAYERS, {
    name: game.i18n.localize("ARGONC2D20.Settings.ShowDoomToPlayers.Name"),
    hint: game.i18n.localize("ARGONC2D20.Settings.ShowDoomToPlayers.Hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.ASSIST_MODE, {
    name: game.i18n.localize("ARGONC2D20.Settings.AssistMode.Name"),
    hint: game.i18n.localize("ARGONC2D20.Settings.AssistMode.Hint"),
    scope: "world",
    config: true,
    type: String,
    choices: {
      [ASSIST_MODES.NORMAL]: game.i18n.localize("ARGONC2D20.Settings.AssistMode.Normal"),
      [ASSIST_MODES.HOUSE_RULE]: game.i18n.localize("ARGONC2D20.Settings.AssistMode.HouseRule")
    },
    default: ASSIST_MODES.NORMAL
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.MOVEMENT_ECONOMY_MODE, {
    name: game.i18n.localize("ARGONC2D20.Settings.MovementEconomyMode.Name"),
    hint: game.i18n.localize("ARGONC2D20.Settings.MovementEconomyMode.Hint"),
    scope: "world",
    config: true,
    type: String,
    choices: {
      [MOVEMENT_ECONOMY_MODES.OFF]: game.i18n.localize("ARGONC2D20.Settings.MovementEconomyMode.Off"),
      [MOVEMENT_ECONOMY_MODES.ONE_PER_ROUND]: game.i18n.localize("ARGONC2D20.Settings.MovementEconomyMode.OnePerRound")
    },
    default: MOVEMENT_ECONOMY_MODES.OFF
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.DEBUG, {
    name: game.i18n.localize("ARGONC2D20.Settings.Debug.Name"),
    hint: game.i18n.localize("ARGONC2D20.Settings.Debug.Hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });
}