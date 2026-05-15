import { ACTION_IDS, ACTION_ECONOMY, ACTION_PANELS, MODULE_ID, ASSIST_MODES } from "../constants.js";
import {
  canSpendEconomy,
  canSpendMovement,
  spendEconomy,
  resetCombatantActionState
} from "../services/action-economy-service.js";
import {
  openSystemSkillTestDialog,
  openRecoverDialog,
  openTreatmentDialog,
  openAssistDialog,
  openExploitDialog,
  executeSystemWeaponAttack
} from "../services/system-roll-service.js";
import { buildCombatContext } from "../services/context-service.js";
import { openReadyDialog } from "../services/ready-workflow-service.js";
import {
  armBraceState,
  clearBraceState,
  clearReadyState,
  setReadyState
} from "../services/tactical-state-service.js";
import { getAttackMode } from "../integrations/conan/actor-access.js";

function disabledReason(key) {
  return game.i18n.localize(key);
}

function getSpeaker(actor) {
  return ChatMessage.getSpeaker({
    actor,
    token: actor?.token ?? actor?.getActiveTokens?.()?.[0] ?? null
  });
}

async function postActionMessage(actor, action) {
  return ChatMessage.create({
    speaker: getSpeaker(actor),
    content: `
      <div class="argon-conan2d20-chat-card">
        <strong>${game.i18n.localize(action.label)}</strong><br>
        <span>${game.i18n.localize("ARGONC2D20.Chat.ScaffoldActionExecuted")}</span>
      </div>
    `
  });
}

async function postDeclarativeActionMessage(actor, titleKey, bodyKey, formatData = {}) {
  const mergedFormatData = {
    actor: actor?.name ?? "",
    ...formatData
  };

  return ChatMessage.create({
    speaker: getSpeaker(actor),
    content: `
      <div class="argon-conan2d20-chat-card">
        <strong>${game.i18n.localize(titleKey)}</strong><br>
        <span>${game.i18n.format(bodyKey, mergedFormatData)}</span>
      </div>
    `
  });
}

function isEconomyAvailable(ctx, action) {
  if (!ctx.inCombat) return true;
  if (!canSpendEconomy(ctx.actionState, action.economy)) return false;
  if (action.requiresMovement && !canSpendMovement(ctx.actionState, action.id)) return false;
  return true;
}

function getEconomyDisabledReason(ctx, action) {
  if (!ctx.inCombat) return null;

  if (action.economy === ACTION_ECONOMY.STANDARD && !ctx.actionEconomy.standardAvailable) {
    return disabledReason("ARGONC2D20.Disabled.NoStandardAction");
  }

  if (action.economy === ACTION_ECONOMY.MINOR && !ctx.actionEconomy.minorAvailable) {
    return disabledReason("ARGONC2D20.Disabled.NoMinorAction");
  }

  if (action.requiresMovement && !canSpendMovement(ctx.actionState, action.id)) {
    return disabledReason("ARGONC2D20.Disabled.NoMovementAction");
  }

  return null;
}

function getStandardAttackItem(ctx, options = {}) {
  const items = ctx?.attacks?.standardItems ?? [];
  const itemId = options.itemId ?? null;

  if (itemId) {
    return items.find((item) => item.id === itemId) ?? ctx?.actor?.items?.get?.(itemId) ?? null;
  }

  return ctx?.attacks?.defaultStandardItem ?? ctx?.equipped?.activeAttackWeapon ?? null;
}

function getThreatenAttackItem(ctx, options = {}) {
  const items = ctx?.attacks?.threatenItems ?? [];
  const itemId = options.itemId ?? null;

  if (itemId) {
    return items.find((item) => item.id === itemId) ?? ctx?.actor?.items?.get?.(itemId) ?? null;
  }

  return ctx?.attacks?.defaultThreatenItem ?? ctx?.equipped?.threatenAttack ?? null;
}

