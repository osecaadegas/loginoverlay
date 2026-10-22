# SC Web Transitions 3.0.0 RC1 changelog

- Rebalanced Money bill sizes. 960×540 synthetic note count reduced from 102 to 47 while maintaining measured 98.97% coverage; 1280×720 synthetic: 66 bills, 98.94% coverage.
- Made the hero bill originate at the physically simulated position of a note in the blast instead of starting from its original static anchor.
- Kept IN camera concealed until a post-activation OBS keyed screenshot is available (availability heuristic, not frame freshness proof).
- Improved initial Money IN and Ice IN cover construction.
- Replaced repeating smoke turbulence with multi-scale, seeded, advected nonperiodic noise; preserved bottom-up emergence and flowing continuity.
- Added explicit Program / Preview target selection for OBS Studio Mode.
- Added loopback Host and Origin checks on the local HTTP service.
- Added safe previous-executable backups and restore attempt on failed Windows upgrades, and Start Menu shortcut creation.
- Added optional Inno Setup recipe (not compiled) and a separate experimental native OBS filter project (not installed).
- Added 4-effect IN cover verification test and full-motion synthetic review recordings.
