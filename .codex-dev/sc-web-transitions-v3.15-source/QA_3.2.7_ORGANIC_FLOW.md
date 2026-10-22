# SC Web Transitions v3.2.7 — QA results

**Status: private test candidate, not certified for public release.**

- `go test ./...`: PASS.
- `go test -race ./...`: PASS.
- `go vet ./...`: PASS.
- Node syntax of the embedded JavaScript: PASS.
- `python test_clouds_326.py`: PASS, 100% synthetic Smoke/Toxic silhouette opacity at full cover and zero alpha after release.
- `python test_smoke_motion_v32.py`: PASS, visual frame change over 0.5-second covered holds; cover->release pixel mean jump **0.0** for both effects when sampled at identical simulated times.
- `python test_organic_flow_327.py`: PASS, repeated full-cover opacity >=98.5%, rising vertical centroid during release, diminishing alpha, and fully transparent end.
- `python test_native_integration.py`: PASS with local mock OBS. Verified Smoke/Toxic IN/OUT, FX screenshot concealment verification, error recovery cases, insufficient cover rejection, unsuitable camera capture rejection, and a recreated camera with a changed scene-item ID. Mock transport may emit benign connection-close warnings.
- `python render_clouds_327.py`: completed full-motion synthetic Smoke/Toxic video exports. These use artificial camera shapes, not actual OBS.
- Money and Ice render source sections: unchanged hashes compared with v3.2.6.
- Windows AMD64 GUI EXE cross-compiled, PE32+ GUI artifact. SHA-256: `b2e9ebbc87047f72fea1f2b7b838351947ad31d0eab5f88fe005f65d7c140643`.

## Not tested
- Native Windows OBS Studio output or actual physical webcam hide/show.
- Real 1080p60 compositing while gaming, GPU frame pacing and long-run RAM usage.
- Commercial-grade volumetric realism. This is a 2D procedural approximation, and visual approval remains pending.
- Native libobs filter, signed installer, Windows upgrade/uninstall validation.

## Windows test instructions
1. Quit the previous build entirely; backup previous EXE.
2. Start v3.2.7 and connect to OBS (normally port 4455).
3. Select **Program** scene, target the *actual keyed webcam item*, and click **Install / realign camera renderer**. Confirm it reports `3.2.7-organic-flow-rc1`.
4. With OBS recording locally, trigger Smoke OUT. The cloud should rise to conceal the live subject, the Activity log should report `OBS composited FX coverage verified`, then `OBS camera confirmed OFF`, and the FX should continue rising until transparent. Repeat with Toxic OUT.
5. Trigger Smoke IN and Toxic IN; confirm `OBS camera confirmed ON` and final clear FX.
6. If camera stays visible, read the precise `OBS FX COVERAGE FAILED` explanation in Activity and use Recover Camera. Do not bypass the coverage guard; send the log and OBS recording for diagnosis.
