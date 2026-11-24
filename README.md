# Profile Sidebar

**Know which account you are using.** A compact profile row below Settings shows the active account and subscription plan, with a menu for everyday account actions.

By [Nikolos89](https://github.com/nikolos89). Independent community project; not affiliated with or endorsed by Google.

## What it does

- Shows your current name and the plan reported by Antigravity itself.
- Displays five-hour usage in the outer blue ring and weekly usage in the inner purple ring. Both update roughly every ten seconds while the window is visible.
- Opens usage details with percentages and reset times when available, plus a shortcut to the native limits page.
- Opens Settings, Account and plan, and the native HTTPS upgrade destination when one is available.
- Asks for confirmation before using the application's native sign-out action.
- Opens the companion's switch or add flow when Account Switcher is enabled and ready.
- Supports keyboard menu navigation, focus handling and reduced motion using the host's theme.

An unknown plan is shown as loading rather than guessed as Free. Identity is cleared when the host reports a signed-out state. Upgrade opens the provider's page; the plugin does not purchase a subscription.

## Better together

[Account Switcher](https://github.com/nikolos89/account-switcher) saves encrypted Windows account profiles and switches from a vertical list with a confirmed app restart. Profile Sidebar shows the active account, plan and usage, with **Switch account** and **Add account** shortcuts to the companion panel.

Without Account Switcher, the profile and native account menu remain available; switch and add entries are hidden. Adding an account opens instructions for the normal Google sign-in flow.

## Read before installing: experimental native UI integration

This is **1.1.3-beta.1**, limited to **Windows, Antigravity App 2.34.0 and an already active custom web bundle override**.

The public sidecar API provides auxiliary panels, but this exact footer placement currently uses an **unsupported, version-specific native UI hook**. A stock Antigravity installation does not provide the required custom bundle. **Installing this plugin through a plugin manager alone does not insert the footer.** The installer refuses to proceed when the bundle or expected anchors are absent. It does not modify app.asar or create a custom-bundle override.

The original local installation's profile row and native settings/account actions were exercised on 2.34.0. The redistributed English package has synthetic component tests. Compatibility with clean stock installations, future App versions and Marketplace acceptance is **not established**. This limitation must be disclosed during review; a passing manifest validator is not approval of native UI modifications.

## Install on a compatible custom-bundle setup

You need Node.js 22+ and your own active, writable web bundle. The default expected path is **%LOCALAPPDATA%/Programs/Antigravity/resources/web_bundle_ru**. For another location set **PROFILE_SIDEBAR_BUNDLE** to its absolute path; the application must already be configured to serve that bundle.

Download the [Profile Sidebar release ZIP](https://github.com/nikolos89/profile-sidebar/releases/tag/v1.1.3-beta.1) and extract it into its own folder. To update an existing public beta, first run its original installer with **--restore**, then uninstall the old Profile Sidebar package in Customizations. Close Antigravity and run from the new extracted folder:

~~~powershell
node install.mjs --stage C:\Temp\profile-sidebar-preview
node --check C:\Temp\profile-sidebar-preview\main.js
node install.mjs --install
~~~

The stage step writes a compatibility preview to the supplied folder and does not install it. Keep that folder outside the plugin payload. If any check fails, stop and report the error rather than replacing compatibility anchors manually.

Reopen Antigravity and enable Profile Sidebar in Customizations. Existing customizations are preserved by exact-anchor checks and backups, but an App update may replace the bundle and remove the footer. Updates require a fresh compatibility review; do not automatically reapply a patch to an unknown version.

## Disable, rollback and remove

Disabling Profile Sidebar hides the row. To restore the original native bundle, close Antigravity yourself and run from the installed plugin folder or original release folder:

~~~powershell
node install.mjs --restore
~~~

Backups and installation hashes live under **~/.gemini/antigravity/plugin_data/profile-sidebar**. Automatic restore refuses to overwrite a bundle changed after installation. Then uninstall the plugin in Customizations if desired. The current sign-in and Account Switcher profiles are retained.

## Privacy and resources

This module reads the profile and plan from the application's in-memory state. It uses the host's own usage service to calculate the consumed percentage for the model or quota group shown in Antigravity. A ring whose quota data is missing stays unfilled. The module adds no server or background process. Sign-out uses the native application action after confirmation. Account Switcher has its own documented local sidecar and encrypted vault.

## Support and review

Use [GitHub Issues](https://github.com/nikolos89/profile-sidebar/issues) with the App version and a redacted description. Do not upload native Google bundles, private backups or account details. Only this project's original source is included; the host application and its SDK are not redistributed.

Run **agy plugin validate --strict .** for manifest and component checks. A Marketplace submission additionally needs review of the unsupported footer hook; no listing or approval is promised. See [CHANGELOG](CHANGELOG.md) and [SECURITY](SECURITY.md). Licensed under [MIT](LICENSE).
