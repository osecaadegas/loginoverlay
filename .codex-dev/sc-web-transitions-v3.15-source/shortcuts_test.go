package main

import (
	"strings"
	"testing"
)

func TestDuplicateHotkeysRepair(t *testing.T) {
	s := defaultSettings()
	s.HotIn = "ctrl + shift + m"
	s.HotToggle = "Ctrl+Shift+M"
	fixed, notes := repairHotkeys(s)
	if len(notes) != 2 {
		t.Fatalf("expected 2 repairs, got %v", notes)
	}
	if fixed.HotOut != "Ctrl+Shift+M" || fixed.HotIn != "Ctrl+Shift+N" || fixed.HotToggle != "Ctrl+Shift+B" {
		t.Fatalf("unexpected repaired values %+v", fixed)
	}
	if again, changes := repairHotkeys(fixed); len(changes) != 0 || again.HotIn != fixed.HotIn {
		t.Fatalf("repair not idempotent: %v, %+v", changes, again)
	}
}
func TestShortcutsLeaveCustomUniqueness(t *testing.T) {
	s := defaultSettings()
	s.HotOut = "Ctrl+Alt+Z"
	s.HotIn = "Alt+F9"
	s.HotToggle = "Ctrl+Shift+B"
	fixed, changes := repairHotkeys(s)
	if len(changes) != 0 || fixed.HotOut != s.HotOut || fixed.HotIn != s.HotIn {
		t.Fatalf("modified valid: %+v, %v", fixed, changes)
	}
}
func TestRepairInvalidShortcut(t *testing.T) {
	s := defaultSettings()
	s.HotIn = "Ctrl+Shift+M+N"
	fixed, notes := repairHotkeys(s)
	if fixed.HotIn != "Ctrl+Shift+N" || len(notes) != 1 || !strings.Contains(notes[0], "invalid") {
		t.Fatalf("incorrect repair: %+v %v", fixed, notes)
	}
}
func TestKeyAliasCollision(t *testing.T) {
	s := defaultSettings()
	s.HotIn = "Control+Shift+M"
	fixed, notes := repairHotkeys(s)
	if len(notes) != 1 || fixed.HotIn != "Ctrl+Shift+N" {
		t.Fatalf("alias collision missed %v %+v", notes, fixed)
	}
}
