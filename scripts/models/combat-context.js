export class CombatContext {
  constructor() {
    this.actor = null;
    this.token = null;
    this.user = game.user ?? null;

    this.combat = null;
    this.combatant = null;
    this.inCombat = false;
    this.isTurnOwner = false;

    this.targets = [];
    this.primaryTarget = null;

    this.actionState = {
      round: 0,
      standardSpent: 0,
      minorSpent: 0,
      reactionSpent: 0,
      movementSpent: 0,
      extraStandardGained: 0,
      extraStandardSpent: 0,
      guardDeclared: false,
      defendUsed: false,
      retaliateUsed: false,
      lastActionId: null
    };

    this.tacticalState = {
      brace: {
        active: false,
        weaponUuid: null,
        weaponName: "",
        round: null,
        turn: null
      },
      ready: {
        active: false,
        actionId: null,
        actionLabel: "",
        triggerText: "",
        round: null,
        turn: null
      }
    };

    this.resources = {
      vigor: { value: 0, max: 0 },
      resolve: { value: 0, max: 0 },
      momentum: { value: 0, max: null },
      doom: { value: 0, visible: false }
    };

    this.rules = {
      maxDice: 5,
      baseDice: 2,
      stressBonusDiceEnabled: true,
      momentumBonusDiceEnabled: true,
      doomBonusDiceEnabled: true,
      assistMode: "normal",
      movementEconomyMode: "off"
    };

    this.capabilities = {
      canAttackMelee: false,
      canAttackRanged: false,
      canThreaten: false,
      canDefend: false,
      canProtect: false,
      canRetaliate: false,
      canAssist: false,
      canRecover: false,
      canRegainGuard: false,
      canStand: false,
      canDrawItem: false,
      canMovement: false,
      canClear: false,
      canBrace: false,
      canExploit: true,
      canReady: true,
      canSkillTest: true,
      canSprint: true,
      canTreatment: true,
      canWithdraw: true,
      canPass: false,
      canInventory: false
    };

    this.equipped = {
      meleeWeapons: [],
      rangedWeapons: [],
      shields: [],
      weaponSets: {},
      activeSetId: "1",
      activeSet: { primary: null, secondary: null },
      activePrimary: null,
      activeSecondary: null,
      activeAttackWeapon: null,
      threatenAttack: null
    };

    this.attacks = {
      standardItems: [],
      threatenItems: [],
      defaultStandardItem: null,
      defaultThreatenItem: null
    };    

    this.inventoryItems = [];

    this.weaponSet = {
      sets: {},
      active: "1",
      activeSet: {
        primary: null,
        secondary: null
      },
      primary: null,
      secondary: null,
      primaryAttackItem: null,
      secondaryAttackItem: null,
      hasSecondaryAttack: false,
      secondaryIsShield: false,
      attackItem: null,
      attackMode: null,
      canBrace: false
    };

    this.status = {
      guardBroken: false,
      prone: false,
      noGuard: false
    };
  }
}