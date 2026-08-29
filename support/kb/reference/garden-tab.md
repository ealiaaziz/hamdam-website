---
id: garden-tab
title: The Garden tab, and the picks inside it
source: FACTS.md "The Garden"; src/pages/privacy.astro section 1.6 for the network behaviour
---
What was called Discover is now the Garden. Version 1.3 renamed it and grew it,
so a requester on 1.3 or later has a Garden tab and one on an older version has
a Discover tab. Both are the same place.

The Garden holds four things:

Three coaches, for mind, movement and sleep, which turn the day's line into a
plan by reading Health, the calendar and the weather.

A garden bed for habits, where someone plants one small thing, says when it
happens and what they will do on the day it does not.

A daily riddle.

The picks, which were the whole of the old Discover tab and are still here.

The picks refresh once a day with books and podcasts from Apple's public
catalogue, through the iTunes Search API. Those requests go from the device
straight to Apple. They never pass through a Hamdam server, and no identifier
tied to the person is sent with them. Because it refreshes daily, "the
recommendations have not changed" is expected within a single day.

The rest of the Garden makes no network requests at all. The coaches, the habit
bed and the riddle read Health, the calendar and the weather through Apple
frameworks on the device, so nothing about them leaves the phone.

Some of the Garden's depth is part of Hamdam Plus rather than the free tier, so
"I cannot open that" may be a subscription answer rather than a fault. Check
`buying-plus.md` before treating it as a bug.
