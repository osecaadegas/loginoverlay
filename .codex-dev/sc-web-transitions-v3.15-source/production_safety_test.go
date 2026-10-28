package main

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestSettingsNormalizeLoadAndAtomicBackup(t *testing.T) {
	path := filepath.Join(t.TempDir(), "settings.json")
	bad := []byte(`{"obsHost":"remote.example","obsPort":99999,"duration":-2,"density":900,"quality":"bad","effect":"bad","hotOut":"broken"}`)
	if err := os.WriteFile(path, bad, 0600); err != nil {
		t.Fatal(err)
	}
	s := loadSettingsFile(path)
	if err := validateSettings(s); err != nil {
		t.Fatal(err)
	}
	if s.OBSPort != 4455 || s.Duration != 3 || s.Density != 75 || s.OBSHost != "127.0.0.1" {
		t.Fatalf("not normalized: %+v", s)
	}
	if err := saveSettingsFile(path, s); err != nil {
		t.Fatal(err)
	}
	s.Effect = "ice"
	if err := saveSettingsFile(path, s); err != nil {
		t.Fatal(err)
	}
	b, err := os.ReadFile(path + ".backup")
	if err != nil {
		t.Fatal(err)
	}
	backup, err := decodeSettings(b)
	if err != nil || backup.Effect != "money" {
		t.Fatal("previous valid settings not backed up")
	}
	os.WriteFile(path, []byte("corrupt"), 0600)
	if got := loadSettingsFile(path); got.Effect != "money" {
		t.Fatal("corrupt configuration did not fall back to backup")
	}
	s.Duration = math.NaN()
	if validateSettings(s) == nil {
		t.Fatal("NaN accepted")
	}
	s = defaultSettings()
	s.SchemaVersion = settingsSchemaVersion + 1
	if validateSettings(s) == nil {
		t.Fatal("future schema accepted")
	}
}

func TestHotkeyConflictPreservesWorkingBindings(t *testing.T) {
	next := 100
	active := map[int]bool{}
	register := func(b hotkeyBinding) error {
		if b.code == "Ctrl+Alt+N" {
			return errors.New("taken")
		}
		active[b.id] = true
		return nil
	}
	unregister := func(b hotkeyBinding) { delete(active, b.id) }
	old, err := replaceHotkeyBindings(nil, [3]string{"Ctrl+Shift+M", "Ctrl+Shift+N", "Ctrl+Shift+B"}, &next, register, unregister)
	if err != nil {
		t.Fatal(err)
	}
	got, err := replaceHotkeyBindings(old, [3]string{"Ctrl+Alt+M", "Ctrl+Alt+N", "Ctrl+Shift+B"}, &next, register, unregister)
	if err == nil || len(active) != 3 {
		t.Fatalf("conflict did not roll back: %v %+v", err, active)
	}
	for i, b := range old {
		if !active[b.id] || got[i].id != b.id {
			t.Fatal("working hotkey lost")
		}
	}
	// Reassign existing combinations without attempting duplicate registration.
	calls := 0
	got, err = replaceHotkeyBindings(old, [3]string{"Ctrl+Shift+N", "Ctrl+Shift+M", "Ctrl+Shift+B"}, &next, func(b hotkeyBinding) error { calls++; return nil }, unregister)
	if err != nil || calls != 0 || got[0].id != old[1].id {
		t.Fatal("existing combination could not be reused")
	}
}

