package main

import (
	"fmt"
	"strings"
)

// parseHotkey shares the same Windows virtual-key interpretation on every platform,
// so saved shortcuts can be repaired and unit-tested before registration.
func parseHotkey(value string) (uintptr, uintptr, error) {
	parts := strings.Split(strings.ToUpper(strings.TrimSpace(value)), "+")
	mods := uintptr(0x4000) // MOD_NOREPEAT
	key := uintptr(0)
	for _, part := range parts {
		p := strings.TrimSpace(part)
		switch p {
		case "CTRL", "CONTROL":
			mods |= 0x0002
		case "ALT":
			mods |= 0x0001
		case "SHIFT":
			mods |= 0x0004
		case "WIN", "WINDOWS":
			mods |= 0x0008
		default:
			if key != 0 {
				return 0, 0, fmt.Errorf("Only one main key is allowed in %q", value)
			}
			if len(p) == 1 && ((p[0] >= 'A' && p[0] <= 'Z') || (p[0] >= '0' && p[0] <= '9')) {
				key = uintptr(p[0])
			} else if strings.HasPrefix(p, "F") {
				var n int
				if _, err := fmt.Sscanf(p, "F%d", &n); err != nil || n < 1 || n > 24 {
					return 0, 0, fmt.Errorf("Unsupported key %q", p)
				}
				key = uintptr(0x70 + n - 1)
			} else {
				return 0, 0, fmt.Errorf("Unsupported key %q", p)
			}
		}
	}
	if key == 0 || mods == 0x4000 {
		return 0, 0, fmt.Errorf("Invalid hotkey %q (example Ctrl+Shift+M)", value)
	}
	return mods, key, nil
}

// repairHotkeys preserves every valid unique shortcut in priority order
// (OUT, IN, TOGGLE). Conflicting/invalid values get a safe unused fallback.
// This also migrates duplicate shortcuts saved by earlier releases.
func repairHotkeys(s Settings) (Settings, []string) {
	fields := []*string{&s.HotOut, &s.HotIn, &s.HotToggle}
	labels := []string{"OUT", "IN", "TOGGLE"}
	candidates := []string{"Ctrl+Shift+M", "Ctrl+Shift+N", "Ctrl+Shift+B", "Ctrl+Alt+M", "Ctrl+Alt+N", "Ctrl+Alt+B", "Alt+F9", "Alt+F10", "Alt+F11", "Ctrl+Shift+1", "Ctrl+Shift+2", "Ctrl+Shift+3"}
	seen := map[[2]uintptr]bool{}
	changes := []string{}
	for i, f := range fields {
		original := strings.TrimSpace(*f)
		m, k, err := parseHotkey(original)
		duplicate := err == nil && seen[[2]uintptr{m, k}]
		if err != nil || duplicate {
			reason := "invalid"
			if duplicate {
				reason = "duplicate"
			}
			fallback := ""
			// Try the function's default shortcut first, then the whole fallback pool.
			for _, candidate := range append([]string{candidates[i]}, candidates...) {
				cm, ck, _ := parseHotkey(candidate)
				if !seen[[2]uintptr{cm, ck}] {
					fallback = candidate
					m, k = cm, ck
					break
				}
			}
			*f = fallback
			changes = append(changes, fmt.Sprintf("%s %s shortcut %q changed to %s", labels[i], reason, original, fallback))
		} else {
			*f = original
		}
		seen[[2]uintptr{m, k}] = true
	}
	return s, changes
}