function getAttackItemForAction(ctx, actionId, options = {}) {
  const item = actionId === ACTION_IDS.ATTACK_THREATEN
    ? getThreatenAttackItem(ctx, options)
    : getStandardAttackItem(ctx, options);

  if (!item) return null;

  const mode = getAttackMode(item);
  if (actionId === ACTION_IDS.ATTACK_MELEE && mode !== "melee") return null;
  if (actionId === ACTION_IDS.ATTACK_RANGED && mode !== "ranged") return null;
  if (actionId === ACTION_IDS.ATTACK_THREATEN && mode !== "threaten") return null;

  return item;
}

const READY_SUPPORTED_ACTION_IDS = [
  ACTION_IDS.ATTACK_MELEE,
  ACTION_IDS.ATTACK_RANGED,
  ACTION_IDS.ATTACK_THREATEN,
  ACTION_IDS.EXPLOIT,
  ACTION_IDS.RECOVER,
  ACTION_IDS.SKILL_TEST,
  ACTION_IDS.ASSIST,
  ACTION_IDS.TREATMENT
];

const BRACE_CLEARING_ACTION_IDS = new Set([
  ACTION_IDS.MOVEMENT,
  ACTION_IDS.SPRINT,
  ACTION_IDS.WITHDRAW
]);

function getReadyChoiceActions(ctx) {
  return READY_SUPPORTED_ACTION_IDS
    .map((id) => getResolvedAction(ctx, id))
    .filter((action) => !!action && !!action.isEnabled)
    .map((action) => ({
      id: action.id,
      label: action.displayLabel ?? game.i18n.localize(action.label)
    }));
}

async function confirmExecuteReadiedAction(readyState) {
  return foundry.applications.api.DialogV2.confirm({
    window: {
      title: game.i18n.localize("ARGONC2D20.Action.ReadyExecuteDialog.Title")
    },
    content: `<p>${game.i18n.format("ARGONC2D20.Action.ReadyExecuteDialog.Content", {
      action: readyState?.actionLabel || game.i18n.localize("ARGONC2D20.ReadyPicker.FallbackAction"),
      trigger: readyState?.triggerText || game.i18n.localize("ARGONC2D20.ReadyPicker.FallbackTrigger")
    })}</p>`,
    rejectClose: false,
    modal: true
  });
}

