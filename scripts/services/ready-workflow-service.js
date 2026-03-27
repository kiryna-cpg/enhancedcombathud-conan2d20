export async function openReadyDialog({ choices = [] } = {}) {
  if (!choices.length) {
    ui.notifications?.warn(game.i18n.localize("ARGONC2D20.ReadyPicker.Error.NoChoices"));
    return null;
  }

  const options = choices
    .map((choice) => `<option value="${choice.id}">${choice.label}</option>`)
    .join("");

  const DialogV2 = foundry.applications.api.DialogV2;

  return DialogV2.prompt({
    window: { title: game.i18n.localize("ARGONC2D20.ReadyPicker.Title") },
    content: `
      <div class="argon-c2d20-skillpicker argon-c2d20-readypicker">
        <div class="argon-c2d20-skillpicker-row">
          <label for="argon-c2d20-ready-action">${game.i18n.localize("ARGONC2D20.ReadyPicker.Field.Action")}</label>
          <select id="argon-c2d20-ready-action" name="actionId">${options}</select>
        </div>
        <div class="argon-c2d20-skillpicker-row">
          <label for="argon-c2d20-ready-trigger">${game.i18n.localize("ARGONC2D20.ReadyPicker.Field.Trigger")}</label>
          <textarea id="argon-c2d20-ready-trigger" name="triggerText" rows="3"></textarea>
        </div>
      </div>
    `,
    ok: {
      label: game.i18n.localize("ARGONC2D20.ReadyPicker.Button.Ready"),
      callback: (_event, button) => {
        const actionId = button.form?.elements?.actionId?.value ?? null;
        const triggerText = String(button.form?.elements?.triggerText?.value ?? "").trim();
        const selected = choices.find((choice) => choice.id === actionId) ?? null;

        if (!selected) return null;

        return {
          actionId: selected.id,
          actionLabel: selected.label,
          triggerText
        };
      }
    },
    rejectClose: false,
    modal: true
  });
}