//go:build windows

package main

import (
	"runtime"
	"testing"
)

// Exercise actual Windows registrations with uncommon function-key chords.
// No keystrokes are injected and no user shortcut is unregistered.
func TestWindowsHotkeyConflictKeepsOldRegistration(t *testing.T) {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	mods := uintptr(0x4000 | 0x0001 | 0x0002 | 0x0004)
	conflict := uintptr(0x70 + 23) // F24
	ok, _, _ := procRegisterHotKey.Call(0, 900, mods, conflict)
	if ok == 0 {
		t.Skip("test conflict chord is already reserved")
	}
	defer procUnregisterHotKey.Call(0, 900)
	defer stopHotkeys()
	if err := configureHotkeys("Ctrl+Alt+Shift+F20", "Ctrl+Alt+Shift+F21", "Ctrl+Alt+Shift+F22", func(string) {}); err != nil {
		t.Skipf("test initial chords unavailable: %v", err)
	}
	if err := configureHotkeys("Ctrl+Alt+Shift+F23", "Ctrl+Alt+Shift+F24", "Ctrl+Alt+Shift+F22", func(string) {}); err == nil {
		t.Fatal("conflict registration succeeded")
	}
	// The first candidate from the failed attempt must have been released.
	ok, _, _ = procRegisterHotKey.Call(0, 901, mods, uintptr(0x70+22))
	if ok == 0 {
		t.Fatal("candidate F23 remained registered after rollback")
	}
	procUnregisterHotKey.Call(0, 901)
	// The original registered chord must still be owned by the worker.
	ok, _, _ = procRegisterHotKey.Call(0, 902, mods, uintptr(0x70+19))
	if ok != 0 {
		procUnregisterHotKey.Call(0, 902)
		t.Fatal("original F20 was lost after failed registration")
	}
}
