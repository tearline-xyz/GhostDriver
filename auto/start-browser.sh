#!/bin/bash -e

if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "This script only supports macOS"
    exit 1
fi

if [ "$1" == "brave" ]; then
    # MetaMask Extension: ${HOME}/Library/Application Support/BraveSoftware/Brave-Browser/Profile 1/Extensions/nkbihfbeogaeaoehlefnkodbefgpgknn/12.12.0_0
    /Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser --remote-debugging-port=9222
elif [ "$1" == "chromium" ]; then
    # MetaMask Extension: ${HOME}/Library/Application Support/Chromium/Default/Extensions/kkhbbfbibkodedkjdpfedmimkkblamop/12.12.0_0
    ${HOME}/Library/Caches/ms-playwright/chromium-1155/chrome-mac/Chromium.app/Contents/MacOS/Chromium --remote-debugging-port=9222 --no-first-run --disable-session-crashed-bubble
	# --proxy-server=http://localhost:7890
else
    echo "Usage: $0 {brave|chromium}"
    exit 1
fi
