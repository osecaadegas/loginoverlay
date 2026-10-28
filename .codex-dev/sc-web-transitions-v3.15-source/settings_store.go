package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"time"
)

const settingsSchemaVersion = 3

func validateSettings(s Settings) error {
	if s.SchemaVersion < 0 || s.SchemaVersion > settingsSchemaVersion {
		return errors.New("unsupported settings schema version")
	}
	if s.OBSHost != "127.0.0.1" && s.OBSHost != "localhost" {
		return errors.New("OBS host must be localhost")
	}
	if s.OBSPort < 1 || s.OBSPort > 65535 {
		return errors.New("OBS port must be 1 to 65535")
	}
	if math.IsNaN(s.Duration) || math.IsInf(s.Duration, 0) || s.Duration < 1 || s.Duration > 7 {
		return errors.New("duration must be 1 to 7 seconds")
	}
	if s.Density < 15 || s.Density > 100 {
		return errors.New("density must be 15 to 100")
	}
	if !validEffect(s.Effect) || !validQuality(s.Quality) {
		return errors.New("invalid effect or quality")
	}
	if s.RendererMode != "gpu" && s.RendererMode != "2d" {
		return errors.New("renderer mode must be gpu or 2d")
	}
	if s.SceneTarget != "Program" && s.SceneTarget != "Preview" {
		return errors.New("scene target must be Program or Preview")
	}
	if len(s.EffectOptions) > 40 {
		return errors.New("too many effect settings")
	}
	for name, t := range s.EffectOptions {
		if !validEffect(name) || !validTuning(t) {
			return errors.New("invalid effect customization")
		}
	}
	seen := map[[2]uintptr]bool{}
	for _, key := range []string{s.HotOut, s.HotIn, s.HotToggle} {
		m, k, err := parseHotkey(key)
		if err != nil {
			return err
		}
		code := [2]uintptr{m, k}
		if seen[code] {
			return fmt.Errorf("duplicate hotkey %q", key)
		}
		seen[code] = true
	}
	return nil
}

// Loading an old or edited file is repairable; API imports instead reject
// invalid values so a user never silently imports a different configuration.
func normalizeSettings(s Settings) Settings {
	d := defaultSettings()
	s.SchemaVersion = settingsSchemaVersion
	if s.OBSHost != "127.0.0.1" && s.OBSHost != "localhost" {
		s.OBSHost = d.OBSHost
	}
	if s.OBSPort < 1 || s.OBSPort > 65535 {
		s.OBSPort = d.OBSPort
	}
	if math.IsNaN(s.Duration) || math.IsInf(s.Duration, 0) || s.Duration < 1 || s.Duration > 7 {
		s.Duration = d.Duration
	}
	if s.Density < 15 || s.Density > 100 {
		s.Density = d.Density
	}
	if !validEffect(s.Effect) {
		s.Effect = d.Effect
	}
	if !validQuality(s.Quality) {
		s.Quality = d.Quality
	}
	if s.RendererMode != "gpu" && s.RendererMode != "2d" {
		s.RendererMode = d.RendererMode
	}
	if s.SceneTarget != "Program" && s.SceneTarget != "Preview" {
		s.SceneTarget = d.SceneTarget
	}
	if s.EffectOptions == nil {
		s.EffectOptions = map[string]EffectTuning{}
	}
	for k, v := range s.EffectOptions {
		if !validEffect(k) || !validTuning(v) {
			delete(s.EffectOptions, k)
		}
	}
	s, _ = repairHotkeys(s)
	return s
}

func decodeSettings(b []byte) (Settings, error) {
	s := defaultSettings()
	if err := json.Unmarshal(b, &s); err != nil {
		return s, err
	}
	if s.SchemaVersion > settingsSchemaVersion {
		return s, errors.New("settings were created by a newer version")
	}
	return normalizeSettings(s), nil
}

func loadSettingsFile(path string) Settings {
	for _, candidate := range []string{path, path + ".backup"} {
		b, err := os.ReadFile(candidate)
		if err != nil {
			continue
		}
		s, err := decodeSettings(b)
		if err == nil {
			return s
		}
	}
	return defaultSettings()
}

func atomicSettingsWrite(path string, b []byte) error {
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return err
	}
	f, err := os.CreateTemp(filepath.Dir(path), ".sc-settings-*")
	if err != nil {
		return err
	}
	tmp := f.Name()
	defer os.Remove(tmp)
	if err = f.Chmod(0600); err == nil {
		_, err = f.Write(b)
	}
	if err == nil {
		err = f.Sync()
	}
	closeErr := f.Close()
	if err == nil {
		err = closeErr
	}
	if err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func saveSettingsFile(path string, s Settings) error {
	s.SchemaVersion = settingsSchemaVersion
	if err := validateSettings(s); err != nil {
		return err
	}
	b, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	if old, e := os.ReadFile(path); e == nil {
		if _, e = decodeSettings(old); e == nil {
			if e = atomicSettingsWrite(path+".backup", old); e != nil {
				return fmt.Errorf("settings backup: %w", e)
			}
		}
	}
	return atomicSettingsWrite(path, b)
}

