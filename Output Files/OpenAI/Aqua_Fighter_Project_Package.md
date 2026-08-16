## Conversation and Critique

### Chat History

**1. ai:**
Hello! I'm the Concierge for Dev Doctor AI. To get started, what is the official name for this project?

**2. user:**
Aqua Fighter

**3. ai:**
“Aqua Fighter” is a strong, splashy name with instant action-game energy! Should I lock **Aqua Fighter** in as the official project name?

**4. user:**
Yes, lock in **Aqua Fighter** as the official project name.

**5. ai:**
Aqua Fighter is locked in—what an awesome, high-energy name! What should players do moment to moment: duel rivals, explore underwater arenas, or build up a fighter?

**6. user:**
I want players to duel rival fighters in fast, fluid underwater arenas, chaining punches, kicks, and aquatic abilities while using currents, reefs, and wreckage to outmaneuver opponents. Each victory should unlock new fighters, techniques, and deeper, more dangerous arenas.

**7. ai:**
Aqua Fighter’s combat sounds exhilarating—imagine arenas where shifting currents create comeback moments and wreckage breaks up every combo. What visual style should define the world: vibrant Saturday-morning anime, sleek underwater sci-fi, or something darker and gritty?

**8. user:**
I want a vibrant Saturday-morning anime style, with bold silhouettes, expressive rival fighters, glowing aquatic abilities, colorful coral reefs, and dramatic underwater effects. The tone should feel energetic and heroic for a broad action-game audience, while deeper arenas gradually introduce darker, more mysterious threats.

**9. ai:**
Aqua Fighter has a vibrant, heroic identity, with expressive anime rivals and increasingly mysterious underwater arenas! I have a clear vision for Aqua Fighter now! Ready to compile and start the design critique?

**10. user:**
Yes—compile the vision and start the design critique. I want the critique to focus on making Aqua Fighter’s fast underwater combat feel fluid and skillful, ensuring currents and arena hazards create strategic anime-style spectacle, and shaping progression so the increasingly dangerous depths remain exciting for a broad action-game audience.

**11. ai:**
Aqua Fighter is compiled, and that focus on fluid skill, strategic spectacle, and exciting depth progression is fantastic! Should we begin by sharpening the core duel controls and movement feel?

**12. user:**
Yes—let’s sharpen the core duel controls around responsive four-direction movement, quick dash bursts, punch and kick chains, and readable aquatic abilities that let skilled players redirect momentum through currents. Every arena interaction should support stylish outplays: ride a current into a combo, rebound off reefs, use wreckage as cover, and turn hazards into dramatic but fair comeback opportunities.

**13. ai:**
That’s an excellent foundation for fluid, skillful duels—responsive movement, readable counters, and stylish arena interactions will keep every victory feeling earned. Should Aqua Fighter’s combat lean more toward competitive mastery or easy-to-learn anime spectacle?

**14. user:**
I want Aqua Fighter to deliver easy-to-learn anime spectacle with a high skill ceiling: newcomers can chain movement, basic strikes, and abilities immediately, while experienced players master timing, momentum redirection, current manipulation, and arena setups for competitive outplays. Every dramatic effect should remain clearly telegraphed and counterable so the action feels powerful, fair, and exciting for everyone.

**15. ai:**
That’s the perfect balance: instantly exciting for newcomers, yet deep enough for masterful competitive outplays! I have a clear vision for Aqua Fighter now—ready to compile and start the design critique?

**16. user:**
Here are my answers to the technical critique questions:

Question: What platforms and rendering targets must be supported, and is the game intended for local play, online multiplayer, or both? If online, what player count, latency tolerance, server authority model, and rollback or client-prediction strategy are required?
Answer: Aqua Fighter should target Windows PC, PlayStation 5, and Xbox Series X|S at a minimum, using scalable DX12/Vulkan rendering at 60 FPS with optional 120 Hz support, and provide same-screen local 1v1 plus online 1v1 matches. Online combat should use a fixed 60 Hz deterministic simulation with dedicated authoritative servers, client input prediction and rollback/re-simulation, targeting ≤80 ms RTT, remaining playable to 150 ms, and excluding ranked play above 200 ms RTT.

Question: Will underwater movement and arena interactions use fully simulated physics, a constrained gameplay movement model, or a hybrid approach? Specifically, how should currents, reef rebounds, wreckage collisions, cover, and momentum redirection interact with hit detection and player control?
Answer: Aqua Fighter should use a **hybrid model**: a deterministic, kinematic four-direction controller with immediate input response, dash/attack state machines, and a lightweight momentum vector, while currents apply tunable directional forces, reef contacts trigger authored rebound impulses, and wreckage provides solid cover and controlled collision redirection rather than emergent rigid-body simulation.  
Hit detection should run against the post-movement, post-redirection player pose using separate attack and hurt volumes; hazards and cover must be telegraphed, consistently collidable, and never override control except during explicitly authored hit-stun or rebound windows, preserving skillful momentum manipulation without physics-driven loss of responsiveness.

Question: What camera perspective and arena format are planned—2D side view, 2.5D arena, or full 3D—and how will the camera preserve readability when fighters, currents, hazards, visual effects, and depth layers overlap?
Answer: **Aqua Fighter will use a fixed orthographic 2.5D arena**: combat occurs on a readable 2D plane with limited depth lanes for dodging, currents, cover, and background layering, rather than full free-camera 3D. Readability is enforced through camera framing and soft zoom, depth-sorted silhouettes, fighters rendered above hazards and effects, high-contrast outlines/team colors, lane separation, and telegraphed hazard/VFX volumes that never obscure attack poses or hit reactions.

Question: What combat responsiveness targets must be met, including input sampling rate, simulation tick rate, dash and attack cancel windows, hit-stop behavior, and maximum acceptable input-to-action latency?
Answer: Implement deterministic offline combat at **240 Hz input sampling** and **120 Hz simulation**, with a **100 ms dash buffer**, dash-cancel availability from **2 ticks after attack impact through 8 ticks (66.7 ms)**, and attack-chain inputs accepted during the final **12 ticks (100 ms)** of recovery; use **33 ms light-hit-stop** and **50 ms heavy/ability hit-stop**, freezing combat simulation while continuing input capture and buffering. The hard maximum input-to-action latency is **33 ms**, with a normal target of **≤25 ms** from physical input to gameplay response.

Question: How many fighters, techniques, arenas, simultaneous hazards, and active visual effects must the system support, and should progression be deterministic and data-driven for balancing, live updates, replays, or competitive validation?
Answer: Target launch capacity is **12 fighters, 36 techniques, 8 arenas, 8 simultaneous gameplay hazards, and 64 concurrent visual-effect instances per duel** (including at least 16 gameplay-readable effects); implement this as an offline deterministic two-fighter simulation with fixed-timestep input buffering and seeded RNG. Store fighters, techniques, arena layouts, hazard rules, unlock progression, telegraphs, damage, and VFX references in versioned data assets, enabling balance patches, replay recording, and competitive validation without code changes.

### Technical Critique Record

**Summary:** Aqua Fighter requires a responsive real-time combat architecture that synchronizes four-direction movement, dashes, chained attacks, momentum redirection, currents, hazards, and aquatic abilities without sacrificing readable feedback or competitive fairness. The main technical risks are deterministic simulation and networking, physics interactions in dynamic underwater arenas, animation/effects synchronization, and maintaining performance as arenas accumulate hazards, particles, and unlockable content. The project also lacks defined platform, camera, match size, and offline/online requirements, which are necessary to constrain the architecture.

#### Questions

- What platforms and rendering targets must be supported, and is the game intended for local play, online multiplayer, or both? If online, what player count, latency tolerance, server authority model, and rollback or client-prediction strategy are required?

- Will underwater movement and arena interactions use fully simulated physics, a constrained gameplay movement model, or a hybrid approach? Specifically, how should currents, reef rebounds, wreckage collisions, cover, and momentum redirection interact with hit detection and player control?

- What camera perspective and arena format are planned—2D side view, 2.5D arena, or full 3D—and how will the camera preserve readability when fighters, currents, hazards, visual effects, and depth layers overlap?

- What combat responsiveness targets must be met, including input sampling rate, simulation tick rate, dash and attack cancel windows, hit-stop behavior, and maximum acceptable input-to-action latency?

- How many fighters, techniques, arenas, simultaneous hazards, and active visual effects must the system support, and should progression be deterministic and data-driven for balancing, live updates, replays, or competitive validation?

#### Answers

- Aqua Fighter should target Windows PC, PlayStation 5, and Xbox Series X|S at a minimum, using scalable DX12/Vulkan rendering at 60 FPS with optional 120 Hz support, and provide same-screen local 1v1 plus online 1v1 matches. Online combat should use a fixed 60 Hz deterministic simulation with dedicated authoritative servers, client input prediction and rollback/re-simulation, targeting ≤80 ms RTT, remaining playable to 150 ms, and excluding ranked play above 200 ms RTT.

- Aqua Fighter should use a **hybrid model**: a deterministic, kinematic four-direction controller with immediate input response, dash/attack state machines, and a lightweight momentum vector, while currents apply tunable directional forces, reef contacts trigger authored rebound impulses, and wreckage provides solid cover and controlled collision redirection rather than emergent rigid-body simulation.  
Hit detection should run against the post-movement, post-redirection player pose using separate attack and hurt volumes; hazards and cover must be telegraphed, consistently collidable, and never override control except during explicitly authored hit-stun or rebound windows, preserving skillful momentum manipulation without physics-driven loss of responsiveness.

- **Aqua Fighter will use a fixed orthographic 2.5D arena**: combat occurs on a readable 2D plane with limited depth lanes for dodging, currents, cover, and background layering, rather than full free-camera 3D. Readability is enforced through camera framing and soft zoom, depth-sorted silhouettes, fighters rendered above hazards and effects, high-contrast outlines/team colors, lane separation, and telegraphed hazard/VFX volumes that never obscure attack poses or hit reactions.

- Implement deterministic offline combat at **240 Hz input sampling** and **120 Hz simulation**, with a **100 ms dash buffer**, dash-cancel availability from **2 ticks after attack impact through 8 ticks (66.7 ms)**, and attack-chain inputs accepted during the final **12 ticks (100 ms)** of recovery; use **33 ms light-hit-stop** and **50 ms heavy/ability hit-stop**, freezing combat simulation while continuing input capture and buffering. The hard maximum input-to-action latency is **33 ms**, with a normal target of **≤25 ms** from physical input to gameplay response.

- Target launch capacity is **12 fighters, 36 techniques, 8 arenas, 8 simultaneous gameplay hazards, and 64 concurrent visual-effect instances per duel** (including at least 16 gameplay-readable effects); implement this as an offline deterministic two-fighter simulation with fixed-timestep input buffering and seeded RNG. Store fighters, techniques, arena layouts, hazard rules, unlock progression, telegraphs, damage, and VFX references in versioned data assets, enabling balance patches, replay recording, and competitive validation without code changes.

---

## Memory and Persona Records

### Structured Memory

- **fact/confirmed** The official project name is Aqua Fighter. _(Sources: conversation)_

- **fact/confirmed** Aqua Fighter centers on fast, fluid duels between rival fighters in underwater arenas, with players chaining punches, kicks, and aquatic abilities. _(Sources: conversation)_

- **fact/confirmed** Combat arenas use currents, reefs, and wreckage as gameplay elements that players can use to outmaneuver opponents. _(Sources: conversation)_

- **fact/confirmed** Each victory is intended to unlock new fighters, techniques, and deeper, more dangerous underwater arenas. _(Sources: conversation)_

- **fact/confirmed** Aqua Fighter will use a vibrant Saturday-morning anime visual style with bold silhouettes, expressive rival fighters, glowing aquatic abilities, colorful coral reefs, and dramatic underwater effects. _(Sources: conversation)_

- **fact/confirmed** The game's tone should feel energetic and heroic for a broad action-game audience. _(Sources: conversation)_

- **fact/confirmed** Deeper arenas will gradually introduce darker, more mysterious threats. _(Sources: conversation)_

- **constraint/active** The design critique should focus on making Aqua Fighter's fast underwater combat feel fluid and skillful. _(Sources: conversation)_

- **constraint/active** The design critique should evaluate how currents and arena hazards can create strategic, anime-style spectacle. _(Sources: conversation)_

- **constraint/active** The design critique should shape progression so increasingly dangerous underwater depths remain exciting for a broad action-game audience. _(Sources: conversation)_

- **proposal/accepted** Core duel controls should use responsive four-direction movement, quick dash bursts, punch and kick chains, and readable aquatic abilities. _(Sources: conversation)_

- **proposal/accepted** Skilled players should be able to use aquatic abilities to redirect their momentum through currents. _(Sources: conversation)_

- **constraint/active** Arena interactions should support stylish outplays, including riding currents into combos, rebounding off reefs, and using wreckage as cover. _(Sources: conversation)_

- **constraint/active** Arena hazards should enable dramatic but fair comeback opportunities. _(Sources: conversation)_

- **decision/accepted** Aqua Fighter should combine easy-to-learn anime spectacle with a high skill ceiling: newcomers can immediately chain movement, basic strikes, and abilities, while experienced players can master timing, momentum redirection, current manipulation, and arena setups for competitive outplays. _(Sources: conversation)_

- **constraint/active** Dramatic combat effects must remain clearly telegraphed and counterable so the action feels powerful, fair, and exciting for all players. _(Sources: conversation)_

### User Proxy

As a player, I want Aqua Fighter to feel like a fast, stylish underwater anime duel where controls respond instantly, arena interactions create clever outplays, and every dramatic moment remains readable and fair. I should be able to enjoy the action immediately as a newcomer while having meaningful techniques and strategies to master over time.

#### Priorities

- Responsive four-direction movement, dashes, attack chains, and aquatic abilities with low input-to-action latency

- Easy-to-learn combat that supports a high skill ceiling through timing, momentum redirection, current manipulation, and arena setups

- Fair, clearly telegraphed, and counterable hazards, attacks, hit reactions, and comeback opportunities

- Readable 2.5D arenas where currents, reefs, wreckage, depth lanes, fighters, and visual effects do not obscure combat

- Vibrant heroic anime presentation with expressive rivals, glowing abilities, colorful environments, and dramatic underwater spectacle

- Compelling progression that unlocks new fighters, techniques, and increasingly dangerous arenas without making deeper content inaccessible

- Reliable local 1v1 and online 1v1 play across PC and current-generation consoles, with competitive-feeling synchronization

- Enough launch variety across fighters, techniques, arenas, hazards, and strategic environmental interactions to keep duels fresh

#### Concerns

- Unresponsive movement, excessive hit-stop, input delay, or network rollback could undermine the promised fluid combat

- Currents, rebounds, cover, and hazards could feel random or overpowering rather than rewarding deliberate skill

- Dense effects, darker depths, layered arenas, or overlapping fighters could make attacks, hit reactions, and danger zones difficult to read

- The easy-to-learn experience could become too shallow, while the high skill ceiling could become intimidating for newcomers

- Online latency above the target range could cause inconsistent hit detection, momentum, or rollback experiences, especially in ranked play

- Progression through increasingly dangerous depths could become frustrating if difficulty rises faster than players can learn new techniques

- Visual spectacle or environmental cover could hide opponents, attacks, or counterplay and create unfair losses

- Limited fighter, technique, or arena variety could reduce replayability despite the strong core duel concept

- Platform performance differences, unstable frame rates, or lack of optional 120 Hz support could affect competitive responsiveness

