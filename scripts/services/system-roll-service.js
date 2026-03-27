const PC_SKILL_I18N = {
  acr: "ARGONC2D20.Skill.acr",
  alc: "ARGONC2D20.Skill.alc",
  ani: "ARGONC2D20.Skill.ani",
  ath: "ARGONC2D20.Skill.ath",
  com: "ARGONC2D20.Skill.com",
  cou: "ARGONC2D20.Skill.cou",
  cra: "ARGONC2D20.Skill.cra",
  dis: "ARGONC2D20.Skill.dis",
  hea: "ARGONC2D20.Skill.hea",
  ins: "ARGONC2D20.Skill.ins",
  lin: "ARGONC2D20.Skill.lin",
  lor: "ARGONC2D20.Skill.lor",
  mel: "ARGONC2D20.Skill.mel",
  obs: "ARGONC2D20.Skill.obs",
  par: "ARGONC2D20.Skill.par",
  per: "ARGONC2D20.Skill.per",
  ran: "ARGONC2D20.Skill.ran",
  res: "ARGONC2D20.Skill.res",
  sai: "ARGONC2D20.Skill.sai",
  soc: "ARGONC2D20.Skill.soc",
  sor: "ARGONC2D20.Skill.sor",
  ste: "ARGONC2D20.Skill.ste",
  sur: "ARGONC2D20.Skill.sur",
  thi: "ARGONC2D20.Skill.thi",
  war: "ARGONC2D20.Skill.war"
};

const NPC_SKILL_I18N = {
  cmb: "ARGONC2D20.Skill.cmb",
  frt: "ARGONC2D20.Skill.frt",
  knw: "ARGONC2D20.Skill.knw",
  mov: "ARGONC2D20.Skill.mov",
  sns: "ARGONC2D20.Skill.sns",
  scl: "ARGONC2D20.Skill.scl"
};

function getSkillI18nKey(actor, skillKey) {
  const map = actor?.type === "npc" ? NPC_SKILL_I18N : PC_SKILL_I18N;
  return map[skillKey] ?? null;
}

function getSkillLabel(actor, skillKey, skillData) {
  const i18nKey = getSkillI18nKey(actor, skillKey);
  if (i18nKey) return game.i18n.localize(i18nKey);
  if (skillData?.label) return skillData.label;
  return skillKey;
}

function getSpeaker(actor) {
  return ChatMessage.getSpeaker({
    actor,
    token: actor?.token ?? actor?.getActiveTokens?.()?.[0] ?? null
  });
}

async function postWorkflowMessage(actor, titleKey, bodyKey, formatData = {}) {
  return ChatMessage.create({
    speaker: getSpeaker(actor),
    content: `
      <div class="argon-conan2d20-chat-card">
        <strong>${game.i18n.localize(titleKey)}</strong><br>
        <span>${game.i18n.format(bodyKey, formatData)}</span>
      </div>
    `
  });
}

function getDialogV2() {
  return foundry.applications.api.DialogV2;
}

function sortByName(entries, key = "label") {
  return entries.slice().sort((a, b) =>
    String(a?.[key] ?? "").localeCompare(String(b?.[key] ?? ""), game.i18n.lang, { sensitivity: "base" })
  );
}

export function getActorSkillEntries(actor) {
  const skills = actor?.system?.skills ?? {};
  const entries = Object.keys(skills).map((key) => ({
    key,
    label: getSkillLabel(actor, key, skills[key]),
    data: skills[key]
  }));

  return sortByName(entries, "label");
}

export async function executeSystemSkillRoll(actor, skillKey, bonusDice = 0) {
  if (!actor || !skillKey) return false;

  if (typeof actor._rollSkillCheck === "function") {
    await actor._rollSkillCheck(skillKey, null, bonusDice);
    return true;
  }

  const fn = actor?.rollSkill ?? actor?.rollSkillTest ?? null;
  if (typeof fn === "function") {
    await fn.call(actor, skillKey, { bonusDice });
    return true;
  }

  const macro = game?.conan2d20?.rollSkill ?? null;
  if (typeof macro === "function") {
    await macro(actor, skillKey, { bonusDice });
    return true;
  }

  actor.sheet?.render(true);
  return false;
}

