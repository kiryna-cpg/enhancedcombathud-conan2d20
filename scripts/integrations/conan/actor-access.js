function getItems(actor) {
  return actor?.items?.contents ?? [];
}

function sortByName(items) {
  return items.slice().sort((a, b) => {
    return String(a?.name ?? "").localeCompare(String(b?.name ?? ""), game.i18n.lang, {
      sensitivity: "base"
    });
  });
}

export function getActorResource(actor, path, fallback = 0) {
  return foundry.utils.getProperty(actor, path) ?? fallback;
}

export function isEquipped(item) {
  return !!foundry.utils.getProperty(item, "system.equipped");
}

export function isWeapon(item) {
  return item?.type === "weapon";
}

export function isArmor(item) {
  return item?.type === "armor";
}

export function isBroken(item) {
  return foundry.utils.getProperty(item, "system.broken") === true;
}

export function getWeaponType(item) {
  return foundry.utils.getProperty(item, "system.weaponType") ?? null;
}

export function getAttackMode(item) {
  if (!item) return null;
  if (item.type === "npcattack") {
    return foundry.utils.getProperty(item, "system.attackType") ?? null;
  }
  if (item.type === "display") return "threaten";
  if (item.type === "weapon") return getWeaponType(item);
  return null;
}

export function isShield(item) {
  return isWeapon(item) && foundry.utils.getProperty(item, "system.isShield") === true;
}

export function isDisplayAttack(item) {
  return item?.type === "display" && !isBroken(item);
}

export function isNpcAttack(item) {
  return item?.type === "npcattack" && !isBroken(item);
}

export function isAttackCapableWeaponItem(item) {
  return isWeapon(item) && !isBroken(item) && ["melee", "ranged"].includes(getAttackMode(item));
}

export function isSetAttackCapableItem(item) {
  if (isNpcAttack(item)) return getAttackMode(item) !== "threaten";
  return isAttackCapableWeaponItem(item);
}

export function getPrimaryAttackItemFromSet(setData) {
  return isSetAttackCapableItem(setData?.primary) ? setData.primary : null;
}

export function getSecondaryAttackItemFromSet(setData) {
  return isSetAttackCapableItem(setData?.secondary) ? setData.secondary : null;
}

export function isUnwieldyWeapon(item) {
  return ["weapon", "npcattack"].includes(item?.type) && foundry.utils.getProperty(item, "system.size") === "unwieldy";
}

export function isMeleeWeapon(item) {
  return isWeapon(item) && !isShield(item) && !isBroken(item) && getWeaponType(item) === "melee";
}

export function isRangedWeapon(item) {
  return isWeapon(item) && !isShield(item) && !isBroken(item) && getWeaponType(item) === "ranged";
}

export function getEquippedWeapons(actor) {
  return getItems(actor).filter((item) => isWeapon(item) && isEquipped(item) && !isBroken(item));
}

export function getEquippedArmor(actor) {
  return getItems(actor).filter((item) => isArmor(item) && isEquipped(item));
}

export function getEquippedMeleeWeapons(actor) {
  return getEquippedWeapons(actor).filter((item) => isMeleeWeapon(item));
}

export function getEquippedRangedWeapons(actor) {
  return getEquippedWeapons(actor).filter((item) => isRangedWeapon(item));
}

export function getEquippedShields(actor) {
  return getEquippedWeapons(actor).filter((item) => isShield(item));
}

export function hasActorStatus(actor, statusId) {
  return actor?.effects?.some((effect) => {
    const statuses = effect?.statuses ?? effect?._source?.statuses;
    if (!statuses) return false;
    if (statuses instanceof Set) return statuses.has(statusId);
    if (Array.isArray(statuses)) return statuses.includes(statusId);
    return false;
  }) === true;
}

const NON_CLEARABLE_STATUS_IDS = new Set([
  "prone",
  "guardBroken",
  "c2mq-no-guard",
  "conan-no-reach",
  "conan-reach-1",
  "conan-reach-2",
  "conan-reach-3",
  "conan-reach-4",
  "conan-reach-5",
  "conan-reach-6",
  "dead"
]);

export function hasClearableConditions(actor) {
  const effects = actor?.effects?.contents ?? actor?.effects ?? [];
  return effects.some((effect) => {
    const statuses = effect?.statuses ?? effect?._source?.statuses;
    if (!statuses) return false;

    const list = statuses instanceof Set ? Array.from(statuses) : Array.isArray(statuses) ? statuses : [];
    return list.some((statusId) => !NON_CLEARABLE_STATUS_IDS.has(statusId));
  });
}

