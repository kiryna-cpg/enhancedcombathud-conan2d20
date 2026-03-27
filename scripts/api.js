import { buildCombatContext } from "./services/context-service.js";
import { getAvailableActions, executeAction } from "./actions/registry.js";
import { createBonusDicePlan, summarizeBonusDicePlan } from "./services/bonus-dice-service.js";
import {
  openSystemSkillTestDialog,
  openRecoverDialog,
  openTreatmentDialog,
  openAssistDialog,
  openExploitDialog,
  executeSystemSkillRoll,
  executeSystemWeaponAttack
} from "./services/system-roll-service.js";

export function buildApi() {
  return {
    async getCombatContext(actor, token = null) {
      return buildCombatContext(actor, token);
    },

    async getAvailableActions(actor, token = null) {
      const ctx = await buildCombatContext(actor, token);
      return getAvailableActions(ctx);
    },

    async executeAction(actor, actionId, token = null) {
      const ctx = await buildCombatContext(actor, token);
      return executeAction(ctx, actionId);
    },

    async openSystemSkillTestDialog(actor) {
      return openSystemSkillTestDialog(actor);
    },

    async openRecoverDialog(actor) {
      return openRecoverDialog(actor);
    },

    async openTreatmentDialog(actor) {
      return openTreatmentDialog(actor);
    },

    async openAssistDialog(actor) {
      return openAssistDialog(actor);
    },

    async openExploitDialog(actor) {
      return openExploitDialog(actor);
    },

    async executeSystemSkillRoll(actor, skillKey, bonusDice = 0) {
      return executeSystemSkillRoll(actor, skillKey, bonusDice);
    },

    async executeSystemWeaponAttack(actor, itemId) {
      return executeSystemWeaponAttack(actor, itemId);
    },

    createBonusDicePlan(ctx, options = {}) {
      return createBonusDicePlan(ctx, options);
    },

    summarizeBonusDicePlan(plan) {
      return summarizeBonusDicePlan(plan);
    }
  };
}