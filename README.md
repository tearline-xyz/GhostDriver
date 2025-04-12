# GhostDriver

![alt](./docs/assets/1744255615072.png)

This project aims to enable users to describe tasks in natural language, which are then analyzed by AI to control the browser for automated execution.

## Installation

1. Download ZIP file from the release page.

2. Install the extension in the Chrome browser:

    - Go to `chrome://extensions` in the browser to open the Chrome Extensions Management page.
    - If a GhostDriver was installed, remove it first.
    - Enable "Developer mode".
    - Drag and drop the previously downloaded ZIP file into the Extensions Management window.

## Development

1. Build the playwright-crx:
    `./auto/build-playwright-crx.sh`

    > This extension project depends on [ruifigueira/playwright-crx](https://github.com/ruifigueira/playwright-crx), which we have modified to support WebSocket communication with the backend. The modified version can be found at the `tearline` branch of [tearline-xyz/playwright-crx](https://github.com/tearline-xyz/playwright-crx).

2. `pnpm dev`

## [Publishing](https://wxt.dev/guide/essentials/publishing.html)

1. Update the `version` in `package.json`.
2. Run `pnpm zip` to generate a zip file with the version number in the `dist` directory.