export function getDefaultWeaponSetUuids(actor) {
  if (actor?.type === "npc") {
    const attackItems = getStandardAttackItems(actor);

    return {
      1: {
        primary: attackItems[0]?.uuid ?? null,
        secondary: null
      },
      2: {
        primary: attackItems[1]?.uuid ?? null,
        secondary: null
      },
      3: {
        primary: attackItems[2]?.uuid ?? null,
        secondary: null
      }
    };
  }

  const equippedWeapons = getEquippedWeapons(actor);
  const attackWeapons = equippedWeapons.filter((item) => !isShield(item));
  const shields = equippedWeapons.filter((item) => isShield(item));

  const defaults = {
    1: {
      primary: attackWeapons[0]?.uuid ?? shields[0]?.uuid ?? null,
      secondary: shields[0]?.uuid ?? attackWeapons[1]?.uuid ?? null
    },
    2: {
      primary: attackWeapons[1]?.uuid ?? null,
      secondary: shields[1]?.uuid ?? attackWeapons[2]?.uuid ?? null
    },
    3: {
      primary: attackWeapons[2]?.uuid ?? null,
      secondary: shields[2]?.uuid ?? attackWeapons[3]?.uuid ?? null
    }
  };

  for (const slots of Object.values(defaults)) {
    if (slots.primary && slots.secondary && slots.primary === slots.secondary) {
      slots.secondary = null;
    }
  }

  return defaults;
}

export function getWeaponSetFlagData(actor) {
  return foundry.utils.deepClone(actor?.getFlag("enhancedcombathud", "weaponSets") ?? {});
}

export function getActiveWeaponSetKey(actor) {
  return String(actor?.getFlag("enhancedcombathud", "activeWeaponSet") ?? "1");
}

async function resolveItemUuid(uuid) {
  if (!uuid) return null;
  return fromUuid(uuid);
}

export async function getResolvedWeaponSets(actor) {
  const defaults = getDefaultWeaponSetUuids(actor);
  const stored = getWeaponSetFlagData(actor);
  const sets = foundry.utils.mergeObject(defaults, stored);

  for (const [setId, slots] of Object.entries(sets)) {
    slots.primary = slots.primary ? await resolveItemUuid(slots.primary) : null;
    slots.secondary = slots.secondary ? await resolveItemUuid(slots.secondary) : null;
    sets[setId] = slots;
  }

  return sets;
}

export function getAttackWeaponFromSet(setData) {
  return getPrimaryAttackItemFromSet(setData) ?? getSecondaryAttackItemFromSet(setData) ?? null;
}

export async function getActiveWeaponSetData(actor) {
  const sets = await getResolvedWeaponSets(actor);
  const active = getActiveWeaponSetKey(actor);
  const activeSet = sets?.[active] ?? { primary: null, secondary: null };
  const primary = activeSet?.primary ?? null;
  const secondary = activeSet?.secondary ?? null;
  const attackWeapon = getAttackWeaponFromSet(activeSet);

  return {
    sets,
    active,
    activeSet,
    primary,
    secondary,
    attackWeapon
  };
}

export function getStandardAttackItems(actor) {
  if (actor?.type === "npc") {
    return sortByName(
      getItems(actor).filter((item) => isNpcAttack(item) && getAttackMode(item) !== "threaten")
    );
  }

  return sortByName(
    getEquippedWeapons(actor).filter((item) => !isShield(item) && ["melee", "ranged"].includes(getAttackMode(item)))
  );
}

export function getThreatenAttackItems(actor) {
  if (actor?.type === "npc") {
    return sortByName(
      getItems(actor).filter((item) => isNpcAttack(item) && getAttackMode(item) === "threaten")
    );
  }

  return sortByName(getItems(actor).filter((item) => isDisplayAttack(item)));
}

export function getDefaultStandardAttackItem(actor, activeSetData = null) {
  const setAttackItem =
    activeSetData?.attackWeapon ??
    getAttackWeaponFromSet(activeSetData?.activeSet ?? activeSetData ?? null);

  if (isSetAttackCapableItem(setAttackItem)) {
    return setAttackItem;
  }

  const standardItems = getStandardAttackItems(actor);
  return standardItems[0] ?? null;
}

export function getDefaultThreatenAttackItem(actor) {
  return getThreatenAttackItems(actor)[0] ?? null;
}

const INVENTORY_ITEM_TYPES = new Set([
  "miscellaneous",
  "consumable",
  "kit",
  "weapon",
  "armor"
]);

export function getInventoryItems(actor) {
  const items = getItems(actor).filter((item) => INVENTORY_ITEM_TYPES.has(item.type));
  return sortByName(items);
}