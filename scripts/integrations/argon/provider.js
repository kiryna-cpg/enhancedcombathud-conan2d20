import { MODULE_ID, ACTION_IDS, SETTING_KEYS, MOVEMENT_ECONOMY_MODES } from "../../constants.js";
import { buildCombatContext } from "../../services/context-service.js";
import { executeAction, getResolvedAction } from "../../actions/registry.js";
import { readMomentumPool, readDoomPool } from "../../services/pool-tracker-service.js";
import {
  getAttackWeaponFromSet,
  getDefaultWeaponSetUuids,
  getInventoryItems,
  getAttackMode
} from "../conan/actor-access.js";
import { clearBraceState } from "../../services/tactical-state-service.js";

const ICONS = {
  ATTACK: "modules/enhancedcombathud/icons/svg/crossed-swords.svg",
  THREATEN: "modules/enhancedcombathud-conan2d20/icons/svg/embrassed-energy.svg",
  WITHDRAW: "modules/enhancedcombathud/icons/svg/walking-boot.svg",
  SPRINT: "modules/enhancedcombathud/icons/svg/run.svg",
  RECOVER: "modules/enhancedcombathud-conan2d20/icons/svg/health-increase.svg",
  READY: "modules/enhancedcombathud/icons/svg/clockwork.svg",
  EXPLOIT: "modules/enhancedcombathud-conan2d20/icons/svg/eye-target.svg",
  BRACE: "modules/enhancedcombathud-conan2d20/icons/svg/pikeman.svg",
  SKILL_TEST: "modules/enhancedcombathud-conan2d20/icons/svg/tightrope.svg",
  INVENTORY: "modules/enhancedcombathud/icons/svg/backpack.svg",
  ASSIST: "modules/enhancedcombathud-conan2d20/icons/svg/team-idea.svg",
  TREATMENT: "modules/enhancedcombathud-conan2d20/icons/svg/arm-bandage.svg",
  REGAIN_GUARD: "systems/conan2d20/assets/icons/conditions/guardbreak.svg",
  STAND: "systems/conan2d20/assets/icons/conditions/prone.svg",
  CLEAR: "icons/svg/aura.svg",
  RESET_ACTIONS: "modules/enhancedcombathud-conan2d20/icons/svg/backward-time.svg"
};

function getActorFromButton(button) {
  return button.actor ?? ui.ARGON?._actor ?? null;
}

function getTokenFromActor(actor) {
  return actor?.token ?? actor?.getActiveTokens?.()?.[0] ?? null;
}

function getCombatantState(actor) {
  const combat = game.combat;
  const combatant = combat?.combatants?.find((c) => c.actor?.id === actor?.id);
  return combatant?.getFlag(MODULE_ID, "actionState") ?? {};
}

function getStandardAttackActionId(item) {
  const mode = getAttackMode(item);
  if (mode === "melee") return ACTION_IDS.ATTACK_MELEE;
  if (mode === "ranged") return ACTION_IDS.ATTACK_RANGED;
  return null;
}

