function getTrackerInput(type) {
  if (type === "momentum") {
    return document.querySelector(
      "input.input-momentum[data-type='momentum'], input[data-type='momentum'], input[name='momentum']"
    );
  }

  if (type === "doom") {
    return document.querySelector(
      "input.input-doom[data-type='doom'], input[data-type='doom'], input[name='doom']"
    );
  }

  return null;
}

function normalizePoolValue(value) {
  const parsed = Number.parseInt(String(value ?? 0), 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function readMomentumPool() {
  const input = getTrackerInput("momentum");
  return normalizePoolValue(input?.value);
}

export function readDoomPool() {
  const input = getTrackerInput("doom");
  return normalizePoolValue(input?.value);
}

export function hasPoolTracker(type) {
  return !!getTrackerInput(type);
}

export function setMomentumPool(value) {
  const input = getTrackerInput("momentum");
  if (!input) return false;

  input.value = String(normalizePoolValue(value));
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

export function setDoomPool(value) {
  const input = getTrackerInput("doom");
  if (!input) return false;

  input.value = String(normalizePoolValue(value));
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}