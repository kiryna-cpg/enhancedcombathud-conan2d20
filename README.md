# Argon - Combat HUD (Conan 2d20)

A lightweight **Argon HUD companion** for **Foundry VTT** and **Robert E. Howard’s Conan: Adventures in an Age Undreamed Of**.

This module keeps the **action economy inside Argon**, launches the **native Conan system dialogs and rollers**, and adds Conan-specific HUD behavior for weapon sets, NPC attacks, Threaten, Ready, Brace, and combat resources.

## What it does

- Adds a Conan-aware **Argon Combat HUD** for PCs and NPCs.
- Keeps **action economy management inside Argon**.
- Launches **native Conan system workflows** for:
  - melee / ranged attacks
  - Threaten
  - Skill Test
  - Recover
  - Treatment
  - Assist
  - Exploit
- Supports **weapon sets** inside Argon.
- Supports **NPC attacks** from real Conan NPC attack items.
- Supports **Ready** and **Brace** state tracking in the HUD.
- Supports **Sprint** and **Withdraw** as declarative HUD actions.
- Supports optional **movement economy** for Sprint / Withdraw.
- Supports **Inventory** access from the Minor panel.
- Supports **Momentum / Doom** resource workflows.
- Works in **English** and **Spanish**.

## Scope

This module is focused on the **Argon-side combat HUD experience** for Conan 2d20.

It is **not**:
- a replacement for the Conan system sheets or native dialogs
- a full combat automation engine
- a full abstract-zones / positioning module
- a replacement for `conan2d20-miniqol`

The intended split is:
- **Argon HUD** handles the visible combat action economy and combat buttons
- **Mini QoL** can handle deeper combat automation where desired

## Main features

### Native action launchers
Argon buttons call Conan’s native dialogs and roll flows instead of duplicating them.

Current supported native launches:
- Attack
- Threaten
- Skill Test
- Recover
- Treatment
- Assist
- Exploit

### Conan action economy in Argon
The HUD tracks Conan-flavoured combat actions and invalid states directly in Argon.

Included standard actions and helpers currently cover:
- Attack
- Threaten
- Ready
- Brace
- Exploit
- Recover
- Assist
- Treatment
- Sprint
- Withdraw
- Reset Actions

Invalid buttons are shown with a dark warning state and still explain why they cannot currently be used.

### Weapon sets, dual wield, and shields
Argon weapon sets are Conan-aware.

Current behavior:
- the active set determines the primary attack source
- a valid secondary weapon or shield can appear as a second attack button
- NPC weapon sets can use real `npcattack` items
- changing weapon set refreshes the active attack state in the HUD

### NPC support
NPCs are not limited to PC weapon logic.

The module can:
- read real NPC attack entries
- use those attacks directly from Argon
- support NPC Threaten entries
- support NPC Brace when the active attack is Unwieldy

### Ready and Brace
- **Ready** stores a prepared action in the HUD and lets you execute it later.
- **Brace** stores the braced state for the active Unwieldy weapon in the HUD.

These are tracked as Argon tactical states so they survive normal HUD refreshes and remain visible during combat.

### Sprint / Withdraw
Sprint and Withdraw are implemented as declarative Argon actions.

They:
- consume the relevant Argon action economy
- post the reminder/declaration to chat
- can optionally also consume the round’s movement allowance if that setting is enabled

## Recommended settings

World Settings → **Argon - Combat HUD (Conan 2d20)**

Suggested baseline:
- **Enable Stress Bonus Dice**: ON
- **Enable Momentum Bonus Dice**: ON
- **Enable Doom Bonus Dice**: ON
- **Assist Mode**: Normal rule
- **Movement Economy**: Disabled unless your table wants Sprint / Withdraw to spend movement in Argon
- **Show Doom to players**: table preference

## Requirements

- **Foundry VTT**: `13.351`
- **Conan 2d20 system**: `2.4.3`
- **Enhanced Combat HUD / Argon**: required

## Installation

1. Foundry → **Add-on Modules** → **Install Module**
2. Paste this manifest URL:

   `https://raw.githubusercontent.com/kiryna-cpg/enhancedcombathud-conan2d20/main/module.json`

3. Install the module
4. Enable **Argon - Combat HUD (Conan 2d20)** in your world
5. **Reload Application**

## Current status

Release `0.2.0` is the first release-focused milestone for the Conan Argon companion.

Included in this milestone:
- stable Conan HUD foundation for Argon
- native action launchers
- Threaten and NPC attack support
- Ready / Brace state handling
- Sprint / Withdraw support
- Assist mode and movement-economy settings
- initial dual-wield / shield-aware weapon-set behavior

Still intentionally left for later phases:
- deeper Assist automation
- Recover / Treatment Apply/Undo workflows
- more inventory polish
- broader interaction with future positioning / zones tooling

## Support

- Issues: https://github.com/kiryna-cpg/enhancedcombathud-conan2d20/issues
- Repo: https://github.com/kiryna-cpg/enhancedcombathud-conan2d20

## License

MIT. See `LICENSE`.
