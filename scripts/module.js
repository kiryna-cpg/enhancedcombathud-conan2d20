import { MODULE_ID } from "./constants.js";
import { registerSettings } from "./settings.js";
import { buildApi } from "./api.js";
import { registerArgonHooks } from "./hooks/argon.js";
import { registerCombatHooks } from "./hooks/combat.js";

// Register Argon as early as possible so the argonInit hook is never missed.
registerArgonHooks();

Hooks.once("init", () => {
  registerSettings();
});

Hooks.once("ready", () => {
  const module = game.modules.get(MODULE_ID);
  if (module) {
    module.api = buildApi();
  }

  registerCombatHooks();

  console.log(`${MODULE_ID} | Ready`);
});