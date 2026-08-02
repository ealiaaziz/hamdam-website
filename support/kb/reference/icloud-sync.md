---
id: icloud-sync
title: iCloud sync
source: src/pages/privacy.astro section 1.4
---
Sync requires a Hamdam Plus subscription. On the free tier nothing is written
to iCloud at all and data stays on the device.

With Plus and sync enabled, journal entries, the streak counter and settings
move between that person's own devices through Apple's CloudKit private
database, scoped to their Apple ID. Hamdam runs no servers that receive this
data, so there is no copy on Hamdam's side to recover from.

If someone deletes their iCloud data or signs out of iCloud, the synced Hamdam
data goes with it.

Sync problems are usually one of: no Plus subscription, the device not signed
in to iCloud, or iCloud Drive turned off for Hamdam in iPhone Settings.
