# Litehous

**A focus timer and task tracker dressed up as a lighthouse you have to keep lit.**

## Short description (for an "About" section)

Litehous turns focus sessions and daily tasks into the job of a lighthouse keeper. Every focus session you complete burns oil and lights the beam; every task you check off logs an entry in the keeper's book. Keep at it night after night and your streak grows, your oil banks up, and you're promoted from Cadet Keeper toward Keeper of the Old Light — with the beam's color changing at each new rank.

## Full description (for a README)

Litehous is a lightweight productivity app built around a single idea: focus and follow-through should feel like tending something, not just checking a box.

- **Timer, not a to-do list you can ignore.** Pick a 25, 45, or 60-minute watch and light the lamp. The beam sweeps while you work, dims when paused, and pulses with a chime when the watch is complete.
- **Tasks as logbook entries.** Add what needs doing, check items off (earns oil), double-click to edit, and archive completed entries so the list doesn't grow forever.
- **Streaks that mean something.** Do at least one focus session or task a day and the light stays lit; miss a full day and the streak resets. A 28-day dot grid shows exactly which days you were active.
- **Keeper rank with a visible payoff.** Oil accumulates into rank, from Cadet Keeper up through Keeper, Senior Keeper, Harbor Master, Beacon Master, and Keeper of the Old Light — and the beam, glow, and progress bar all shift to that rank's color.
- **Built-in guidance.** A dismissible "how this works" panel explains oil, streaks, and rank on first use.
- **Persistent.** Progress is saved automatically and is there the next time you open it.
- **Responsive.** The layout stacks to a single column on narrow screens.

Built as a single-file React component, styled with a custom navy palette (accent color shifts by rank) and Fraunces + Public Sans typography — no external state libraries, no backend.

## How it works

| Action | Reward |
|---|---|
| Complete a focus session | Oil equal to the session length in minutes (25/45/60) |
| Check off a task | +15 oil |
| Active on a session or task | Counts toward that day's streak |

## Interaction notes

- **Reset** requires a second confirming tap once a watch is in progress, so accidental taps don't lose progress.
- **Double-click** a pending task to edit its text inline.
- **Archive completed** clears checked-off tasks from the visible list and keeps a running archived count.

## Possible future additions

- Break timers between focus sessions
- A full history view of archived logbook entries
- Adjustable oil rewards / rank thresholds