export async function openSystemSkillTestDialog(actor) {
  if (!actor) return false;

  const entries = getActorSkillEntries(actor);
  if (!entries.length) {
    ui.notifications?.warn(game.i18n.localize("ARGONC2D20.SkillPicker.Error.NoSkills"));
    return false;
  }

  const options = entries
    .map((entry) => `<option value="${entry.key}">${entry.label}</option>`)
    .join("");

  const DialogV2 = getDialogV2();

  const selectedSkill = await DialogV2.prompt({
    window: { title: game.i18n.localize("ARGONC2D20.SkillPicker.Title") },
    content: `
      <div class="argon-c2d20-skillpicker">
        <div class="argon-c2d20-skillpicker-row">
          <label for="argon-c2d20-skill-key">${game.i18n.localize("ARGONC2D20.SkillPicker.Field.Skill")}</label>
          <select id="argon-c2d20-skill-key" name="skillKey">${options}</select>
        </div>
      </div>
    `,
    ok: {
      label: game.i18n.localize("ARGONC2D20.SkillPicker.Button.Open"),
      callback: (_event, button) => button.form?.elements?.skillKey?.value ?? null
    },
    rejectClose: false,
    modal: true
  });

  if (!selectedSkill) return false;
  return executeSystemSkillRoll(actor, selectedSkill, 0);
}

export async function executeSystemWeaponAttack(actor, itemId) {
  if (!actor || !itemId) return false;

  if (typeof actor._executeAttack === "function") {
    await actor._executeAttack(itemId);
    return true;
  }

  const item = actor.items.get(itemId);
  if (!item) return false;

  if (typeof item.roll === "function") {
    await item.roll();
    return true;
  }

  const fn = actor?.rollWeapon ?? actor?.rollAttack ?? null;
  if (typeof fn === "function") {
    await fn.call(actor, item);
    return true;
  }

  item.sheet?.render(true);
  return false;
}

function getTargetedActors(excludeActor = null) {
  const targets = Array.from(game.user?.targets ?? []);
  return targets
    .map((token) => token?.actor ?? null)
    .filter((actor) => actor && actor.id !== excludeActor?.id);
}

async function promptModeSelection({ title, fieldLabel, options, buttonLabel }) {
  const DialogV2 = getDialogV2();
  const selectOptions = options
    .map((option) => `<option value="${option.value}">${option.label}</option>`)
    .join("");

  return DialogV2.prompt({
    window: { title },
    content: `
      <div class="argon-c2d20-skillpicker">
        <div class="argon-c2d20-skillpicker-row">
          <label for="argon-c2d20-generic-mode">${fieldLabel}</label>
          <select id="argon-c2d20-generic-mode" name="selectedValue">${selectOptions}</select>
        </div>
      </div>
    `,
    ok: {
      label: buttonLabel,
      callback: (_event, button) => button.form?.elements?.selectedValue?.value ?? null
    },
    rejectClose: false,
    modal: true
  });
}

