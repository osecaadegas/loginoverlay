package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

type TransitionEvent struct {
	State     string    `json:"state"`
	At        time.Time `json:"at"`
	ElapsedMS int64     `json:"elapsedMs"`
}

func (a *App) coverageEvidence(id int, action string, frame, confirmations int) bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.job == nil || a.job.ID != id || frame < 1 || confirmations < 2 {
		return false
	}
	if a.acknowledged[action] {
		return frame == a.job.FrameSequence
	}
	if frame <= a.job.FrameSequence {
		return false
	}
	a.job.FrameSequence = frame
	return true
}

func (a *App) recordStateLocked(state string) {
	a.transitionState = state
	elapsed := int64(0)
	if !a.transitionStarted.IsZero() {
		elapsed = time.Since(a.transitionStarted).Milliseconds()
	}
	a.timeline = append(a.timeline, TransitionEvent{state, time.Now().UTC(), elapsed})
	if len(a.timeline) > 64 {
		a.timeline = a.timeline[len(a.timeline)-64:]
	}
}

func (a *App) invalidateFrameLocked() {
	a.frame = nil
	a.lastFrame = nil
	a.cameraVisibility = "unknown"
	a.cameraVerifiedAt = time.Time{}
}

func (a *App) currentVisibilityLocked() string {
	if a.cameraVerifiedAt.IsZero() || time.Since(a.cameraVerifiedAt) > 6*time.Second {
		return "unknown"
	}
	return a.cameraVisibility
}

// UI polling schedules at most one low-rate visibility probe while idle. It
// never runs screenshots or changes OBS state, and stale installations cannot
// overwrite the selected camera's status.
func (a *App) refreshOBSStatus() {
	a.mu.Lock()
	if a.active || a.shuttingDown || a.statusProbing || a.scene.Camera == "" || time.Since(a.statusProbe) < 3*time.Second {
		a.mu.Unlock()
		return
	}
	a.statusProbing = true
	a.statusProbe = time.Now()
	sc := a.scene
	rid := a.rendererID
	host, port, password := a.settings.OBSHost, a.settings.OBSPort, a.obsPassword
	a.mu.Unlock()
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		o, err := DialOBSContext(ctx, host, port, password)
		var value bool
		if err == nil {
			var fresh Scene
			fresh, err = resolveCameraAndFX(o, sc)
			if err == nil {
				var result map[string]json.RawMessage
				result, err = o.Request("GetSceneItemEnabled", map[string]any{"sceneName": fresh.Name, "sceneItemId": fresh.CamID})
				if err == nil {
					value, err = field[bool](result, "sceneItemEnabled")
				}
			}
			o.Close()
		}
		a.mu.Lock()
		defer a.mu.Unlock()
		a.statusProbing = false
		if a.scene != sc || a.rendererID != rid || a.active || a.shuttingDown {
			return
		}
		a.connected = err == nil
		a.cameraVerifiedAt = time.Now()
		if err != nil {
			a.cameraVisibility = "unknown"
		} else if value {
			a.cameraVisibility = "visible"
		} else {
			a.cameraVisibility = "hidden"
		}
	}()
}

func recoveryFile() string { return filepath.Join(filepath.Dir(cfgFile()), "recovery.json") }
func (a *App) writeRecoveryMarker(sc Scene) error {
	b, err := json.Marshal(sc)
	if err != nil {
		return err
	}
	return atomicSettingsWrite(recoveryFile(), b)
}
func (a *App) removeRecoveryMarker() {
	if err := os.Remove(recoveryFile()); err != nil && !os.IsNotExist(err) {
		a.log("Recovery journal cleanup warning: " + err.Error())
	}
}
func (a *App) loadRecoveryMarker() {
	b, err := os.ReadFile(recoveryFile())
	if err != nil {
		return
	}
	var sc Scene
	if json.Unmarshal(b, &sc) != nil || sc.Name == "" || sc.Camera == "" {
		return
	}
	a.scene = sc
	a.recoveryPending = true
	a.transitionState = "SAFE_ERROR"
	a.recoveryStatus = "A previous transition did not finish. Connect to OBS, then Recover Camera before triggering effects."
	a.log(a.recoveryStatus)
}

func (a *App) cancelTransition(ctx context.Context) error {
	a.mu.Lock()
	if a.active && a.transitionCancel != nil {
		select {
		case <-a.transitionCancel:
		default:
			close(a.transitionCancel)
		}
	}
	done, active := a.transitionDone, a.active
	a.mu.Unlock()
	if active && done == nil {
		return errors.New("another controller operation is still running")
	}
	if done != nil {
		select {
		case <-done:
		case <-ctx.Done():
			return fmt.Errorf("transition cancellation unconfirmed: %w", ctx.Err())
		}
	}
	return nil
}

