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

### playwright-crx

This extension project depends on [ruifigueira/playwright-crx](https://github.com/ruifigueira/playwright-crx), which we have modified to support WebSocket communication with the backend. The modified version can be found at [tearline-xyz/playwright-crx](https://github.com/tearline-xyz/playwright-crx). During development, whether initializing the project or making further modifications to playwright-crx, execute the following command in the root directory of this project:

```bash
./auto/build-playwright-crx.sh
```

Additionally, if modifications are made to playwright-crx, ensure you are on the `tearline` branch, and do not forget to create a PR for this.

## [Publishing](https://wxt.dev/guide/essentials/publishing.html)

1. Update the `version` field in `package.json`.
2. Run `pnpm zip` to generate a zip file with the version number in the `dist` directory.
