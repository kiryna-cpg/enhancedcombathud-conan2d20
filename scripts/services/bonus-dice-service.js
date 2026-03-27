import { BonusDicePlan } from "../models/bonus-dice-plan.js";
import { BONUS_DICE_PRIORITY, ROLL_DOMAINS } from "../constants.js";

function clampPlan(plan) {
  while (plan.totalDice > plan.maxDice) {
    if (plan.fromDoom > 0) plan.fromDoom -= 1;
    else if (plan.fromMomentum > 0) plan.fromMomentum -= 1;
    else if (plan.fromStress.resolve > 0) plan.fromStress.resolve -= 1;
    else if (plan.fromStress.vigor > 0) plan.fromStress.vigor -= 1;
    else if (plan.fromOther > 0) plan.fromOther -= 1;
    else break;
  }
  return plan;
}

export function createBonusDicePlan(ctx, { rollDomain = ROLL_DOMAINS.OTHER } = {}) {
  return new BonusDicePlan({
    baseDice: ctx?.rules?.baseDice ?? 2,
    maxDice: ctx?.rules?.maxDice ?? 5
  });
}

export function getAvailableBonusDiceSources(ctx, { rollDomain = ROLL_DOMAINS.OTHER } = {}) {
  const sources = {
    stressVigor: 0,
    stressResolve: 0,
    momentum: 0,
    doom: 0
  };

  if (ctx?.rules?.stressBonusDiceEnabled) {
    if (rollDomain === ROLL_DOMAINS.PHYSICAL) {
      sources.stressVigor = Math.max(0, Number(ctx.resources.vigor.value ?? 0));
    }
    if (rollDomain === ROLL_DOMAINS.MENTAL) {
      sources.stressResolve = Math.max(0, Number(ctx.resources.resolve.value ?? 0));
    }
  }

  if (ctx?.rules?.momentumBonusDiceEnabled) {
    sources.momentum = Math.max(0, Number(ctx.resources.momentum.value ?? 0));
  }

  if (ctx?.rules?.doomBonusDiceEnabled) {
    sources.doom = Math.max(0, Number(ctx.resources.doom.value ?? 0));
  }

  return sources;
}

export function autoAllocateBonusDice(ctx, plan, { requestedBonusDice = 0, rollDomain = ROLL_DOMAINS.OTHER, priority = BONUS_DICE_PRIORITY.MANUAL } = {}) {
  const next = new BonusDicePlan({
    baseDice: plan.baseDice,
    maxDice: plan.maxDice
  });

  const wanted = Math.max(0, Math.min(requestedBonusDice, next.maxDice - next.baseDice));
  const available = getAvailableBonusDiceSources(ctx, { rollDomain });

  if (priority === BONUS_DICE_PRIORITY.MANUAL) {
    return next;
  }

  let remaining = wanted;

  const spendStress = () => {
    if (rollDomain === ROLL_DOMAINS.PHYSICAL) {
      const spend = Math.min(remaining, available.stressVigor);
      next.fromStress.vigor += spend;
      remaining -= spend;
    } else if (rollDomain === ROLL_DOMAINS.MENTAL) {
      const spend = Math.min(remaining, available.stressResolve);
      next.fromStress.resolve += spend;
      remaining -= spend;
    }
  };

  const spendMomentum = () => {
    const spend = Math.min(remaining, available.momentum);
    next.fromMomentum += spend;
    remaining -= spend;
  };

  const spendDoom = () => {
    const spend = Math.min(remaining, available.doom);
    next.fromDoom += spend;
    remaining -= spend;
  };

  switch (priority) {
    case BONUS_DICE_PRIORITY.STRESS_FIRST:
      spendStress();
      spendMomentum();
      spendDoom();
      break;
    case BONUS_DICE_PRIORITY.MOMENTUM_FIRST:
      spendMomentum();
      spendStress();
      spendDoom();
      break;
    case BONUS_DICE_PRIORITY.DOOM_FIRST:
      spendDoom();
      spendStress();
      spendMomentum();
      break;
  }

  return clampPlan(next);
}

export function summarizeBonusDicePlan(plan) {
  return {
    baseDice: plan.baseDice,
    totalDice: plan.totalDice,
    bonusDice: plan.bonusDice,
    costs: {
      vigor: plan.fromStress.vigor,
      resolve: plan.fromStress.resolve,
      momentum: plan.fromMomentum,
      doom: plan.fromDoom
    }
  };
}