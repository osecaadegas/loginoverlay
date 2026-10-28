package main

import (
	"errors"
	"fmt"
	"math"
)

// Raw input screenshots cannot prove that OBS actually places the FX over the
// camera. Validate the compositor's current placement independently of alpha.
// This remains sampled WebSocket evidence, not an atomic libobs frame fence.
func verifyCompositorPlacement(o *OBS, sc Scene) error {
	fail := func(err error) error {
		return fmt.Errorf("OBS compositor coverage is unsafe: %w. Install / realign the renderer before transitioning", err)
	}
	var transforms [2]map[string]any
	var indices [2]int
	for i, id := range []int{sc.CamID, sc.FXID} {
		p := map[string]any{"sceneName": sc.Name, "sceneItemId": id}
		response, err := o.Request("GetSceneItemTransform", p)
		if err != nil {
			return fail(err)
		}
		transforms[i], err = readObj(response, "sceneItemTransform")
		if err != nil {
			return fail(err)
		}
		response, err = o.Request("GetSceneItemIndex", p)
		if err != nil {
			return fail(err)
		}
		indices[i], err = field[int](response, "sceneItemIndex")
		if err != nil {
			return fail(err)
		}
	}
	if indices[1] <= indices[0] {
		return fail(errors.New("FX is not above the camera in the scene stack"))
	}
	if err := compareCompositorTransforms(transforms[0], transforms[1], sc.Width, sc.Height); err != nil {
		return fail(err)
	}
	p := map[string]any{"sceneName": sc.Name, "sceneItemId": sc.FXID}
	response, err := o.Request("GetSceneItemBlendMode", p)
	if err != nil {
		return fail(err)
	}
	blend, err := field[string](response, "sceneItemBlendMode")
	if err != nil {
		return fail(err)
	}
	if blend != "OBS_BLEND_NORMAL" {
		return fail(fmt.Errorf("FX blend mode %q does not provide opaque concealment", blend))
	}
	// Read visibility last, immediately before accepting the placement proof.
	response, err = o.Request("GetSceneItemEnabled", p)
	if err != nil {
		return fail(err)
	}
	enabled, err := field[bool](response, "sceneItemEnabled")
	if err != nil {
		return fail(err)
	}
	if !enabled {
		return fail(errors.New("FX scene item is disabled"))
	}
	return nil
}

func compareCompositorTransforms(camera, fx map[string]any, width, height int) error {
	number := func(m map[string]any, key string) (float64, error) {
		v, ok := m[key].(float64)
		if !ok || math.IsNaN(v) || math.IsInf(v, 0) {
			return 0, fmt.Errorf("OBS transform omitted a finite %s", key)
		}
		return v, nil
	}
	for _, key := range []string{"sourceWidth", "sourceHeight", "positionX", "positionY", "rotation", "scaleX", "scaleY", "alignment", "cropLeft", "cropRight", "cropTop", "cropBottom"} {
		c, err := number(camera, key)
		if err != nil {
			return err
		}
		f, err := number(fx, key)
		if err != nil {
			return err
		}
		if math.Abs(c-f) > .01 {
			return fmt.Errorf("camera and FX %s differ (%g versus %g)", key, c, f)
		}
	}
	w, _ := number(camera, "sourceWidth")
	h, _ := number(camera, "sourceHeight")
	if w < 64 || h < 64 {
		return errors.New("camera source dimensions are unavailable")
	}
	if (width > 0 && math.Abs(w-float64(width)) > .01) || (height > 0 && math.Abs(h-float64(height)) > .01) {
		return errors.New("camera source dimensions changed since installation")
	}
	bounds, ok := camera["boundsType"].(string)
	if !ok || bounds == "" {
		return errors.New("camera bounds mode is unavailable")
	}
	if fx["boundsType"] != bounds {
		return errors.New("camera and FX bounds modes differ")
	}
	if bounds != "OBS_BOUNDS_NONE" {
		for _, key := range []string{"boundsWidth", "boundsHeight", "boundsAlignment"} {
			c, err := number(camera, key)
			if err != nil {
				return err
			}
			f, err := number(fx, key)
			if err != nil {
				return err
			}
			if math.Abs(c-f) > .01 {
				return fmt.Errorf("camera and FX %s differ", key)
			}
		}
	}
	// cropToBounds is absent on older OBS versions; its default is false.
	cropCamera, _ := camera["cropToBounds"].(bool)
	cropFX, _ := fx["cropToBounds"].(bool)
	if cropCamera != cropFX {
		return errors.New("camera and FX bounds cropping differs")
	}
	return nil
}