func TestSensitiveReadsRequireUITokenAndDiagnosticsRedact(t *testing.T) {
	a := &App{nonce: "test-ui", active: true, settings: defaultSettings(), scene: Scene{Name: "private-scene", Camera: "private-camera"}, rendererID: "secret-renderer", history: []string{"private log"}, obsPassword: "secret-password"}
	for _, path := range []string{"/api/status", "/api/diagnostics", "/api/settings/export"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		w := httptest.NewRecorder()
		a.apiHandler(w, req)
		if w.Code != 403 {
			t.Fatalf("unauthenticated %s=%d", path, w.Code)
		}
		req = httptest.NewRequest(http.MethodGet, path, nil)
		req.Header.Set("X-SC-Token", a.nonce)
		w = httptest.NewRecorder()
		a.apiHandler(w, req)
		if w.Code != 200 {
			t.Fatalf("authenticated %s=%d", path, w.Code)
		}
		body := w.Body.String()
		for _, secret := range []string{a.obsPassword, a.rendererID} {
			if strings.Contains(body, secret) {
				t.Fatalf("%s leaked capability", path)
			}
		}
		if path == "/api/diagnostics" && (strings.Contains(body, "private-camera") || strings.Contains(body, "private-scene") || strings.Contains(body, "private log")) {
			t.Fatal("diagnostics leaked private metadata")
		}
	}
}

func TestRecoveryWorksWithoutRendererAndConfirmsOBS(t *testing.T) {
	t.Setenv("APPDATA", t.TempDir())
	a := &App{settings: defaultSettings()}
	var camera, fx atomic.Bool
	fx.Store(true)
	o := simulatedOBS(t, func(name string, p map[string]json.RawMessage) map[string]any {
		if name == "SetSceneItemEnabled" {
			id, _ := field[int](p, "sceneItemId")
			v, _ := field[bool](p, "sceneItemEnabled")
			if id == 84 {
				camera.Store(v)
			} else if id == 85 {
				fx.Store(v)
			}
		}
		if name == "GetSceneItemEnabled" {
			id, _ := field[int](p, "sceneItemId")
			if id == 84 {
				return map[string]any{"sceneItemEnabled": camera.Load()}
			}
			return map[string]any{"sceneItemEnabled": fx.Load()}
		}
		return simulatedSceneResponse(name)
	})
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := a.reconcileWithOBS(ctx, o, Scene{Name: "Studio", Camera: "Camera"}); err != nil {
		t.Fatal(err)
	}
	if !camera.Load() || fx.Load() || a.cameraVisibility != "visible" {
		t.Fatal("recovery not verified")
	}
}

func TestRecoveryRejectsAmbiguousSharedCamera(t *testing.T) {
	a := &App{}
	var writes atomic.Int32
	o := simulatedOBS(t, func(name string, p map[string]json.RawMessage) map[string]any {
		if name == "GetSceneItemList" {
			return map[string]any{"sceneItems": []SceneItem{{SourceName: "Camera", SceneItemID: 1}, {SourceName: "Camera", SceneItemID: 2}}}
		}
		if name == "SetSceneItemEnabled" {
			writes.Add(1)
		}
		return map[string]any{}
	})
	if err := a.reconcileWithOBS(context.Background(), o, Scene{Name: "Studio", Camera: "Camera"}); err == nil || writes.Load() != 0 {
		t.Fatal("ambiguous source modified")
	}
}