// Emergency recovery targets only the installed scene item. It never follows a
// newly selected Program scene and never requires the renderer to respond.
func (a *App) reconcileCamera(ctx context.Context, sc Scene) error {
	if sc.Name == "" || sc.Camera == "" {
		return errors.New("no installed camera to recover")
	}
	a.mu.Lock()
	a.recordStateLocked("OBS_STATE_RECONCILIATION")
	a.recoveryStatus = "Confirming camera visibility and clearing the installed FX source"
	a.mu.Unlock()
	host, port, password := a.credentials()
	o, err := DialOBSContext(ctx, host, port, password)
	if err != nil {
		return err
	}
	defer o.Close()
	return a.reconcileWithOBS(ctx, o, sc)
}
func (a *App) reconcileWithOBS(ctx context.Context, o *OBS, sc Scene) error {
	list, err := items(o, sc.Name)
	if err != nil {
		return err
	}
	var cameraIDs, fxIDs []int
	for _, it := range list {
		if it.SourceName == sc.Camera {
			cameraIDs = append(cameraIDs, it.SceneItemID)
		}
		if it.SourceName == sceneFX {
			fxIDs = append(fxIDs, it.SceneItemID)
		}
	}
	// Never guess among duplicate references to a shared source.
	if len(cameraIDs) != 1 {
		return fmt.Errorf("camera recovery requires one unambiguous direct item %q in %q (found %d); select its containing scene or restore the deleted source", sc.Camera, sc.Name, len(cameraIDs))
	}
	if len(fxIDs) > 1 {
		return errors.New("multiple FX items found; remove duplicate FX items before recovery")
	}
	confirm := func(id int, enabled bool) error {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		p := map[string]any{"sceneName": sc.Name, "sceneItemId": id}
		before, e := o.Request("GetSceneItemEnabled", p)
		if e != nil {
			return e
		}
		visible, e := field[bool](before, "sceneItemEnabled")
		if e != nil {
			return e
		}
		if visible != enabled {
			p["sceneItemEnabled"] = enabled
			if _, e = o.Request("SetSceneItemEnabled", p); e != nil {
				return e
			}
		}
		for i := 0; i < 5; i++ {
			read, e := o.Request("GetSceneItemEnabled", map[string]any{"sceneName": sc.Name, "sceneItemId": id})
			if e != nil {
				return e
			}
			actual, e := field[bool](read, "sceneItemEnabled")
			if e == nil && actual == enabled {
				return nil
			}
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(60 * time.Millisecond):
			}
		}
		return fmt.Errorf("scene item %d did not confirm enabled=%v", id, enabled)
	}
	cameraErr := confirm(cameraIDs[0], true)
	// Clear FX even if camera restoration fails. Report both errors explicitly.
	var fxErr error
	if len(fxIDs) == 1 {
		fxErr = confirm(fxIDs[0], false)
	}
	if err = errors.Join(cameraErr, fxErr); err != nil {
		a.mu.Lock()
		a.cameraVisibility = "unknown"
		a.mu.Unlock()
		return err
	}
	a.mu.Lock()
	a.cameraVisibility = "visible"
	a.cameraVerifiedAt = time.Now()
	a.recoveryPending = false
	a.recoveryStatus = "Confirmed: camera visible, FX disabled"
	if !a.shuttingDown {
		a.shutdownState = ""
		a.shutdownError = ""
	}
	a.mu.Unlock()
	a.removeRecoveryMarker()
	return nil
}

func (a *App) recoverCamera(ctx context.Context) error {
	if err := a.cancelTransition(ctx); err != nil {
		return err
	}
	a.mu.Lock()
	if a.active {
		a.mu.Unlock()
		return errors.New("controller is still busy")
	}
	if a.scene.Camera == "" {
		a.mu.Unlock()
		return errors.New("no installed camera to recover; connect to OBS and install the camera renderer first")
	}
	a.active = true
	sc := a.scene
	a.recordStateLocked("RECOVERING")
	a.mu.Unlock()
	err := a.reconcileCamera(ctx, sc)
	a.mu.Lock()
	a.active = false
	if err != nil {
		a.recoveryPending = true
		a.recoveryStatus = "Recovery unconfirmed: " + err.Error()
		a.recordStateLocked("SAFE_ERROR")
	} else {
		a.recordStateLocked("IDLE")
	}
	a.mu.Unlock()
	if err == nil {
		a.log("Recovery successful: OBS confirmed camera visible and FX disabled")
	}
	return err
}

func (a *App) requestShutdown() error {
	a.mu.Lock()
	if a.shuttingDown {
		a.mu.Unlock()
		return errors.New("shutdown is already in progress")
	}
	a.shuttingDown = true
	a.shutdownState = "reconciling"
	a.shutdownError = ""
	a.mu.Unlock()
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		err := a.cancelTransition(ctx)
		a.mu.Lock()
		sc := a.scene
		a.mu.Unlock()
		if err == nil && sc.Camera != "" {
			err = a.writeRecoveryMarker(sc)
			if err == nil {
				err = a.reconcileCamera(ctx, sc)
			}
		}
		if err != nil {
			a.mu.Lock()
			a.shuttingDown = false
			a.shutdownState = "blocked"
			a.shutdownError = err.Error()
			a.recoveryPending = sc.Camera != ""
			a.recoveryStatus = "Shutdown recovery unconfirmed: " + err.Error()
			a.recordStateLocked("SAFE_ERROR")
			a.mu.Unlock()
			a.log("Quit cancelled: OBS recovery was not confirmed. Reconnect OBS and Recover Camera, then retry Quit. " + err.Error())
			return
		}
		if err = stopHotkeys(); err != nil {
			a.log("Hotkey cleanup: " + err.Error())
		}
		a.mu.Lock()
		a.shutdownState = "complete"
		a.invalidateFrameLocked()
		a.mu.Unlock()
		if a.server != nil {
			shutdownCtx, stop := context.WithTimeout(context.Background(), 2*time.Second)
			err = a.server.Shutdown(shutdownCtx)
			stop()
			if err != nil {
				a.server.Close()
			}
		}
		a.exitOnce.Do(func() {
			if a.exit != nil {
				close(a.exit)
			}
		})
	}()
	return nil
}
