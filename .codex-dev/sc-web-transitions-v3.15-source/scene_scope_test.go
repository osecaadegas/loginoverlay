package main

import (
	"encoding/json"
	"testing"
)

func TestFXInstallationRefusesSharedSceneOrGroupInputs(t *testing.T) {
	for _, shared := range []string{"none", "scene", "group"} {
		t.Run(shared, func(t *testing.T) {
			o := simulatedOBS(t, func(name string, p map[string]json.RawMessage) map[string]any {
				if name == "GetSceneList" {
					return map[string]any{"scenes": []map[string]any{{"sceneName": "Studio"}, {"sceneName": "Other"}}}
				}
				scene, _ := field[string](p, "sceneName")
				if name == "GetSceneItemList" {
					if scene == "Studio" {
						return map[string]any{"sceneItems": []SceneItem{{SourceName: sceneFX, SceneItemID: 8}}}
					}
					if shared == "scene" {
						return map[string]any{"sceneItems": []SceneItem{{SourceName: sceneFX, SceneItemID: 9}}}
					}
					if shared == "group" {
						return map[string]any{"sceneItems": []SceneItem{{SourceName: "SharedGroup", SceneItemID: 10, IsGroup: true}}}
					}
					return map[string]any{"sceneItems": []SceneItem{}}
				}
				if name == "GetGroupSceneItemList" {
					return map[string]any{"sceneItems": []SceneItem{{SourceName: sceneFX, SceneItemID: 11}}}
				}
				t.Errorf("unexpected request %s", name)
				return map[string]any{}
			})
			err := ensurePrivateFX(o, "Studio")
			if (err != nil) != (shared != "none") {
				t.Fatalf("shared=%s error=%v", shared, err)
			}
		})
	}
}