const ACTION_REGISTRY = [
  {
    id: ACTION_IDS.ATTACK_MELEE,
    panel: ACTION_PANELS.STANDARD,
    economy: ACTION_ECONOMY.STANDARD,
    sort: 100,
    icon: "fa-solid fa-sword",
    label: "ARGONC2D20.Action.AttackMelee",
    visible: () => true,
    enabled: (ctx) => !!getAttackItemForAction(ctx, ACTION_IDS.ATTACK_MELEE) && isEconomyAvailable(ctx, { economy: ACTION_ECONOMY.STANDARD }),
    disabledReason: (ctx) =>
      !getAttackItemForAction(ctx, ACTION_IDS.ATTACK_MELEE)
        ? disabledReason("ARGONC2D20.Disabled.NoMeleeWeapon")
        : getEconomyDisabledReason(ctx, { economy: ACTION_ECONOMY.STANDARD })
  },
  {
    id: ACTION_IDS.ATTACK_RANGED,
    panel: ACTION_PANELS.STANDARD,
    economy: ACTION_ECONOMY.STANDARD,
    sort: 110,
    icon: "fa-solid fa-bow-arrow",
    label: "ARGONC2D20.Action.AttackRanged",
    visible: () => true,
    enabled: (ctx) => !!getAttackItemForAction(ctx, ACTION_IDS.ATTACK_RANGED) && isEconomyAvailable(ctx, { economy: ACTION_ECONOMY.STANDARD }),
    disabledReason: (ctx) =>
      !getAttackItemForAction(ctx, ACTION_IDS.ATTACK_RANGED)
        ? disabledReason("ARGONC2D20.Disabled.NoRangedWeapon")
        : getEconomyDisabledReason(ctx, { economy: ACTION_ECONOMY.STANDARD })
  },
  {
    id: ACTION_IDS.ATTACK_THREATEN,
    panel: ACTION_PANELS.STANDARD,
    economy: ACTION_ECONOMY.STANDARD,
    sort: 120,
    icon: "fa-solid fa-face-angry-horns",
    label: "ARGONC2D20.Action.Threaten",
    visible: () => true,
    enabled: (ctx) => !!getAttackItemForAction(ctx, ACTION_IDS.ATTACK_THREATEN) && isEconomyAvailable(ctx, { economy: ACTION_ECONOMY.STANDARD }),
    disabledReason: (ctx) =>
      !getAttackItemForAction(ctx, ACTION_IDS.ATTACK_THREATEN)
        ? disabledReason("ARGONC2D20.Disabled.NoThreatenAttack")
        : getEconomyDisabledReason(ctx, { economy: ACTION_ECONOMY.STANDARD })
  },
  {
    id: ACTION_IDS.READY,
    panel: ACTION_PANELS.STANDARD,
    economy: ACTION_ECONOMY.STANDARD,
    sort: 130,
    icon: "fa-solid fa-hourglass-half",
    label: "ARGONC2D20.Action.Ready",
    visible: () => true,
    enabled: (ctx) => {
      if (!ctx.combatant) return false;
      if (ctx.tacticalState?.ready?.active) return true;
      return ctx.capabilities.canReady && isEconomyAvailable(ctx, { economy: ACTION_ECONOMY.STANDARD });
    },
    disabledReason: (ctx) => {
      if (!ctx.combatant) return disabledReason("ARGONC2D20.Disabled.ReadyRequiresCombat");
      if (ctx.tacticalState?.ready?.active) return null;
      return getEconomyDisabledReason(ctx, { economy: ACTION_ECONOMY.STANDARD });
    }
  },
  {
    id: ACTION_IDS.BRACE,
    panel: ACTION_PANELS.STANDARD,
    economy: ACTION_ECONOMY.STANDARD,
    sort: 140,
    icon: "fa-solid fa-crosshairs",
    label: "ARGONC2D20.Action.Brace",
    visible: () => true,
    enabled: (ctx) => ctx.capabilities.canBrace && isEconomyAvailable(ctx, { economy: ACTION_ECONOMY.STANDARD }),
    disabledReason: (ctx) => {
      if (!ctx.combatant) return disabledReason("ARGONC2D20.Disabled.BraceRequiresCombat");
      if (ctx.tacticalState?.brace?.active && ctx.tacticalState?.brace?.weaponUuid === ctx.attacks?.defaultStandardItem?.uuid) {
        return disabledReason("ARGONC2D20.Disabled.AlreadyBraced");
      }
      if (!ctx.capabilities.canBrace) return disabledReason("ARGONC2D20.Disabled.BraceRequiresUnwieldy");
      return getEconomyDisabledReason(ctx, { economy: ACTION_ECONOMY.STANDARD });
    }
  },
  {
    id: ACTION_IDS.EXPLOIT,
    panel: ACTION_PANELS.STANDARD,
    economy: ACTION_ECONOMY.STANDARD,
    sort: 150,
    icon: "fa-solid fa-eye",
    label: "ARGONC2D20.Action.Exploit",
    visible: () => true,
    enabled: (ctx) => ctx.capabilities.canExploit && isEconomyAvailable(ctx, { economy: ACTION_ECONOMY.STANDARD }),
    disabledReason: (ctx) => getEconomyDisabledReason(ctx, { economy: ACTION_ECONOMY.STANDARD })
  },
  {
    id: ACTION_IDS.SKILL_TEST,
    panel: ACTION_PANELS.STANDARD,
    economy: ACTION_ECONOMY.STANDARD,
    sort: 160,
    icon: "fa-solid fa-dice-d20",
    label: "ARGONC2D20.Action.SkillTest",
    visible: () => true,
    enabled: (ctx) => ctx.capabilities.canSkillTest && isEconomyAvailable(ctx, { economy: ACTION_ECONOMY.STANDARD }),
    disabledReason: (ctx) => getEconomyDisabledReason(ctx, { economy: ACTION_ECONOMY.STANDARD })
  },
  {
    id: ACTION_IDS.RECOVER,
    panel: ACTION_PANELS.STANDARD,
    economy: ACTION_ECONOMY.STANDARD,
    sort: 170,
    icon: "fa-solid fa-heart-pulse",
    label: "ARGONC2D20.Action.Recover",
    visible: () => true,
    enabled: (ctx) => ctx.capabilities.canRecover && isEconomyAvailable(ctx, { economy: ACTION_ECONOMY.STANDARD }),
    disabledReason: (ctx) => getEconomyDisabledReason(ctx, { economy: ACTION_ECONOMY.STANDARD })
  },
  {
    id: ACTION_IDS.ASSIST,
    panel: ACTION_PANELS.STANDARD,
    economy: ACTION_ECONOMY.STANDARD,
    sort: 180,
    icon: "fa-solid fa-handshake-angle",
    label: "ARGONC2D20.Action.Assist",
    visible: () => true,
    enabled: (ctx) => ctx.capabilities.canAssist && isEconomyAvailable(ctx, { economy: ACTION_ECONOMY.STANDARD }),
    disabledReason: (ctx) => getEconomyDisabledReason(ctx, { economy: ACTION_ECONOMY.STANDARD })
  },
  {
    id: ACTION_IDS.TREATMENT,
    panel: ACTION_PANELS.STANDARD,
    economy: ACTION_ECONOMY.STANDARD,
    sort: 190,
    icon: "fa-solid fa-kit-medical",
    label: "ARGONC2D20.Action.Treatment",
    visible: () => true,
    enabled: (ctx) => ctx.capabilities.canTreatment && isEconomyAvailable(ctx, { economy: ACTION_ECONOMY.STANDARD }),
    disabledReason: (ctx) => getEconomyDisabledReason(ctx, { economy: ACTION_ECONOMY.STANDARD })
  },
  {
    id: ACTION_IDS.WITHDRAW,
    panel: ACTION_PANELS.STANDARD,
    economy: ACTION_ECONOMY.STANDARD,
    requiresMovement: true,
    sort: 200,
    icon: "fa-solid fa-arrow-right-from-bracket",
    label: "ARGONC2D20.Action.Withdraw",
    visible: () => true,
    enabled: (ctx) => ctx.capabilities.canWithdraw && isEconomyAvailable(ctx, { economy: ACTION_ECONOMY.STANDARD, requiresMovement: true, id: ACTION_IDS.WITHDRAW }),
    disabledReason: (ctx) => getEconomyDisabledReason(ctx, { economy: ACTION_ECONOMY.STANDARD, requiresMovement: true, id: ACTION_IDS.WITHDRAW })
  },
  {
    id: ACTION_IDS.SPRINT,
    panel: ACTION_PANELS.STANDARD,
    economy: ACTION_ECONOMY.STANDARD,
    requiresMovement: true,
    sort: 210,
    icon: "fa-solid fa-person-running",
    label: "ARGONC2D20.Action.Sprint",
    visible: () => true,
    enabled: (ctx) => ctx.capabilities.canSprint && isEconomyAvailable(ctx, { economy: ACTION_ECONOMY.STANDARD, requiresMovement: true, id: ACTION_IDS.SPRINT }),
    disabledReason: (ctx) => getEconomyDisabledReason(ctx, { economy: ACTION_ECONOMY.STANDARD, requiresMovement: true, id: ACTION_IDS.SPRINT })
  },

  {
    id: ACTION_IDS.REGAIN_GUARD,
    panel: ACTION_PANELS.MINOR,
    economy: ACTION_ECONOMY.MINOR,
    sort: 300,
    icon: "fa-solid fa-shield-halved",
    label: "ARGONC2D20.Action.RegainGuard",
    visible: () => true,
    enabled: (ctx) => ctx.capabilities.canRegainGuard && isEconomyAvailable(ctx, { economy: ACTION_ECONOMY.MINOR }),
    disabledReason: (ctx) =>
      !ctx.capabilities.canRegainGuard
        ? disabledReason("ARGONC2D20.Disabled.GuardNotBroken")
        : getEconomyDisabledReason(ctx, { economy: ACTION_ECONOMY.MINOR })
  },
  {
    id: ACTION_IDS.STAND,
    panel: ACTION_PANELS.MINOR,
    economy: ACTION_ECONOMY.MINOR,
    sort: 310,
    icon: "fa-solid fa-person",
    label: "ARGONC2D20.Action.Stand",
    visible: () => true,
    enabled: (ctx) => ctx.capabilities.canStand && isEconomyAvailable(ctx, { economy: ACTION_ECONOMY.MINOR }),
    disabledReason: (ctx) =>
      !ctx.capabilities.canStand
        ? disabledReason("ARGONC2D20.Disabled.NotProne")
        : getEconomyDisabledReason(ctx, { economy: ACTION_ECONOMY.MINOR })
  },
  {
    id: ACTION_IDS.CLEAR,
    panel: ACTION_PANELS.MINOR,
    economy: ACTION_ECONOMY.MINOR,
    sort: 320,
    icon: "fa-solid fa-broom",
    label: "ARGONC2D20.Action.Clear",
    visible: () => true,
    enabled: (ctx) => ctx.capabilities.canClear && isEconomyAvailable(ctx, { economy: ACTION_ECONOMY.MINOR }),
    disabledReason: (ctx) =>
      !ctx.capabilities.canClear
        ? disabledReason("ARGONC2D20.Disabled.NoClearableCondition")
        : getEconomyDisabledReason(ctx, { economy: ACTION_ECONOMY.MINOR })
  },
  {
    id: ACTION_IDS.RESET_ACTIONS,
    panel: ACTION_PANELS.MINOR,
    economy: ACTION_ECONOMY.UTILITY,
    sort: 330,
    icon: "fa-solid fa-rotate-left",
    label: "ARGONC2D20.Action.ResetActions",
    visible: (ctx) => ctx.inCombat,
    enabled: (ctx) => !!ctx.combatant,
    disabledReason: () => null
  },

  {
    id: ACTION_IDS.END_TURN,
    panel: ACTION_PANELS.UTILITY,
    economy: ACTION_ECONOMY.UTILITY,
    sort: 900,
    icon: "fa-solid fa-forward-step",
    label: "ARGONC2D20.Action.EndTurn",
    visible: (ctx) => ctx.inCombat,
    enabled: (ctx) => ctx.isTurnOwner,
    disabledReason: (ctx) =>
      !ctx.isTurnOwner ? disabledReason("ARGONC2D20.Disabled.NotYourTurn") : null
  }
];

