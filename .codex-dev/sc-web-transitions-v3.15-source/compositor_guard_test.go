package main

import (
	"encoding/json"
	"strings"
	"sync/atomic"
	"testing"
)

func fixtureTransform() map[string]any {
	return map[string]any{
		"sourceWidth": float64(1280), "sourceHeight": float64(720), "positionX": float64(320), "positionY": float64(180), "rotation": float64(0), "scaleX": .5, "scaleY": .5, "alignment": float64(5),
		"cropLeft": float64(0), "cropRight": float64(0), "cropTop": float64(0), "cropBottom": float64(0), "boundsType": "OBS_BOUNDS_NONE", "boundsWidth": float64(640), "boundsHeight": float64(360), "boundsAlignment": float64(0), "cropToBounds": false,
	}
}

func fixturePlacementResponse(name string, p map[string]json.RawMessage) map[string]any {
	id, _ := field[int](p, "sceneItemId")
	switch name {
	case "GetSceneItemTransform":
		return map[string]any{"sceneItemTransform": fixtureTransform()}
	case "GetSceneItemIndex":
		index := 3
		if id == 85 {
			index = 4
		}
		return map[string]any{"sceneItemIndex": index}
	case "GetSceneItemBlendMode":
		return map[string]any{"sceneItemBlendMode": "OBS_BLEND_NORMAL"}
	}
	return nil
}

func TestCompositorGuardBlocksUnsafeVisibilityChanges(t *testing.T) {
	cases := []struct {
		name      string
		transform func(map[string]any)
		order     int
		enabled   bool
		blend     string
	}{
		{"aligned", nil, 4, true, "OBS_BLEND_NORMAL"},
		{"cropped", func(m map[string]any) { m["cropLeft"] = float64(30) }, 4, true, "OBS_BLEND_NORMAL"},
		{"moved", func(m map[string]any) { m["positionX"] = float64(600) }, 4, true, "OBS_BLEND_NORMAL"},
		{"scaled", func(m map[string]any) { m["scaleY"] = .3 }, 4, true, "OBS_BLEND_NORMAL"},
		{"rotated", func(m map[string]any) { m["rotation"] = float64(20) }, 4, true, "OBS_BLEND_NORMAL"},
		{"resized source", func(m map[string]any) { m["sourceWidth"] = float64(1920) }, 4, true, "OBS_BLEND_NORMAL"},
		{"bounds mode", func(m map[string]any) { m["boundsType"] = "OBS_BOUNDS_STRETCH" }, 4, true, "OBS_BLEND_NORMAL"},
		{"crop to bounds", func(m map[string]any) { m["cropToBounds"] = true }, 4, true, "OBS_BLEND_NORMAL"},
		{"lowered FX", nil, 2, true, "OBS_BLEND_NORMAL"},
		{"disabled FX", nil, 4, false, "OBS_BLEND_NORMAL"},
		{"additive FX", nil, 4, true, "OBS_BLEND_ADDITIVE"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			a := protocolFixture()
			a.settings = defaultSettings()
			var writes atomic.Int32
			o := simulatedOBS(t, func(name string, p map[string]json.RawMessage) map[string]any {
				id, _ := field[int](p, "sceneItemId")
				if name == "GetSceneItemTransform" {
					m := fixtureTransform()
					if id == 84 && tc.transform != nil {
						tc.transform(m)
					}
					return map[string]any{"sceneItemTransform": m}
				}
				if name == "GetSceneItemIndex" {
					index := 3
					if id == 85 {
						index = tc.order
					}
					return map[string]any{"sceneItemIndex": index}
				}
				if name == "GetSceneItemBlendMode" {
					return map[string]any{"sceneItemBlendMode": tc.blend}
				}
				if name == "GetSceneItemEnabled" {
					enabled := writes.Load() == 0
					if id == 85 {
						enabled = tc.enabled
					}
					return map[string]any{"sceneItemEnabled": enabled}
				}
				if name == "SetSceneItemEnabled" {
					writes.Add(1)
				}
				return simulatedSceneResponse(name)
			})
			err := a.changeVisibleForJob(o, Scene{Name: "Studio", Camera: "Camera", Width: 1280, Height: 720}, false, 10)
			if tc.name == "aligned" {
				if err != nil || writes.Load() != 1 {
					t.Fatalf("aligned handoff failed: %v writes=%d", err, writes.Load())
				}
			} else {
				if err == nil || !strings.Contains(err.Error(), "compositor") || writes.Load() != 0 {
					t.Fatalf("unsafe %s handoff: error=%v writes=%d", tc.name, err, writes.Load())
				}
			}
		})
	}
}

func TestCoverageScreenshotsCannotBypassDisabledFX(t *testing.T) {
	a := protocolFixture()
	var captures atomic.Int32
	o := simulatedOBS(t, func(name string, p map[string]json.RawMessage) map[string]any {
		if name == "GetSourceScreenshot" {
			captures.Add(1)
		}
		if r := fixturePlacementResponse(name, p); r != nil {
			return r
		}
		if name == "GetSceneItemEnabled" {
			return map[string]any{"sceneItemEnabled": false}
		}
		return simulatedSceneResponse(name)
	})
	if err := a.verifyOBSOverlay(o, Scene{Name: "Studio", Camera: "Camera", Width: 1280, Height: 720}, 10, true); err == nil {
		t.Fatal("disabled FX accepted")
	}
	if captures.Load() != 0 {
		t.Fatal("raw source alpha was used before verifying FX placement")
	}
}

func TestEmergencyVisibilityRecoveryBypassesVisualPlacementGuard(t *testing.T) {
	a := protocolFixture()
	a.settings = defaultSettings()
	var writes atomic.Int32
	o := simulatedOBS(t, func(name string, p map[string]json.RawMessage) map[string]any {
		if name == "GetSceneItemTransform" || name == "GetSceneItemIndex" || name == "GetSceneItemBlendMode" {
			t.Error("recovery was made dependent on FX placement")
		}
		if name == "SetSceneItemEnabled" {
			writes.Add(1)
		}
		if name == "GetSceneItemEnabled" {
			return map[string]any{"sceneItemEnabled": true}
		}
		return simulatedSceneResponse(name)
	})
	if err := a.changeVisible(o, Scene{Name: "Studio", Camera: "Camera"}, true); err != nil || writes.Load() != 1 {
		t.Fatalf("emergency camera recovery blocked: %v", err)
	}
}

func TestCompositorGuardChecksActiveBoundsAndInstalledDimensions(t *testing.T) {
	for _, key := range []string{"boundsWidth", "boundsHeight", "boundsAlignment"} {
		camera, fx := fixtureTransform(), fixtureTransform()
		camera["boundsType"] = "OBS_BOUNDS_SCALE_INNER"
		fx["boundsType"] = "OBS_BOUNDS_SCALE_INNER"
		fx[key] = camera[key].(float64) + 20
		if compareCompositorTransforms(camera, fx, 1280, 720) == nil {
			t.Fatalf("changed %s accepted", key)
		}
	}
	camera, fx := fixtureTransform(), fixtureTransform()
	camera["sourceWidth"] = float64(1920)
	fx["sourceWidth"] = float64(1920)
	if compareCompositorTransforms(camera, fx, 1280, 720) == nil {
		t.Fatal("source size change since install accepted")
	}
}
