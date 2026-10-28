package main

import "fmt"

// OBS browser inputs are shared objects. Changing their URL changes every scene
// reference, so installation must not repoint an FX input used elsewhere.
// Nested camera transforms remain unsupported; this is an ownership check, not
// a claim that flattening nested scenes/groups is safe.
func ensurePrivateFX(o *OBS, targetScene string) error {
	r, err := o.Request("GetSceneList", nil)
	if err != nil {
		return fmt.Errorf("cannot verify FX input ownership: %w", err)
	}
	var scenes []struct {
		Name string `json:"sceneName"`
	}
	scenes, err = field[[]struct {
		Name string `json:"sceneName"`
	}](r, "scenes")
	if err != nil {
		return fmt.Errorf("cannot enumerate scenes before installing FX: %w", err)
	}
	visited := map[string]bool{}
	var inspect func(string, bool, int) error
	inspect = func(name string, group bool, depth int) error {
		if depth > 12 {
			return fmt.Errorf("scene/group nesting exceeds safe inspection depth")
		}
		key := fmt.Sprintf("%t:%s", group, name)
		if visited[key] {
			return nil
		}
		visited[key] = true
		method := "GetSceneItemList"
		if group {
			method = "GetGroupSceneItemList"
		}
		response, e := o.Request(method, map[string]any{"sceneName": name})
		if e != nil {
			return fmt.Errorf("cannot inspect %q for shared FX references: %w", name, e)
		}
		list, e := field[[]SceneItem](response, "sceneItems")
		if e != nil {
			return e
		}
		for _, item := range list {
			if item.SourceName == sceneFX && (group || name != targetScene) {
				return fmt.Errorf("FX input %q is also referenced by %q; installation would change that shared source. Remove that FX reference or create a separate OBS input before installing in %q", sceneFX, name, targetScene)
			}
			if item.IsGroup {
				if e = inspect(item.SourceName, true, depth+1); e != nil {
					return e
				}
			}
		}
		return nil
	}
	for _, scene := range scenes {
		if err = inspect(scene.Name, false, 0); err != nil {
			return err
		}
	}
	return nil
}