### Senior Technical Analyst Risks

- **High: Offline combat is specified at 120 Hz, while online combat is specified as a fixed 60 Hz deterministic simulation. The design does not define whether gameplay timing, collision results, cancel windows, hit-stop, and replays use one canonical tick rate or two different rule sets.** — Offline and online combat may feel or behave differently, rollback states may not match local simulation, and competitive validation or replay playback may become unreliable.

- **High: The design requires authoritative servers, client prediction, rollback/re-simulation, and hit-stop that freezes combat simulation while continuing input capture. No rule is defined for how hit-stop is represented across clients or reconciled after rollback.** — Players may see different freeze durations, attack outcomes, hit reactions, or buffered inputs. Corrections can cause visible snapping and undermine the stated fairness requirement.

- **High: The specification targets a maximum input-to-action latency of 33 ms and normal latency of 25 ms while also targeting online play at up to 150 ms RTT. It does not distinguish local presentation latency from confirmed network response latency.** — The 25–33 ms requirement may be impossible for network-confirmed actions at the stated RTT, creating a false acceptance criterion or forcing excessive prediction that produces frequent corrections.

- **High: Determinism is required across Windows, PlayStation 5, and Xbox Series X|S, but the implementation details needed to guarantee cross-platform deterministic arithmetic, collision ordering, animation state, RNG, and asset evaluation are unspecified.** — The server and clients may diverge during rollback, producing phantom hits, missed collisions, desynchronized replays, or platform-specific competitive behavior.

- **Medium: The requirement names scalable DX12/Vulkan rendering while targeting PlayStation 5 and Xbox Series X|S. The specification does not identify the console graphics APIs, engine abstraction, feature floor, or fallback behavior.** — The rendering target may be technically incomplete, causing rework in shaders, effects, performance tooling, platform certification, and 120 Hz support.

- **High: A fixed orthographic 2.5D arena combines limited depth lanes, currents, cover, hazards, attack volumes, effects, outlines, and depth sorting. The proposed readability measures are goals, not validated interaction rules.** — Players may misread lane occupancy, attack reach, cover blocking, or current direction, especially during hit-stop and simultaneous effects. The result could be perceived as arbitrary rather than skillful.

- **High: Currents, reef rebounds, wreckage redirection, cover, and hazards are expected to create outplays while never overriding control except in authored windows. The design does not define priority rules when multiple interactions occur in the same tick.** — Identical inputs can produce different outcomes depending on event ordering, enabling unintended combos, unreactable hazards, or rollback discrepancies.

- **High: The stated timing windows use 120 Hz simulation ticks, including a 100 ms dash buffer, 66.7 ms dash-cancel window, and 100 ms attack-chain window, while also requiring immediate response and a 33 ms maximum input-to-action latency. No animation, input-device, rendering, or platform overhead budget is provided.** — The game may satisfy simulation timing while still feeling sluggish, or timing windows may become too permissive and reduce the intended skill ceiling. Hit-stop further changes perceived responsiveness.

- **High: Victory-based unlocks for fighters, techniques, and deeper arenas conflict with the stated competitive fairness goal unless gameplay-relevant unlocks are separated from ranked access or normalized.** — New or disadvantaged players may face stronger options, matchmaking may become paywall- or grind-like if monetization is later introduced, and ranked outcomes may reflect progression rather than mastery.

- **High: Versioned data assets are expected to support balance patches, replays, and competitive validation without code changes, but replay compatibility, asset migration, schema validation, and authoritative version selection are unspecified.** — Patches can invalidate replays, produce different match outcomes, or cause clients and servers to load incompatible fighter, hazard, or telegraph definitions.

- **Medium: The capacity target of 64 visual-effect instances, at least 16 gameplay-readable effects, eight hazards, two fighters, split-screen local play, and optional 120 Hz lacks CPU, GPU, memory, bandwidth, and overdraw budgets per platform.** — Effects that preserve anime spectacle may degrade frame rate or obscure combat, particularly in local multiplayer and lower-spec PC configurations. Performance failures can also increase input latency.

- **Medium: Dedicated authoritative servers and RTT restrictions are specified, but region selection, matchmaking policy, server tick behavior under load, packet-loss handling, reconnects, spectators, and ranked eligibility rules are not defined.** — Players may be matched into unacceptable latency, experience inconsistent simulation under server load, or lose matches because operational edge cases are undefined.

### Synthesis

Aqua Fighter is a one-on-one underwater arena fighter focused on responsive four-direction movement, momentum control, aquatic techniques, and readable anime spectacle. Its validated design uses fixed orthographic 2.5D arenas with limited depth lanes and authored currents, reefs, wreckage, and hazards. The combat model is deterministic and kinematic rather than emergent physics, with data-driven fighters, techniques, arenas, hazards, and progression. Major unresolved areas concern simulation-rate consistency, rollback and hit-stop behavior, cross-platform determinism, latency budgets, interaction arbitration, readability validation, ranked progression access, rendering abstractions, performance budgets, replay versioning, and online service policies.

#### Accepted decisions

- The official project name is Aqua Fighter.

- The game centers on fast, fluid one-on-one underwater duels in which players chain punches, kicks, dashes, and aquatic abilities.

- The baseline combat scheme uses responsive four-direction movement, quick dash bursts, punch and kick chains, guard, and readable aquatic abilities, with remappable controller and keyboard inputs.

- The game combines immediate accessibility with a high skill ceiling based on timing, spacing, momentum redirection, current manipulation, resource use, and arena setups.

- Aquatic abilities can redirect fighter momentum through currents.

- Arena interactions support intentional outplays such as riding currents into combos, rebounding from reefs, and using wreckage as cover.

- Hazards must be telegraphed, consistently activated, counterable, and capable of creating dramatic but fair comeback opportunities.

- The movement architecture is a deterministic hybrid model: a kinematic four-direction controller with immediate input response, state machines, lightweight momentum, authored current forces, authored reef rebounds, and controlled wreckage collision redirection.

- Hit detection is evaluated after movement and redirection using separate attack and hurt volumes. Hazards and cover must not override control except during explicitly authored hit-stun or rebound states.

- Aqua Fighter uses fixed orthographic 2.5D arenas with a readable 2D combat plane and limited depth lanes rather than free-camera 3D.

- Readability is supported through camera framing and soft zoom, depth-sorted silhouettes, fighters rendered above hazards and effects, high-contrast outlines or team colors, lane separation, and telegraphed hazard and VFX volumes.

- The default standard duel is best of three rounds, with 90-second rounds, health reset between rounds, and ranked modes using fixed competitive rules without fighter-specific progression advantages.

- Offline input sampling is targeted at 240 Hz and offline simulation at 120 Hz; online combat is targeted at a fixed 60 Hz deterministic simulation.

- The validated timing targets include a 100 ms dash buffer, a dash-cancel window beginning two simulation ticks after impact and lasting through eight 120 Hz ticks, attack-chain buffering during the final 12 recovery ticks, and a hard maximum input-to-action latency target of 33 ms.

- The launch capacity target is 12 fighters, 36 techniques, 8 arenas, 8 simultaneous gameplay hazards, and 64 concurrent visual-effect instances per duel, including at least 16 gameplay-readable effects.

- Fighters, techniques, arena layouts, hazard rules, unlock progression, telegraphs, damage, and VFX references are to be stored in versioned data assets to support balancing, replay recording, and competitive validation without code changes.

- The minimum target platforms are Windows PC, PlayStation 5, and Xbox Series X|S, with same-screen local 1v1 and online 1v1 support targeted.

- Online play is targeted to use dedicated authoritative servers, client input prediction, rollback and re-simulation, a target of 80 ms RTT, playability to 150 ms RTT, and exclusion of ranked play above 200 ms RTT.

- The visual direction is vibrant Saturday-morning anime, with bold silhouettes, expressive rival fighters, glowing aquatic abilities, colorful coral reefs, and dramatic underwater effects.

- Progression is intended to unlock fighters, techniques, and deeper, more dangerous underwater arenas, while deeper arenas introduce darker and more mysterious threats.

#### Unresolved questions

- What is the single canonical gameplay simulation rate, and how will 120 Hz offline simulation be reconciled with 60 Hz online simulation so gameplay timing, collision results, rollback states, and replays remain equivalent?

- Is 120 Hz required for gameplay simulation or only for input sampling and rendering, and will offline, local, online, and replay modes execute identical simulation code and timing?

- What rollback window and maximum re-simulation cost are required on the target platforms?

- Does hit-stop pause simulation ticks, advance them with a special state, or apply per-entity time scaling, and how are hit-stop duration and buffered inputs represented and ordered across server, clients, and rollback?

- Does the 25–33 ms input-to-action requirement measure local rendered or predicted response, simulation-state change, or authoritative network confirmation?

- What correction frequency and maximum correction distance are acceptable at 80 ms and 150 ms RTT, and how are packet loss, jitter, and higher-than-target latency handled?

- What cross-platform deterministic numeric and execution model will be used for arithmetic, collision ordering, animation state, RNG, asset evaluation, and divergence detection or recovery?

- How are simultaneous hits, current application, hazard events, movement, contacts, invulnerability, hit-stun, and rebounds ordered and arbitrated?

- Which interaction wins when a dash, current, reef rebound, attack, and hazard trigger in the same tick, and can accumulated effects push fighters through cover or into hazards?

- How many depth lanes can players reliably distinguish during active combat, how do attacks cross lanes, and what telegraph lead times and occlusion limits are required?

- What camera, lane-transition, cover, hazard, and effect rules are needed to preserve readability during hit-stop and simultaneous effects?

- What end-to-end latency budget applies across input devices, rendering, display, animation transitions, hit-stop, and rollback correction, and how do timing windows scale between 60 Hz and 120 Hz?

- Are accessibility input buffers and competitive timing windows intended to use the same timing values?

- Are all fighters and techniques available in ranked matches, and are progression unlocks limited to cosmetics, tutorials, or demonstrably equivalent side-grade options?

- How will new players access required practice tools, counters, fighters, techniques, and arena knowledge before entering online or ranked play?

- What engine and rendering abstraction maps DX12, Vulkan, and the console graphics APIs, and what feature floor, resolution targets, effects quality, and 60 Hz or 120 Hz budgets apply per platform?

- What CPU, GPU, memory, bandwidth, overdraw, and effect-count budgets apply to each platform, including same-screen local 1v1 and worst-case simultaneous hazards and readable effects?

- Are the 64 visual-effect instances counted per client, per server, or per rendered view?

- What immutable content-version, replay migration, schema-validation, server compatibility, and content-hash rules apply when data assets change?

- Which data changes require a code or protocol version increment despite the data-driven content model?

- How will RTT be measured before and during matches, and what packet-loss, jitter, server-overload, disconnect, reconnect, rematch, forfeiture, and ranked-result policies apply?

- Are ranked results voided when latency exceeds 200 ms after a match has started?

---

## Full Transcript Record

**Preserved in full:** Yes

**Updated:** 16/08/2026, 10:43:20 PM

**Messages:** 16

---

# Aqua Fighter

*Generated: 16/08/2026, 11:00:07 PM*


---


## Design Document (GDD/PRD)

### 1.1 Product Vision

**Aqua Fighter** is a fast-paced, one-on-one underwater arena fighter built around fluid movement, deliberate momentum control, and readable anime spectacle.

Players control distinctive aquatic heroes and rivals in fixed-camera 2.5D arenas. Fighters attack with punches, kicks, dashes, and special aquatic techniques while exploiting currents, coral reefs, wreckage, cover, hazards, and limited depth lanes.

The game must communicate two simultaneous promises:

1. **Immediate accessibility:** A new player can move, attack, dash, chain basic attacks, and use a special ability within minutes.
2. **Competitive mastery:** Experienced players can optimize timing, momentum redirection, current manipulation, spacing, defensive routing, environmental setups, and matchup-specific counterplay.

The underwater setting is not cosmetic. Movement, currents, rebound surfaces, and environmental hazards are core combat systems.

### 1.2 Target Audience

Aqua Fighter targets:

- Players who enjoy accessible arcade and platform fighters.
- Anime and action-game audiences.
- Local multiplayer groups seeking immediate couch-play fun.
- Competitive fighting-game players seeking a movement-focused arena fighter.
- Players who prefer spectacle and character expression without requiring traditional fighting-game execution barriers.
- Younger and family audiences, supported by clear visual language and scalable accessibility options.

The game should be approachable with a controller, but its deterministic systems, replay tools, and ranked rules must support serious competitive play.

### Pillar 1: Fluid, Skillful Underwater Combat

Movement must feel responsive rather than floaty. Fighters should respond immediately to directional inputs while retaining a controllable momentum vector that enables:

- Current-assisted approaches.
- Mid-air or mid-water redirection.
- Dash routing.
- Rebound extensions.
- Evasive lane changes.
- Positioning around cover and hazards.

The player should understand why a fighter moved and should be able to reproduce the result.

### Pillar 2: Anime Spectacle With Gameplay Clarity

Attacks should feel dramatic through:

- Strong anticipation poses.
- Exaggerated impact frames.
- Speed lines.
- Elemental water effects.
- Camera shake and hit-stop.
- Character callouts.
- Brief, high-contrast finishing poses.

Spectacle must never conceal:

- The attacking fighter’s pose.
- The defender’s hurt reaction.
- The active hit volume.
- The direction of knockback.
- Hazard telegraphs.
- Available defensive options.

### Pillar 3: Environmental Outplay

Arenas are combat tools. Players should be able to:

- Ride a current into a combo.
- Use a reef to rebound toward or away from an opponent.
- Hide or reposition behind wreckage.
- Redirect an opponent toward a hazard.
- Bait an enemy into an unsafe lane.
- Convert environmental contact into a deliberate combo extension.
- Use hazards for comebacks without relying on random outcomes.

### Pillar 4: Accessible Fundamentals, Deep Optimization

The baseline control scheme must not require complex motion inputs. Depth comes from:

- Timing.
- Spacing.
- Attack selection.
- Momentum management.
- Resource usage.
- Cancel discipline.
- Current routing.
- Risk and reward assessment.
- Matchup knowledge.
- Arena knowledge.

### Pillar 5: Fair Escalation

Progression introduces deeper and more dangerous areas, but difficulty must come from richer decisions rather than unreadable punishment.

Every advanced hazard must have:

- A visible telegraph.
- A consistent activation rule.
- A defined counterplay option.
- A predictable collision result.
- A reasonable recovery or reset opportunity.

### 1.4 Core Match Fantasy

A successful match should produce moments such as:

- A fighter dashes through a water mine just before it detonates.
- An opponent is launched into a current, then intercepted with a rising kick.
- A player uses wreckage to break line of sight, changes depth lanes, and reverses position.
- A reef rebound converts a near-ring-out into a counterattack.
- A deep-sea creature shadow appears in the background while a clearly telegraphed hazard creates a final exchange.

---

### 2.1 Match Objective

A standard duel is a one-on-one fight in which each fighter has a health gauge.

Default rules:

- Best of three rounds.
- Each round lasts 90 seconds.
- Fighter health resets between rounds.
- The first fighter to win two rounds wins the match.
- If time expires, the fighter with greater remaining health wins.
- A tie uses remaining momentum/resource advantage as a secondary tiebreaker, followed by a sudden-death round if required.
- Ranked modes use fixed competitive rules and no fighter-specific progression advantages.

Alternative rules such as stock, endurance, and hazard-heavy variants may exist in casual modes.

### 2.2 Standard Control Layout

