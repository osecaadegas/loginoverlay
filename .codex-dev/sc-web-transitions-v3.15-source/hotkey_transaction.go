package main

import "fmt"

type hotkeyBinding struct {
	id           int
	mods, key    uintptr
	action, code string
}

func hotkeyBindings(codes [3]string) ([]hotkeyBinding, error) {
	actions := []string{"out", "in", "toggle"}
	bindings := make([]hotkeyBinding, 0, 3)
	for i, code := range codes {
		m, k, err := parseHotkey(code)
		if err != nil {
			return nil, err
		}
		for _, b := range bindings {
			if b.mods == m && b.key == k {
				return nil, fmt.Errorf("duplicate shortcut %s", code)
			}
		}
		bindings = append(bindings, hotkeyBinding{mods: m, key: k, action: actions[i], code: code})
	}
	return bindings, nil
}

// Register all genuinely new keys BEFORE releasing any working key. Unchanged
// combinations keep their Windows IDs, even when their action is reassigned.
// A conflict releases only candidates from this attempt, never the old set.
func replaceHotkeyBindings(old []hotkeyBinding, codes [3]string, nextID *int, register func(hotkeyBinding) error, unregister func(hotkeyBinding)) ([]hotkeyBinding, error) {
	candidates, err := hotkeyBindings(codes)
	if err != nil {
		return old, err
	}
	var added []hotkeyBinding
	for i := range candidates {
		for _, b := range old {
			if b.mods == candidates[i].mods && b.key == candidates[i].key {
				candidates[i].id = b.id
				break
			}
		}
		if candidates[i].id == 0 {
			*nextID++
			candidates[i].id = *nextID
			if err = register(candidates[i]); err != nil {
				for _, b := range added {
					unregister(b)
				}
				return old, err
			}
			added = append(added, candidates[i])
		}
	}
	for _, b := range old {
		keep := false
		for _, c := range candidates {
			if c.id == b.id {
				keep = true
			}
		}
		if !keep {
			unregister(b)
		}
	}
	return candidates, nil
}
