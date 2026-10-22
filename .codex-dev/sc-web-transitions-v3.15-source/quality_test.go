package main

import (
	"encoding/json"
	"testing"
)

func TestQualityMigrationAndValidation(t *testing.T) {
	s := defaultSettings()
	var old Settings
	if err := json.Unmarshal([]byte(`{"effect":"money","duration":3,"density":75,"hotOut":"Ctrl+Shift+M"}`), &old); err != nil {
		t.Fatal(err)
	}
	if validQuality(old.Quality) {
		t.Fatalf("Old settings should have absent quality")
	}
	if !validQuality(s.Quality) {
		t.Fatalf("Invalid default quality %q", s.Quality)
	}
	for _, name := range []string{"Performance", "Balanced", "Cinematic", "Ultra"} {
		if !validQuality(name) {
			t.Fatal(name)
		}
	}
	for _, name := range []string{"", "Hollywood", "Medium"} {
		if validQuality(name) {
			t.Fatal(name)
		}
	}
}