export function getAllActions() {
  return ACTION_REGISTRY.slice();
}

export function getActionById(actionId) {
  return ACTION_REGISTRY.find((action) => action.id === actionId) ?? null;
}

export function getResolvedAction(ctx, actionId) {
  const action = getActionById(actionId);
  if (!action) return null;

  const resolved = {
    ...action,
    isEnabled: !!action.enabled(ctx),
    reason: action.disabledReason(ctx),
    displayLabel: null,
    tooltipDescription: null,
    isArmed: false
  };

  if (actionId === ACTION_IDS.READY && ctx?.tacticalState?.ready?.active) {
    const readyState = ctx.tacticalState.ready;
    resolved.isArmed = true;
    resolved.displayLabel = game.i18n.localize("ARGONC2D20.Action.ReadyArmed");
    resolved.tooltipDescription = game.i18n.format("ARGONC2D20.Tooltip.ReadyArmed", {
      action: readyState.actionLabel || game.i18n.localize("ARGONC2D20.ReadyPicker.FallbackAction"),
      trigger: readyState.triggerText || game.i18n.localize("ARGONC2D20.ReadyPicker.FallbackTrigger")
    });
  }

  if (
    actionId === ACTION_IDS.BRACE &&
    ctx?.tacticalState?.brace?.active &&
    ctx?.tacticalState?.brace?.weaponUuid === ctx?.attacks?.defaultStandardItem?.uuid
  ) {
    const braceState = ctx.tacticalState.brace;
    resolved.isArmed = true;
    resolved.displayLabel = game.i18n.localize("ARGONC2D20.Action.BraceArmed");
    resolved.tooltipDescription = game.i18n.format("ARGONC2D20.Tooltip.BraceArmed", {
      weapon: braceState.weaponName || ctx?.attacks?.defaultStandardItem?.name || ""
    });
  }

  return resolved;
}

