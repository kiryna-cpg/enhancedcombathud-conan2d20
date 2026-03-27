import { ACTION_IDS, MODULE_ID, ROLL_DOMAINS, SETTING_KEYS } from "../constants.js";
import { createBonusDicePlan, summarizeBonusDicePlan } from "./bonus-dice-service.js";
import { readDoomPool, readMomentumPool, setDoomPool, setMomentumPool } from "./pool-tracker-service.js";

function clampInt(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const n = Number.parseInt(String(value ?? 0), 10);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function getDoomMode(ctx) {
  return (ctx?.actor?.type === "npc" && game.user?.isGM) ? "spend" : "add";
}

function getSourceCaps(ctx, rollDomain) {
  const maxBonusDice = Math.max(0, Number(ctx?.rules?.maxDice ?? 5) - Number(ctx?.rules?.baseDice ?? 2));
  const doomMode = getDoomMode(ctx);

  const caps = {
    vigor: 0,
    resolve: 0,
    momentum: 0,
    doom: 0
  };

  if (game.settings.get(MODULE_ID, SETTING_KEYS.ENABLE_STRESS_BONUS_DICE)) {
    if (rollDomain === ROLL_DOMAINS.PHYSICAL) {
      caps.vigor = Math.max(0, Number(ctx?.resources?.vigor?.value ?? 0));
    }
    if (rollDomain === ROLL_DOMAINS.MENTAL) {
      caps.resolve = Math.max(0, Number(ctx?.resources?.resolve?.value ?? 0));
    }
  }

  if (game.settings.get(MODULE_ID, SETTING_KEYS.ENABLE_MOMENTUM_BONUS_DICE)) {
    caps.momentum = Math.max(0, Number(readMomentumPool() ?? 0));
  }

  if (game.settings.get(MODULE_ID, SETTING_KEYS.ENABLE_DOOM_BONUS_DICE)) {
    caps.doom = doomMode === "spend"
      ? Math.max(0, Number(readDoomPool() ?? 0))
      : maxBonusDice;
  }

  return {
    caps,
    doomMode,
    maxBonusDice
  };
}

function hasAnyBonusSources(ctx, { allowDomainChoice = false, rollDomain = ROLL_DOMAINS.OTHER } = {}) {
  const domains = allowDomainChoice
    ? [ROLL_DOMAINS.PHYSICAL, ROLL_DOMAINS.MENTAL, ROLL_DOMAINS.OTHER]
    : [rollDomain];

  return domains.some((domain) => {
    const { caps } = getSourceCaps(ctx, domain);
    return Object.values(caps).some((value) => value > 0);
  });
}

function buildDialogContent(ctx, {
  actionId,
  rollDomain = ROLL_DOMAINS.OTHER,
  allowDomainChoice = false,
  weaponName = ""
} = {}) {
  const baseDice = Number(ctx?.rules?.baseDice ?? 2);
  const maxDice = Number(ctx?.rules?.maxDice ?? 5);
  const { doomMode } = getSourceCaps(ctx, rollDomain);

  const domainField = allowDomainChoice ? `
    <div class="argon-c2d20-rollprep-row">
      <label for="argon-c2d20-roll-domain">${game.i18n.localize("ARGONC2D20.RollPrep.Field.RollDomain")}</label>
      <select id="argon-c2d20-roll-domain" name="rollDomain">
        <option value="${ROLL_DOMAINS.PHYSICAL}">${game.i18n.localize("ARGONC2D20.RollPrep.Domain.Physical")}</option>
        <option value="${ROLL_DOMAINS.MENTAL}">${game.i18n.localize("ARGONC2D20.RollPrep.Domain.Mental")}</option>
        <option value="${ROLL_DOMAINS.OTHER}" selected>${game.i18n.localize("ARGONC2D20.RollPrep.Domain.Other")}</option>
      </select>
    </div>
  ` : `
    <input type="hidden" name="rollDomain" value="${rollDomain}">
  `;

  const weaponField = weaponName ? `
    <div class="argon-c2d20-rollprep-row">
      <label>${game.i18n.localize("ARGONC2D20.RollPrep.Field.Weapon")}</label>
      <div class="argon-c2d20-rollprep-static">${weaponName}</div>
    </div>
  ` : "";

  return `
    <div class="argon-c2d20-rollprep" data-action-id="${actionId}">
      ${weaponField}
      ${domainField}

      <div class="argon-c2d20-rollprep-row">
        <label>${game.i18n.localize("ARGONC2D20.RollPrep.Field.BaseDice")}</label>
        <div class="argon-c2d20-rollprep-static">${baseDice}d20</div>
      </div>

      <div class="argon-c2d20-rollprep-row">
        <label>${game.i18n.localize("ARGONC2D20.RollPrep.Field.MaxDice")}</label>
        <div class="argon-c2d20-rollprep-static">${maxDice}d20</div>
      </div>

      <div class="argon-c2d20-rollprep-row argon-c2d20-rollprep-source" data-source="vigor">
        <label for="argon-c2d20-roll-vigor">${game.i18n.localize("ARGONC2D20.RollPrep.Field.Vigor")}</label>
        <input id="argon-c2d20-roll-vigor" name="fromVigor" type="number" min="0" step="1" value="0">
      </div>

      <div class="argon-c2d20-rollprep-row argon-c2d20-rollprep-source" data-source="resolve">
        <label for="argon-c2d20-roll-resolve">${game.i18n.localize("ARGONC2D20.RollPrep.Field.Resolve")}</label>
        <input id="argon-c2d20-roll-resolve" name="fromResolve" type="number" min="0" step="1" value="0">
      </div>

      <div class="argon-c2d20-rollprep-row argon-c2d20-rollprep-source" data-source="momentum">
        <label for="argon-c2d20-roll-momentum">${game.i18n.localize("ARGONC2D20.RollPrep.Field.Momentum")}</label>
        <input id="argon-c2d20-roll-momentum" name="fromMomentum" type="number" min="0" step="1" value="0">
      </div>

      <div class="argon-c2d20-rollprep-row argon-c2d20-rollprep-source" data-source="doom">
        <label for="argon-c2d20-roll-doom">
          ${doomMode === "spend"
            ? game.i18n.localize("ARGONC2D20.RollPrep.Field.DoomSpend")
            : game.i18n.localize("ARGONC2D20.RollPrep.Field.DoomAdd")}
        </label>
        <input id="argon-c2d20-roll-doom" name="fromDoom" type="number" min="0" step="1" value="0">
      </div>

      <div class="argon-c2d20-rollprep-summary" data-role="summary"></div>
    </div>
  `;
}

function updateDialogPreview(form, ctx) {
  const rollDomain = form.elements.rollDomain?.value ?? ROLL_DOMAINS.OTHER;
  const { caps, maxBonusDice } = getSourceCaps(ctx, rollDomain);

  const vigorRow = form.querySelector(`[data-source="vigor"]`);
  const resolveRow = form.querySelector(`[data-source="resolve"]`);
  const momentumRow = form.querySelector(`[data-source="momentum"]`);
  const doomRow = form.querySelector(`[data-source="doom"]`);

  const vigorInput = form.elements.fromVigor;
  const resolveInput = form.elements.fromResolve;
  const momentumInput = form.elements.fromMomentum;
  const doomInput = form.elements.fromDoom;

  const showVigor = caps.vigor > 0;
  const showResolve = caps.resolve > 0;
  const showMomentum = caps.momentum > 0;
  const showDoom = caps.doom > 0;

  vigorRow?.classList.toggle("argon-c2d20-hidden", !showVigor);
  resolveRow?.classList.toggle("argon-c2d20-hidden", !showResolve);
  momentumRow?.classList.toggle("argon-c2d20-hidden", !showMomentum);
  doomRow?.classList.toggle("argon-c2d20-hidden", !showDoom);

  if (!showVigor) vigorInput.value = "0";
  if (!showResolve) resolveInput.value = "0";
  if (!showMomentum) momentumInput.value = "0";
  if (!showDoom) doomInput.value = "0";

  vigorInput.max = String(caps.vigor);
  resolveInput.max = String(caps.resolve);
  momentumInput.max = String(caps.momentum);
  doomInput.max = String(caps.doom);

  const totalBonus =
    clampInt(vigorInput.value, 0, caps.vigor) +
    clampInt(resolveInput.value, 0, caps.resolve) +
    clampInt(momentumInput.value, 0, caps.momentum) +
    clampInt(doomInput.value, 0, caps.doom);

  const totalDice = Number(ctx?.rules?.baseDice ?? 2) + totalBonus;
  const summary = form.querySelector('[data-role="summary"]');

  if (summary) {
    summary.innerHTML = `
      <strong>${game.i18n.format("ARGONC2D20.RollPrep.Summary.TotalDice", { totalDice })}</strong><br>
      <span>${game.i18n.format("ARGONC2D20.RollPrep.Summary.BonusDice", { bonusDice: totalBonus, maxBonusDice })}</span>
    `;
  }
}

function parsePreparedRoll(form, ctx, { actionId, weaponName = "" } = {}) {
  const rollDomain = form.elements.rollDomain?.value ?? ROLL_DOMAINS.OTHER;
  const { caps, doomMode, maxBonusDice } = getSourceCaps(ctx, rollDomain);

  const fromVigor = clampInt(form.elements.fromVigor?.value, 0, caps.vigor);
  const fromResolve = clampInt(form.elements.fromResolve?.value, 0, caps.resolve);
  const fromMomentum = clampInt(form.elements.fromMomentum?.value, 0, caps.momentum);
  const fromDoom = clampInt(form.elements.fromDoom?.value, 0, caps.doom);

  const selectedTotal = fromVigor + fromResolve + fromMomentum + fromDoom;
  if (selectedTotal > maxBonusDice) {
    ui.notifications?.warn(game.i18n.format("ARGONC2D20.RollPrep.Warning.MaxBonusDice", { maxBonusDice }));
    return null;
  }

  const plan = createBonusDicePlan(ctx, { rollDomain });
  plan.fromStress.vigor = fromVigor;
  plan.fromStress.resolve = fromResolve;
  plan.fromMomentum = fromMomentum;
  plan.fromDoom = fromDoom;

  const summary = summarizeBonusDicePlan(plan);

  return {
    actionId,
    rollDomain,
    doomMode,
    weaponName,
    plan,
    summary
  };
}

export async function openRollPreparationDialog(ctx, {
  actionId,
  title,
  rollDomain = ROLL_DOMAINS.OTHER,
  allowDomainChoice = false,
  weaponName = ""
} = {}) {
  const DialogV2 = foundry.applications.api.DialogV2;

  try {
    const result = await DialogV2.prompt({
      window: { title },
      content: buildDialogContent(ctx, { actionId, rollDomain, allowDomainChoice, weaponName }),
      ok: {
        label: game.i18n.localize("ARGONC2D20.RollPrep.Button.Confirm"),
        callback: (_event, button) => parsePreparedRoll(button.form, ctx, { actionId, weaponName })
      },
      rejectClose: false,
      modal: true,
      render: (_event, dialog) => {
        const form = dialog.element?.querySelector("form");
        if (!form) return;

        updateDialogPreview(form, ctx);

        for (const element of form.querySelectorAll("input, select")) {
          element.addEventListener("input", () => updateDialogPreview(form, ctx));
          element.addEventListener("change", () => updateDialogPreview(form, ctx));
        }
      }
    });

    return result ?? null;
  } catch (_err) {
    return null;
  }
}

export async function prepareActionRoll(ctx, {
  actionId,
  rollDomain = ROLL_DOMAINS.OTHER,
  allowDomainChoice = false,
  weaponName = ""
} = {}) {
  if (!game.settings.get(MODULE_ID, SETTING_KEYS.AUTO_OPEN_BONUS_DICE)) return null;
  if (!hasAnyBonusSources(ctx, { allowDomainChoice, rollDomain })) return null;

  let title = game.i18n.localize("ARGONC2D20.RollPrep.Title.Generic");
  if (actionId === ACTION_IDS.ATTACK_MELEE || actionId === ACTION_IDS.ATTACK_RANGED) {
    title = game.i18n.localize("ARGONC2D20.RollPrep.Title.Attack");
  } else if (actionId === ACTION_IDS.SKILL_TEST) {
    title = game.i18n.localize("ARGONC2D20.RollPrep.Title.SkillTest");
  }

  return openRollPreparationDialog(ctx, {
    actionId,
    title,
    rollDomain,
    allowDomainChoice,
    weaponName
  });
}

export async function applyPreparedRollCosts(ctx, prepared) {
  if (!prepared || !ctx?.actor) return;

  const actorUpdate = {};

  const currentVigor = Number(foundry.utils.getProperty(ctx.actor, "system.health.physical.value") ?? 0);
  const currentResolve = Number(foundry.utils.getProperty(ctx.actor, "system.health.mental.value") ?? 0);

  if (prepared.summary.costs.vigor > 0) {
    actorUpdate["system.health.physical.value"] = Math.max(0, currentVigor - prepared.summary.costs.vigor);
  }

  if (prepared.summary.costs.resolve > 0) {
    actorUpdate["system.health.mental.value"] = Math.max(0, currentResolve - prepared.summary.costs.resolve);
  }

  if (Object.keys(actorUpdate).length > 0) {
    await ctx.actor.update(actorUpdate);
  }

  if (prepared.summary.costs.momentum > 0) {
    await Promise.resolve(setMomentumPool(Math.max(0, readMomentumPool() - prepared.summary.costs.momentum)));
  }

  if (prepared.summary.costs.doom > 0) {
    const currentDoom = readDoomPool();
    const nextDoom = prepared.doomMode === "spend"
      ? Math.max(0, currentDoom - prepared.summary.costs.doom)
      : Math.max(0, currentDoom + prepared.summary.costs.doom);

    await Promise.resolve(setDoomPool(nextDoom));
  }
}

export function createPreparedRollChatContent(actionLabel, prepared) {
  const costs = prepared?.summary?.costs ?? {};
  const weaponLine = prepared?.weaponName
    ? `<div>${game.i18n.format("ARGONC2D20.Chat.PreparedRollWeapon", { weapon: prepared.weaponName })}</div>`
    : "";

  const doomLabel = prepared?.doomMode === "spend"
    ? game.i18n.localize("ARGONC2D20.RollPrep.Field.DoomSpend")
    : game.i18n.localize("ARGONC2D20.RollPrep.Field.DoomAdd");

  return `
    <div class="argon-conan2d20-chat-card">
      <strong>${actionLabel}</strong><br>
      ${weaponLine}
      <div>${game.i18n.format("ARGONC2D20.Chat.PreparedRollDice", {
        totalDice: prepared?.summary?.totalDice ?? 2,
        bonusDice: prepared?.summary?.bonusDice ?? 0
      })}</div>
      <div>${game.i18n.format("ARGONC2D20.Chat.PreparedRollCosts", {
        vigor: costs.vigor ?? 0,
        resolve: costs.resolve ?? 0,
        momentum: costs.momentum ?? 0,
        doom: costs.doom ?? 0,
        doomLabel
      })}</div>
    </div>
  `;
}