The control scheme must support controller, keyboard, and remappable input.

### Gamepad Default

| Input | Action |
|---|---|
| Left Stick / D-pad | Four-direction movement |
| Face Button 1 | Light attack / punch |
| Face Button 2 | Heavy attack / kick |
| Face Button 3 | Aquatic technique |
| Face Button 4 | Dash burst |
| Shoulder Button 1 | Guard |
| Shoulder Button 2 | Technique modifier / alternate technique |
| Start/Menu | Pause or menu |
| Select/View | Training controls, replay information, or scorecard |

### Keyboard Default

| Input | Action |
|---|---|
| WASD / Arrow Keys | Movement |
| J | Light attack |
| K | Heavy attack |
| L | Aquatic technique |
| Space | Dash |
| Shift | Guard |
| U | Alternate technique/modifier |
| Esc | Pause/menu |

All controls must be remappable. Each action must support keyboard rollover validation and controller dead-zone configuration.

### 2.3 Movement and Attack Direction

Attacks inherit direction from the current movement intent and fighter state.

Examples:

- Neutral light attack: forward jab.
- Up plus light: rising strike.
- Down plus heavy: descending kick.
- Direction plus technique: directional technique variant where supported.
- Dash plus attack: dash strike or approach attack.

The direction sampled at attack commitment is stored for deterministic replay and cannot be altered by later analog noise unless the move explicitly supports steering.

### 2.4 Basic Attacks

Each fighter has a universal or semi-universal base kit:

- Light punch.
- Heavy punch or kick.
- Rising attack.
- Descending attack.
- Dash attack.
- Air or waterborne follow-up.
- Guard.
- Dash burst.
- Aquatic technique slots.

### Light Attacks

Light attacks are:

- Fast.
- Low commitment.
- Lower damage.
- Suitable for confirming combos.
- Capable of chaining into other lights during the chain window.

Recommended baseline:

- Startup: 5–8 simulation frames.
- Active: 3–5 frames.
- Recovery: 10–18 frames.
- Damage: 2–4% of standard round health.
- Hit advantage: modest, allowing a follow-up under correct timing.

### Heavy Attacks

Heavy attacks are:

- Slower.
- More damaging.
- Higher knockback.
- More likely to interact strongly with environmental surfaces.
- Riskier on whiff or block.

Recommended baseline:

- Startup: 12–20 frames.
- Active: 4–8 frames.
- Recovery: 20–34 frames.
- Damage: 6–10%.
- Strong hit reaction and possible wall or reef bounce.

### Attack Chains

Attack-chain inputs are accepted during the final 12 recovery ticks of an attack, equal to 100 ms in the 120 Hz offline simulation.

The chain system must:

- Accept buffered input during recovery.
- Preserve the first valid next attack.
- Reject duplicate or ambiguous inputs according to priority rules.
- Prevent infinite loops through per-chain route limits.
- Allow fighter-specific chain branches.
- Provide visual and audio confirmation when a chain is accepted.

A basic route may be:

`Light → Light → Heavy`

A fighter-specific route may be:

`Light → Up-Light → Technique`

### Guard

Guard reduces or negates incoming damage depending on attack type.

Default guard behavior:

- Guard is held manually.
- Guard applies only within the fighter’s forward-facing defensive arc unless a fighter trait modifies it.
- Guard prevents normal hit-stun from light attacks.
- Heavy attacks apply guard pushback and guard strain.
- Techniques may chip guard, force movement, or bypass guard only when explicitly telegraphed.

### Guard Break

Guard breaks occur when:

- Guard strain exceeds the fighter’s threshold.
- A designated guard-break attack connects.
- A fighter remains stationary in guard against repeated pressure.

Guard break must have:

- A distinct audio cue.
- A readable stagger animation.
- A guaranteed minimum vulnerability window.
- No hidden random chance.

### Hit-Stun

Hit-stun is an authored state. During hit-stun:

- Movement input is suppressed.
- Momentum may continue according to the attack’s knockback profile.
- The fighter cannot attack or dash unless a specific recovery technique is available.
- Hit-stop may occur at impact.
- Environmental collision is resolved using deterministic rules.

The game must distinguish:

- Light hit-stun.
- Heavy hit-stun.
- Launch state.
- Knockdown state.
- Rebound state.
- Hazard stun.

### Recovery Options

Depending on fighter and move, players may have:

- Directional recovery input.
- Air tech.
- Dash recovery.
- Reef rebound.
- Technique cancel.
- Depth-lane escape.

Recovery options must be clearly communicated and limited by resources, cooldowns, or move-specific rules.

### 2.6 Aquatic Techniques

Aquatic techniques are character-defining abilities such as:

- Water blades.
- Bubble traps.
- Pressure bursts.
- Electric eel arcs.
- Ice currents.
- Coral growth.
- Ink clouds.
- Tidal grabs.
- Whirlpool pulls.

Each technique must define:

- Startup.
- Active frames.
- Recovery.
- Damage.
- Hit-stun.
- Knockback.
- Resource cost.
- Cooldown, if any.
- Directional behavior.
- Guard interaction.
- Environmental interaction.
- Telegraph.
- VFX and audio references.
- Counterplay.
- Online determinism requirements.

Techniques should not all be direct damage tools. Some should be used for:

- Space control.
- Current creation.
- Momentum redirection.
- Defensive escape.
- Cover denial.
- Combo routing.
- Hazard interruption.
- Resource conversion.

### 2.7 Fighter Design Framework

Launch capacity is 12 fighters. Each fighter must have a distinct combat identity without violating the universal readability rules.

Recommended fighter archetypes:

1. **Striker:** Fast punch and kick chains, high pressure.
2. **Current Rider:** Excels at converting currents into movement and damage.
3. **Anchor:** High stability, strong guard, lower mobility.
4. **Trickster:** Creates decoys, bubbles, or deceptive trajectories.
5. **Lancer:** Controls long-range space with spear-like aquatic attacks.
6. **Grappler:** Converts close contact into throws or directional slams.
7. **Reef Guardian:** Uses rebound and collision interactions.
8. **Storm Fighter:** Electric techniques and lane control.
9. **Depth Hunter:** Strong against hazards and darkness effects.
10. **Glass Cannon:** High mobility and burst damage, low durability.
11. **Support Controller:** Creates temporary currents or cover.
12. **Balanced Rival:** Teaches the standard system and serves as the introductory fighter.

Every fighter must have:

- A readable silhouette at gameplay scale.
- A unique movement accent.
- A universal basic attack language.
- One signature mechanic.
- At least one clear weakness.
- At least one reliable approach tool.
- At least one defensive answer.
- A defined arena interaction profile.

### 2.8 Damage and Scaling

Damage must be data-driven and deterministic.

Damage calculation may include:

- Base move damage.
- Combo scaling.
- Counter-hit modifier.
- Guard modifier.
- Environmental multiplier.
- Technique resource modifier.
- Round or mode-specific modifier.

A recommended combo scaling model:

- First hit: 100%.
- Second hit: 92%.
- Third hit: 84%.
- Subsequent hits: minimum 45%.
- Environmental hits may have a separate capped multiplier.

Scaling must prevent infinite or low-risk loops while preserving satisfying short combos.

---

### 3.1 Hybrid Movement Model

Aqua Fighter uses a deterministic, kinematic movement controller rather than fully emergent rigid-body physics.

The controller consists of:

1. **Input intent vector**
2. **Immediate movement response**
3. **Lightweight momentum vector**
4. **Current and authored force contributions**
5. **State-machine constraints**
6. **Post-movement collision resolution**
7. **Attack and hurt-volume evaluation**

The simulation must never rely on platform-specific floating-point behavior for authoritative outcomes.

### 3.2 Movement Plane and Depth Lanes

The playable arena is a 2D combat plane with limited depth lanes.

Recommended structure:

- Three gameplay lanes: foreground, center, background.
- Fighters may move between lanes using up/down input.
- Each lane has a defined world-space depth.
- Lane transitions take a short, consistent duration.
- Attacks have lane tolerance values.
- Some attacks affect multiple lanes.
- Cover and hazards may occupy selected lanes.

Depth lanes are not a free 3D space. They exist to support:

- Dodging.
- Layered positioning.
- Cover play.
- Current routing.
- Background and foreground composition.
- Attack prediction and counterplay.

### 3.3 Movement Response

Input response should feel immediate.

Recommended controller properties:

- Input sampling offline: 240 Hz.
- Offline simulation: 120 Hz.
- Online simulation: fixed 60 Hz.
- Normal input-to-gameplay response target: ≤25 ms.
- Hard maximum input-to-action latency: 33 ms.
- Movement acceleration is high enough to feel responsive.
- Momentum decay is deterministic and tunable by fighter.
- Direction reversal has authored braking rather than uncontrolled sliding.

A fighter’s velocity is represented as fixed-point or deterministic integer components:

```text
velocity = input_velocity
         + retained_momentum
         + current_force
         + authored_rebound
         + attack_knockback
```

Each component has a source tag for debugging and replay validation.

### 3.4 Dash Burst

Dash is a short, high-priority movement action.

Default properties:

- Dash input buffer: 100 ms.
- Dash duration: approximately 100–150 ms.
- Dash distance: fighter-specific but within a controlled range.
- Dash grants limited collision protection only if explicitly assigned.
- Dash may cross certain attacks but not all hazards.
- Dash cancels selected attacks during the defined cancel window.
- Dash has a cooldown or stamina cost.

Dash cancel timing:

- The cancel window begins two simulation ticks after attack impact.
- It remains available through eight 120 Hz ticks.
- The full authored window is 66.7 ms in the 120 Hz simulation.
- In the 60 Hz online simulation, the window is represented using equivalent serialized timing markers rather than rounded inconsistently.
- The move definition stores the timing in milliseconds and derives tick windows per simulation rate.

Dash must not become a universal escape from all commitment. Cancel eligibility is move-specific and must be visible in training mode.

### 3.5 Momentum

Momentum is intentionally lightweight and readable.

Momentum affects:

- Drift after directional movement.
- Current interaction.
- Dash exit position.
- Reef rebounds.
- Knockback travel.
- Some techniques.

Momentum does not create uncontrolled physics. It is clamped by:

- Fighter maximum momentum.
- Arena boundary limits.
- State-specific movement limits.
- Hazard-specific safety limits.
- Rebound caps.

Players can redirect momentum through:

- Opposite directional input.
- Dash.
- Current entry or exit.
- Reef rebound.
- Techniques that explicitly alter velocity.
- Depth-lane movement.

### 3.6 Currents

Currents are authored volumes or lanes that apply directional force.

Each current defines:

- Shape or path.
- Active lanes.
- Direction.
- Magnitude.
- Acceleration curve.
- Maximum applied momentum.
- Entry telegraph.
- Exit behavior.
- Whether attacks can be performed inside it.
- Whether it affects projectiles and hazards.
- Whether fighters can resist or reverse it.
- Cooldown or cycle timing.

Current rules:

- Current force is applied after player movement intent but before collision resolution.
- Current direction is predictable and visually represented.
- Entering and exiting a current should not randomly rotate a fighter.
- Current effects use caps and smooth interpolation.
- A current may alter momentum without disabling control.
- Only authored moves or hazards may temporarily override player control.

A current must support intentional gameplay such as:

```text
Approach → enter current → retain forward momentum → dash cancel → heavy strike
```

### 3.7 Reef Rebounds

Reefs are solid environmental surfaces with authored rebound behavior.

On valid contact:

- The fighter enters a rebound state.
- An authored impulse is applied away from the reef.
- Rebound duration and steering are defined per reef.
- The rebound may be canceled into an attack or dash if specified.
- The contact point is snapped to a deterministic valid location.
- The player retains limited directional influence unless the rebound explicitly restricts it.

Rebounds must not be based on arbitrary rigid-body restitution. Each reef uses a defined rebound profile:

```text
ReboundProfile:
  impulseVector
  steeringPercent
  durationTicks
  attackCancelStart
  attackCancelEnd
  invulnerabilityFrames
  maximumUsesPerSequence
```

### 3.8 Wreckage and Cover

Wreckage provides hard cover and controlled collision redirection.

Wreckage may:

- Block direct attacks.
- Break projectile paths.
- Split lanes.
- Force a fighter to route around an object.
- Provide a temporary hiding point.
- Create predictable wall-bounce opportunities.

Wreckage must not:

- Move through emergent physics.
- Trap a fighter indefinitely.
- Produce unpredictable corner interactions.
- Obscure both fighters from the camera.
- Override control except during authored hit-stun or rebound states.

Collision behavior should use:

- Static authored shapes.
- Lane-aware redirection.
- Minimum escape distance.
- Corner unsticking rules.
- Deterministic slide vectors.
- Explicit projectile interaction flags.

### 3.9 Collision Priority

The deterministic collision resolution order is:

1. Apply player input movement.
2. Apply state restrictions.
3. Apply current force.
4. Apply dash or technique displacement.
5. Apply active knockback or rebound.
6. Resolve arena boundaries.
7. Resolve wreckage and reef contacts.

---

## Pitch Deck

### SLIDE 1: Title Slide

# Aqua Fighter

### Master the Current. Own the Arena.

A fast-paced underwater arena fighter where movement, spectacle, and competitive mastery collide.

### SLIDE 2: The Problem

## Action spectacle should not come at the cost of control

Aqua Fighter is designed around a clear player desire: immediate, readable action with room for long-term mastery.

- **Immediate entry:** Movement, attacks, dashes, and aquatic abilities should feel understandable from the first duel.
- **Meaningful mastery:** Timing, momentum, positioning, and environmental interactions create room for skilled play.
- **Readable spectacle:** Dramatic effects and hazards should remain telegraphed, counterable, and easy to follow.
- **A setting with gameplay value:** The underwater environment is treated as part of the combat experience rather than a visual backdrop.

### The opportunity

Create an underwater 1v1 fighter that combines accessible fundamentals with expressive, skill-driven arena play.

### SLIDE 3: The Solution: Your Project

## Aqua Fighter

### Underwater movement becomes a competitive combat advantage

Aqua Fighter is a fast-paced one-on-one arena fighter set in vibrant underwater environments.

Players combine movement, attacks, dash bursts, aquatic abilities, and arena interactions to create dynamic exchanges between rival fighters.

- Ride currents and redirect momentum.
- Rebound from coral reefs and use wreckage as cover.
- Chain attacks while managing position and timing.
- Progress toward new fighters, techniques, and deeper arenas.

**High concept:** anime arena combat where the flow of the environment is part of every matchup.

### SLIDE 4: Core Features & Loop

## The duel-to-depth loop

**Select → Fight → Outplay → Unlock → Dive Deeper**

- **Select:** Choose a fighter and enter an underwater arena.
- **Fight:** Use movement, dash bursts, punch and kick chains, and aquatic abilities.
- **Outplay:** Manipulate currents, momentum, positioning, cover, reefs, and hazards.
- **Unlock:** Advance toward additional fighters, techniques, and arena content.
- **Dive deeper:** Encounter arenas with a darker visual and gameplay identity.

### Why the loop is compelling

- Fundamentals are designed to be immediately readable.
- Advanced play rewards timing, routing, positioning, and environmental awareness.
- Visual effects support the impact of each exchange while preserving combat clarity.
- Each duel can function as both a skill test and a progression step.

### SLIDE 5: Unique Selling Proposition

## Anime spectacle meets skill-first underwater combat

Aqua Fighter differentiates itself by making the underwater setting central to how combat feels and plays.

