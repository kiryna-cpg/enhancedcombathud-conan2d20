# Argon - Combat HUD (Conan 2d20)

Argon - Combat HUD (Conan 2d20) is a companion module for **Argon - Combat HUD (CORE)** and the Conan 2d20 system.

It adds Conan-aware action buttons, resources, and combat workflows to Argon while preserving the native Conan roll dialogs and actor data.

## v14 status

- Foundry VTT: **v14**
- Conan 2d20 system: **2.5.0**
- Argon / Enhanced Combat HUD Core: **5.0.0**
- Languages: English and Spanish

## Main features

- Native Conan launchers from Argon for attacks and common actions.
- PC weapon and shield support in the Argon attack area.
- NPC attack support using real Conan `npcattack` items.
- Threaten support.
- Skill Test, Recover, Treatment, Assist, and Exploit actions.
- Ready and Brace tactical states reflected in the HUD.
- Sprint and Withdraw action declarations.
- Optional Stress, Momentum, and Doom bonus dice helpers.
- Optional movement economy setting for Sprint / Withdraw.

## Requirements

- Foundry VTT: `14`
- Conan 2d20 system: `2.5.0`
- Argon - Combat HUD (CORE): `5.0.0`

## Installation

Install with this manifest URL:

```txt
https://raw.githubusercontent.com/kiryna-cpg/enhancedcombathud-conan2d20/main/module.json
```

Enable both modules in the world:

- Argon - Combat HUD (CORE)
- Argon - Combat HUD (Conan 2d20)

## Recommended settings

World Settings → **Argon - Combat HUD (Conan 2d20)**

Suggested baseline:

- **Enable Stress Bonus Dice**: ON
- **Enable Momentum Bonus Dice**: ON
- **Enable Doom Bonus Dice**: ON
- **Assist Mode**: Normal rule
- **Movement Economy**: Disabled unless your table wants Sprint / Withdraw to spend movement in Argon
- **Show Doom to players**: table preference

## Support

Report issues at:

```txt
https://github.com/kiryna-cpg/enhancedcombathud-conan2d20/issues
```

Include Foundry version, Conan system version, Argon Core version, selected actor type, active combat state, reproduction steps, and console logs.

## License

MIT.