async function promptAssistOrExploit(actor, {
  title,
  targetLabel,
  skillLabel,
  buttonLabel,
  targets,
  defaultSkillKey = "obs"
} = {}) {
  const skillEntries = getActorSkillEntries(actor);
  if (!skillEntries.length) {
    ui.notifications?.warn(game.i18n.localize("ARGONC2D20.SkillPicker.Error.NoSkills"));
    return null;
  }

  const targetOptions = sortByName(
    targets.map((targetActor) => ({ value: targetActor.id, label: targetActor.name })),
    "label"
  ).map((entry) => `<option value="${entry.value}">${entry.label}</option>`).join("");

  const skillOptions = skillEntries.map((entry) => {
    const selected = entry.key === defaultSkillKey ? " selected" : "";
    return `<option value="${entry.key}"${selected}>${entry.label}</option>`;
  }).join("");

  const DialogV2 = getDialogV2();

  return DialogV2.prompt({
    window: { title },
    content: `
      <div class="argon-c2d20-skillpicker">
        <div class="argon-c2d20-skillpicker-row">
          <label for="argon-c2d20-target-actor">${targetLabel}</label>
          <select id="argon-c2d20-target-actor" name="targetActorId">${targetOptions}</select>
        </div>
        <div class="argon-c2d20-skillpicker-row">
          <label for="argon-c2d20-skill-key">${skillLabel}</label>
          <select id="argon-c2d20-skill-key" name="skillKey">${skillOptions}</select>
        </div>
      </div>
    `,
    ok: {
      label: buttonLabel,
      callback: (_event, button) => ({
        targetActorId: button.form?.elements?.targetActorId?.value ?? null,
        skillKey: button.form?.elements?.skillKey?.value ?? null
      })
    },
    rejectClose: false,
    modal: true
  });
}

export async function openRecoverDialog(actor) {
  if (!actor) return false;

  const mode = await promptModeSelection({
    title: game.i18n.localize("ARGONC2D20.RecoverPicker.Title"),
    fieldLabel: game.i18n.localize("ARGONC2D20.RecoverPicker.Field.Mode"),
    buttonLabel: game.i18n.localize("ARGONC2D20.RecoverPicker.Button.Open"),
    options: [
      { value: "physical", label: game.i18n.localize("ARGONC2D20.RecoverPicker.Mode.Physical") },
      { value: "mental", label: game.i18n.localize("ARGONC2D20.RecoverPicker.Mode.Mental") }
    ]
  });

  if (!mode) return false;

  const skillKey = mode === "mental" ? "dis" : "res";
  const opened = await executeSystemSkillRoll(actor, skillKey, 0);
  if (!opened) return false;

  await postWorkflowMessage(
    actor,
    "ARGONC2D20.Action.Recover",
    "ARGONC2D20.RecoverPicker.Chat.Launched",
    {
      mode: game.i18n.localize(
        mode === "mental"
          ? "ARGONC2D20.RecoverPicker.Mode.Mental"
          : "ARGONC2D20.RecoverPicker.Mode.Physical"
      ),
      skill: getSkillLabel(actor, skillKey, actor?.system?.skills?.[skillKey])
    }
  );

  return true;
}

export async function openTreatmentDialog(actor) {
  if (!actor) return false;

  const targets = getTargetedActors(actor);
  if (!targets.length) {
    ui.notifications?.warn(game.i18n.localize("ARGONC2D20.TreatmentPicker.Error.NoTarget"));
    return false;
  }

  const result = await promptAssistOrExploit(actor, {
    title: game.i18n.localize("ARGONC2D20.TreatmentPicker.Title"),
    targetLabel: game.i18n.localize("ARGONC2D20.TreatmentPicker.Field.Target"),
    skillLabel: game.i18n.localize("ARGONC2D20.TreatmentPicker.Field.Mode"),
    buttonLabel: game.i18n.localize("ARGONC2D20.TreatmentPicker.Button.Open"),
    targets,
    defaultSkillKey: "hea"
  });

  if (!result?.targetActorId) return false;

  const DialogV2 = getDialogV2();
  const mode = await DialogV2.prompt({
    window: { title: game.i18n.localize("ARGONC2D20.TreatmentPicker.Title") },
    content: `
      <div class="argon-c2d20-skillpicker">
        <div class="argon-c2d20-skillpicker-row">
          <label for="argon-c2d20-treatment-mode">${game.i18n.localize("ARGONC2D20.TreatmentPicker.Field.Mode")}</label>
          <select id="argon-c2d20-treatment-mode" name="treatmentMode">
            <option value="physical">${game.i18n.localize("ARGONC2D20.TreatmentPicker.Mode.Physical")}</option>
            <option value="mental">${game.i18n.localize("ARGONC2D20.TreatmentPicker.Mode.Mental")}</option>
          </select>
        </div>
      </div>
    `,
    ok: {
      label: game.i18n.localize("ARGONC2D20.TreatmentPicker.Button.Open"),
      callback: (_event, button) => button.form?.elements?.treatmentMode?.value ?? null
    },
    rejectClose: false,
    modal: true
  });

  if (!mode) return false;

  const targetActor = targets.find((candidate) => candidate.id === result.targetActorId) ?? null;
  if (!targetActor) return false;

  const skillKey = mode === "mental" ? "cou" : "hea";
  const opened = await executeSystemSkillRoll(actor, skillKey, 0);
  if (!opened) return false;

  await postWorkflowMessage(
    actor,
    "ARGONC2D20.Action.Treatment",
    "ARGONC2D20.TreatmentPicker.Chat.Launched",
    {
      target: targetActor.name,
      mode: game.i18n.localize(
        mode === "mental"
          ? "ARGONC2D20.TreatmentPicker.Mode.Mental"
          : "ARGONC2D20.TreatmentPicker.Mode.Physical"
      ),
      skill: getSkillLabel(actor, skillKey, actor?.system?.skills?.[skillKey])
    }
  );

  return true;
}