- **Fluid arena movement:** Four-direction movement and dash control support expressive positioning.
- **Environmental combat:** Currents, reefs, wreckage, cover, and hazards create tactical possibilities.
- **Readable spectacle:** High-contrast silhouettes, clear telegraphs, and deliberate effects keep exchanges understandable.
- **Accessible depth:** Straightforward fundamentals can lead into timing, momentum control, and environmental mastery.
- **Distinctive fantasy:** The project offers a fighter identity built around aquatic motion rather than a conventional arena.

### SLIDE 6: Target Audience

## Built for players who want immediate action and room to improve

### Primary audiences

- **Action-game players** drawn to fast, expressive one-on-one combat.
- **Anime fans** seeking colorful rivals, dramatic abilities, and energetic presentation.
- **Fighting-game newcomers** looking for readable controls and approachable fundamentals.
- **Experienced competitive players** interested in timing, positioning, momentum, and environmental outplays.

### Audience fit

Aqua Fighter is positioned to serve both social and mastery-driven play through its 1v1 format, accessible entry point, and deeper combat possibilities.

### Market size

No quantified TAM, SAM, or SOM figures were supplied. Market sizing should be completed using validated research across action-game, anime-game, and fighting-game audiences.

### SLIDE 7: Art & Style

## Vibrant spectacle. Clear combat. Deeper mystery.

Aqua Fighter’s visual direction combines Saturday-morning anime energy with gameplay-first readability.

- Bold fighter silhouettes and expressive rival designs.
- Glowing aquatic abilities and dramatic motion effects.
- Colorful coral reefs, currents, wreckage, and layered underwater spaces.
- A visual progression from bright shallows toward darker, more mysterious depths.
- Strong contrast and clear presentation of combat-critical information.

The intended result is energetic, memorable art that supports—not obscures—the action.

### SLIDE 8: The Team

## Roles required to bring Aqua Fighter to life

The supplied material does not identify individual team members by name. The project’s described responsibilities map to these key disciplines:

- **Creative and game direction:** Owns the project identity, onboarding, fighter fantasy, and progression.
- **Combat and systems design:** Shapes movement, attacks, abilities, currents, timing, and counterplay.
- **Technical and online development:** Supports simulation, multiplayer, input handling, and replay-ready systems.
- **Art and VFX:** Creates expressive fighters, aquatic abilities, telegraphs, and readable effects.
- **Arena and content design:** Develops reefs, currents, wreckage, hazards, and deeper environments.

Named team members, biographies, and credentials should be added when supplied.

### SLIDE 9: The Ask & Roadmap

## Seeking development support and a publishing partner

### The ask

- **Development funding** to build and validate the core combat experience.
- **A publishing partner** to support production, market preparation, and release planning.
- Strategic support aligned with an accessible 1v1 fighter that can also reward competitive mastery.

### High-level roadmap

1. **Combat Prototype** — Validate movement, attacks, abilities, hit detection, and underwater handling.
2. **Vertical Slice** — Present a polished arena, rival fighters, environmental interactions, and the intended visual identity.
3. **Production and Online Validation** — Expand fighters, techniques, arenas, networking, readability, and balance.
4. **Beta and Launch Readiness** — Test local and online 1v1 play, tune accessibility and competition, and prepare release content.

Specific funding amount, milestone dates, and confirmed platform commitments were not supplied and should be added after validation.

### SLIDE 10: Contact Information

## Continue the conversation

### Aqua Fighter

A fast-paced underwater arena fighter built around responsive combat, readable anime spectacle, environmental play, and competitive mastery.

**Project contact:** Not provided

Add the appropriate representative, studio name, email address, website, and social links before distribution.

---

## MVP Definition

### Summary
A focused local 1v1 vertical slice that proves Aqua Fighter’s unique hook: responsive momentum-based underwater movement combined with readable arena outplay. It ships with two contrasting fighters, one handcrafted three-lane arena, and a complete best-of-three match loop.

### In Scope

- Local two-player versus on one supported platform, with controller and keyboard input, remappable controls, pause, and basic round/match results.

- Two fighters: one balanced introductory fighter and one movement-focused rival, each with distinct movement, a signature aquatic technique, a weakness, and a clear approach and defensive option.

- Deterministic 2.5D combat with three depth lanes, immediate directional movement, controllable momentum, dash burst, guard, light/heavy attacks, directional attacks, hit-stun, knockback, basic chains, and one recovery option.

- One arena built around the hook: a predictable current, reef rebound surfaces, lane-aware wreckage cover, arena boundaries, and one clearly telegraphed deterministic hazard with defined counterplay.

- Complete best-of-three round rules with 90-second rounds, health reset between rounds, timeout resolution by remaining health, readable hit/hurt feedback, and essential combat HUD.

- A minimal training mode with a stationary or repeatable dummy, move display, and reset controls for learning movement, attacks, currents, rebounds, and the hazard.

### Out of Scope

- Online multiplayer, rollback networking, ranked rules, matchmaking, leaderboards, spectating, and replay sharing.

- A 12-fighter launch roster; additional fighters, fighter-specific progression, unlocks, and balance across a full roster.

- Multiple arenas, hazard variants, stock or endurance modes, casual rule modifiers, and a campaign or story mode.

- Advanced systems such as complex technique resource economies, multiple techniques per fighter, elaborate cancel routes, deep matchup-specific mechanics, or a full environmental interaction matrix.

- AI opponents, if local versus and training are the initial playable modes.

- Full accessibility, localization, platform certification, extensive graphics customization, and cinematic presentation beyond combat readability essentials.

---

## MVP Feature Specifications (BDD)

### Feature: Local two-player versus with remappable controls, pause, and best-of-three results

**Feature ID:** `local-two-player-versus-controls-and-match-loop`

**User story:** As a local player, I want to configure keyboard or controller controls and complete a readable best-of-three Aqua Fighter match with another player, so that we can compete locally using our preferred inputs and understand every round and match result.

#### Scenarios

**Start a local best-of-three match with keyboard and controller input [happy-path] (ID: `start-local-versus-with-keyboard-and-controller`)**

*Given*

- Aqua Fighter is running on the supported platform in local versus setup

- One supported controller is connected and detected

- The default keyboard mapping is available

- The two launch fighters and the single three-lane arena are available

*When*

- Player 1 selects the balanced introductory fighter and confirms keyboard controls

- Player 2 selects the movement-focused rival and confirms the connected controller

- Both players confirm the arena and start the match

*Then*

- A best-of-three match is created with one fighter assigned to each player

- Round 1 starts with both fighters at full health and the timer at 90 seconds

- The combat HUD shows both health values, fighter identities, the 0-0 round score, and the countdown

- Keyboard input controls only Player 1 and controller input controls only Player 2

**Prevent match start when a selected controller is unavailable [failure] (ID: `reject-disconnected-controller-before-match`)**

*Given*

- Player 2 selected a connected controller during local versus setup

- The selected controller is disconnected before both players confirm

*When*

- Player 2 attempts to confirm the controller layout or start the match

*Then*

- The match is not created and no fighter enters combat

- The setup screen identifies the missing controller and offers reconnect, choose keyboard, or return to device selection

- Player 1's confirmed fighter and controls remain intact

#### Acceptance criteria

- On the supported platform, two local players can enter the same match using supported combinations of keyboard and detected controllers.

- The match contains exactly two fighters, one per player, and uses the single handcrafted three-lane arena.

- The match is best-of-three: the first player to win two rounds is the match winner.

- Each round lasts no longer than 90 seconds, starts with both fighters at full health, and resets health between rounds.

- If the timer reaches 00:00 with both fighters alive, the fighter with greater remaining health wins; equal-health timeout uses a documented deterministic tie rule visible in the result.

- The combat HUD shows both health values, the round timer, and the round score during active combat.

- Pause stops deterministic combat simulation and the timer, blocks gameplay state changes, and supports resume without losing combat state.

- The control editor supports remapping shipped movement, combat, signature-technique, recovery, and pause actions for each local player.

- A player cannot confirm a control layout with an invalid input or without one valid binding for every required action.

- Round results identify the round winner and resolution reason; final results identify the match winner, final score, fighters, and round winners.

- A rematch can reuse selected fighters, arena, input devices, and valid control layouts without restarting the application.

- Hit-stun, knockback, current movement, reef rebounds, lane-aware wreckage cover, and the telegraphed arena hazard are frozen during pause and resume deterministically from their prior state.

#### Failure states

- A selected controller disconnects during setup: block match creation, preserve the other player's setup, and offer reconnect or device reassignment.

- A controller disconnects during active combat: pause the match automatically, identify the player who lost input, and offer reconnect, switch to an available valid device, or quit.

- A control-layout save fails: retain the last valid local layout in memory, report that the new layout was not saved, and allow play only with the last valid layout or shipped defaults.

- A match-state transition fails between rounds: keep the completed result visible, prevent duplicate round awards, and provide a safe return to setup.

- The application is suspended or loses focus during active combat: enter the paused state before the next simulation tick and resume only through explicit player action.

- A fighter reaches zero health at the same simulation tick as the timer reaches zero: apply the deterministic event-order rule and show the resulting resolution reason.

#### Invalid / Wrong-input behavior

- Keyboard keys or controller inputs not present in the supported input-device enumeration are rejected by the remapping UI.

- A pause request from an unassigned or non-participating device is ignored.

- A remap that duplicates a required action is rejected unless explicit replacement confirmation gives the displaced action a valid replacement.

- Starting local versus with fewer than two valid player input assignments is blocked.

- Starting local versus with the same exclusive controller assignment for both players is blocked unless the platform exposes that device as two independent supported sources.

- Gameplay inputs during pause, round-result, or match-result screens cannot alter fighter state.

- Continue or rematch commands before the relevant result screen is active are ignored.

#### Boundary / Tolerance conditions

- The round timer starts at 90 seconds, reaches zero exactly, and never displays a negative value.

- The match ends at the first score of two rounds won; a third round is never created after a 2-0 result.

- Health is clamped between zero and the fighter's configured maximum.

- Exactly three depth lanes are available; lane movement beyond either outer lane produces no transition.

- Only one local match and one active round simulation may exist at a time.

- Pause duration is excluded from the round timer and combat simulation time.

- Every required action must have one valid binding before a control layout is confirmed.

- The round-result state accepts exactly one round award and one continuation transition even if confirmation is repeated.

#### Offline / Failure behavior

All local versus, control remapping, pause, round results, and match results operate without internet access, authentication, or backend services. Control layouts and local match preferences are stored on the supported platform's local profile when available. No match is uploaded, synchronized, or recoverable across devices; if local persistence is unavailable, the current session remains playable and the layout is discarded when the application exits.

#### Accessibility / Usability

- Every remappable action has a text label and a non-color-only visual indicator.

- Player-specific HUD elements use player labels, fighter names, icons, and distinct patterns or markers in addition to color.

- Round-result and match-result screens state the winner and resolution reason in text.

- Pause, resume, quit, remap, restore-defaults, confirm, and cancel actions are reachable by keyboard and controller.

- The control editor provides visible focus and supports navigation without simultaneous button presses.

- Hit, guard, hazard, and round-ending feedback use at least two of visual, audio, and controller-vibration channels where supported; gameplay-critical information does not rely on color alone.

- The 90-second timer and health values remain legible against the underwater arena background.

#### Telemetry

- Record local session events for versus setup opened, device assignment confirmed, match started, round started, round won, round timeout, match completed, pause opened, resume selected, remap saved, remap rejected, device disconnected, and match abandoned.

- For match events, record an anonymized session ID, fighter selections, arena ID, input-device types, round number, resolution reason, and elapsed active simulation time; do not record raw key presses or controller inputs.

- Measure match-start failure rate by reason, controller disconnect count, remap rejection count, pause duration, round duration, and match completion rate.

- Log deterministic simulation diagnostics for duplicate round awards, invalid state transitions, timer values outside 0-90 seconds, health values outside 0-maximum, and lane indices outside 0-2.

- Telemetry remains disabled from network transmission while offline and may be queued only if an existing consented analytics pipeline supports later upload.

#### Security considerations

- No network authority, matchmaking, account authentication, or remote-player trust is required for this local-only feature.

- Treat local profile files as untrusted input: validate fighter IDs, arena ID, device IDs, action names, binding types, and serialized values before loading them.

- Reject malformed or oversized control-layout data without crashing or overwriting the last valid layout.

- Do not execute arbitrary strings or platform commands from remapped control data or match-result data.

- If telemetry is enabled by the existing product consent model, exclude raw input sequences, personal identifiers, and file paths.

#### Performance targets

- Run deterministic combat simulation and rendering at the supported platform's target frame rate, with simulation updates completing within 25% of the frame budget during two-player combat, hazard activity, hit effects, and pause transitions.

- Apply a local input event to its owning fighter within 50 milliseconds at the target frame rate under normal load.

- Open the pause overlay and freeze simulation within one rendered frame of the pause input.

- Enter the next round or match-results state within 250 milliseconds after the round-ending event, excluding intentional result-screen presentation time.

- Load a remapped local control profile and populate the control editor within 500 milliseconds after opening setup.

- Support at least two simultaneous local input devices and all required action bindings without dropped input events during active combat.

- Control-layout persistence uses no more than 64 KB per local profile.

#### Technical notes & dependencies

Implement a deterministic local match state machine with Setup, ActiveRound, Paused, RoundResult, MatchResult, and Aborted states. Use a fixed-step combat simulation so keyboard and controller inputs enter the same normalized action pipeline and produce reproducible momentum, dash, guard, attack, hit-stun, knockback, lane movement, current, rebound, wreckage-cover, and hazard behavior. Assign each input source to exactly one player and route normalized actions through player ownership before fighter simulation. Define event ordering explicitly: process input, movement and arena forces, attacks and collisions, health resolution, then timer expiry; document and test the zero-health/zero-timer case. Use active simulation time rather than wall-clock time for the timer. Reset health, hit-stun, knockback, momentum, active attacks, hazard state, and temporary arena interactions between rounds while preserving fighter selection and control layouts. Version serialized control layouts, validate action coverage and input identifiers on load, support restore-defaults, and retain the last valid layout on failure. Pause must halt gameplay and arena simulation, suppress gameplay action application, retain UI navigation input only, and auto-pause on application deactivation or participating-device loss. Integrate with the existing fighter definitions, three-lane arena collision and hazard systems, HUD, training-mode input display, local profile storage, and platform controller-discovery APIs.

#### Dependencies

- Supported-platform keyboard and controller input APIs with device connection and disconnection events

- Two shipped fighter definitions: one balanced introductory fighter and one movement-focused rival

- Deterministic 2.5D combat simulation supporting three depth lanes, momentum, dash burst, guard, light and heavy attacks, directional attacks, hit-stun, knockback, basic chains, and one recovery option

- One handcrafted three-lane arena with a predictable current, reef rebound surfaces, lane-aware wreckage cover, arena boundaries, and one clearly telegraphed deterministic hazard with defined counterplay

- Combat HUD and readable hit and hurt feedback

- Local profile storage for control layouts and local match preferences

- Minimal training mode with stationary or repeatable dummy, move display, and reset controls

---

### Feature: Two contrasting playable fighters

**Feature ID:** `two-fighter-roster`

**User story:** As a local versus player, I want to choose between a balanced introductory fighter and a movement-focused rival with distinct movement, aquatic techniques, weaknesses, approach options, and defensive options, so that I can learn and outplay different combat styles in Aqua Fighter.

#### Scenarios

