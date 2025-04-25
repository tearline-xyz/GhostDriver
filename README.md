# GhostDriver

![alt](./docs/assets/1744255615072.png)

This project aims to enable users to describe tasks in natural language, which are then analyzed by AI to control the browser for automated execution.

## Features

- Connect your browser with Tearline AI agents.
- Out of the box. No additional dependencies required. No LLM API key needed.
- Your data, your control.

## Installation

1. Download ZIP file from the [release page](https://github.com/tearline-xyz/GhostDriver/releases).

2. Install the extension in the Chrome browser:

    - Go to `chrome://extensions` in the browser to open the Chrome Extensions Management page.
    - If a GhostDriver was installed, remove it first.
    - Enable "Developer mode".
    - Drag and drop the previously downloaded ZIP file into the Extensions Management window.

## Development

> [!IMPORTANT]
> Please set `WXT_APP_ENV` environment variable when executing any `pnpm` commands. The value can be `development`, `test`, or `production`. For example: `WXT_APP_ENV=development pnpm dev`

1. Build the playwright-crx:
    `./auto/build-playwright-crx.sh`

    > This extension project depends on [ruifigueira/playwright-crx](https://github.com/ruifigueira/playwright-crx), which we have modified to support WebSocket communication with the backend. The modified version can be found at the `tearline` branch of [tearline-xyz/playwright-crx](https://github.com/tearline-xyz/playwright-crx).

2. `pnpm dev`

## [Packaging](https://wxt.dev/guide/essentials/publishing.html)

1. Update the `version` in `package.json`.
2. Run `pnpm zip` to generate a zip file with the version number in the `dist` directory.

## Publishing

1. Create a git tag pointing to the corresponding commit:
    ```bash
    VERSION_TAG=1.0.0-beta.1
    GIT_COMMIT=105611016b04c66382c9df0f91c6ecc340d2f554
    git tag -a $VERSION_TAG $GIT_COMMIT -m "Release $VERSION_TAG"
    ```
2. Push the tag to GitHub:
    ```bash
    git push origin $VERSION_TAG
    ```
3. Reference the tag when creating a new release on GitHub.

## Release policy

e.g.

```
1.0.0-alpha.1    (First internal alpha)
1.0.0-alpha.2    (Internal alpha iteration)
...
1.0.0-alpha.n    (Last internal alpha)

1.0.0-beta.1     (First external beta)
1.0.0-beta.2     (External beta iteration)
...
1.0.0-beta.n     (Last external beta)

1.0.0-rc.1       (Optional: First release candidate)
1.0.0-rc.2       (Optional: Release candidate iteration)
...

1.0.0            (Official release)
```