export function getAvailableActions(ctx, { panel = null } = {}) {
  let actions = ACTION_REGISTRY.filter((action) => action.visible(ctx));

  if (panel) actions = actions.filter((action) => action.panel === panel);

  return actions
    .map((action) => ({
      ...action,
      isEnabled: !!action.enabled(ctx),
      reason: action.disabledReason(ctx)
    }))
    .sort((a, b) => a.sort - b.sort);
}

async function clearActorStatus(actor, statusId) {
  if (!actor?.toggleStatusEffect) return false;
  await actor.toggleStatusEffect(statusId, { active: false });
  return true;
}

async function launchSystemRoll(ctx, action, options = {}) {
  if (action.id === ACTION_IDS.ATTACK_MELEE || action.id === ACTION_IDS.ATTACK_RANGED) {
    const weapon = getAttackItemForAction(ctx, action.id, options);
    if (!weapon) {
      ui.notifications?.warn(game.i18n.localize("ARGONC2D20.Disabled.NoAttackAvailable"));
      return false;
    }

    return executeSystemWeaponAttack(ctx.actor, weapon.id);
  }

  if (action.id === ACTION_IDS.ATTACK_THREATEN) {
    const threatenAttack = getAttackItemForAction(ctx, action.id, options);
    if (!threatenAttack) {
      ui.notifications?.warn(game.i18n.localize("ARGONC2D20.Disabled.NoThreatenAttack"));
      return false;
    }

    return executeSystemWeaponAttack(ctx.actor, threatenAttack.id);
  }

  if (action.id === ACTION_IDS.RECOVER) {
    return openRecoverDialog(ctx.actor);
  }

  if (action.id === ACTION_IDS.TREATMENT) {
    return openTreatmentDialog(ctx.actor);
  }

  if (action.id === ACTION_IDS.ASSIST) {
    return openAssistDialog(ctx.actor);
  }

  if (action.id === ACTION_IDS.EXPLOIT) {
    return openExploitDialog(ctx.actor);
  }

  if (action.id === ACTION_IDS.SKILL_TEST) {
    return openSystemSkillTestDialog(ctx.actor);
  }

  return null;
}