**Players select and use the two contrasting fighters [happy-path] (ID: `select-and-play-two-fighters`)**

*Given*

- Two local players are on the fighter-select screen

- The MVP fighter roster contains one balanced introductory fighter and one movement-focused rival

- A supported three-lane arena is available for local versus play

*When*

- Each player selects a different fighter

- The players start a local best-of-three match

- The players use movement, dash, guard, attacks, and each fighter's signature aquatic technique

*Then*

- The match starts with the selected fighters in the arena

- Each fighter uses its authored movement profile and signature aquatic technique

- Each fighter has a readable weakness, approach option, and defensive option during play

- Movement, attacks, guard, hit-stun, knockback, and signature-technique results are deterministic for identical inputs and game states

**The match cannot start without two valid fighter selections [failure] (ID: `reject-incomplete-fighter-selection`)**

*Given*

- Two local players are on the fighter-select screen

- At least one player has not selected a valid playable fighter

*When*

- A player attempts to start the local versus match

*Then*

- The match does not start

- The fighter-select screen remains visible until both players have selected valid fighters

- No round, health state, or match result is created

#### Technical notes & dependencies

Implement exactly the two MVP fighters as data-driven definitions within the deterministic 2.5D combat system. The balanced introductory fighter and movement-focused rival must have distinct movement behavior, one signature aquatic technique each, an authored weakness, a clear approach option, and a clear defensive option. Integrate both fighters with the three depth lanes, immediate directional movement, controllable momentum, dash burst, guard, light and heavy attacks, directional attacks, hit-stun, knockback, basic chains, and the available recovery option. Their techniques and combat behavior must work in local two-player versus and the minimal training mode, support keyboard and controller input with remappable controls, and expose readable combat feedback through the HUD and move display. Identical local inputs with identical fighter, arena, current, and hazard states must produce identical combat and round results.

---

### Feature: Deterministic 2.5D three-lane combat

**Feature ID:** `aqua-fighter-deterministic-2-5d-combat`

**User story:** As a local-versus player, I want responsive momentum-based movement and readable combat across three depth lanes, so that I can outmaneuver an opponent and complete a best-of-three match.

#### Scenarios

**Two local players complete a best-of-three match [happy-path] (ID: `complete-local-best-of-three-match`)**

*Given*

- A local two-player match is started on the supported platform.

- Player 1 and Player 2 select the two available fighters.

- The handcrafted arena is loaded with three depth lanes, arena boundaries, a predictable current, reef rebound surfaces, lane-aware wreckage cover, and one telegraphed deterministic hazard.

- Both fighters begin the first 90-second round with full health.

*When*

- The players use keyboard or controller inputs for immediate directional movement, lane changes, controllable momentum, dash burst, guard, light attacks, heavy attacks, and directional attacks.

- A fighter lands an attack and the opponent receives hit-stun and knockback.

- The defending player uses the available recovery option during the match.

- A fighter wins two rounds, or a round reaches its 90-second limit and is resolved using remaining health.

*Then*

- Movement and lane changes respond immediately while preserving the configured momentum behavior.

- Attacks, guard, hit-stun, knockback, basic chains, and the recovery option resolve deterministically and provide readable combat feedback.

- The arena current, rebound surfaces, wreckage cover, boundaries, and telegraphed hazard behave according to their configured counterplay.

- Health resets between rounds, and timeout resolution uses remaining health.

- After one fighter wins two rounds, the match-results screen shows the winner and round results.

**Unavailable dash or recovery input is rejected [failure] (ID: `reject-unavailable-combat-action`)**

*Given*

- A fighter is in a state where dash burst or the recovery option is unavailable, such as an active cooldown, an invalid recovery situation, hit-stun, defeat, or a round transition.

- The local-versus match is still active.

*When*

- The player presses the unavailable dash burst or recovery control.

*Then*

- The unavailable action does not create movement, damage, or a combat-state change.

- The fighter remains in a valid lane and retains the correct combat state.

- The HUD continues to show the actual availability of the recovery option and the relevant dash state.

- The rejected input does not affect the deterministic match result.

#### Technical notes & dependencies

Implement the feature as deterministic local 1v1 combat with exactly three depth lanes, immediate directional movement, controllable momentum, dash burst, guard, light and heavy attacks, directional attacks, hit-stun, knockback, basic chains, and one recovery option. Support keyboard and controller input for both players, remappable controls, and pause. Use the single handcrafted arena's predictable current, reef rebound surfaces, lane-aware wreckage cover, boundaries, and one clearly telegraphed deterministic hazard with defined counterplay. Implement complete best-of-three rules with 90-second rounds, health reset between rounds, timeout resolution by remaining health, readable hit and hurt feedback, and an essential combat HUD. Training mode must use the combat rules with a stationary or repeatable dummy, move display, and reset controls for practicing movement, attacks, currents, rebounds, and the hazard. Online multiplayer, AI opponents, additional arenas, additional fighters, and network-dependent systems are out of scope.

---

### Feature: Three-lane arena with predictable current, reef rebounds, wreckage cover, boundaries, and deterministic hazard

**Feature ID:** `three-lane-arena-environmental-outplay`

**User story:** As a local versus player, I want to read and use the arena current, reef rebound surfaces, lane-aware wreckage cover, boundaries, and telegraphed hazard, so that positioning and movement create predictable outplay opportunities.

#### Scenarios

**Player counters the telegraphed hazard using lane movement or cover [happy-path] (ID: `use-arena-elements-to-counter-hazard`)**

*Given*

- A local 1v1 round is active in the handcrafted three-lane arena

- The deterministic arena hazard has visibly telegraphed its target lane

- The player can move between the three depth lanes and lane-aware wreckage cover is available

*When*

- The player changes to an unselected lane or moves behind valid wreckage cover before the hazard activates

*Then*

- The hazard resolves in its telegraphed lane

- The player avoids the hazard effect through the selected counterplay

- The arena continues applying its predictable current and normal movement rules without random hazard behavior

**Boundary or unavailable rebound input cannot remove the fighter from the arena [failure] (ID: `invalid-arena-interaction-stays-contained`)**

*Given*

- A fighter is at an arena boundary or has no valid reef rebound interaction available

- The fighter is affected by movement or knockback that would leave the arena, or the player attempts the unavailable rebound

*When*

- The movement or knockback is resolved, or the player submits the rebound input

*Then*

- The fighter remains within the arena boundaries

- An unavailable rebound does not grant rebound movement or another defensive effect

- The failed interaction does not corrupt the fighter, lane, or round state

#### Technical notes & dependencies

Implement the arena as a deterministic local combat-space component for the supported 2.5D three-lane fighter simulation. Author stable lane geometry, a predictable current, reef rebound collision surfaces, lane-aware wreckage cover, explicit arena boundaries, and one deterministic hazard with a visible telegraph and documented counterplay. Resolve current movement, lane changes, rebound interactions, cover checks, hazard effects, knockback, and boundary containment in a fixed simulation order so identical local inputs produce identical results. Integrate the arena with local 1v1 best-of-three rounds, 90-second round timing, pause, remappable keyboard and controller controls, essential combat HUD feedback, and minimal training-mode reset and repeat controls. Hazard, current, rebound, cover, boundary, and timeout behavior must remain deterministic in both versus and training modes.

---

### Feature: Complete best-of-three combat rounds with readable feedback and essential HUD

**Feature ID:** `complete-best-of-three-combat-round-rules`

**User story:** As a local Aqua Fighter player, I want clear 90-second rounds with visible health, timer, hit feedback, and round results, so that I can understand the fight state and win a complete best-of-three match through readable combat decisions.

#### Scenarios

**Two local fighters complete a best-of-three match [happy-path] (ID: `start-and-win-best-of-three-match`)**

*Given*

- Two local players have selected the two available fighters: the balanced introductory fighter and the movement-focused rival.

- Both players are in the handcrafted three-lane arena in the pre-round state.

- The match score is 0-0 and both fighters have their configured starting health.

*When*

- The pre-round countdown reaches zero.

- One fighter reduces the other fighter's health to zero before the 90-second round timer expires.

- The round result is displayed and the next round begins.

- The same player wins a second round.

*Then*

- The player who reduced the opponent's health to zero is awarded one round win.

- Both fighters' health is reset to their configured starting health before the next round begins.

- Temporary combat state from the completed round is cleared before the next active round.

- The round timer resets to 90 seconds for the next round.

- The HUD displays both health states, both round scores, the active round number, and the 90-second countdown.

- The match ends immediately when either player reaches two round wins, and a third round is not started.

**A 90-second round is resolved by remaining health [boundary] (ID: `timeout-resolves-by-remaining-health`)**

*Given*

- A local versus round is active in the three-lane arena.

- The round timer is at 00:01.

- Player 1 has less remaining health than Player 2.

- Neither fighter has reached zero health.

*When*

- The timer reaches exactly 00:00.

*Then*

- The round enters its timeout result state.

- The player with greater remaining health is awarded the round.

- The authoritative round result cannot be changed by combat input, movement, hazard effects, or damage after the timeout is committed.

- The HUD identifies the result as a timeout and shows the health values used for resolution.

- The next round resets both fighters' health and starts with a new 90-second timer after the round transition.

#### Acceptance criteria

- A local versus match uses a first-to-two-round-wins format.

- Each round has a 90-second timer that counts down only during active combat.

- A fighter reaching zero health wins the round unless the round has already been resolved by timeout.

- At timeout, the fighter with greater remaining health wins the round based on health sampled at the timeout transition.

- Health resets between rounds without changing the match score or fighter selection.

- The HUD displays both fighters' health, round scores, active round number, and timer during active combat.

- Hit and hurt feedback remains readable during combat.

- The feature works with local controller and keyboard input, including remapped controls, and can be paused.

#### Failure states

- Combat inputs received after a round or match has resolved must not alter health, score, timer, or the resolved result.

- A timeout must not be resolved more than once, and damage received after the timeout transition must not change its result.

- If a fighter or arena fails to initialize, the match must not enter active combat with partial round state.

#### Offline / Failure behavior

The complete local versus match, including character selection, arena loading, rounds, HUD, feedback, pause, and remappable controls, must remain playable without network access.

#### Technical notes & dependencies

Implement an explicit local match and round state flow covering pre-round, active round, round resolution, and match resolution. The active-round timer must run for exactly 90 seconds and stop when the round resolves. A round ends when a fighter reaches zero health or when the timer expires; timeout resolution compares the fighters' remaining health at the authoritative 00:00 transition. Reset both fighters' health and temporary combat state between rounds without changing fighter selection or match score. End the match when a player reaches two round wins. The combat HUD must show both fighter identities, health, round scores, active round number, and timer. Hit and hurt feedback must be readable during deterministic 2.5D combat across the three depth lanes and must communicate impact and damage without relying on color alone. Support the local controller and keyboard inputs, including remappable controls and pause, with no online-service dependency.

---

### Feature: Minimal Training Mode

**Feature ID:** `aqua-fighter-training-mode-mvp`

**User story:** As an Aqua Fighter player, I want a local training mode with a controllable dummy, move display, and reset controls, so that I can learn movement, attacks, currents, rebounds, and the arena hazard before playing a best-of-three match.

#### Scenarios

**Enter training mode and practice movement [happy-path] (ID: `enter-training-and-practice-core-movement`)**

*Given*

- Aqua Fighter is at the local mode selection screen.

- The player selects Training Mode and selects either of the two MVP fighters.

- The three-lane handcrafted arena is loaded with its predictable current, reef rebound surfaces, lane-aware wreckage cover, boundaries, and deterministic hazard.

*When*

- The player presses movement inputs, dash burst, guard, light attack, heavy attack, and directional attack inputs.

- The player moves between all three depth lanes and contacts a reef rebound surface.

*Then*

- The selected fighter responds using the same deterministic movement, momentum, dash, attack, guard, hit-stun, knockback, rebound, current, and boundary rules as local versus.

- The move display identifies the most recently recognized action and its directional variant within 100 milliseconds of the input being accepted.

- The move display records whether the action connected with the dummy, was guarded, whiffed, or was interrupted.

- The player remains in Training Mode after attacks, knockback, or hazard interactions; no round win, loss, or best-of-three transition occurs.

**Use a stationary dummy and reset the drill [happy-path] (ID: `practice-stationary-dummy-and-reset-state`)**

*Given*

- Training Mode is active with the stationary dummy selected.

- The fighter, dummy, and arena have non-default positions or combat states.

- The dummy has been hit, moved by knockback, or placed into hit-stun.

*When*

- The player activates Reset Training using the configured reset control.

- The player attacks the stationary dummy again after the reset completes.

*Then*

- The fighter returns to the configured player start position and the dummy returns to the configured dummy start position in the selected depth lanes.

- Fighter and dummy health, hit-stun, knockback, guard state, active attack state, momentum, and recovery state return to their training defaults.

- The current, hazard telegraph, hazard active window, and arena interaction state return to the same deterministic starting phase on every reset.

- The move display history is cleared and the next accepted action becomes the first displayed action.

- The dummy remains stationary until the player changes its mode or directly interacts with it.

**Practice against a repeatable dummy pattern [happy-path] (ID: `replay-repeatable-dummy-pattern`)**

*Given*

- Training Mode is active and the repeatable dummy mode is selected.

- A deterministic dummy pattern containing movement, guard, and attack actions is loaded.

- The fighter and dummy are at their configured training start positions.

*When*

- The player starts the repeatable dummy pattern.

- The pattern reaches its final action or the player activates Reset Training.

*Then*

- The dummy performs the same recorded pattern with the same timing and lane transitions on every run.

- The pattern pauses or restarts at its defined beginning when the player activates Reset Training.

- The move display identifies both player actions and dummy actions, including whether a player attack hit, was guarded, or missed.

- The repeatable dummy pattern does not create a round result, alter best-of-three scores, or persist changes outside the current training session.

**Reset while the hazard is active [edge-case] (ID: `reset-during-active-hazard`)**

*Given*

- Training Mode is active and the arena hazard is in its telegraphed or active phase.

- The fighter or dummy is currently affected by the hazard, in hit-stun, or in knockback.

*When*

- The player activates Reset Training during the hazard telegraph, active window, hit-stun, or knockback.

*Then*

- The reset completes at the next simulation-safe frame without applying additional hazard damage, knockback, or hit-stun.

- Both combatants return to their configured training positions and health.

- The hazard returns to its deterministic initial phase and its telegraph is not left visually active after reset.

- No hazard hit, attack result, or move-display entry is generated solely by the reset operation.

**Continue training when a controller disconnects [failure] (ID: `controller-disconnect-during-training`)**

*Given*

- Training Mode is active with a local controller assigned to the player.

- The player is not in a round transition or loading screen.

*When*

- The assigned controller disconnects or stops reporting input.

*Then*

- The fighter stops receiving movement and attack input within 100 milliseconds of the last valid input sample.

- The game pauses training and identifies the disconnected controller using the existing pause/input-reconnect flow.

- No buffered input causes an attack, dash, lane change, or reset while the controller is disconnected.

- After the controller is reconnected and the player confirms resume, the training state is preserved unless the player explicitly chooses Reset Training.

**Reset at the start and end of an input frame [boundary] (ID: `training-reset-at-simulation-boundary`)**

*Given*

- Training Mode is active at 60 simulation updates per second.

- The player activates Reset Training while an input frame contains a movement, attack, hazard, or rebound event.

*When*

- The reset request is received before the frame is simulated or after the frame has completed.

*Then*

- The reset is applied exactly once at a simulation-safe boundary.