func TestShutdownAdmissionAndCancellation(t *testing.T) {
	a := &App{active: true, transitionCancel: make(chan struct{}), transitionDone: make(chan struct{}), exit: make(chan struct{}), settings: defaultSettings()}
	// A synthetic running worker acknowledges the same cancellation channel used
	// by the real controller; no OBS/live-camera validation is implied.
	go func() {
		<-a.transitionCancel
		a.mu.Lock()
		a.active = false
		close(a.transitionDone)
		a.transitionDone = nil
		a.mu.Unlock()
	}()
	if err := a.requestShutdown(); err != nil {
		t.Fatal(err)
	}
	if a.startTransition("money", "out", 3, 75) == nil {
		t.Fatal("transition admitted during shutdown")
	}
	select {
	case <-a.exit:
	case <-time.After(2 * time.Second):
		t.Fatal("shutdown did not await cancellation and exit")
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.shutdownState != "complete" {
		t.Fatal(a.shutdownState)
	}
}

func TestShutdownFailureDoesNotPretendExit(t *testing.T) {
	a := &App{active: true, exit: make(chan struct{}), settings: defaultSettings()}
	if err := a.requestShutdown(); err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		a.mu.Lock()
		blocked := a.shutdownState == "blocked"
		a.mu.Unlock()
		if blocked {
			break
		}
		time.Sleep(time.Millisecond)
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.shutdownState != "blocked" || a.transitionState != "SAFE_ERROR" {
		t.Fatal("failure not reported")
	}
	select {
	case <-a.exit:
		t.Fatal("unsafe exit")
	default:
	}
}

func TestRecoveryBeforeInstallDoesNotLockController(t *testing.T) {
	a := &App{settings: defaultSettings()}
	if err := a.recoverCamera(context.Background()); err == nil {
		t.Fatal("missing installation accepted")
	}
	if a.active || a.recoveryPending {
		t.Fatal("first-run recovery permanently locked the controller")
	}
}

func TestCrashRecoveryJournalAndFrameInvalidation(t *testing.T) {
	t.Setenv("APPDATA", t.TempDir())
	a := &App{}
	sc := Scene{Name: "Studio", Camera: "Camera"}
	if err := a.writeRecoveryMarker(sc); err != nil {
		t.Fatal(err)
	}
	b := newApp()
	if !b.recoveryPending || b.scene.Camera != "Camera" || b.transitionState != "SAFE_ERROR" {
		t.Fatal("interrupted transition not detected")
	}
	b.frame = []byte{1}
	b.lastFrame = []byte{2}
	b.invalidateFrameLocked()
	if len(b.frame) != 0 || len(b.lastFrame) != 0 || b.cameraVisibility != "unknown" {
		t.Fatal("camera evidence not invalidated")
	}
	b.removeRecoveryMarker()
	if _, err := os.Stat(recoveryFile()); !os.IsNotExist(err) {
		t.Fatal("journal remained after recovery")
	}
}

func TestCoverageEvidenceNeedsConsecutiveFramesAndRejectsReplay(t *testing.T) {
	a := protocolFixture()
	if a.coverageEvidence(10, "covered", 0, 2) || a.coverageEvidence(10, "covered", 10, 1) || a.coverageEvidence(9, "covered", 10, 2) {
		t.Fatal("invalid frame evidence accepted")
	}
	if !a.coverageEvidence(10, "covered", 10, 2) {
		t.Fatal("valid evidence rejected")
	}
	a.acknowledged["covered"] = true
	if !a.coverageEvidence(10, "covered", 10, 2) || a.coverageEvidence(10, "covered", 9, 2) {
		t.Fatal("idempotency/replay failure")
	}
}

func TestCoverageHTTPEndpointRequiresRenderedEvidence(t *testing.T) {
	a := protocolFixture()
	a.rendererID = "installed-renderer"
	for _, query := range []string{"", "&frame=10&confirmations=1", "&frame=0&confirmations=2"} {
		r := httptest.NewRequest(http.MethodPost, "http://127.0.0.1:18767/covered?rid=installed-renderer&id=10&coverage=1"+query, nil)
		w := httptest.NewRecorder()
		a.routes().ServeHTTP(w, r)
		if w.Code != 409 || len(a.covered) != 0 {
			t.Fatal("coverage endpoint accepted missing frame evidence")
		}
	}
	r := httptest.NewRequest(http.MethodPost, "http://127.0.0.1:18767/covered?rid=installed-renderer&id=10&coverage=1&frame=10&confirmations=2", nil)
	w := httptest.NewRecorder()
	a.routes().ServeHTTP(w, r)
	if w.Code != 200 || len(a.covered) != 1 {
		t.Fatalf("valid coverage endpoint rejected: %d", w.Code)
	}
}

func TestExpiredVisibilityIsNeverPresentedAsCurrent(t *testing.T) {
	a := &App{cameraVisibility: "visible", cameraVerifiedAt: time.Now().Add(-7 * time.Second)}
	if a.currentVisibilityLocked() != "unknown" {
		t.Fatal("stale OBS visibility shown as current")
	}
	a.cameraVerifiedAt = time.Now()
	if a.currentVisibilityLocked() != "visible" {
		t.Fatal("fresh OBS confirmation discarded")
	}
}