export async function executeAction(ctx, actionId, options = {}) {
  const action = getActionById(actionId);
  if (!action) return false;

  if (!action.enabled(ctx)) {
    ui.notifications?.warn(
      action.disabledReason(ctx) ?? game.i18n.localize("ARGONC2D20.Error.ActionUnavailable")
    );
    return false;
  }

  const skipEconomy = options.skipEconomy === true;

  Hooks.callAll(`${MODULE_ID}:preExecuteAction`, ctx, action, options);

  if (actionId === ACTION_IDS.END_TURN) {
    if (game.combat?.combatant?.actor?.id === ctx.actor?.id) {
      await game.combat.nextTurn();
      return true;
    }
    return false;
  }

  if (actionId === ACTION_IDS.RESET_ACTIONS) {
    const round = Number(game.combat?.round ?? ctx.actionState?.round ?? 0);
    await resetCombatantActionState(ctx.combatant, round);
    ui.notifications?.info(game.i18n.localize("ARGONC2D20.Info.ActionsReset"));
    ui.ARGON?.refresh?.();
    return true;
  }

  if (actionId === ACTION_IDS.READY) {
    if (!ctx.combatant) {
      ui.notifications?.warn(game.i18n.localize("ARGONC2D20.Disabled.ReadyRequiresCombat"));
      return false;
    }

    if (ctx.tacticalState?.ready?.active) {
      const readyState = ctx.tacticalState.ready;
      const confirmed = await confirmExecuteReadiedAction(readyState);
      if (!confirmed) return false;

      await clearReadyState(ctx.combatant);

      const refreshedCtx = await buildCombatContext(ctx.actor, ctx.token);
      const executed = await executeAction(refreshedCtx, readyState.actionId, {
        ...options,
        skipEconomy: true,
        fromReady: true,
        readyTrigger: readyState.triggerText,
        readyStored: true
      });

      ui.ARGON?.refresh?.();
      return executed;
    }

    const readyChoice = await openReadyDialog({ choices: getReadyChoiceActions(ctx) });
    if (!readyChoice?.actionId) return false;

    if (!skipEconomy && ctx.inCombat && ctx.combatant) {
      await spendEconomy(ctx.combatant, action.economy, action.id);
    }

    await clearReadyState(ctx.combatant);
    await setReadyState(ctx.combatant, {
      actionId: readyChoice.actionId,
      actionLabel: readyChoice.actionLabel,
      triggerText: readyChoice.triggerText,
      round: Number(game.combat?.round ?? 0),
      turn: Number(game.combat?.turn ?? 0)
    });

    await postDeclarativeActionMessage(ctx.actor, "ARGONC2D20.Action.Ready", "ARGONC2D20.Chat.ReadyDeclared", {
      action: readyChoice.actionLabel || game.i18n.localize("ARGONC2D20.ReadyPicker.FallbackAction"),
      trigger: readyChoice.triggerText || game.i18n.localize("ARGONC2D20.ReadyPicker.FallbackTrigger")
    });

    ui.ARGON?.refresh?.();
    Hooks.callAll(`${MODULE_ID}:postExecuteAction`, ctx, action, options);
    return true;
  }

  if (actionId === ACTION_IDS.BRACE) {
    const activeWeapon = ctx?.attacks?.defaultStandardItem ?? null;
    if (!ctx.combatant || !activeWeapon?.uuid) {
      ui.notifications?.warn(game.i18n.localize("ARGONC2D20.Disabled.BraceRequiresCombat"));
      return false;
    }

    if (!skipEconomy && ctx.inCombat && ctx.combatant) {
      await spendEconomy(ctx.combatant, action.economy, action.id);
    }

    await armBraceState(ctx.combatant, {
      weaponUuid: activeWeapon.uuid,
      weaponName: activeWeapon.name ?? "",
      round: Number(game.combat?.round ?? 0),
      turn: Number(game.combat?.turn ?? 0)
    });

    await postDeclarativeActionMessage(ctx.actor, "ARGONC2D20.Action.Brace", "ARGONC2D20.Chat.BraceDeclared", {
      weapon: activeWeapon.name ?? ""
    });

    ui.ARGON?.refresh?.();
    Hooks.callAll(`${MODULE_ID}:postExecuteAction`, ctx, action, options);
    return true;
  }

  if (actionId === ACTION_IDS.REGAIN_GUARD) {
    await clearActorStatus(ctx.actor, "guardBroken");
  }

  if (actionId === ACTION_IDS.STAND) {
    await clearActorStatus(ctx.actor, "prone");
  }

  const launchedSystemRoll = await launchSystemRoll(ctx, action, options);
  if (launchedSystemRoll === false) return false;

  if (!skipEconomy && ctx.inCombat && ctx.combatant) {
    await spendEconomy(ctx.combatant, action.economy, action.id);
  }

  if (
    ctx.combatant &&
    BRACE_CLEARING_ACTION_IDS.has(actionId) &&
    ctx.tacticalState?.brace?.active
  ) {
    await clearBraceState(ctx.combatant);
  }

  ui.ARGON?.refresh?.();

  const usedItem = getAttackItemForAction(ctx, actionId, options);
  const assistMode = ctx?.rules?.assistMode ?? ASSIST_MODES.NORMAL;

  if (launchedSystemRoll === null) {
    if (actionId === ACTION_IDS.SPRINT) {
      await postDeclarativeActionMessage(ctx.actor, "ARGONC2D20.Action.Sprint", "ARGONC2D20.Chat.SprintDeclared");
    } else if (actionId === ACTION_IDS.WITHDRAW) {
      await postDeclarativeActionMessage(ctx.actor, "ARGONC2D20.Action.Withdraw", "ARGONC2D20.Chat.WithdrawDeclared");
    } else {
      await postActionMessage(ctx.actor, action);
    }
  } else {
    Hooks.callAll(`${MODULE_ID}:systemRollLaunched`, {
      actor: ctx.actor,
      token: ctx.token,
      combatant: ctx.combatant,
      action,
      assistMode,
      item: usedItem
    });
  }

  Hooks.callAll(`${MODULE_ID}:postExecuteAction`, ctx, action, options);
  return true;
}