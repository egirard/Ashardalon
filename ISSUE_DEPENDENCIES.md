# Issue Dependencies Analysis

This document outlines the dependencies between open issues in the repository. These dependencies should be added as blockers to help prioritize work and understand the relationships between different features.

## Dependency Graph

```
Legend:
  → depends on / is blocked by
  
#34 (Win Adventure)
  → #102 (Player Cards) - needs player/hero state tracking
  → #107 (Encounter Cards) - needs encounter system for villain spawning

#107 (Encounter Cards tracking) [Meta-issue]
  → #125 (Integration) - integration depends on this tracking
  → #126 (Special Encounters) - subset of encounter functionality
  → #127 (Traps/Hazards) - subset of encounter functionality

#122 (Status/Conditions for Power Cards)
  [No blocking dependencies, but provides foundation for:]
  - #127 (some traps apply status conditions)
  - #126 (some encounters apply status effects)

#123 (Conditional Effects for Power Cards)
  [No blocking dependencies]

#124 (Board Tokens for Power Cards)
  [No blocking dependencies, but provides foundation for:]
  - #127 (traps/hazards need persistent board markers)

#125 (Integration of Encounter Mechanics)
  → #107 (Encounter Cards tracking) - integration needs the tracking issue
  → #126 (Special Encounters) - integrates special encounter implementations
  → #127 (Traps/Hazards) - integrates trap/hazard implementations

#126 (Special Encounter Mechanics)
  → #103 (Treasure Cards) - special encounters involve treasure placement
  → #107 (Encounter Cards tracking) - subset of encounter functionality

#127 (Traps and Hazards)
  → #124 (Board Tokens) - needs persistent board markers like power card tokens

#102 (Player Cards)
  [No blocking dependencies]

#103 (Treasure Cards)
  [No blocking dependencies]
```

## Detailed Dependency Analysis

### High Priority Foundation Issues
These issues have no blockers and should be prioritized:

1. **#102 - Player Cards** (0 blockers)
   - Foundation for #34 (Win Adventure)
   - Core gameplay element

2. **#103 - Treasure Cards** (0 blockers)
   - Foundation for #126 (Special Encounters)
   - Core gameplay element

3. **#122 - Status/Conditions for Power Cards** (0 blockers)
   - Provides foundation for #127 and #126
   - Power card functionality

4. **#123 - Conditional Effects for Power Cards** (0 blockers)
   - Power card functionality

5. **#124 - Board Tokens for Power Cards** (0 blockers)
   - Foundation for #127 (Traps/Hazards)
   - Power card functionality

### Mid Priority Implementation Issues
These issues depend on foundation issues:

6. **#107 - Track Encounter Cards** (0 blockers, but is a meta-issue)
   - Meta-issue for tracking encounter card implementation
   - Foundation for #125, #126, #127

7. **#126 - Special Encounter Mechanics** (2 blockers)
   - Blocked by: #103 (Treasure Cards), #107 (Encounter Cards tracking)
   - Implements special encounter card effects

8. **#127 - Traps and Hazards** (1 blocker)
   - Blocked by: #124 (Board Tokens)
   - Implements trap and hazard encounter cards

### High Priority Integration Issues
These issues integrate multiple subsystems:

9. **#125 - Integration of Encounter Mechanics** (3 blockers)
   - Blocked by: #107 (Encounter Cards tracking), #126 (Special Encounters), #127 (Traps/Hazards)
   - Integrates all encounter card subsystems
   - Final integration and testing phase

### Feature Completion Issues
These issues build on multiple other systems:

10. **#34 - Win Adventure** (2 blockers)
    - Blocked by: #102 (Player Cards), #107 (Encounter Cards)
    - End-game victory condition
    - User-facing feature

## Recommended Work Order

Based on dependency analysis, the recommended work order is:

### Phase 1: Foundation (Parallel work possible)
1. #102 - Player Cards
2. #103 - Treasure Cards
3. #122 - Status/Conditions for Power Cards
4. #123 - Conditional Effects for Power Cards
5. #124 - Board Tokens for Power Cards

### Phase 2: Encounter System
6. #107 - Track Encounter Cards (meta-issue, ongoing)
7. #126 - Special Encounter Mechanics (after #103, #107)
8. #127 - Traps and Hazards (after #124)

### Phase 3: Integration
9. #125 - Integration of Encounter Mechanics (after #107, #126, #127)

### Phase 4: Feature Completion
10. #34 - Win Adventure (after #102, #107)

## Blocker Relationships to Add

The following blocker relationships should be added to GitHub issues:

| Issue | Should be blocked by | Reason |
|-------|---------------------|---------|
| #34 | #102, #107 | Needs player state tracking and encounter system |
| #125 | #107, #126, #127 | Integration depends on subsystem implementations |
| #126 | #103, #107 | Needs treasure system and encounter tracking |
| #127 | #124 | Needs board token system for persistent markers |

## Notes on Non-Blocking Dependencies

Some issues provide functionality that would benefit others but are not strict blockers:

- #122 (Status/Conditions) would benefit #127 (some traps apply conditions) and #126 (some encounters apply conditions)
- #124 (Board Tokens) is required for #127 but also provides similar functionality

These should be noted in issue comments or descriptions but may not need to be formal blockers if the dependent issues can implement workarounds.