export function registerArgonProvider() {
  Hooks.on("argonInit", (CoreHUD) => {
    if (game.system.id !== "conan2d20") return;

    console.info(`${MODULE_ID} | argonInit received`);

    const ARGON = CoreHUD.ARGON;

    class ConanTooltip extends ARGON.CORE.Tooltip {}

    class ConanPortraitPanel extends ARGON.PORTRAIT.PortraitPanel {
      get description() {
        const actorType = this.actor?.type ?? "";
        const actorTypeLabel = actorType ? actorType.charAt(0).toUpperCase() + actorType.slice(1) : "";
        return actorTypeLabel || this.actor?.name || "";
      }

      async getStatBlocks() {
        const actor = this.actor;
        const showDoom = game.user?.isGM || game.settings.get(MODULE_ID, SETTING_KEYS.SHOW_DOOM_TO_PLAYERS);

        const blocks = [
          [
            {
              text: `${foundry.utils.getProperty(actor, "system.health.physical.value") ?? 0}`,
              color: "var(--ech-movement-baseMovement-background)"
            },
            { text: "/" },
            { text: `${foundry.utils.getProperty(actor, "system.health.physical.max") ?? 0}` },
            { text: game.i18n.localize("ARGONC2D20.Resource.Vigor") }
          ],
          [
            {
              text: `${foundry.utils.getProperty(actor, "system.health.mental.value") ?? 0}`,
              color: "var(--ech-movement-baseMovement-background)"
            },
            { text: "/" },
            { text: `${foundry.utils.getProperty(actor, "system.health.mental.max") ?? 0}` },
            { text: game.i18n.localize("ARGONC2D20.Resource.Resolve") }
          ],
          [
            {
              text: `${readMomentumPool()}`,
              color: "var(--ech-movement-baseMovement-background)"
            },
            { text: game.i18n.localize("ARGONC2D20.Resource.Momentum") }
          ]
        ];

        if (showDoom) {
          blocks.push([
            {
              text: `${readDoomPool()}`,
              color: "var(--ech-movement-baseMovement-background)"
            },
            { text: game.i18n.localize("ARGONC2D20.Resource.Doom") }
          ]);
        }

        return blocks;
      }
    }

    class ConanDrawerPanel extends ARGON.DRAWER.DrawerPanel {
      get categories() {
        return [];
      }
    }

    const WeaponSetsBase =
      ARGON?.WEAPONSETS?.WeaponSets ??
      ARGON?.WeaponSets ??
      ARGON?.MAIN?.WeaponSets ??
      null;

class ConanWeaponSets extends (WeaponSetsBase ?? class {}) {
  constructor(...args) {
    super(...args);
    this._lastSetSignature = null;
  }

  async getDefaultSets() {
    return getDefaultWeaponSetUuids(this.actor);
  }

  async _onSetChange({ sets, active }) {
    if (ui.ARGON?._actor?.id !== this.actor?.id) return;

    const signature = JSON.stringify({
      active,
      sets: Object.fromEntries(
        Object.entries(sets ?? {}).map(([setId, slots]) => [
          setId,
          {
            primary: slots?.primary?.uuid ?? null,
            secondary: slots?.secondary?.uuid ?? null
          }
        ])
      )
    });

    if (this._lastSetSignature === null) {
      this._lastSetSignature = signature;
      return;
    }

    if (this._lastSetSignature === signature) return;
    this._lastSetSignature = signature;

    const token = getTokenFromActor(this.actor);
    const ctx = await buildCombatContext(this.actor, token);

    const bracedWeaponUuid = ctx?.tacticalState?.brace?.weaponUuid ?? null;
    const activeWeaponUuid = ctx?.weaponSet?.primaryAttackItem?.uuid ?? null;

    if (ctx?.combatant && bracedWeaponUuid && activeWeaponUuid !== bracedWeaponUuid) {
      await clearBraceState(ctx.combatant);
    }

    ui.ARGON?.refresh?.();
  }
}
    const MovementHudBase =
      ARGON?.MOVEMENT?.MovementHud ??
      ARGON?.MovementHud ??
      ARGON?.CORE?.MovementHud ??
      null;

    class ConanMovementHud extends (MovementHudBase ?? class {}) {
      constructor(...args) {
        super(...args);
        this._movementUsed = 0;
      }

      get visible() {
        return game.combat?.started && game.settings.get(MODULE_ID, SETTING_KEYS.MOVEMENT_ECONOMY_MODE) === MOVEMENT_ECONOMY_MODES.ONE_PER_ROUND;
      }

      get movementUsed() {
        const state = getCombatantState(this.actor);
        return Number(state?.movementSpent ?? this._movementUsed ?? 0);
      }

      set movementUsed(value) {
        this._movementUsed = Math.max(Number(value ?? 0), 0);
      }

      get movementMax() {
        return 1;
      }

      get movementColor() {
        return "base-movement";
      }

      updateMovement() {
        this._movementUsed = Number(getCombatantState(this.actor)?.movementSpent ?? 0);
        return super.updateMovement();
      }

      async _onNewRound(..._args) {
        return super._onNewRound?.(..._args);
      }

      async _onCombatEnd(..._args) {
        return super._onCombatEnd?.(..._args);
      }
    }
    class ConanResolvedActionButton extends ARGON.MAIN.BUTTONS.ActionButton {
      constructor(actionData, { icon = null, colorScheme = 0 } = {}) {
        super();
        this.actionData = actionData;
        this._icon = icon;
        this._colorScheme = colorScheme;
      }

      setActionData(actionData) {
        this.actionData = actionData;
      }

      get colorScheme() {
        return this._colorScheme;
      }

      get label() {
        return this.actionData?.displayLabel ?? game.i18n.localize(this.actionData?.label ?? "");
      }

      get icon() {
        return this._icon ?? ICONS.ATTACK;
      }

      get isInvalid() {
        return !this.actionData?.isEnabled;
      }

      get hasTooltip() {
        return true;
      }

      async getTooltipData() {
        return {
          title: this.label,
          description: this.actionData?.tooltipDescription || this.actionData?.reason || game.i18n.localize("ARGONC2D20.Tooltip.NoAdditionalDetails"),
          subtitle: game.i18n.localize("ARGONC2D20.Tooltip.ActionSubtitle"),
          details: []
        };
      }

      async _onLeftClick(_event) {
        if (!this.actionData) return false;

        const actor = getActorFromButton(this);
        if (!actor) return false;

        const token = getTokenFromActor(actor);
        const ctx = await buildCombatContext(actor, token);
        return executeAction(ctx, this.actionData.id);
      }

      async _onRightClick(_event) {
        const actor = getActorFromButton(this);
        actor?.sheet?.render(true);
      }

      async _renderInner() {
        await super._renderInner();
        this.element.classList.toggle("argon-c2d20-invalid", this.isInvalid && !this.actionData?.isArmed);
        this.element.classList.toggle("argon-c2d20-armed", !!this.actionData?.isArmed);
      }
    }

    class ConanAttackButton extends ARGON.MAIN.BUTTONS.ActionButton {
      constructor(ctx, { slot = "primary" } = {}) {
        super();
        this.ctx = ctx;
        this.slot = slot;
      }

      setContext(ctx) {
        this.ctx = ctx;
      }

      get item() {
        if (this.slot === "secondary") {
          return this.ctx?.weaponSet?.secondaryAttackItem ?? null;
        }

        return this.ctx?.weaponSet?.primaryAttackItem ?? this.ctx?.attacks?.defaultStandardItem ?? this.ctx?.equipped?.activeAttackWeapon ?? null;
      }

      get label() {
        return this.item?.name ?? game.i18n.localize("ARGONC2D20.Action.Attack");
      }

      get icon() {
        return this.item?.img ?? ICONS.ATTACK;
      }

      get isSecondary() {
        return this.slot === "secondary";
      }

      get isShieldAttack() {
        return this.isSecondary && this.ctx?.weaponSet?.secondaryIsShield === true;
      }

      get isInvalid() {
        const item = this.item;
        if (!item) return true;

        const actionId = getStandardAttackActionId(item);
        if (!actionId) return true;

        const actionData = getResolvedAction(this.ctx, actionId);
        return !actionData?.isEnabled;
      }

      get hasTooltip() {
        return true;
      }

      async getTooltipData() {
        const activeType = getAttackMode(this.item);
        const actionId = getStandardAttackActionId(this.item);
        const actionData = actionId ? getResolvedAction(this.ctx, actionId) : null;

        if (!this.item) {
          return {
            title: game.i18n.localize("ARGONC2D20.Action.Attack"),
            description: game.i18n.localize("ARGONC2D20.Disabled.NoAttackAvailable"),
            subtitle: game.i18n.localize("ARGONC2D20.Tooltip.ActionSubtitle"),
            details: []
          };
        }

        let descriptionKey = "ARGONC2D20.Tooltip.AttackWithSelectedPrimaryWeapon";
        if (this.isShieldAttack) {
          descriptionKey = "ARGONC2D20.Tooltip.AttackWithSelectedShield";
        } else if (this.isSecondary) {
          descriptionKey = "ARGONC2D20.Tooltip.AttackWithSelectedSecondaryWeapon";
        }

        return {
          title: this.label,
          description: actionData?.reason || game.i18n.localize(descriptionKey),
          subtitle: `${this.item.name} • ${activeType ?? "weapon"}`,
          details: []
        };
      }

      async _onLeftClick(_event) {
        const actor = getActorFromButton(this);
        if (!actor) return false;

        const token = getTokenFromActor(actor);
        const ctx = await buildCombatContext(actor, token);
        const weapon = this.slot === "secondary"
          ? (ctx?.weaponSet?.secondaryAttackItem ?? null)
          : (ctx?.weaponSet?.primaryAttackItem ?? ctx?.attacks?.defaultStandardItem ?? null);

        if (!weapon) {
          ui.notifications?.warn(game.i18n.localize("ARGONC2D20.Disabled.NoAttackAvailable"));
          return false;
        }

        const actionId = getStandardAttackActionId(weapon);
        if (!actionId) {
          ui.notifications?.warn(game.i18n.localize("ARGONC2D20.Disabled.NoAttackAvailable"));
          return false;
        }

        return executeAction(ctx, actionId, {
          itemId: weapon.id,
          attackSlot: this.slot
        });
      }

      async _onRightClick(_event) {
        this.item?.sheet?.render(true);
      }

      async _renderInner() {
        await super._renderInner();
        this.element.classList.toggle("argon-c2d20-invalid", this.isInvalid);
      }
    }

    class ConanThreatenButton extends ARGON.MAIN.BUTTONS.ActionButton {
      constructor(ctx) {
        super();
        this.ctx = ctx;
      }

      setContext(ctx) {
        this.ctx = ctx;
      }

      get item() {
        return this.ctx?.attacks?.defaultThreatenItem ?? this.ctx?.equipped?.threatenAttack ?? null;
      }

      get actionData() {
        return getResolvedAction(this.ctx, ACTION_IDS.ATTACK_THREATEN);
      }

      get label() {
        return game.i18n.localize("ARGONC2D20.Action.Threaten");
      }

      get icon() {
        return this.item?.img ?? ICONS.THREATEN;
      }

      get isInvalid() {
        return !this.actionData?.isEnabled;
      }

      get hasTooltip() {
        return true;
      }

      async getTooltipData() {
        return {
          title: this.label,
          description: this.actionData?.reason || game.i18n.localize("ARGONC2D20.Tooltip.NoAdditionalDetails"),
          subtitle: this.item?.name ?? game.i18n.localize("ARGONC2D20.Action.Threaten"),
          details: []
        };
      }

      async _onLeftClick(_event) {
        const actor = getActorFromButton(this);
        if (!actor) return false;

        const token = getTokenFromActor(actor);
        const ctx = await buildCombatContext(actor, token);
        const item = ctx?.attacks?.defaultThreatenItem ?? null;
        return executeAction(ctx, ACTION_IDS.ATTACK_THREATEN, { itemId: item?.id ?? null });
      }

      async _onRightClick(_event) {
        this.item?.sheet?.render(true);
      }

      async _renderInner() {
        await super._renderInner();
        this.element.classList.toggle("argon-c2d20-invalid", this.isInvalid);
      }
    }

    class ConanAttackSourceItemButton extends ARGON.MAIN.BUTTONS.ItemButton {
      constructor(item, actionId) {
        super({ item });
        this.actionId = actionId;
      }

      get quantity() {
        return null;
      }

      async _onLeftClick(_event) {
        const actor = getActorFromButton(this);
        if (!actor) return false;

        const token = getTokenFromActor(actor);
        const ctx = await buildCombatContext(actor, token);
        return executeAction(ctx, this.actionId, { itemId: this.item?.id ?? null });
      }

      async _onRightClick(_event) {
        this.item?.sheet?.render(true);
      }
    }

    class ConanAttackSourcePanelButton extends ARGON.MAIN.BUTTONS.ButtonPanelButton {
      constructor(ctx, mode = "standard") {
        super();
        this.ctx = ctx;
        this.mode = mode;
      }

      setContext(ctx) {
        this.ctx = ctx;
      }

      get items() {
        return this.mode === "threaten"
          ? (this.ctx?.attacks?.threatenItems ?? [])
          : (this.ctx?.attacks?.standardItems ?? []);
      }

      get primaryItem() {
        return this.mode === "threaten"
          ? (this.ctx?.attacks?.defaultThreatenItem ?? null)
          : (this.ctx?.attacks?.defaultStandardItem ?? null);
      }

      get label() {
        if (this.mode === "threaten") return game.i18n.localize("ARGONC2D20.Action.Threaten");
        return this.primaryItem?.name ?? game.i18n.localize("ARGONC2D20.Action.Attack");
      }

      get icon() {
        if (this.primaryItem?.img) return this.primaryItem.img;
        return this.mode === "threaten" ? ICONS.THREATEN : ICONS.ATTACK;
      }

      get isInvalid() {
        if (!this.primaryItem) return true;
        const actionId = this.mode === "threaten" ? ACTION_IDS.ATTACK_THREATEN : getStandardAttackActionId(this.primaryItem);
        if (!actionId) return true;
        const actionData = getResolvedAction(this.ctx, actionId);
        return !actionData?.isEnabled;
      }

      get hasTooltip() {
        return true;
      }

      async getTooltipData() {
        const actionId = this.mode === "threaten" ? ACTION_IDS.ATTACK_THREATEN : getStandardAttackActionId(this.primaryItem);
        const actionData = actionId ? getResolvedAction(this.ctx, actionId) : null;

        return {
          title: this.label,
          description: actionData?.reason || game.i18n.localize("ARGONC2D20.Tooltip.NoAdditionalDetails"),
          subtitle: this.primaryItem?.name ?? game.i18n.localize("ARGONC2D20.Tooltip.ActionSubtitle"),
          details: []
        };
      }

      async _onClick(event) {
        if (this.isInvalid) {
          const actionId = this.mode === "threaten" ? ACTION_IDS.ATTACK_THREATEN : getStandardAttackActionId(this.primaryItem);
          const actionData = actionId ? getResolvedAction(this.ctx, actionId) : null;
          ui.notifications?.warn(actionData?.reason ?? game.i18n.localize("ARGONC2D20.Error.ActionUnavailable"));
          return false;
        }

        return super._onClick(event);
      }

      async _renderInner() {
        await super._renderInner();
        this.element.classList.toggle("argon-c2d20-invalid", this.isInvalid);
      }

      async _getPanel() {
        const buttons = this.items.map((item) => {
          const actionId = this.mode === "threaten" ? ACTION_IDS.ATTACK_THREATEN : getStandardAttackActionId(item);
          return new ConanAttackSourceItemButton(item, actionId);
        }).filter((button) => !!button.actionId);

        return new ARGON.MAIN.BUTTON_PANELS.ButtonPanel({
          id: `${MODULE_ID}.${this.mode}.attacks.${this.actor?.id ?? "unknown"}`,
          buttons
        });
      }
    }

    class ConanInventoryItemButton extends ARGON.MAIN.BUTTONS.ItemButton {
      constructor(item) {
        super({ item });
      }

      get quantity() {
        return null;
      }

      async _onLeftClick(_event) {
        this.item?.sheet?.render(true);
      }

      async _onRightClick(_event) {
        this.item?.sheet?.render(true);
      }
    }

    class ConanInventoryPanelButton extends ARGON.MAIN.BUTTONS.ButtonPanelButton {
      get label() {
        return game.i18n.localize("ARGONC2D20.Action.Inventory");
      }

      get icon() {
        return ICONS.INVENTORY;
      }

      async _getPanel() {
        const items = getInventoryItems(this.actor);
        const buttons = items.map((item) => new ConanInventoryItemButton(item));

        return new ARGON.MAIN.BUTTON_PANELS.ButtonPanel({
          id: `${MODULE_ID}.inventory.${this.actor?.id ?? "unknown"}`,
          buttons
        });
      }
    }

    class ConanBaseActionPanel extends ARGON.MAIN.ActionPanel {
      get template() {
        return "modules/enhancedcombathud/templates/partials/ActionPanel.hbs";
      }

      get label() {
        return "";
      }

      _getState() {
        return getCombatantState(this.actor);
      }

      async _getContext() {
        return buildCombatContext(this.actor, this.actor?.token ?? null);
      }
    }

    class ConanStandardPanel extends ConanBaseActionPanel {
      get label() {
        return game.i18n.localize("ARGONC2D20.Panel.Standard");
      }

      get maxActions() {
        return 1;
      }

      get currentActions() {
        const state = this._getState();
        const spent = Number(state.standardSpent ?? 0) + Number(state.extraStandardSpent ?? 0);
        const max = 1 + Math.max(0, Number(state.extraStandardGained ?? 0));
        return Math.max(0, max - spent);
      }

      async _getButtons() {
        const ctx = await this._getContext();
        const resolve = (actionId) => getResolvedAction(ctx, actionId);

        const primaryAttackButton = new ConanAttackButton(ctx, { slot: "primary" });
        const secondaryAttackButton = ctx.weaponSet?.hasSecondaryAttack
          ? new ConanAttackButton(ctx, { slot: "secondary" })
          : null;

        const attackButton = secondaryAttackButton
          ? new ARGON.MAIN.BUTTONS.SplitButton(primaryAttackButton, secondaryAttackButton)
          : primaryAttackButton;

        const threatenButton = (ctx.attacks?.threatenItems?.length ?? 0) > 1
          ? new ConanAttackSourcePanelButton(ctx, "threaten")
          : new ConanThreatenButton(ctx);

        return [
          attackButton,
          new ARGON.MAIN.BUTTONS.SplitButton(
            new ConanResolvedActionButton(resolve(ACTION_IDS.BRACE), { icon: ICONS.BRACE }),
            new ConanResolvedActionButton(resolve(ACTION_IDS.READY), { icon: ICONS.READY })
          ),
          threatenButton,
          new ARGON.MAIN.BUTTONS.SplitButton(
            new ConanResolvedActionButton(resolve(ACTION_IDS.WITHDRAW), { icon: ICONS.WITHDRAW }),
            new ConanResolvedActionButton(resolve(ACTION_IDS.SPRINT), { icon: ICONS.SPRINT })
          ),
          new ARGON.MAIN.BUTTONS.SplitButton(
            new ConanResolvedActionButton(resolve(ACTION_IDS.EXPLOIT), { icon: ICONS.EXPLOIT }),
            new ConanResolvedActionButton(resolve(ACTION_IDS.SKILL_TEST), { icon: ICONS.SKILL_TEST })
          ),
          new ConanResolvedActionButton(resolve(ACTION_IDS.RECOVER), { icon: ICONS.RECOVER }),
          new ARGON.MAIN.BUTTONS.SplitButton(
            new ConanResolvedActionButton(resolve(ACTION_IDS.ASSIST), { icon: ICONS.ASSIST }),
            new ConanResolvedActionButton(resolve(ACTION_IDS.TREATMENT), { icon: ICONS.TREATMENT })
          )
        ];
      }
    }

    class ConanMinorPanel extends ConanBaseActionPanel {
      get label() {
        return game.i18n.localize("ARGONC2D20.Panel.Minor");
      }

      get maxActions() {
        return 1;
      }

      get currentActions() {
        const state = this._getState();
        const spent = Number(state.minorSpent ?? 0);
        return Math.max(0, 1 - spent);
      }

      async _getButtons() {
        const ctx = await this._getContext();
        const resolve = (actionId) => getResolvedAction(ctx, actionId);

        return [
          new ConanInventoryPanelButton(),
          new ARGON.MAIN.BUTTONS.SplitButton(
            new ConanResolvedActionButton(resolve(ACTION_IDS.REGAIN_GUARD), { icon: ICONS.REGAIN_GUARD }),
            new ConanResolvedActionButton(resolve(ACTION_IDS.STAND), { icon: ICONS.STAND })
          ),
          new ARGON.MAIN.BUTTONS.SplitButton(
            new ConanResolvedActionButton(resolve(ACTION_IDS.CLEAR), { icon: ICONS.CLEAR }),
            new ConanResolvedActionButton(resolve(ACTION_IDS.RESET_ACTIONS), { icon: ICONS.RESET_ACTIONS })
          )
        ];
      }
    }

    const mainPanels = [
      ConanStandardPanel,
      ConanMinorPanel,
      ARGON.PREFAB.PassTurnPanel
    ];

    CoreHUD.definePortraitPanel(ConanPortraitPanel);
    CoreHUD.defineDrawerPanel(ConanDrawerPanel);

    if (WeaponSetsBase && typeof CoreHUD.defineWeaponSets === "function") {
      CoreHUD.defineWeaponSets(ConanWeaponSets);
      console.info(`${MODULE_ID} | Weapon sets configured`);
    } else {
      console.warn(`${MODULE_ID} | Weapon sets base class not found`);
    }

    if (MovementHudBase && typeof CoreHUD.defineMovementHud === "function") {
      CoreHUD.defineMovementHud(ConanMovementHud);
      console.info(`${MODULE_ID} | Movement HUD configured`);
    } else {
      console.warn(`${MODULE_ID} | Movement HUD base class not found`);
    }

    CoreHUD.defineMainPanels(mainPanels);
    CoreHUD.defineTooltip(ConanTooltip);
    CoreHUD.defineSupportedActorTypes(["character", "npc"]);

    console.info(`${MODULE_ID} | Argon provider configured`);
  });

  console.info(`${MODULE_ID} | Argon provider hook installed`);
}