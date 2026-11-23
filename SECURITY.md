# Security and privacy

This is a community beta. Report security concerns without including credentials, sign-in snapshots, account identifiers or unredacted logs. Public issues are suitable for a redacted description only; arrange a private disclosure channel before sharing sensitive material.

No telemetry or external identity upload is implemented. Follow the compatibility and storage restrictions in README.md. Review executable paths before installing. A manifest validation result does not establish the security or support status of the host's private APIs.

The footer hook uses private host symbols and only runs on the specifically checked bundle. Host updates can invalidate it. This module reads native in-memory profile state; it does not implement a separate authentication system.
