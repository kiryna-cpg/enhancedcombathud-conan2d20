import { MODULE_ID } from "../constants.js";
import { registerArgonProvider } from "../integrations/argon/provider.js";

let providerHookRegistered = false;

export function registerArgonHooks() {
  if (providerHookRegistered) return;
  providerHookRegistered = true;

  registerArgonProvider();
  console.info(`${MODULE_ID} | Argon hook registered`);
}