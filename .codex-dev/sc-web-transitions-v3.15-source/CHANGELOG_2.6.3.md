# SC Web Transitions v2.6.4 Cinematic Polish

- Money cover never draws the webcam snapshot: animated mixed-size bills fall onto the LIVE camera image in OBS.
- The final alpha-clipped layer contains only your custom sheep banknotes, not a still of the person. It completes the silhouette coverage before OBS hides the camera.
- Money OUT now blasts individual bills apart with centrifugal movement, gravity and a continuous perspective lens bill, which falls away last.
- Smoke and Toxic preserve their approved appearance while keeping turbulence, drift, rotation, and toxic sparks moving during OBS source handoff.
- The cover-to-play motion phase carries actual elapsed time and does not snap backwards after the controller toggles the camera.
- Ice stays unchanged.

## Known limitations
The position of the banknote silhouette is derived from a keyed OBS screenshot at effect start. A one-time capture cannot track a person moving outside that silhouette. This application cannot guarantee covering extreme motion without a continuous live alpha-mask feed. Test with natural motion at 1080p60 before public release.
