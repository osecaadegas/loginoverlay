package main

import "testing"

func TestExpansionEffectNames(t *testing.T) {
	expected := []string{"glitch", "lightning", "shadow", "holy", "sand", "crystal", "petal", "plasma"}
	for _, name := range expected {
		if !validEffect(name) {
			t.Fatalf("new effect %q not accepted", name)
		}
	}
	for _, name := range []string{"money", "ice", "smoke", "toxic", "inferno"} {
		if !validEffect(name) {
			t.Fatalf("existing effect %q rejected", name)
		}
	}
	for _, name := range []string{"", "unknown", "<script>", "glitch/../"} {
		if validEffect(name) {
			t.Fatalf("unsupported effect %q accepted", name)
		}
	}
}
func TestExpansionTuningValidation(t *testing.T) {
	pass := []EffectTuning{{}, {Accent: "#aBcDeF", Motion: .45, Detail: .45}, {Accent: "#123456", Motion: 2.25, Detail: 1.65}}
	fail := []EffectTuning{{Accent: "javascript:alert(1)"}, {Accent: "#zazaza"}, {Accent: "#123"}, {Motion: 5}, {Detail: 5}, {Motion: -1}, {Detail: -1}}
	for _, x := range pass {
		if !validTuning(x) {
			t.Fatalf("valid effect setting rejected: %+v", x)
		}
	}
	for _, x := range fail {
		if validTuning(x) {
			t.Fatalf("invalid effect setting accepted: %+v", x)
		}
	}
}
func TestDefaultV34MaintainsExistingHotkeys(t *testing.T) {
	s := defaultSettings()
	if s.Effect != "money" || s.SceneTarget != "Program" || s.HotOut != "Ctrl+Shift+M" || s.HotIn != "Ctrl+Shift+N" {
		t.Fatalf("old defaults were changed: %+v", s)
	}
	if s.EffectOptions == nil {
		t.Fatal("effect options must be persistable")
	}
}