- No partially applied attack, rebound, current displacement, hazard effect, or duplicate reset remains after the reset.

- The resulting state is identical for equivalent reset requests regardless of whether the request arrived before or after the frame simulation boundary.

#### Acceptance criteria

- Training Mode is selectable from the local mode flow and loads the same two fighters and the same three-lane arena used by local versus.

- Training Mode provides stationary dummy and repeatable dummy modes without AI decision-making or network services.

- The player can practice immediate directional movement, controllable momentum, dash burst, guard, light attack, heavy attack, directional attacks, basic chains, hit-stun, knockback, recovery, current interaction, reef rebounds, arena boundaries, wreckage cover, and the deterministic hazard.

- The move display shows the latest accepted player or dummy action, directional variant, and result state of hit, guard, miss, or interruption.

- Reset Training restores fighter, dummy, arena, current, hazard, health, momentum, hit-stun, knockback, guard, and move-display state to a deterministic baseline in no more than 250 milliseconds.

- Training Mode has no 90-second round timer, no round score, no best-of-three result, and no transition to match results.

- Training behavior uses the same combat simulation rules and input mappings as local versus, except for explicitly configured training-only dummy behavior and reset behavior.

- All training controls are available through both supported keyboard input and supported controller input, including remapped controls.

- Training Mode remains fully playable without an online connection or account service.

#### Failure states

- If the training scene fails to load, the game returns to the local mode selection screen and records the scene-load failure; it does not enter a partially initialized combat state.

- If the repeatable dummy pattern data is missing or invalid, Training Mode loads with the stationary dummy selected and identifies repeatable mode as unavailable for that session.

- If reset processing fails, gameplay remains paused, the reset control is not silently ignored, and the player can retry reset or leave Training Mode without corrupting local match state.

- If a controller disconnects, its held inputs are cleared and no input is reassigned to the other local player or dummy.

#### Invalid / Wrong-input behavior

- A reset request received while the training scene is not initialized is ignored and cannot modify local versus round or match state.

- A repeatable dummy pattern index outside the available pattern range is rejected and replaced with the stationary dummy mode.

- A move-display action identifier not present in the two-fighter MVP move definitions is not rendered as a valid move and is logged as an invalid simulation event.

- A lane selection outside the three valid depth lanes is clamped by the shared arena movement rules and cannot place a fighter outside the arena bounds.

- Multiple reset inputs received during one reset operation are coalesced into one reset and cannot produce duplicate reset events.

#### Boundary / Tolerance conditions

- The arena contains exactly three valid depth lanes; training must expose and permit transitions among lane 1, lane 2, and lane 3 only.

- Training Mode runs at the project's 60 simulation updates per second target and must remain deterministic across repeated resets.

- Reset requests are coalesced while a reset is pending and are applied no more than once per simulation frame.

- The move display retains the latest 32 recognized actions per combatant; when full, the oldest entry is removed first.

- Training Mode has no 90-second round timeout; the existing 90-second timer is disabled and must not resolve a training result.

- Dummy health cannot produce a match result; damage, hit-stun, knockback, and recovery may be observed, but training continues until the player exits.

- A fighter at an arena boundary cannot be moved beyond that boundary by training reset, current, rebound, knockback, or dummy interaction.

#### Offline / Failure behavior

Training Mode is entirely local. It loads fighter definitions, arena data, dummy patterns, controls, move-display labels, and reset behavior from packaged game data. No account, matchmaking, telemetry upload, or network connection is required. Telemetry events are queued locally when enabled and discarded or retained according to the existing local telemetry policy when no connection is available.

#### Accessibility / Usability

- Every training action, including dummy-mode selection, pattern start, reset, pause, and exit, is available through keyboard and controller input and respects remappable controls.

- The move display uses text labels in addition to color, animation, or sound to identify action, direction, and result.

- Hit, guard, miss, hazard telegraph, and reset feedback each use distinct visual and audio cues; no result may rely on color alone.

- The move display, dummy mode, and reset status remain visible while the game is paused and are readable at the project's minimum supported resolution.

- The player can pause Training Mode without losing the current drill state, and can resume or reset from the pause menu.

- Controller and keyboard prompts update to the currently assigned input device and do not require simultaneous use of both devices.

#### Telemetry

- Record training_mode_entered with selected fighter, input device, dummy mode, and arena build version.

- Record training_action_result with fighter, action identifier, direction, lane, result category, and simulation frame.

- Record training_reset with reset reason, current hazard phase, current dummy mode, and time since training entry.

- Record repeatable_dummy_started, repeatable_dummy_completed, and repeatable_dummy_interrupted with pattern identifier and completion frame.

- Record training_load_failure, invalid_pattern_data, controller_disconnect, and reset_processing_failure with local diagnostic context.

- Do not record raw keyboard keys, controller serial numbers, account identifiers, or network-originated player data.

#### Security considerations

- Training input is accepted only from locally assigned devices and cannot alter online, ranked, progression, or best-of-three match results.

- Packaged dummy patterns and move definitions are validated against known fighter, action, lane, timing, and arena identifiers before use.

- Reset and dummy-mode commands are scoped to the active training session and cannot invoke unrestricted debug commands, modify save data, or change match rules.

- Telemetry payloads contain no personally identifying information and are safe to discard when offline.

#### Performance targets

- At 60 simulation updates per second, accepted movement, attack, guard, dash, lane, and reset inputs are reflected in simulation within one simulation frame.

- The move display updates within 100 milliseconds of an accepted action and does not reduce the combat simulation rate below 60 updates per second.

- Training scene entry reaches an interactive state within 3 seconds after its load begins on the supported platform, excluding initial application startup.

- Reset Training completes within 250 milliseconds and within 15 simulation frames under normal local storage and CPU conditions.

- Training Mode adds no more than 32 MB of runtime memory over the loaded local versus arena and maintains a frame time of 16.67 milliseconds or less during combat, hazard activity, reset, and move-display updates.

#### Technical notes & dependencies

Implement Training Mode as a local match-context variant using the shared deterministic 2.5D combat simulation, fighter definitions, input mapping, arena collision, current, rebound, hazard, hit/hurt, and HUD systems. The training context must disable round countdown, 90-second timeout, round scoring, best-of-three transitions, and match results. Provide a stationary dummy entity with configurable start lane and position, infinite training continuity, and shared hurt, guard, hit-stun, knockback, and recovery states. Provide a repeatable dummy entity driven by packaged deterministic action-timeline data rather than AI. Each pattern must validate action identifiers, direction values, lane values, timing, and arena positions before activation. Maintain a per-combatant move-display buffer of 32 entries containing simulation frame, action identifier, direction, result category, and source combatant. Reset must execute through the simulation command queue at a frame boundary, clear pending inputs and active transient effects, restore deterministic fighter and dummy transforms and combat state, restore current and hazard phase, and clear the move-display buffer. The reset baseline must be generated from immutable training-session configuration so repeated resets produce identical state. Use the existing pause and remappable-control systems, with explicit bindings for reset, dummy mode, pattern start, pause, and exit. Keep all training-only state owned by the training scene or match context so leaving the mode cannot mutate local versus scores or persistent progression.

#### Dependencies

- Local mode selection and scene-loading flow

- Shared deterministic 2.5D combat simulation

- Two MVP fighter definitions and move metadata

- Three-lane handcrafted arena with current, reef rebound surfaces, wreckage cover, boundaries, and deterministic hazard

- Keyboard and controller input abstraction with remappable controls

- Pause and controller reconnect flow

- Combat HUD rendering and readable hit, guard, miss, hazard, and knockback feedback

- Packaged deterministic dummy-pattern data and local validation

- Existing local telemetry and diagnostic logging policy

---

## MVP Feature Specifications

### Feature: Local two-player versus with remappable controls, pause, and best-of-three results

As a local player, I want to configure keyboard or controller controls and complete a readable best-of-three Aqua Fighter match with another player, so that we can compete locally using our preferred inputs and understand every round and match result.

#### Technical Specifications

Implement a deterministic local match state machine with Setup, ActiveRound, Paused, RoundResult, MatchResult, and Aborted states. Use a fixed-step combat simulation so keyboard and controller inputs enter the same normalized action pipeline and produce reproducible momentum, dash, guard, attack, hit-stun, knockback, lane movement, current, rebound, wreckage-cover, and hazard behavior. Assign each input source to exactly one player and route normalized actions through player ownership before fighter simulation. Define event ordering explicitly: process input, movement and arena forces, attacks and collisions, health resolution, then timer expiry; document and test the zero-health/zero-timer case. Use active simulation time rather than wall-clock time for the timer. Reset health, hit-stun, knockback, momentum, active attacks, hazard state, and temporary arena interactions between rounds while preserving fighter selection and control layouts. Version serialized control layouts, validate action coverage and input identifiers on load, support restore-defaults, and retain the last valid layout on failure. Pause must halt gameplay and arena simulation, suppress gameplay action application, retain UI navigation input only, and auto-pause on application deactivation or participating-device loss. Integrate with the existing fighter definitions, three-lane arena collision and hazard systems, HUD, training-mode input display, local profile storage, and platform controller-discovery APIs.

### Feature: Two contrasting playable fighters

As a local versus player, I want to choose between a balanced introductory fighter and a movement-focused rival with distinct movement, aquatic techniques, weaknesses, approach options, and defensive options, so that I can learn and outplay different combat styles in Aqua Fighter.

#### Technical Specifications

Implement exactly the two MVP fighters as data-driven definitions within the deterministic 2.5D combat system. The balanced introductory fighter and movement-focused rival must have distinct movement behavior, one signature aquatic technique each, an authored weakness, a clear approach option, and a clear defensive option. Integrate both fighters with the three depth lanes, immediate directional movement, controllable momentum, dash burst, guard, light and heavy attacks, directional attacks, hit-stun, knockback, basic chains, and the available recovery option. Their techniques and combat behavior must work in local two-player versus and the minimal training mode, support keyboard and controller input with remappable controls, and expose readable combat feedback through the HUD and move display. Identical local inputs with identical fighter, arena, current, and hazard states must produce identical combat and round results.

### Feature: Deterministic 2.5D three-lane combat

As a local-versus player, I want responsive momentum-based movement and readable combat across three depth lanes, so that I can outmaneuver an opponent and complete a best-of-three match.

#### Technical Specifications

Implement the feature as deterministic local 1v1 combat with exactly three depth lanes, immediate directional movement, controllable momentum, dash burst, guard, light and heavy attacks, directional attacks, hit-stun, knockback, basic chains, and one recovery option. Support keyboard and controller input for both players, remappable controls, and pause. Use the single handcrafted arena's predictable current, reef rebound surfaces, lane-aware wreckage cover, boundaries, and one clearly telegraphed deterministic hazard with defined counterplay. Implement complete best-of-three rules with 90-second rounds, health reset between rounds, timeout resolution by remaining health, readable hit and hurt feedback, and an essential combat HUD. Training mode must use the combat rules with a stationary or repeatable dummy, move display, and reset controls for practicing movement, attacks, currents, rebounds, and the hazard. Online multiplayer, AI opponents, additional arenas, additional fighters, and network-dependent systems are out of scope.

### Feature: Three-lane arena with predictable current, reef rebounds, wreckage cover, boundaries, and deterministic hazard

As a local versus player, I want to read and use the arena current, reef rebound surfaces, lane-aware wreckage cover, boundaries, and telegraphed hazard, so that positioning and movement create predictable outplay opportunities.

#### Technical Specifications

Implement the arena as a deterministic local combat-space component for the supported 2.5D three-lane fighter simulation. Author stable lane geometry, a predictable current, reef rebound collision surfaces, lane-aware wreckage cover, explicit arena boundaries, and one deterministic hazard with a visible telegraph and documented counterplay. Resolve current movement, lane changes, rebound interactions, cover checks, hazard effects, knockback, and boundary containment in a fixed simulation order so identical local inputs produce identical results. Integrate the arena with local 1v1 best-of-three rounds, 90-second round timing, pause, remappable keyboard and controller controls, essential combat HUD feedback, and minimal training-mode reset and repeat controls. Hazard, current, rebound, cover, boundary, and timeout behavior must remain deterministic in both versus and training modes.

### Feature: Complete best-of-three combat rounds with readable feedback and essential HUD

As a local Aqua Fighter player, I want clear 90-second rounds with visible health, timer, hit feedback, and round results, so that I can understand the fight state and win a complete best-of-three match through readable combat decisions.

#### Technical Specifications

Implement an explicit local match and round state flow covering pre-round, active round, round resolution, and match resolution. The active-round timer must run for exactly 90 seconds and stop when the round resolves. A round ends when a fighter reaches zero health or when the timer expires; timeout resolution compares the fighters' remaining health at the authoritative 00:00 transition. Reset both fighters' health and temporary combat state between rounds without changing fighter selection or match score. End the match when a player reaches two round wins. The combat HUD must show both fighter identities, health, round scores, active round number, and timer. Hit and hurt feedback must be readable during deterministic 2.5D combat across the three depth lanes and must communicate impact and damage without relying on color alone. Support the local controller and keyboard inputs, including remappable controls and pause, with no online-service dependency.

### Feature: Minimal Training Mode

As an Aqua Fighter player, I want a local training mode with a controllable dummy, move display, and reset controls, so that I can learn movement, attacks, currents, rebounds, and the arena hazard before playing a best-of-three match.

#### Technical Specifications

Implement Training Mode as a local match-context variant using the shared deterministic 2.5D combat simulation, fighter definitions, input mapping, arena collision, current, rebound, hazard, hit/hurt, and HUD systems. The training context must disable round countdown, 90-second timeout, round scoring, best-of-three transitions, and match results. Provide a stationary dummy entity with configurable start lane and position, infinite training continuity, and shared hurt, guard, hit-stun, knockback, and recovery states. Provide a repeatable dummy entity driven by packaged deterministic action-timeline data rather than AI. Each pattern must validate action identifiers, direction values, lane values, timing, and arena positions before activation. Maintain a per-combatant move-display buffer of 32 entries containing simulation frame, action identifier, direction, result category, and source combatant. Reset must execute through the simulation command queue at a frame boundary, clear pending inputs and active transient effects, restore deterministic fighter and dummy transforms and combat state, restore current and hazard phase, and clear the move-display buffer. The reset baseline must be generated from immutable training-session configuration so repeated resets produce identical state. Use the existing pause and remappable-control systems, with explicit bindings for reset, dummy mode, pattern start, pause, and exit. Keep all training-only state owned by the training scene or match context so leaving the mode cannot mutate local versus scores or persistent progression.

---

## MVP Feature Specification Validation

### local-two-player-versus-controls-and-match-loop

- **Valid:** Yes

- **Repaired:** Yes

### two-fighter-roster

- **Valid:** Yes

- **Repaired:** Yes

### aqua-fighter-deterministic-2-5d-combat

- **Valid:** Yes

- **Repaired:** Yes

### three-lane-arena-environmental-outplay

- **Valid:** Yes

- **Repaired:** Yes

### complete-best-of-three-combat-round-rules

- **Valid:** Yes

- **Repaired:** Yes

### aqua-fighter-training-mode-mvp

- **Valid:** Yes

- **Repaired:** No

---

## Asset Metadata and Visual Prompt Contracts

### Aqua Fighter Default Input Control Layout

**Asset ID:** `aqua-fighter-input-control-layout`

**Category:** technical  

**Purpose:** Defines the default gamepad and keyboard mappings for movement, attacks, techniques, dash, guard, menus, and training controls.