export async function openAssistDialog(actor) {
  if (!actor) return false;

  const targets = getTargetedActors(actor);
  if (!targets.length) {
    ui.notifications?.warn(game.i18n.localize("ARGONC2D20.AssistPicker.Error.NoTarget"));
    return false;
  }

  const result = await promptAssistOrExploit(actor, {
    title: game.i18n.localize("ARGONC2D20.AssistPicker.Title"),
    targetLabel: game.i18n.localize("ARGONC2D20.AssistPicker.Field.Target"),
    skillLabel: game.i18n.localize("ARGONC2D20.AssistPicker.Field.Skill"),
    buttonLabel: game.i18n.localize("ARGONC2D20.AssistPicker.Button.Open"),
    targets,
    defaultSkillKey: "obs"
  });

  if (!result?.targetActorId || !result?.skillKey) return false;

  const targetActor = targets.find((candidate) => candidate.id === result.targetActorId) ?? null;
  if (!targetActor) return false;

  const opened = await executeSystemSkillRoll(actor, result.skillKey, 0);
  if (!opened) return false;

  await postWorkflowMessage(
    actor,
    "ARGONC2D20.Action.Assist",
    "ARGONC2D20.AssistPicker.Chat.Launched",
    {
      target: targetActor.name,
      skill: getSkillLabel(actor, result.skillKey, actor?.system?.skills?.[result.skillKey])
    }
  );

  return true;
}

export async function openExploitDialog(actor) {
  if (!actor) return false;

  const targets = getTargetedActors(actor, null);
  if (!targets.length) {
    ui.notifications?.warn(game.i18n.localize("ARGONC2D20.ExploitPicker.Error.NoTarget"));
    return false;
  }

  const result = await promptAssistOrExploit(actor, {
    title: game.i18n.localize("ARGONC2D20.ExploitPicker.Title"),
    targetLabel: game.i18n.localize("ARGONC2D20.ExploitPicker.Field.Target"),
    skillLabel: game.i18n.localize("ARGONC2D20.ExploitPicker.Field.Skill"),
    buttonLabel: game.i18n.localize("ARGONC2D20.ExploitPicker.Button.Open"),
    targets,
    defaultSkillKey: "obs"
  });

  if (!result?.targetActorId || !result?.skillKey) return false;

  const targetActor = targets.find((candidate) => candidate.id === result.targetActorId) ?? null;
  if (!targetActor) return false;

  const opened = await executeSystemSkillRoll(actor, result.skillKey, 0);
  if (!opened) return false;

  await postWorkflowMessage(
    actor,
    "ARGONC2D20.Action.Exploit",
    "ARGONC2D20.ExploitPicker.Chat.Launched",
    {
      target: targetActor.name,
      skill: getSkillLabel(actor, result.skillKey, actor?.system?.skills?.[result.skillKey])
    }
  );

  return true;
}