func (a *App) applySettings(s Settings) (any, error) {
	if err := validateSettings(s); err != nil {
		return nil, err
	}
	s.SchemaVersion = settingsSchemaVersion
	a.mu.Lock()
	if a.active || a.shuttingDown {
		a.mu.Unlock()
		return nil, errors.New("wait for the controller to finish before changing settings")
	}
	old := a.settings
	// Reserve admission while the OS registration and atomic disk transaction run.
	a.active = true
	a.mu.Unlock()
	defer func() { a.mu.Lock(); a.active = false; a.mu.Unlock() }()
	callback := func(which string) { a.trigger(which) }
	if !a.noHotkeys {
		if err := configureHotkeys(s.HotOut, s.HotIn, s.HotToggle, callback); err != nil {
			return nil, err
		}
	}
	if err := saveSettings(s); err != nil {
		var rollback error
		if !a.noHotkeys {
			rollback = configureHotkeys(old.HotOut, old.HotIn, old.HotToggle, callback)
		}
		return nil, errors.Join(fmt.Errorf("settings were not saved: %w", err), rollback)
	}
	a.mu.Lock()
	a.settings = s
	if old.OBSHost != s.OBSHost || old.OBSPort != s.OBSPort || old.SceneTarget != s.SceneTarget {
		a.invalidateFrameLocked()
		a.rendererID = ""
		a.connected = false
	}
	a.mu.Unlock()
	a.log("Settings saved atomically; previous settings backed up")
	return map[string]any{"settings": s, "corrections": []string{}}, nil
}

func (a *App) productAPI(w http.ResponseWriter, r *http.Request) bool {
	switch r.URL.Path {
	case "/api/settings/export":
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", 405)
			return true
		}
		a.mu.Lock()
		s := a.settings
		a.mu.Unlock()
		w.Header().Set("Content-Disposition", `attachment; filename="SC-Web-Transitions-settings.json"`)
		jsonSend(w, 200, map[string]any{"schemaVersion": settingsSchemaVersion, "version": appVersion, "settings": s, "defaults": defaultSettings()})
		return true
	case "/api/diagnostics":
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", 405)
			return true
		}
		status := a.statusJSON().(map[string]any)
		// Export technical evidence without scene/source names, camera data, tokens,
		// user-entered log messages or connection credentials.
		delete(status, "scene")
		delete(status, "camera")
		delete(status, "sources")
		delete(status, "settings")
		delete(status, "history")
		delete(status, "status")
		delete(status, "renderError")
		delete(status, "recovery")
		delete(status, "shutdown")
		var memory runtime.MemStats
		runtime.ReadMemStats(&memory)
		w.Header().Set("Content-Disposition", `attachment; filename="SC-Web-Transitions-diagnostics.json"`)
		jsonSend(w, 200, map[string]any{"capturedAt": time.Now().UTC(), "platform": runtime.GOOS + "/" + runtime.GOARCH, "controllerHeapBytes": memory.Alloc, "goroutines": runtime.NumGoroutine(), "controller": status, "limitations": []string{"Renderer FPS is browser rAF, not OBS Program or encoder FPS", "OBS WebSocket screenshots provide no source frame timestamps", "Camera frames and credentials are excluded"}})
		return true
	case "/api/settings/import", "/api/settings/restore":
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", 405)
			return true
		}
		a.controlMu.Lock()
		defer a.controlMu.Unlock()
		var s Settings
		var err error
		if r.URL.Path == "/api/settings/import" {
			var doc struct {
				SchemaVersion int      `json:"schemaVersion"`
				Settings      Settings `json:"settings"`
			}
			err = json.NewDecoder(io.LimitReader(r.Body, 32<<10)).Decode(&doc)
			if err == nil && (doc.SchemaVersion < 1 || doc.SchemaVersion > settingsSchemaVersion) {
				err = errors.New("unsupported configuration schema version")
			}
			s = doc.Settings
		} else {
			var b []byte
			b, err = os.ReadFile(cfgFile() + ".backup")
			if err == nil {
				err = json.Unmarshal(b, &s)
			}
		}
		var result any
		if err == nil {
			result, err = a.applySettings(s)
		}
		if err != nil {
			jsonSend(w, 400, map[string]any{"error": err.Error()})
		} else {
			jsonSend(w, 200, map[string]any{"ok": true, "data": result})
		}
		return true
	}
	return false
}