**Format:** JSON  

**Resolution:** N/A

#### Acceptance criteria

- Gamepad and keyboard defaults match the controls specified in GDD section 2.2.

- Every gameplay action can be remapped independently.

- Keyboard rollover validation is available for all mapped gameplay actions.

- Controller dead-zone configuration is persisted per profile.

- Input mappings serialize deterministically for replay and online simulation.

### Deterministic Input Buffer and Direction Sampler

**Asset ID:** `aqua-fighter-deterministic-input-buffer`

**Category:** technical  

**Purpose:** Captures movement intent, attack direction, buffered chain inputs, dash buffers, and serialized input timing for deterministic gameplay and replay.

**Format:** C#  

**Resolution:** N/A

#### Acceptance criteria

- Offline input sampling runs at 240 Hz.

- Offline gameplay simulation runs at 120 Hz and online simulation runs at fixed 60 Hz.

- Attack direction is stored at attack commitment and is unaffected by later analog noise unless steering is explicitly enabled.

- The 100 ms dash buffer and 100 ms attack-chain buffer are represented consistently across simulation rates.

- Identical serialized inputs produce identical movement and attack outcomes across supported platforms.

### Aqua Fighter Combat State Machine

**Asset ID:** `aqua-fighter-combat-state-machine`

**Category:** technical  

**Purpose:** Controls fighter states including neutral movement, attacks, guard, hit-stun, launch, knockdown, rebound, hazard stun, and recovery states.

**Format:** C#  

**Resolution:** N/A

#### Acceptance criteria

- The state machine distinguishes light hit-stun, heavy hit-stun, launch, knockdown, rebound, and hazard stun.

- Movement and attack input are suppressed or permitted according to the active state definition.

- All state transitions are deterministic and serializable for replay.

- Guard break produces a guaranteed minimum vulnerability window.

- Recovery options are limited by the configured resource, cooldown, or move-specific rule.

### Fighter Combat Data Schema

**Asset ID:** `aqua-fighter-fighter-data-schema`

**Category:** technical  

**Purpose:** Stores deterministic fighter attributes, attack definitions, movement tuning, signature mechanics, weaknesses, defensive options, and arena interaction profiles.

**Format:** JSON Schema  

**Resolution:** N/A

#### Acceptance criteria

- The schema supports twelve launch fighter entries.

- Each fighter entry contains a readable silhouette reference, movement accent, universal attack set, signature mechanic, weakness, approach tool, defensive answer, and arena interaction profile.

- Attack startup, active, recovery, damage, hit-stun, knockback, guard interaction, and cancel windows are data-driven.

- All authoritative numeric fields use deterministic integer or fixed-point representations.

- Invalid or incomplete fighter data fails validation before entering a playable build.

### Universal Attack and Hurt Volume Library

**Asset ID:** `aqua-fighter-universal-attack-volume-library`

**Category:** technical  

**Purpose:** Provides authored hit volumes, hurt volumes, guard volumes, lane tolerances, and collision labels for readable fighter interactions.

**Format:** JSON  

**Resolution:** N/A

#### Acceptance criteria

- The library contains neutral light, heavy, rising, descending, dash, and follow-up attack volume definitions.

- Every active attack volume has an associated damage, hit-stun, knockback, lane tolerance, and guard interaction value.

- Volumes are visualized in training mode at gameplay scale.

- Collision results are identical for identical positions, states, and inputs.

- Volume placement does not conceal the attacking pose, defender reaction, or knockback direction.

### Deterministic Damage and Combo Scaling Rules

**Asset ID:** `aqua-fighter-damage-scaling-rules`

**Category:** technical  

**Purpose:** Calculates damage, combo scaling, counter-hit modifiers, guard modifiers, environmental multipliers, and technique resource modifiers.

**Format:** JSON  

**Resolution:** N/A

#### Acceptance criteria

- The default scaling values are 100 percent for the first hit, 92 percent for the second, 84 percent for the third, and a minimum of 45 percent thereafter.

- Environmental hit multipliers use a separately capped value.

- Damage outcomes are deterministic and independent of platform floating-point behavior.

- Guard, counter-hit, technique resource, and mode-specific modifiers are individually auditable in combat logs.

- The system prevents infinite or low-risk damage loops through configured route and scaling limits.

### Aquatic Technique Data Schema

**Asset ID:** `aqua-fighter-technique-data-schema`

**Category:** technical  

**Purpose:** Defines character techniques, including timing, damage, resource cost, cooldown, direction, guard behavior, environmental interaction, telegraph, counterplay, and deterministic simulation rules.

**Format:** JSON Schema  

**Resolution:** N/A

#### Acceptance criteria

- Each technique record contains startup, active frames, recovery, damage, hit-stun, knockback, resource cost, cooldown, directional behavior, guard interaction, environmental interaction, telegraph, counterplay, VFX reference, and audio reference.

- The schema supports direct damage, space control, current creation, momentum redirection, defensive escape, cover denial, combo routing, hazard interruption, and resource conversion techniques.

- Every technique has an explicit online determinism flag and serialized execution parameters.

- Missing counterplay or telegraph data prevents the technique from being marked production-ready.

### Deterministic Arena Collision Resolution System

**Asset ID:** `aqua-fighter-collision-resolution-system`

**Category:** technical  

**Purpose:** Resolves movement, current force, dash and technique displacement, knockback, rebound, arena boundaries, wreckage, and reef contacts in a fixed priority order.

**Format:** C#  

**Resolution:** N/A

#### Acceptance criteria

- Collision processing follows the specified nine-step priority order from player movement through reef contact resolution.

- The system uses authored static shapes and deterministic slide, snap, unsticking, and boundary rules.

- No collision result depends on emergent rigid-body restitution.

- Identical replay inputs produce identical collision positions and state transitions.

- Fighters cannot be trapped indefinitely by wreckage corners or authored cover.

### Three-Lane Underwater Arena Collision Data

**Asset ID:** `aqua-fighter-arena-collision-data`

**Category:** environment  

**Purpose:** Defines the 2D combat plane, foreground, center, and background gameplay lanes, lane transitions, arena boundaries, cover shapes, reef contacts, and hazard occupancy.

**Format:** JSON  

**Resolution:** N/A

#### Acceptance criteria

- The arena contains exactly three gameplay depth lanes with defined world-space depths.

- Lane transitions have a consistent authored duration and serialized completion state.

- Each cover, reef, boundary, and hazard object has lane occupancy and collision flags.

- Minimum escape distances and corner unsticking rules are authored for every static obstacle.

- Lane data supports attack tolerance checks and camera readability testing.

### Authored Current Volume and Lane Data

**Asset ID:** `aqua-fighter-current-volume-data`

**Category:** environment  

**Purpose:** Defines predictable current paths, active lanes, directional force, acceleration curves, momentum caps, entry telegraphs, exit behavior, and projectile or hazard influence.

**Format:** JSON  

**Resolution:** N/A

#### Acceptance criteria

- Every current defines shape or path, active lanes, direction, magnitude, acceleration curve, maximum applied momentum, entry telegraph, exit behavior, and attack availability.

- Current force is applied after player intent and before collision resolution.

- Current entry and exit never randomly rotate a fighter.

- Current effects use capped, smoothly interpolated force.

- The current supports an intentional approach, momentum retention, dash cancel, and heavy-strike route in a test arena.

### Authored Reef Rebound Profiles

**Asset ID:** `aqua-fighter-reef-rebound-profiles`

**Category:** environment  

**Purpose:** Defines deterministic reef contact behavior, rebound impulse, steering, duration, cancel windows, invulnerability, and sequence-use limits.

**Format:** JSON  

**Resolution:** N/A

#### Acceptance criteria

- Every rebound profile contains impulse vector, steering percentage, duration ticks, attack cancel start, attack cancel end, invulnerability frames, and maximum uses per sequence.

- Valid reef contact snaps the fighter to a deterministic collision location.

- Rebound steering and cancel behavior are testable in training mode.

- Rebound impulses are authored values and never calculated from rigid-body restitution.

- A rebound can convert a near-ring-out into a controlled counterattack without producing an infinite loop.

### Gameplay Current Flow Effects

**Asset ID:** `aqua-fighter-current-flow-vfx`

**Category:** VFX  

**Purpose:** Visually communicates current direction, active lanes, acceleration strength, entry state, and exit state without obscuring fighters or attack volumes.

**Format:** PNG sprite sheet  

**Resolution:** 2048x1024 per lane variant

#### Acceptance criteria

- Foreground, center, and background lane variants are distinguishable at gameplay camera scale.

- Flow direction is readable within 250 ms of entering the volume.

- The effect communicates active current status without hiding fighter silhouettes, hit volumes, or knockback direction.

- The effect supports colorblind-safe direction cues through shape and motion, not color alone.

- Entry and exit transitions match the authored current timing data.

### Reef Rebound Contact and Direction Effects

**Asset ID:** `aqua-fighter-reef-rebound-vfx`

**Category:** VFX  

**Purpose:** Communicates reef contact, rebound direction, rebound state, available cancel timing, and limited invulnerability without obscuring gameplay.

**Format:** PNG sprite sheet  

**Resolution:** 1024x1024 per effect variant

#### Acceptance criteria

- Contact impact, rebound travel, cancel availability, and rebound completion have separate readable visual states.

- The effect displays the rebound direction consistently with the authored impulse vector.

- Effects remain legible in all three depth lanes.

- The effect does not hide the fighter hurtbox or the reef collision contact point.

- The effect duration matches the serialized rebound duration within one simulation tick.

### Visual prompt: aqua-fighter-input-control-layout

Create a polished 16:9 gameplay-UI reference plate for Aqua Fighter showing a controller and keyboard control layout beside a readable underwater arena vignette. Clearly label four-direction movement, light attack, heavy attack, aquatic technique, dash burst, guard, alternate technique, pause/menu, and training or replay controls. Use large high-contrast iconography, clean grouping by action category, accessible typography, and subtle anime aquatic accents such as translucent bubbles, cyan current lines, and coral framing. The layout should communicate immediate accessibility without appearing like a dense technical manual. Keep all labels legible at presentation scale and reserve clear space around the control diagrams.

**Aspect ratio:** 16:9

#### Style constraints

- Readable anime action-game presentation with polished production UI

- High contrast between labels, icons, and deep-ocean background

- No clutter, no ambiguous button symbols, no hidden controls

- Use family-friendly color coding and accessibility-conscious typography

- Do not depict uncontrolled physics or a free-roaming 3D control scheme

### Visual prompt: aqua-fighter-deterministic-input-buffer

Create a 16:9 visual systems diagram for Aqua Fighter illustrating deterministic input capture and buffering during a fast underwater attack sequence. Show a fighter moving through a center lane, committing to a directional attack, buffering a follow-up light or heavy attack during recovery, and receiving a dash input within a clearly marked timing window. Use a horizontal simulation timeline with input samples, commitment markers, chain acceptance, rejected duplicate input, and serialized replay data. The visual should make it obvious that attack direction is sampled at commitment and later analog noise cannot alter the move. Present the timing as precise but approachable, using glowing water trails and crisp frame markers rather than abstract engineering notation alone.

**Aspect ratio:** 16:9

#### Style constraints

- Combine anime gameplay readability with technical motion-graphics clarity

- Use deterministic, repeatable trajectories and visibly authored timing windows

- Clearly distinguish accepted, buffered, and rejected inputs

- Avoid chaotic motion blur that hides attack direction or state changes

- Use fixed-point or replay concepts symbolically without implying emergent physics

### Visual prompt: aqua-fighter-combat-state-machine

Create a 16:9 production concept diagram for the Aqua Fighter combat state machine. Depict one aquatic fighter progressing through neutral movement, light attack, guard, heavy hit-stun, launch, knockdown, reef rebound, hazard stun, and recovery states around a central arena silhouette. Connect states with directional arrows and clearly mark player-controlled transitions, authored restrictions, recovery windows, and defensive options. Use small readable action snapshots for each state: guarded stance, exaggerated impact pose, launched body line, grounded knockdown, rebound silhouette, and directional recovery. The composition should demonstrate that spectacle remains readable and that every advanced state has a visible rule and counterplay.

**Aspect ratio:** 16:9

#### Style constraints

- Readable anime fighting-game pose language

- Use distinct colors for controllable, restricted, vulnerable, and recovery states

- Show clear hit reactions and defensive opportunities

- Do not obscure silhouettes with excessive VFX

- Keep transitions authored and deterministic rather than physically emergent

### Visual prompt: aqua-fighter-fighter-data-schema

Create a 16:9 character-design data visualization for Aqua Fighter showing a structured fighter profile for a balanced introductory rival. Include a bold readable silhouette, movement accent, universal light and heavy attacks, signature aquatic mechanic, approach tool, defensive answer, weakness, and arena interaction profile. Surround the character with clean data cards for movement responsiveness, momentum retention, dash range, guard stability, technique identity, and environmental affinity. Use an anime underwater hero design with strong silhouette separation, expressive pose, and restrained water effects. The presentation should feel like a production-ready fighter select or design-bible page, not a generic character poster.

**Aspect ratio:** 16:9

#### Style constraints

- Distinct silhouette readable at gameplay scale

- Accessible visual language with one clear signature mechanic

- Use controlled anime spectacle and restrained aquatic VFX

- Avoid implying fighter-specific progression advantages in ranked play

- Show strengths and weaknesses with balanced, non-misleading presentation

### Visual prompt: aqua-fighter-universal-attack-volume-library

Create a 16:9 technical gameplay visualization of Aqua Fighter attack and defense volumes in a fixed-camera 2.5D underwater arena. Show a fighter performing a forward light punch, rising attack, descending heavy kick, guard, and directional technique across the foreground, center, and background lanes. Overlay clean translucent hit volumes, hurt volumes, guard arcs, lane tolerance bands, and collision labels using distinct colors and solid outlines. Include one impact moment where the attacking pose, defending hurt reaction, active hit volume, and knockback direction remain simultaneously readable. Keep the camera orthographic and compositionally clear, with coral and wreckage serving only as secondary environmental context.

**Aspect ratio:** 16:9

#### Style constraints

- Technical overlay must remain legible over anime character art

- Use precise authored shapes rather than soft or ambiguous effect clouds

- Clearly separate hit, hurt, guard, and lane-tolerance visualization

- Fixed-camera 2.5D composition with three readable depth lanes

- No excessive camera shake, bloom, or motion blur

### Visual prompt: aqua-fighter-damage-scaling-rules

Create a 16:9 combat analytics presentation for Aqua Fighter showing a short deterministic combo in an underwater arena: light punch, second light, heavy launch, and environmental reef contact. Display a clean damage meter and segmented combo-scaling readout showing first-hit strength, reduced subsequent damage, a capped environmental multiplier, and the final total. Include a small counter-hit and guarded-hit comparison panel without overcrowding the main action. The fighters must remain visible in readable anime impact poses, with clear knockback direction and no visual suggestion of random damage outcomes. Make the display feel suitable for training mode, replay review, or competitive match analysis.

**Aspect ratio:** 16:9

#### Style constraints

- Data-driven competitive fighting-game UI

- Damage and scaling values must appear deterministic and consistently ordered

- Use strong impact frames while preserving fighter silhouettes and hit direction

- Avoid sensationalized infinite-combo imagery

- Environmental contribution must be visibly capped and understandable

### Visual prompt: aqua-fighter-technique-data-schema

