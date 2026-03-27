# Changelog
All notable changes to this project will be documented in this file.

This project follows a lightweight versioning style.

## [Unreleased]
### Planned
- Swift Action / second-standard-action handling for dual wield flows.
- Deeper Assist automation.
- Recover / Treatment Apply/Undo integration.
- Additional inventory polish.

---

## [0.2.0] - Current
### Added
- First release-facing documentation set for the module.
- Native Conan system launchers from Argon for:
  - melee / ranged attacks
  - Threaten
  - Skill Test
  - Recover
  - Treatment
  - Assist
  - Exploit
- Real NPC attack support using Conan NPC attack items.
- Threaten support based on real Conan attack sources instead of a fragile hardcoded item-name lookup.
- Ready workflow support with stored readied action state in the HUD.
- Brace workflow support for active Unwieldy weapons.
- Declarative Sprint / Withdraw actions with chat messaging.
- World settings for:
  - Assist mode
  - movement economy for Sprint / Withdraw
- Initial dual-wield / shield-aware weapon-set handling in the Argon attack area.
- English and Spanish release-ready strings for the new HUD actions and settings.
- README and CHANGELOG files for release packaging.

### Changed
- Promoted the module to **0.2.0** as the first release-focused milestone.
- Clarified module metadata for GitHub-based installation by adding repository, manifest, download, and issues URLs.
- Kept the Conan action economy inside Argon instead of delegating HUD actions to Mini QoL.
- Reworked attack-source resolution so PCs and NPCs use Conan-appropriate sources.
- Reworked Threaten so it is modeled as a real Conan action source instead of a hardcoded special case.
- Reworked Ready and Brace to use persistent tactical state reflected directly in the HUD.
- Reworked Sprint / Withdraw so they behave as proper Argon actions instead of inert placeholders.
- Reworked weapon-set handling so the active set drives the primary attack source and can expose a valid secondary attack source.
- Shortened and reorganized the README for a more user-friendly release presentation.

### Fixed
- Fixed NPC attacks always falling back to the first attack instead of respecting the active weapon set.
- Fixed Argon movement HUD crashes caused by a getter-only `movementUsed` implementation.
- Fixed Sprint / Withdraw chat messages showing `undefined` instead of the actor name.
- Fixed missing i18n text for new Assist / movement settings.
- Fixed Ready armed state appearing as invalid instead of as an armed state.
- Fixed the Ready execution confirmation dialog using the wrong i18n path.
- Fixed weapon-set regressions affecting active-set behavior on PCs.
- Fixed repeated HUD refresh behavior that caused Argon to shift left and right continuously after weapon-set updates.

### UX
- Invalid actions remain visible in Argon and explain why they are unavailable.
- Armed Ready / Brace states are now visually distinct in the HUD.
- Secondary weapon / shield attacks can be surfaced directly from the active weapon set.

---

## [0.1.0]
### Added
- Initial public milestone for the Conan Argon companion module.
- Conan-aware Argon provider, settings, resources, and baseline action buttons.

---

## Versioning notes
- `v0.1.x`: foundation and phased Conan HUD implementation
- `v0.2.x`: release-oriented Conan Argon milestone
- future releases: broader action economy extensions, deeper automation, and richer weapon-set / combat-state handling
