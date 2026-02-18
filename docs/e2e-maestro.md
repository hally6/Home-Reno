# Maestro E2E

## Prerequisites

- Install Maestro CLI: `curl -Ls "https://get.maestro.mobile.dev" | bash`
- Run a simulator/emulator or connected device.
- Launch the app (`npm run android` or `npm run ios`).

## Run Smoke Flow

```bash
maestro test .maestro/smoke.yaml
```

The smoke flow covers tab navigation and key entry screens.

## Run Expanded Core Flows

```bash
maestro test .maestro/core-flows.yaml
```

The core flow adds search interaction and settings/theme coverage on top of smoke checks.