Create a 16:9 production concept sheet for an Aqua Fighter aquatic technique called Pressure Burst. Show the technique in a fixed-camera 2.5D arena with a strong anticipation pose, a readable startup telegraph, a concentrated active pressure wave, recovery vulnerability, directional behavior, guard interaction, resource cost, cooldown indicator, and a clear counterplay route. Include compact technical callouts for startup, active duration, recovery, damage, hit-stun, knockback, lane coverage, environmental interaction, and deterministic simulation requirements. The effect should feel spectacular through layered water compression, speed lines, and a sharp impact frame, while never hiding the attacker, defender, hit volume, or available escape.

**Aspect ratio:** 16:9

#### Style constraints

- Anime aquatic spectacle with strict gameplay clarity

- Telegraph, active area, and recovery state must be visually distinct

- Use authored directional geometry rather than amorphous fluid simulation

- Show a fair counterplay option and readable guard response

- Avoid effects that obscure hurt reactions or lane relationships

### Visual prompt: aqua-fighter-collision-resolution-system

Create a 16:9 sequential systems illustration of Aqua Fighter's deterministic collision-resolution order in a compact underwater arena. Present six numbered visual stages: player input movement, state restrictions, current force, dash or technique displacement, knockback or rebound, then arena and environmental collision resolution. Use the same fighter and same starting position in each stage so the final position can be traced. Include a reef, wreckage object, arena boundary, and current lane, with color-coded velocity arrows and source tags. The style should combine polished anime gameplay frames with an engineering-grade sequence diagram and make every displacement visibly authored and reproducible.

**Aspect ratio:** 16:9

#### Style constraints

- Sequential before-and-after states must be spatially traceable

- Use fixed-camera 2.5D framing and explicit collision geometry

- Color-code force sources without creating visual clutter

- No ragdoll behavior, random rebounds, or uncontrolled rigid-body motion

- Final collision result must be predictable from the displayed order

### Visual prompt: aqua-fighter-arena-collision-data

Create a 16:9 top-down-plus-side-profile arena layout sheet for Aqua Fighter showing the 2D combat plane, foreground, center, and background gameplay lanes, lane-transition paths, fixed arena boundaries, static wreckage cover, reef contact surfaces, and clearly marked hazard occupancy. Use a readable orthographic presentation with a small side profile inset to explain depth separation without turning the arena into free 3D space. Place two fighter markers in opposing lanes and show attack lane tolerance, minimum escape routes, and unobstructed camera composition. The arena should feel like a tactical underwater combat tool with coral, wreckage, and current-routing opportunities.

**Aspect ratio:** 16:9

#### Style constraints

- Fixed-camera 2.5D arena logic must be immediately understandable

- Three depth lanes should be visually distinct but not physically exaggerated

- Cover and reef geometry must be static, authored, and escape-safe

- Leave clear sightlines for both fighters and hazards

- Use attractive underwater color and composition without sacrificing map readability

### Visual prompt: aqua-fighter-current-volume-data

Create a 16:9 gameplay concept visualization of a predictable authored current volume in an Aqua Fighter arena. Show a bright directional water lane crossing the center and background lanes, with visible entry boundary, acceleration gradient, maximum momentum cap, exit behavior, and a separate projectile or hazard interaction indicator. Depict one fighter intentionally entering the current, retaining forward control, redirecting momentum, and exiting into a dash strike route. Use arrows, lane labels, and compact callouts while preserving an exciting anime combat moment. The current must read as a tactical movement tool, not a random environmental force.

**Aspect ratio:** 16:9

#### Style constraints

- Current direction and strength must be visually predictable

- Show player control remaining active inside the current

- Use smooth authored flow bands rather than noisy fluid simulation

- Do not rotate fighters unpredictably or conceal attack volumes

- Support the gameplay fantasy of approach, routing, dash cancel, and strike

### Visual prompt: aqua-fighter-reef-rebound-profiles

Create a 16:9 production reference image showing an authored reef rebound sequence in Aqua Fighter. Present three connected gameplay moments: fighter contact with a coral reef surface, deterministic rebound impulse away from the reef, and a controllable rebound cancel into either an attack or dash. Overlay the rebound vector, steering percentage, duration window, invulnerability interval, attack-cancel window, and sequence-use limit using clean visual markers. Include an opponent positioned to make the rebound a deliberate reversal rather than an accidental bounce. Use strong anime poses and bright coral impact accents while keeping contact points and recovery options unmistakable.

**Aspect ratio:** 16:9

#### Style constraints

- Rebound must look authored and repeatable, never like rigid-body physics

- Contact point and impulse direction must be explicit

- Show limited steering and clearly bounded cancel timing

- Invulnerability must be communicated subtly without obscuring the fighter

- The reef should support strategic reversal and ring-out recovery readability

### Visual prompt: aqua-fighter-current-flow-vfx

Create a 16:9 in-game VFX style frame for Aqua Fighter showing a current communicating direction, active lanes, acceleration strength, entry state, and exit state during combat. Use layered translucent ribbons, particulate bubbles, contour lines, and compact directional chevrons that flow behind and around two clearly visible fighters. The current should guide the eye through a possible approach route while leaving attack silhouettes, hurt reactions, hazards, and collision boundaries unobstructed. Include subtle variations in flow density to indicate acceleration without suggesting uncontrolled simulation. The palette should be deep navy, cyan, teal, and selective warm warning accents.

**Aspect ratio:** 16:9

#### Style constraints

- VFX must communicate gameplay information before decorative spectacle

- Keep fighters, active hit volumes, and hazards readable at all times

- Use clean directional ribbons and authored flow patterns

- Avoid opaque fog, excessive bloom, and full-screen distortion

- Maintain anime energy with restrained, accessibility-friendly contrast

### Visual prompt: aqua-fighter-reef-rebound-vfx

Create a 16:9 in-game VFX style frame for Aqua Fighter depicting a readable reef rebound. Show a fighter contacting a coral surface with a crisp impact flash, a directional burst that indicates the authored rebound impulse, a brief protected-state accent, and a small timing cue for the available attack or dash cancel. Keep the opponent and arena lane structure visible so the rebound reads as a tactical movement event and potential counterattack. Use coral shards, bubble rings, curved motion trails, and a high-contrast impact frame, but keep the effect localized to the contact and travel path.

**Aspect ratio:** 16:9

#### Style constraints

- Clearly distinguish contact, rebound travel, invulnerability, and cancel timing

- Use localized VFX that never hides either fighter's silhouette

- Rebound direction must be visually unambiguous

- Avoid random-looking debris or physically simulated fragmentation

- Support anime spectacle while preserving recovery and counterplay readability

---

## Asset List

### TECHNICAL

- Aqua Fighter Default Input Control Layout — Defines the default gamepad and keyboard mappings for movement, attacks, techniques, dash, guard, menus, and training controls. — JSON — N/A

- Deterministic Input Buffer and Direction Sampler — Captures movement intent, attack direction, buffered chain inputs, dash buffers, and serialized input timing for deterministic gameplay and replay. — C# — N/A

- Aqua Fighter Combat State Machine — Controls fighter states including neutral movement, attacks, guard, hit-stun, launch, knockdown, rebound, hazard stun, and recovery states. — C# — N/A

- Fighter Combat Data Schema — Stores deterministic fighter attributes, attack definitions, movement tuning, signature mechanics, weaknesses, defensive options, and arena interaction profiles. — JSON Schema — N/A

- Universal Attack and Hurt Volume Library — Provides authored hit volumes, hurt volumes, guard volumes, lane tolerances, and collision labels for readable fighter interactions. — JSON — N/A

- Deterministic Damage and Combo Scaling Rules — Calculates damage, combo scaling, counter-hit modifiers, guard modifiers, environmental multipliers, and technique resource modifiers. — JSON — N/A

- Aquatic Technique Data Schema — Defines character techniques, including timing, damage, resource cost, cooldown, direction, guard behavior, environmental interaction, telegraph, counterplay, and deterministic simulation rules. — JSON Schema — N/A

- Deterministic Arena Collision Resolution System — Resolves movement, current force, dash and technique displacement, knockback, rebound, arena boundaries, wreckage, and reef contacts in a fixed priority order. — C# — N/A

### ENVIRONMENT

- Three-Lane Underwater Arena Collision Data — Defines the 2D combat plane, foreground, center, and background gameplay lanes, lane transitions, arena boundaries, cover shapes, reef contacts, and hazard occupancy. — JSON — N/A

- Authored Current Volume and Lane Data — Defines predictable current paths, active lanes, directional force, acceleration curves, momentum caps, entry telegraphs, exit behavior, and projectile or hazard influence. — JSON — N/A

- Authored Reef Rebound Profiles — Defines deterministic reef contact behavior, rebound impulse, steering, duration, cancel windows, invulnerability, and sequence-use limits. — JSON — N/A

### VFX

- Gameplay Current Flow Effects — Visually communicates current direction, active lanes, acceleration strength, entry state, and exit state without obscuring fighters or attack volumes. — PNG sprite sheet — 2048x1024 per lane variant

- Reef Rebound Contact and Direction Effects — Communicates reef contact, rebound direction, rebound state, available cancel timing, and limited invulnerability without obscuring gameplay. — PNG sprite sheet — 1024x1024 per effect variant

---

## Scope Review

### Feature: 12-fighter launch roster

**Severity:** High

**Critique:** Twelve fighters multiplied by unique movement accents, signature mechanics, techniques, animations, VFX, balance data, arena interactions, tutorials, and matchup testing is a major production burden. The roster also creates a large balance matrix before the core combat is proven.

**Suggestion:** Cut V1 to 4 fighters: one balanced tutorial fighter, one mobility specialist, one control specialist, and one heavy fighter. Build all four from the same universal base kit and allow only one signature mechanic per fighter. Add the remaining roster only after the combat prototype survives external playtesting.



### Feature: Online ranked multiplayer

**Severity:** High

**Critique:** Deterministic simulation, rollback or lockstep networking, input delay handling, desync detection, matchmaking, reconnect behavior, region support, ranking, moderation, and platform certification are separate products inside the game. Supporting 240 Hz input, 120 Hz offline simulation, and 60 Hz online simulation increases synchronization risk.

**Suggestion:** Remove online ranked play from V1. Ship local versus, training, and possibly same-device challenge modes first. If online is mandatory, target one fixed 60 Hz simulation with rollback and no ranked ladder, crossplay, or reconnect complexity until the core combat is validated.



### Feature: Multiple simulation rates and deterministic replay

**Severity:** High

**Critique:** Maintaining 240 Hz input sampling, 120 Hz offline simulation, 60 Hz online simulation, fixed-point movement, serialized timing markers, replay validation, and platform-independent outcomes is a high-risk engineering requirement. Differences in rounding, input buffering, collision order, and animation timing will create difficult-to-reproduce bugs.

**Suggestion:** Use one fixed simulation rate for V1, preferably 60 Hz or 120 Hz depending on prototype feel. Store inputs and deterministic random seeds only after the simulation is stable. Defer authoritative replay verification and cross-rate compatibility.



### Feature: Full environmental interaction suite

**Severity:** High

**Critique:** Currents, reefs, wreckage, cover, lane splitting, rebounds, projectiles, hazards, hit-stun, knockback, and techniques all interacting creates a combinatorial collision matrix. Every combination needs rules for priority, escape, camera visibility, corner behavior, and competitive fairness.

**Suggestion:** Choose one signature environmental interaction for V1: authored currents plus simple boundary rebounds. Remove hard cover, movable-looking wreckage, lane-splitting objects, and complex environmental multipliers. Use static visual props until the core interaction is proven.



### Feature: Three gameplay depth lanes

**Severity:** High

**Critique:** Depth lanes require lane-aware hitboxes, attack tolerance, transitions, camera composition, cover rules, projectile behavior, collision handling, player readability, and edge-case testing during hit-stun and knockback. They can also make attacks feel like they miss for unclear reasons.

**Suggestion:** Prototype two lanes first, or make depth a single short dodge/shift action rather than a continuously available three-lane system. Restrict attacks to clear lane rules and avoid attacks that hit arbitrary lane combinations in V1.



### Feature: Universal chain system plus fighter-specific branches

**Severity:** High

**Critique:** Buffered inputs, priority rules, duplicate rejection, route limits, branch-specific timing, cancel windows, hit-confirm behavior, animation transitions, and training feedback are more complex than a simple three-hit combo system. Ambiguous directional input will generate frequent player-facing errors.

**Suggestion:** Ship one universal Light-Light-Heavy chain and one directional finisher per fighter. Remove branching route trees, alternate chain priorities, and extensive fighter-specific cancel logic from V1.



### Feature: Aquatic technique slots and environmental technique interactions

**Severity:** High

**Critique:** Each technique requires authored timing, hitboxes, resource behavior, guard rules, telegraphs, VFX, sound, animation, counterplay, and interaction testing with currents, cover, rebounds, hazards, and every fighter state. Supporting multiple technique roles per character creates substantial balance and content cost.

**Suggestion:** Give each fighter one signature technique in V1. Use a shared resource model and restrict techniques to one or two interaction categories, such as damage or movement control. Defer alternate techniques, modifiers, grabs, traps, clouds, and persistent hazards.



### Feature: Guard, guard strain, guard breaks, recovery options, and multiple defensive states

**Severity:** High

**Critique:** Manual guard, directional arcs, guard pushback, strain thresholds, repeated-pressure rules, guard breaks, air techs, dash recovery, technique cancels, reef rebounds, and lane escapes can create defensive complexity that is difficult to teach and balance. The design risks producing situations where players cannot tell which escape is valid.

**Suggestion:** Use one guard state, one clear guard-break rule, and one universal recovery option. Remove fighter-specific defensive exceptions and resource-based recovery variants from V1. Make guard direction either full-front with a clear facing indicator or omnidirectional.



### Feature: Hazard-heavy arenas and fair escalation

**Severity:** High

**Critique:** Every hazard needs telegraphs, activation timing, collision outcomes, interruption behavior, recovery rules, camera treatment, accessibility settings, and competitive balance. Hazard interactions with currents, knockback, guard, cover, and techniques will multiply QA requirements. Background creatures and spectacle can also be mistaken for gameplay threats.

**Suggestion:** Exclude hazards from ranked and standard V1 matches. Include one optional casual arena hazard with a fixed timer, obvious telegraph, fixed damage, and a guaranteed escape route. Treat background creatures as non-interactive visual dressing.



### Feature: Dynamic camera, anime spectacle, and impact presentation

**Severity:** Medium

**Critique:** Camera shake, hit-stop, speed lines, finishing poses, callouts, water effects, lane visibility, silhouettes, and readable hurt reactions compete for screen space. Effects that look good in isolation may obscure hit volumes, current telegraphs, or directional knockback. Camera behavior also becomes difficult around boundaries and cover.

**Suggestion:** Use a fixed camera with limited, globally tuned hit-stop and one restrained impact effect. Remove character-specific camera moves, finishing poses, large screen overlays, and complex speed-line packages from V1. Add an effects intensity accessibility slider.



### Feature: Wreckage as hard cover and line-of-sight gameplay

**Severity:** High

**Critique:** Cover introduces occlusion, corner trapping, projectile path rules, lane-specific collision, minimum escape distances, camera conflicts, and potential stalling strategies. It is effectively a tactical level-design system layered onto a fighter.

**Suggestion:** Cut hard cover from V1. Replace it with visually distinct static reefs or soft boundary zones that provide a single predictable rebound interaction. Reintroduce cover only after matches demonstrate a need for line-of-sight play.

