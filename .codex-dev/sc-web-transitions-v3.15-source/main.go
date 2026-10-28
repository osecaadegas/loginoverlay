package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"embed"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"image/png"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"
)

//go:embed ui.html overlay.html webgl3d.js gpu-vfx3d.js money-vfx3d.js ice-vfx3d.js gas-vfx3d.js cinematic-plates.js crystal-hero3d.js premium-vfx-meshes.js premium-crystal-accents.js expansion-effects.js bill.png sc.ico vfx_assets/*.glb vfx_assets/*.png vfx_assets/*.json
var static embed.FS

var rendererPort = 18767

const sceneFX = "SC Web Transitions | FX"
const appVersion = "3.18.0-cinematic-gpu"

// Set by the release build; diagnostic exports identify the exact source commit.
var buildRevision = "development"

type EffectTuning struct {
	Accent string  `json:"accent"`
	Motion float64 `json:"motion"`
	Detail float64 `json:"detail"`
}

var expansionEffects = map[string]bool{"glitch": true, "lightning": true, "shadow": true, "holy": true, "sand": true, "crystal": true, "petal": true, "plasma": true, "neon": true}

func validEffect(effect string) bool {
	switch effect {
	case "money", "ice", "smoke", "toxic", "inferno":
		return true
	}
	return expansionEffects[effect]
}
func validTuning(t EffectTuning) bool {
	if t.Accent != "" {
		if len(t.Accent) != 7 || t.Accent[0] != '#' {
			return false
		}
		for _, c := range t.Accent[1:] {
			if !strings.ContainsRune("0123456789abcdefABCDEF", c) {
				return false
			}
		}
	}
	return (t.Motion == 0 || (t.Motion >= .45 && t.Motion <= 2.25)) && (t.Detail == 0 || (t.Detail >= .45 && t.Detail <= 1.65))
}

type Settings struct {
	SchemaVersion   int                     `json:"schemaVersion"`
	OBSHost         string                  `json:"obsHost"`
	OBSPort         int                     `json:"obsPort"`
	Effect          string                  `json:"effect"`
	Duration        float64                 `json:"duration"`
	Density         int                     `json:"density"`
	HotOut          string                  `json:"hotOut"`
	HotIn           string                  `json:"hotIn"`
	HotToggle       string                  `json:"hotToggle"`
	Quality         string                  `json:"quality"`
	RendererMode    string                  `json:"rendererMode"`
	AutoPerformance bool                    `json:"autoPerformance"`
	SceneTarget     string                  `json:"sceneTarget"`
	EffectOptions   map[string]EffectTuning `json:"effectOptions,omitempty"`
}

func defaultSettings() Settings {
	return Settings{SchemaVersion: settingsSchemaVersion, OBSHost: "127.0.0.1", OBSPort: 4455, Effect: "money", Duration: 3.0, Density: 75, HotOut: "Ctrl+Shift+M", HotIn: "Ctrl+Shift+N", HotToggle: "Ctrl+Shift+B", Quality: "Cinematic", RendererMode: "gpu", AutoPerformance: true, SceneTarget: "Program", EffectOptions: map[string]EffectTuning{}}
}

// Adaptive quality is applied only when a NEW transition is prepared. Never
// change mesh budgets halfway through a transition (which causes visible pops).
func broadcastQuality(requested string, tier int, enabled bool) string {
	if !enabled || tier < 1 {
		return requested
	}
	names := []string{"Performance", "Balanced", "Cinematic", "Ultra"}
	index := 2
	for i, q := range names {
		if q == requested {
			index = i
			break
		}
	}
	index -= tier
	if index < 0 {
		index = 0
	}
	return names[index]
}

// Heartbeats contain actual rAF interval P95, not JS submission duration.
// A healthy 60 Hz renderer reports about 16.67 ms, never <10 ms.
func rendererFrameHealth(fps, p95 float64) (slow, healthy bool) {
	if fps <= 0 || fps > 240 || p95 <= 0 || p95 >= 1000 {
		return false, false
	}
	return p95 > 21 || fps < 46, fps >= 57 && p95 <= 18.5
}

type SceneItem struct {
	SourceName  string `json:"sourceName"`
	SceneItemID int    `json:"sceneItemId"`
	InputKind   string `json:"inputKind"`
	IsGroup     bool   `json:"isGroup"`
}
type Scene struct {
	Name   string
	Camera string
	CamID  int
	FXID   int
	Width  int
	Height int
}
type Job struct {
	ID            int          `json:"job_id"`
	Phase         string       `json:"phase"`
	State         string       `json:"transition_state"`
	Effect        string       `json:"effect"`
	Direction     string       `json:"direction"`
	Duration      float64      `json:"duration"`
	Density       int          `json:"intensity"`
	CameraReady   bool         `json:"camera_ready"`
	Quality       string       `json:"quality"`
	RendererMode  string       `json:"renderer_mode"`
	Tuning        EffectTuning `json:"tuning"`
	FrameSequence int          `json:"frame_sequence"`
}
type App struct {
	mu                sync.Mutex
	obsPassword       string
	settings          Settings
	scene             Scene
	sources           []string
	connected         bool
	active            bool
	recoveryArmed     bool
	transitionState   string
	transitionCancel  chan struct{}
	acknowledged      map[string]bool
	status            string
	history           []string
	job               *Job
	seq               int
	frame             []byte
	lastFrame         []byte
	ready             chan struct{}
	covered           chan struct{}
	reveal            chan struct{}
	done              chan struct{}
	errored           chan string
	rendererSeen      time.Time
	rendererVersion   string
	rendererFPS       float64
	rendererP95       float64
	rendererEffect    string
	rendererStage     string
	rendererMode      string
	rendererID        string
	performanceTier   int
	slowBeats         int
	healthyBeats      int
	revealAck         bool
	renderError       string
	server            *http.Server
	nonce             string
	controlMu         sync.Mutex
	transitionDone    chan struct{}
	shuttingDown      bool
	shutdownState     string
	shutdownError     string
	recoveryStatus    string
	recoveryPending   bool
	cameraVisibility  string
	cameraVerifiedAt  time.Time
	statusProbe       time.Time
	statusProbing     bool
	timeline          []TransitionEvent
	transitionStarted time.Time
	exit              chan struct{}
	exitOnce          sync.Once
	noHotkeys         bool
}

func newApp() *App {
	a := &App{settings: loadSettings(), exit: make(chan struct{}), cameraVisibility: "unknown", transitionState: "IDLE", status: "Ready. Open OBS, connect and select your webcam."}
	random := make([]byte, 18)
	rand.Read(random)
	a.nonce = base64.RawURLEncoding.EncodeToString(random)
	a.log("SC Web Transitions v" + appVersion + " started")
	a.loadRecoveryMarker()
	return a
}
func cfgFile() string {
	base := os.Getenv("APPDATA")
	if base == "" {
		dir, _ := os.UserConfigDir()
		base = dir
	}
	return filepath.Join(base, "SCWebTransitions", "settings_v2.json")
}
func loadSettings() Settings { return loadSettingsFile(cfgFile()) }
func validQuality(q string) bool {
	return q == "Performance" || q == "Balanced" || q == "Cinematic" || q == "Ultra"
}
func saveSettings(s Settings) error { return saveSettingsFile(cfgFile(), s) }
func (a *App) log(message string) {
	log.Println(message)
	a.mu.Lock()
	defer a.mu.Unlock()
	a.status = message
	a.history = append(a.history, time.Now().Format("15:04:05")+"  "+message)
	if len(a.history) > 35 {
		a.history = a.history[len(a.history)-35:]
	}
}
func (a *App) statusJSON() any {
	a.mu.Lock()
	defer a.mu.Unlock()
	var j any
	if a.job != nil {
		t := *a.job
		j = t
	}
	return map[string]any{"version": appVersion, "sourceRevision": buildRevision, "connected": a.connected, "scene": a.scene.Name, "camera": a.scene.Camera, "sources": a.sources, "busy": a.active, "transitionState": a.transitionState, "status": a.status, "history": a.history, "settings": a.settings, "job": j, "rendererAlive": !a.rendererSeen.IsZero() && time.Since(a.rendererSeen) < 6*time.Second, "rendererVersion": a.rendererVersion, "rendererEffect": a.rendererEffect, "rendererMode": a.rendererMode, "rendererStage": a.rendererStage, "rendererFPS": a.rendererFPS, "rendererP95": a.rendererP95, "adaptiveQuality": a.performanceTier, "renderError": a.renderError, "cameraVisibility": a.currentVisibilityLocked(), "cameraVerifiedAt": a.cameraVerifiedAt, "recovery": a.recoveryStatus, "shutdown": map[string]any{"pending": a.shuttingDown, "state": a.shutdownState, "error": a.shutdownError}, "lastTimeline": append([]TransitionEvent(nil), a.timeline...)}
}
func (a *App) credentials() (string, int, string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.settings.OBSHost, a.settings.OBSPort, a.obsPassword
}
func (a *App) obs() (*OBS, error) {
	host, port, password := a.credentials()
	return DialOBS(host, port, password)
}
func params(fields map[string]any) map[string]any { return fields }

// A production broadcast must never silently use Studio Mode Preview.
// Program is the default output; Preview is an explicit user selection.
func getScene(o *OBS, target string) (string, error) {
	if target == "Preview" {
		mode, err := o.Request("GetStudioModeEnabled", nil)
		if err != nil {
			return "", err
		}
		enabled, err := field[bool](mode, "studioModeEnabled")
		if err != nil || !enabled {
			return "", errors.New("Preview target requires OBS Studio Mode")
		}
		p, err := o.Request("GetCurrentPreviewScene", nil)
		if err != nil {
			return "", err
		}
		return field[string](p, "currentPreviewSceneName")
	}
	r, err := o.Request("GetCurrentProgramScene", nil)
	if err != nil {
		return "", err
	}
	return field[string](r, "currentProgramSceneName")
}
func items(o *OBS, scene string) ([]SceneItem, error) {
	r, err := o.Request("GetSceneItemList", params(map[string]any{"sceneName": scene}))
	if err != nil {
		return nil, err
	}
	return field[[]SceneItem](r, "sceneItems")
}
func (a *App) connect(password string) (any, error) {
	a.mu.Lock()
	if a.active || a.shuttingDown {
		a.mu.Unlock()
		return nil, errors.New("Controller is busy")
	}
	a.active = true
	defer func() { a.mu.Lock(); a.active = false; a.mu.Unlock() }()
	a.obsPassword = password
	target := a.settings.SceneTarget
	a.mu.Unlock()
	o, err := a.obs()
	if err != nil {
		return nil, err
	}
	defer o.Close()
	scene, err := getScene(o, target)
	if err != nil {
		return nil, err
	}
	list, err := items(o, scene)
	if err != nil {
		return nil, err
	}
	sources := []string{}
	for _, it := range list {
		if it.SourceName != sceneFX {
			sources = append(sources, it.SourceName)
		}
	}
	a.mu.Lock()
	a.connected = true
	if a.scene.Name != scene && !a.recoveryPending {
		a.invalidateFrameLocked()
		a.scene = Scene{Name: scene}
		a.rendererID = ""
	}
	a.sources = sources
	a.mu.Unlock()
	a.log(fmt.Sprintf("Connected to OBS %s · Scene: %s", o.version, scene))
	return map[string]any{"scene": scene, "sources": sources}, nil
}
func readObj(fieldData map[string]json.RawMessage, key string) (map[string]any, error) {
	return field[map[string]any](fieldData, key)
}
func intVal(m map[string]any, key string, def int) int {
	if n, ok := m[key].(float64); ok {
		return int(n)
	}
	return def
}
func (f *App) install(camera string) (any, error) {
	f.mu.Lock()
	if f.active || f.shuttingDown || f.recoveryPending {
		f.mu.Unlock()
		return nil, errors.New("Transition in progress")
	}
	f.active = true
	target := f.settings.SceneTarget
	defer func() { f.mu.Lock(); f.active = false; f.mu.Unlock() }()
	f.mu.Unlock()
	o, err := f.obs()
	if err != nil {
		return nil, err
	}
	defer o.Close()
	scene, err := getScene(o, target)
	if err != nil {
		return nil, err
	}
	list, err := items(o, scene)
	if err != nil {
		return nil, err
	}
	var cam *SceneItem
	var fx *SceneItem
	for i := range list {
		if list[i].SourceName == camera {
			cam = &list[i]
		}
		if list[i].SourceName == sceneFX {
			fx = &list[i]
		}
	}
	cameraMatches := 0
	for _, item := range list {
		if item.SourceName == camera {
			cameraMatches++
		}
	}
	if cameraMatches > 1 {
		return nil, errors.New("Multiple references to this camera exist in the target scene; select a scene with one unambiguous camera item")
	}
	if cam == nil {
		return nil, errors.New("Selected source must be a direct, unique item in the target scene. For cameras inside groups or nested scenes, select the containing scene as a source, or install in that actual scene; nested child transforms are not safely supported.")
	}
	tfResponse, err := o.Request("GetSceneItemTransform", params(map[string]any{"sceneName": scene, "sceneItemId": cam.SceneItemID}))
	if err != nil {
		return nil, err
	}
	transform, err := readObj(tfResponse, "sceneItemTransform")
	if err != nil {
		return nil, err
	}
	width := intVal(transform, "sourceWidth", 1280)
	height := intVal(transform, "sourceHeight", 720)
	if width < 64 || height < 64 {
		return nil, errors.New("OBS reported an invalid camera source size. Ensure the webcam is active and retry.")
	}
	if err := ensurePrivateFX(o, scene); err != nil {
		return nil, err
	}
	// Keep input dimensions identical to the camera's unscaled source dimensions;
	// mirror OBS's transform and crop instead of positioning the effect at (0,0).
	ridBytes := make([]byte, 12)
	if _, err := rand.Read(ridBytes); err != nil {
		return nil, err
	}
	rid := base64.RawURLEncoding.EncodeToString(ridBytes)
	sourceSettings := map[string]any{"is_local_file": false, "url": fmt.Sprintf("http://127.0.0.1:%d/overlay.html?v=%s&rid=%s&t=%d", rendererPort, appVersion, rid, time.Now().UnixNano()), "width": width, "height": height, "shutdown": false, "restart_when_active": false, "css": "body { margin:0; background:rgba(0,0,0,0)!important; overflow:hidden; }"}
	var fxid int
	if fx != nil {
		_, err = o.Request("SetInputSettings", params(map[string]any{"inputName": sceneFX, "inputSettings": sourceSettings, "overlay": true}))
		if err != nil {
			return nil, err
		}
		fxid = fx.SceneItemID
	} else {
		r, err := o.Request("GetInputList", nil)
		if err != nil {
			return nil, err
		}
		var inputs []struct {
			InputName string `json:"inputName"`
		}
		json.Unmarshal(r["inputs"], &inputs)
		exists := false
		for _, i := range inputs {
			if i.InputName == sceneFX {
				exists = true
				break
			}
		}
		method := "CreateInput"
		args := map[string]any{"sceneName": scene, "inputName": sceneFX, "inputKind": "browser_source", "inputSettings": sourceSettings, "sceneItemEnabled": true}
		if exists {
			method = "CreateSceneItem"
			args = map[string]any{"sceneName": scene, "sourceName": sceneFX, "sceneItemEnabled": true}
			o.Request("SetInputSettings", map[string]any{"inputName": sceneFX, "inputSettings": sourceSettings, "overlay": true})
		}
		r, err = o.Request(method, args)
		if err != nil {
			return nil, err
		}
		fxid, err = field[int](r, "sceneItemId")
		if err != nil {
			return nil, err
		}
	}
	allowed := map[string]bool{"positionX": true, "positionY": true, "rotation": true, "alignment": true, "scaleX": true, "scaleY": true, "boundsType": true, "boundsAlignment": true, "cropLeft": true, "cropRight": true, "cropTop": true, "cropBottom": true, "cropToBounds": true}
	if transform["boundsType"] != "OBS_BOUNDS_NONE" {
		allowed["boundsWidth"] = true
		allowed["boundsHeight"] = true
	}
	clone := map[string]any{}
	for k, v := range transform {
		if allowed[k] {
			clone[k] = v
		}
	}
	_, err = o.Request("SetSceneItemTransform", params(map[string]any{"sceneName": scene, "sceneItemId": fxid, "sceneItemTransform": clone}))
	if err != nil {
		return nil, err
	}
	if _, err = o.Request("SetSceneItemBlendMode", map[string]any{"sceneName": scene, "sceneItemId": fxid, "sceneItemBlendMode": "OBS_BLEND_NORMAL"}); err != nil {
		return nil, err
	}
	newItems, err := items(o, scene)
	if err != nil {
		return nil, err
	}
	_, err = o.Request("SetSceneItemIndex", params(map[string]any{"sceneName": scene, "sceneItemId": fxid, "sceneItemIndex": len(newItems) - 1}))
	if err != nil {
		return nil, err
	}
	_, err = o.Request("SetSceneItemEnabled", params(map[string]any{"sceneName": scene, "sceneItemId": fxid, "sceneItemEnabled": true}))
	if err != nil {
		return nil, err
	}
	f.mu.Lock()
	f.scene = Scene{scene, camera, cam.SceneItemID, fxid, width, height}
	f.invalidateFrameLocked()
	f.rendererSeen = time.Time{}
	f.rendererVersion = ""
	f.rendererID = rid
	f.renderError = ""
	f.connected = true
	f.mu.Unlock()
	// Browser source reload is best-effort; URL cache-busting remains the primary refresh.
	if _, refreshErr := o.Request("PressInputPropertiesButton", map[string]any{"inputName": sceneFX, "propertyName": "refreshnocache"}); refreshErr != nil {
		log.Printf("Optional OBS browser refresh unavailable: %v", refreshErr)
	}
	f.log(fmt.Sprintf("Installed camera renderer above %q (%dx%d). Renderer must report the same installation capability before effects run.", camera, width, height))
	return map[string]any{"scene": scene, "camera": camera, "width": width, "height": height}, nil
}

// Resolve scene items BY NAME before each switch. IDs are unique to a scene
// item, not a stable input; reinstalling, duplicating or changing a scene may
// invalidate a cached ID while the underlying source remains available.
func resolveCameraAndFX(o *OBS, sc Scene) (Scene, error) {
	list, err := items(o, sc.Name)
	if err != nil {
		return sc, fmt.Errorf("refreshing OBS scene items: %w", err)
	}
	camFound, fxFound := false, false
	camCount, fxCount := 0, 0
	for _, it := range list {
		if it.SourceName == sc.Camera {
			sc.CamID = it.SceneItemID
			camFound = true
			camCount++
		}
		if it.SourceName == sceneFX {
			sc.FXID = it.SceneItemID
			fxFound = true
			fxCount++
		}
	}
	if camCount > 1 || fxCount > 1 {
		return sc, errors.New("Duplicate camera/FX scene items are ambiguous; install in a scene with unique direct items")
	}
	if !camFound {
		return sc, fmt.Errorf("webcam %q not found in OBS scene %q. Install / realign the camera renderer", sc.Camera, sc.Name)
	}
	if !fxFound {
		return sc, fmt.Errorf("FX source not found in OBS scene %q. Install / realign the camera renderer", sc.Name)
	}
	return sc, nil
}
func (a *App) visible(o *OBS, scene Scene) (bool, error) {
	fresh, err := resolveCameraAndFX(o, scene)
	if err != nil {
		return false, err
	}
	r, err := o.Request("GetSceneItemEnabled", map[string]any{"sceneName": fresh.Name, "sceneItemId": fresh.CamID})
	if err != nil {
		return false, err
	}
	v, err := field[bool](r, "sceneItemEnabled")
	a.mu.Lock()
	a.cameraVerifiedAt = time.Now()
	if err != nil {
		a.cameraVisibility = "unknown"
	} else if v {
		a.cameraVisibility = "visible"
	} else {
		a.cameraVisibility = "hidden"
	}
	a.mu.Unlock()
	return v, err
}

// This call is not considered successful until OBS reports the requested
// camera state. Log the target and use fresh IDs on retries.
func (a *App) changeVisible(o *OBS, scene Scene, enabled bool) error {
	return a.changeVisibleForJob(o, scene, enabled, 0)
}
func (a *App) changeVisibleForJob(o *OBS, scene Scene, enabled bool, id int) error {
	a.mu.Lock()
	sceneTarget := a.settings.SceneTarget
	a.mu.Unlock()
	target := "OFF"
	if enabled {
		target = "ON"
	}
	var last error
	for attempt := 1; attempt <= 3; attempt++ {
		currentScene, err := getScene(o, sceneTarget)
		if err != nil {
			return fmt.Errorf("cannot resolve OBS Program/Preview scene: %w", err)
		}
		if currentScene != scene.Name {
			return fmt.Errorf("OBS scene changed from %q to %q before camera %s; no camera state modified", scene.Name, currentScene, target)
		}
		fresh, err := resolveCameraAndFX(o, scene)
		if err != nil {
			return err
		}
		if id != 0 {
			if err := a.checkTransition(id); err != nil {
				return err
			}
			if err := verifyCompositorPlacement(o, fresh); err != nil {
				return err
			}
			if err := a.checkTransition(id); err != nil {
				return err
			}
		}
		_, err = o.Request("SetSceneItemEnabled", map[string]any{"sceneName": fresh.Name, "sceneItemId": fresh.CamID, "sceneItemEnabled": enabled})
		if err != nil {
			last = fmt.Errorf("SetSceneItemEnabled scene=%q camera=%q id=%d state=%s failed: %w", fresh.Name, fresh.Camera, fresh.CamID, target, err)
			var netErr net.Error
			if errors.As(err, &netErr) && netErr.Timeout() {
				return last
			}
			if errors.Is(err, io.EOF) || errors.Is(err, net.ErrClosed) {
				return last
			}
		} else {
			// Confirmation may require a render tick; bounded polling is much safer
			// than assuming WebSocket RPC success means the video changed state.
			for check := 0; check < 5; check++ {
				if id != 0 {
					if err := a.checkTransition(id); err != nil {
						return err
					}
				}
				r, e := o.Request("GetSceneItemEnabled", map[string]any{"sceneName": fresh.Name, "sceneItemId": fresh.CamID})
				if e == nil {
					actual, fe := field[bool](r, "sceneItemEnabled")
					if fe == nil && actual == enabled {
						a.mu.Lock()
						a.cameraVerifiedAt = time.Now()
						if enabled {
							a.cameraVisibility = "visible"
						} else {
							a.cameraVisibility = "hidden"
						}
						a.mu.Unlock()
						a.log(fmt.Sprintf("OBS camera confirmed %s: scene=%q source=%q item=%d attempt=%d", target, fresh.Name, fresh.Camera, fresh.CamID, attempt))
						return nil
					}
					if fe != nil {
						last = fe
					} else {
						last = fmt.Errorf("camera is still enabled=%v instead of %v", actual, enabled)
					}
				} else {
					last = e
					var netErr net.Error
					if errors.As(e, &netErr) && netErr.Timeout() {
						return fmt.Errorf("OBS readback timed out: %w", e)
					}
					if errors.Is(e, io.EOF) || errors.Is(e, net.ErrClosed) {
						return fmt.Errorf("OBS connection lost during readback: %w", e)
					}
				}
				time.Sleep(75 * time.Millisecond)
			}
		}
		time.Sleep(125 * time.Millisecond)
	}
	return fmt.Errorf("OBS camera did not confirm %s after 3 attempts (%v). Source may be nested, in another scene, or controlled by another filter", target, last)
}

// Clear a failed FX using its current scene-item ID, then confirm OBS
// disabled the Browser Source. This prevents a changed item ID from leaving
// a stuck opaque cloud onscreen after an error or a user-initiated recovery.
func (a *App) clearFX(o *OBS, sc Scene) error {
	list, err := items(o, sc.Name)
	if err != nil {
		return err
	}
	id := -1
	for _, it := range list {
		if it.SourceName == sceneFX {
			id = it.SceneItemID
			break
		}
	}
	if id < 0 {
		return fmt.Errorf("FX input %q missing in OBS scene %q", sceneFX, sc.Name)
	}
	_, err = o.Request("SetSceneItemEnabled", map[string]any{"sceneName": sc.Name, "sceneItemId": id, "sceneItemEnabled": false})
	if err != nil {
		return fmt.Errorf("disable FX item %d: %w", id, err)
	}
	for i := 0; i < 4; i++ {
		r, e := o.Request("GetSceneItemEnabled", map[string]any{"sceneName": sc.Name, "sceneItemId": id})
		if e == nil {
			active, fe := field[bool](r, "sceneItemEnabled")
			if fe == nil && !active {
				return nil
			}
		}
		time.Sleep(80 * time.Millisecond)
	}
	return fmt.Errorf("FX source %q item %d did not confirm disabled after cleanup", sceneFX, id)
}
func (a *App) capture(o *OBS, sc Scene) ([]byte, error) {
	return a.captureSource(o, sc.Camera, sc.Width, sc.Height)
}
func (a *App) captureSource(o *OBS, source string, width, height int) ([]byte, error) {
	// Request both dimensions: OBS returns the specified source, not the whole scene.
	w, h := width, height
	if w > 1920 {
		h = int(float64(h) * 1920 / float64(w))
		w = 1920
	}
	if h > 1080 {
		w = int(float64(w) * 1080 / float64(h))
		h = 1080
	}
	r, err := o.Request("GetSourceScreenshot", map[string]any{"sourceName": source, "imageFormat": "png", "imageWidth": w, "imageHeight": h})
	if err != nil {
		return nil, err
	}
	uri, err := field[string](r, "imageData")
	if err != nil {
		return nil, err
	}
	chunks := strings.SplitN(uri, ",", 2)
	if len(chunks) != 2 {
		return nil, errors.New("OBS screenshot did not contain an image")
	}
	b, err := base64.StdEncoding.DecodeString(chunks[1])
	if err != nil {
		return nil, err
	}
	conf, err := png.DecodeConfig(bytes.NewReader(b))
	if err != nil {
		return nil, fmt.Errorf("OBS image invalid: %w", err)
	}
	if conf.Width < 64 || conf.Height < 64 {
		return nil, errors.New("OBS camera screenshot is too small")
	}
	return b, nil
}

// Camera evidence from OBS, not from the synthetic preview.
// Sample the PNG alpha and corner green. Fully opaque camera captures without
// green screen cannot be reliably converted into a person silhouette.
type FrameStats struct {
	Width           int     `json:"width"`
	Height          int     `json:"height"`
	AlphaBackground float64 `json:"alphaBackground"`
	GreenBackground float64 `json:"greenBackground"`
	Foreground      float64 `json:"foreground"`
	Bounds          [4]int  `json:"bounds"`
}

func frameStats(pngData []byte) (FrameStats, error) {
	im, err := png.Decode(bytes.NewReader(pngData))
	if err != nil {
		return FrameStats{}, err
	}
	bb := im.Bounds()
	w, h := bb.Dx(), bb.Dy()
	st := FrameStats{Width: w, Height: h, Bounds: [4]int{w, h, 0, 0}}
	var total, clear, green, visible float64
	step := int(float64(w) / 220.0)
	if step < 2 {
		step = 2
	}
	for y := 0; y < h; y += step {
		for x := 0; x < w; x += step {
			total++
			r, g, b, a := im.At(bb.Min.X+x, bb.Min.Y+y).RGBA()
			if a < 0xA000 {
				clear++
			} else {
				rr, gg, bl := int(r>>8), int(g>>8), int(b>>8)
				if gg > 72 && gg-rr > 34 && gg-bl > 29 && float64(gg) > float64(rr)*1.26 && float64(gg) > float64(bl)*1.24 {
					green++
				} else {
					visible++
					if x < st.Bounds[0] {
						st.Bounds[0] = x
					}
					if y < st.Bounds[1] {
						st.Bounds[1] = y
					}
					if x > st.Bounds[2] {
						st.Bounds[2] = x
					}
					if y > st.Bounds[3] {
						st.Bounds[3] = y
					}
				}
			}
		}
	}
	if total > 0 {
		st.AlphaBackground = clear / total
		st.GreenBackground = green / total
		st.Foreground = visible / total
	}
	if visible == 0 {
		st.Bounds = [4]int{0, 0, 0, 0}
	}
	return st, nil
}
func solidPixels(b []byte) (float64, error) {
	im, e := png.Decode(bytes.NewReader(b))
	if e != nil {
		return 0, e
	}
	bd := im.Bounds()
	n, opaque := 0, 0
	stride := bd.Dx() / 160
	if stride < 2 {
		stride = 2
	}
	for y := bd.Min.Y; y < bd.Max.Y; y += stride {
		for x := bd.Min.X; x < bd.Max.X; x += stride {
			rr, gg, bb, a := im.At(x, y).RGBA()
			n++
			// Ignore the browser's solid black/opaque fallback. OBS can report
			// nontransparent pixels even when the canvas itself never painted.
			if a > 0x3800 && (rr>>8)+(gg>>8)+(bb>>8) > 18 {
				opaque++
			}
		}
	}
	if n == 0 {
		return 0, nil
	}
	return float64(opaque) / float64(n), nil
}

// checkTransition prevents late renderer ACKs and recovery requests from racing
// an OBS visibility change. The cancel channel exists before PREPARING starts.
func (a *App) checkTransition(id int) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	if !a.active || a.job == nil || a.job.ID != id {
		return errors.New("transition is no longer current")
	}
	select {
	case <-a.transitionCancel:
		return errors.New("Camera recovery requested")
	default:
	}
	return nil
}

func (a *App) setTransitionState(id int, state string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.job != nil && a.job.ID == id {
		a.job.State = state
		a.recordStateLocked(state)
	}
}

func (a *App) verifyOBSOverlay(o *OBS, sc Scene, id int, refreshLive bool) error {
	if err := a.checkTransition(id); err != nil {
		return err
	}
	fresh, err := resolveCameraAndFX(o, sc)
	if err != nil {
		return err
	}
	if err = verifyCompositorPlacement(o, fresh); err != nil {
		return err
	}

	// Check both the prepared silhouette and the current live frame. The user
	// can move while coverage builds; the original silhouette alone is unsafe.
	a.mu.Lock()
	camera := append([]byte(nil), a.frame...)
	a.mu.Unlock()
	var detail string
	consecutive := 0
	for i := 0; i < 9; i++ {
		if err := a.checkTransition(id); err != nil {
			return err
		}
		current := camera
		if refreshLive {
			var err error
			current, err = a.capture(o, sc)
			if err != nil {
				return fmt.Errorf("cannot verify current live silhouette: %w", err)
			}
		}
		fx, e := a.captureSource(o, sceneFX, sc.Width, sc.Height)
		if e == nil {
			original, ce := measureFXCoverage(camera, fx)
			live, le := measureFXCoverage(current, fx)
			if ce == nil && le == nil && original.Safe() && live.Safe() {
				consecutive++
				if consecutive >= 2 {
					a.log(fmt.Sprintf("OBS FX coverage verified twice: %.2f%% original, %.2f%% live; worst occupied tile %.2f%%.", original.Coverage*100, live.Coverage*100, live.MinimumTile*100))
					return nil
				}
			} else {
				consecutive = 0
				if ce != nil {
					detail = ce.Error()
				} else if le != nil {
					detail = le.Error()
				} else {
					detail = fmt.Sprintf("original %.2f%%, live %.2f%%, local minimum %.2f%%", original.Coverage*100, live.Coverage*100, live.MinimumTile*100)
				}
			}
		} else {
			consecutive = 0
			detail = e.Error()
		}
		time.Sleep(70 * time.Millisecond)
	}
	return fmt.Errorf("OBS FX COVERAGE FAILED in scene %q (%s). Camera switch cancelled. Ensure the FX source is visible, above the camera and aligned; Install / realign if needed", sc.Name, detail)
}

// waitForUsableCameraFrame checks camera pixels AFTER enabling the source.
// Browser/WebSocket screenshots do not expose OBS frame timestamps, so this is
// an availability/alpha validation, not proof that a frame is temporally fresh.
// A future native libobs filter will replace this fallback with a frame counter.
func (a *App) waitForUsableCameraFrame(o *OBS, sc Scene) error {
	var last error
	for attempt := 0; attempt < 7; attempt++ {
		frame, err := a.capture(o, sc)
		if err == nil {
			var stats FrameStats
			stats, err = frameStats(frame)
			if err == nil && stats.Foreground > 0.004 && (stats.AlphaBackground >= .012 || stats.GreenBackground >= .20) {
				return nil
			}
			if err == nil {
				err = fmt.Errorf("camera source has no usable keyed foreground after activation")
			}
		}
		last = err
		time.Sleep(85 * time.Millisecond)
	}
	return fmt.Errorf("camera could not provide usable pixels after enabling it: %w", last)
}

func (a *App) verifyFXCleared(o *OBS, sc Scene, id int) error {
	var last error
	for attempt := 0; attempt < 5; attempt++ {
		if err := a.checkTransition(id); err != nil {
			return err
		}
		frame, err := a.captureSource(o, sceneFX, sc.Width, sc.Height)
		if err == nil {
			clear, decodeErr := effectIsClear(frame)
			if decodeErr == nil && clear {
				return nil
			}
			err = decodeErr
			if err == nil {
				err = errors.New("renderer still contains visible pixels after completion")
			}
		}
		last = err
		time.Sleep(70 * time.Millisecond)
	}
	return fmt.Errorf("FX completion cleanup failed: %w", last)
}

func (a *App) startTransition(effect, direction string, duration float64, density int) error {
	a.mu.Lock()
	if a.active || a.shuttingDown || a.recoveryPending {
		a.mu.Unlock()
		return errors.New("Controller busy, shutting down, or awaiting camera recovery")
	}
	if a.scene.Camera == "" {
		a.mu.Unlock()
		return errors.New("Connect to OBS and install the renderer first")
	}
	sc := a.scene
	a.active = true
	a.transitionStarted = time.Now()
	a.timeline = nil
	a.recordStateLocked("PREPARING")
	a.transitionDone = make(chan struct{})
	a.transitionCancel = make(chan struct{})
	a.recoveryArmed = false
	a.renderError = ""
	a.mu.Unlock()
	go func() {
		var transitionErr error
		defer func() {
			// A panic in an individual transition must not leave a camera
			// hidden behind an enabled Browser Source.
			if crash := recover(); crash != nil {
				transitionErr = fmt.Errorf("unexpected transition failure: %v", crash)
			}
			a.mu.Lock()
			armed := a.recoveryArmed
			a.mu.Unlock()
			recoveryFailed := false
			if transitionErr != nil {
				a.mu.Lock()
				shuttingDown := a.shuttingDown
				a.recordStateLocked("ERROR")
				a.renderError = transitionErr.Error()
				a.mu.Unlock()
				if armed && !shuttingDown {
					ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
					e := a.reconcileCamera(ctx, sc)
					cancel()
					recoveryFailed = e != nil
					if e != nil {
						a.log("Transition failed; recovery unconfirmed: " + e.Error())
					}
				}
				a.log("Transition error: " + transitionErr.Error())
			}

			a.mu.Lock()
			a.recoveryArmed = false
			if recoveryFailed {
				a.recordStateLocked("SAFE_ERROR")
				a.recoveryPending = true
			} else {
				if transitionErr == nil {
					a.recordStateLocked("COMPLETE")
				}
				a.recordStateLocked("IDLE")
			}

			a.active = false
			a.job = nil
			a.frame = nil
			if a.transitionDone != nil {
				close(a.transitionDone)
				a.transitionDone = nil
			}
			a.mu.Unlock()
		}()
		transitionErr = a.runTransition(sc, effect, direction, duration, density)
	}()
	return nil
}
func (a *App) runTransition(sc Scene, effect, direction string, duration float64, density int) error {
	a.mu.Lock()
	sceneTarget := a.settings.SceneTarget
	a.mu.Unlock()
	o, err := a.obs()
	if err != nil {
		return err
	}
	defer o.Close()
	// Abort a blocked screenshot/RPC as well as channel waits. Otherwise a
	// recovery request could sit behind several nine-second screenshot timeouts.
	a.mu.Lock()
	cancel := a.transitionCancel
	a.mu.Unlock()
	watchDone := make(chan struct{})
	defer close(watchDone)
	go func() {
		deadline := time.NewTimer(time.Duration(duration*float64(time.Second)) + 30*time.Second)
		defer deadline.Stop()
		select {
		case <-cancel:
			o.Close()
		case <-deadline.C:
			o.Close()
		case <-watchDone:
		}
	}()
	current, err := getScene(o, sceneTarget)
	if err != nil {
		return err
	}
	if current != sc.Name {
		return fmt.Errorf("Active OBS %s scene is %q, installed scene is %q. Select the correct scene and Install / realign", sceneTarget, current, sc.Name)
	}
	sc, err = resolveCameraAndFX(o, sc)
	if err != nil {
		return err
	}
	initial, err := a.visible(o, sc)
	if err != nil {
		return err
	}
	a.mu.Lock()
	rendererLive := !a.rendererSeen.IsZero() && time.Since(a.rendererSeen) < 5*time.Second && a.rendererID != ""
	a.mu.Unlock()
	if !rendererLive {
		return errors.New("OBS renderer is not online for this installed camera. Install / realign the Browser Source in your CURRENT OBS scene")
	}
	if direction == "out" && !initial {
		return errors.New("Camera is already hidden; use IN")
	}
	if direction == "in" && initial {
		return errors.New("Camera is already visible; use OUT")
	}
	// Changes beyond this point may require restoring camera visibility. An
	// invalid OUT against an already-hidden camera must not reveal it.
	a.mu.Lock()
	a.recoveryArmed = true
	a.mu.Unlock()
	if err := a.writeRecoveryMarker(sc); err != nil {
		return fmt.Errorf("cannot persist transition recovery state: %w", err)
	}
	_, err = o.Request("SetSceneItemEnabled", map[string]any{"sceneName": sc.Name, "sceneItemId": sc.FXID, "sceneItemEnabled": true})
	if err != nil {
		return err
	}
	var frame []byte
	if direction == "out" {
		frame, err = a.capture(o, sc)
		if err != nil {
			return err
		}
		stats, statErr := frameStats(frame)
		if statErr != nil {
			return statErr
		}
		a.log(fmt.Sprintf("OBS CAMERA CAPTURE: %dx%d, transparency %.1f%%, green %.1f%%, foreground %.1f%%", stats.Width, stats.Height, stats.AlphaBackground*100, stats.GreenBackground*100, stats.Foreground*100))
		if stats.AlphaBackground < .012 && stats.GreenBackground < .20 {
			return errors.New("OBS camera screenshot has no green-screen or transparent background. The demo preview uses a fake keyed figure. Apply background removal directly to the selected OBS camera source, then Install / realign.")
		}
	} else {
		a.mu.Lock()
		frame = append([]byte(nil), a.lastFrame...)
		a.mu.Unlock()
		if candidate, capErr := a.capture(o, sc); capErr == nil {
			if stats, stErr := frameStats(candidate); stErr == nil && stats.Foreground > .004 && (stats.AlphaBackground >= .012 || stats.GreenBackground >= .20) {
				frame = candidate
				a.log("IN obtained camera pixels while hidden; OBS WebSocket does not prove temporal freshness")
			}
		}
		if len(frame) == 0 {
			return errors.New("Run OUT once first to capture the camera silhouette for IN")
		}
	}
	a.mu.Lock()
	a.seq++
	id := a.seq
	tune := a.settings.EffectOptions[effect]
	requestedQuality := a.settings.Quality
	selectedQuality := broadcastQuality(requestedQuality, a.performanceTier, a.settings.AutoPerformance)
	a.revealAck = false
	a.acknowledged = make(map[string]bool)
	a.job = &Job{ID: id, Phase: "prepare", State: "PREPARING", Effect: effect, Direction: direction, Duration: duration, Density: density, CameraReady: false, Quality: selectedQuality, RendererMode: a.settings.RendererMode, Tuning: tune}
	a.frame = frame
	a.ready = make(chan struct{}, 1)
	a.covered = make(chan struct{}, 1)
	a.reveal = make(chan struct{}, 1)
	a.done = make(chan struct{}, 1)
	a.errored = make(chan string, 1)
	a.mu.Unlock()
	a.log(fmt.Sprintf("Preparing %s %s, renderer quality %s (requested %s)", effect, direction, selectedQuality, requestedQuality))
	wait := func(ch <-chan struct{}, timeout time.Duration, stage string) error {
		a.mu.Lock()
		errCh := a.errored
		cancel := a.transitionCancel
		a.mu.Unlock()
		timer := time.NewTimer(timeout)
		ticker := time.NewTicker(400 * time.Millisecond)
		defer timer.Stop()
		defer ticker.Stop()
		for {
			select {
			case <-ch:
				return a.checkTransition(id)
			case <-cancel:
				return errors.New("Camera recovery requested")
			case e := <-errCh:
				return errors.New("Renderer: " + e)
			case <-timer.C:
				return fmt.Errorf("Renderer timed out during %s. Check the OBS Browser Source", stage)
			case <-ticker.C:
				a.mu.Lock()
				last := a.rendererSeen
				a.mu.Unlock()
				if time.Since(last) > 4500*time.Millisecond {
					return fmt.Errorf("Renderer heartbeat lost during %s; camera will be recovered", stage)
				}
			}
		}
	}
	if err = wait(a.ready, 8*time.Second, "preparing (if renderer status is offline, press Install / realign)"); err != nil {
		return err
	}
	a.setTransitionState(id, "FRAME_READY")
	if direction == "out" {
		a.setPhase(id, "cover")
		a.setTransitionState(id, "COVER_BUILDING")
		if err = wait(a.covered, 6*time.Second, "confirming visual concealment before camera-off"); err != nil {
			return err
		}
		if err = a.verifyOBSOverlay(o, sc, id, true); err != nil {
			return err
		}
		a.setTransitionState(id, "COVER_VERIFIED")
		if err = a.checkTransition(id); err != nil {
			return err
		}
		a.setTransitionState(id, "CAMERA_SWITCHING")
		if err = a.changeVisibleForJob(o, sc, false, id); err != nil {
			return err
		}
		a.setTransitionState(id, "CAMERA_STATE_CONFIRMED")
	} // IN starts with webcam hidden. No stale frozen webcam displayed during banknote assembly.
	if direction == "in" {
		a.setTransitionState(id, "COVER_BUILDING")
	} else {
		a.setTransitionState(id, "DISPERSING")
	}
	a.setPhase(id, "play")
	a.log(fmt.Sprintf("Playing %s %s (%.1fs) after renderer coverage", effect, direction, duration))
	if direction == "in" {
		a.mu.Lock()
		revealCh := a.reveal
		doneCh := a.done
		errCh := a.errored
		cancel := a.transitionCancel
		a.mu.Unlock()
		timer := time.NewTimer(time.Duration((duration + 5) * float64(time.Second)))
		ticker := time.NewTicker(400 * time.Millisecond)
		defer timer.Stop()
		defer ticker.Stop()
		revealed := false
		for {
			select {
			case <-ticker.C:
				a.mu.Lock()
				last := a.rendererSeen
				a.mu.Unlock()
				if time.Since(last) > 4500*time.Millisecond {
					return errors.New("IN renderer heartbeat lost; attempting safe camera recovery")
				}
			case <-cancel:
				return errors.New("Camera recovery requested")
			case <-revealCh:
				if !revealed {
					if err = a.verifyOBSOverlay(o, sc, id, false); err != nil {
						return fmt.Errorf("IN concealment not confirmed before camera-on: %w", err)
					}
					a.setTransitionState(id, "COVER_VERIFIED")
					if err = a.checkTransition(id); err != nil {
						return err
					}
					a.setTransitionState(id, "CAMERA_SWITCHING")
					if err = a.changeVisibleForJob(o, sc, true, id); err != nil {
						return err
					}
					// Keep all effects fully concealing the camera until
					// OBS supplies a keyed image after source activation.
					if err = a.waitForUsableCameraFrame(o, sc); err != nil {
						return err
					}
					// Recheck the now-live silhouette before releasing concealment.
					if err = a.verifyOBSOverlay(o, sc, id, true); err != nil {
						return err
					}
					if err = a.checkTransition(id); err != nil {
						return err
					}
					a.setTransitionState(id, "CAMERA_STATE_CONFIRMED")
					revealed = true
					a.mu.Lock()
					if a.job != nil && a.job.ID == id {
						a.job.CameraReady = true
					}
					a.mu.Unlock()
					a.setTransitionState(id, "DISPERSING")
				}
			case <-doneCh:
				if !revealed {
					return errors.New("IN renderer finished before verified camera reveal; recovery will show the camera")
				}
				if visible, e := a.visible(o, sc); e != nil || !visible {
					return fmt.Errorf("IN completed but OBS camera is not confirmed visible: visible=%v err=%v", visible, e)
				}
				if err = a.verifyFXCleared(o, sc, id); err != nil {
					return err
				}
				a.removeRecoveryMarker()
				a.log("Camera visible. IN complete.")
				return nil
			case e := <-errCh:
				return errors.New("Renderer: " + e)
			case <-timer.C:
				return errors.New("IN animation timed out; camera will be restored")
			}
		}
	}
	if err = wait(a.done, time.Duration((duration+5)*float64(time.Second)), "finishing OUT"); err != nil {
		return err
	}
	a.mu.Lock()
	a.lastFrame = append([]byte(nil), frame...)
	a.mu.Unlock()
	if visible, e := a.visible(o, sc); e != nil || visible {
		return fmt.Errorf("OUT completed but OBS camera is not confirmed hidden: visible=%v err=%v", visible, e)
	}
	if err = a.verifyFXCleared(o, sc, id); err != nil {
		return err
	}
	a.removeRecoveryMarker()
	a.log("Camera hidden. OUT complete.")
	return nil
}
func (a *App) setPhase(id int, phase string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.job != nil && a.job.ID == id {
		a.job.Phase = phase
	}
}

// Renderer requests may be retried after the response is lost. Accepted signals
// are idempotent for this job, but never refresh the liveness of a stale job.
func (a *App) ack(id int, action, reason string, coverage float64) bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.job == nil || a.job.ID != id {
		return false
	}
	select {
	case <-a.transitionCancel:
		return false
	default:
	}
	if a.acknowledged[action] {
		return true
	}
	var ch chan struct{}
	fail := func(reason string) bool {
		select {
		case a.errored <- reason:
		default:
		}
		return true
	}
	validCoverage := func() bool { return coverage >= minimumCoverage && coverage <= 1 }
	switch action {
	case "ready":
		if a.job.Phase != "prepare" {
			return false
		}
		ch = a.ready
	case "covered":
		if a.job.Phase != "cover" {
			return false
		}
		if !validCoverage() {
			return fail(fmt.Sprintf("%s coverage failed: %.2f%% (99.5%% required)", a.job.Effect, coverage*100))
		}
		ch = a.covered
	case "reveal":
		if a.job.Phase != "play" || a.job.Direction != "in" {
			return false
		}
		if !validCoverage() {
			return fail(fmt.Sprintf("%s reveal coverage failed: %.2f%% (99.5%% required)", a.job.Effect, coverage*100))
		}
		a.revealAck = true
		ch = a.reveal
	case "done":
		if a.job.Phase != "play" {
			return false
		}
		if a.job.Direction == "in" && !a.revealAck {
			return fail("IN finished without a reveal acknowledgement")
		}
		if a.job.Direction == "in" && !a.job.CameraReady {
			return fail("IN finished before OBS confirmed a usable camera frame")
		}
		ch = a.done
	case "error":
		return fail(reason)
	default:
		return false
	}
	if ch == nil {
		return false
	}
	if a.acknowledged == nil {
		a.acknowledged = make(map[string]bool)
	}
	a.acknowledged[action] = true
	a.rendererSeen = time.Now()
	select {
	case ch <- struct{}{}:
	default:
	}
	return true
}
func (a *App) stateJSON() any {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.job == nil {
		return map[string]any{"job_id": 0, "phase": "idle", "transition_state": a.transitionState}
	}
	copyJob := *a.job
	return copyJob
}
func (a *App) getFrame() (int, []byte) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.job == nil {
		return 0, nil
	}
	return a.job.ID, a.frame
}
func jsonSend(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
func readJSON(r *http.Request, v any) error {
	return json.NewDecoder(io.LimitReader(r.Body, 32<<10)).Decode(v)
}
func (a *App) apiHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	path := r.URL.Path
	if r.Header.Get("X-SC-Token") != a.nonce || a.nonce == "" {
		jsonSend(w, 403, map[string]any{"error": "Invalid local UI token"})
		return
	}
	if a.productAPI(w, r) {
		return
	}
	if path == "/api/status" && r.Method == "GET" {
		a.refreshOBSStatus()
		jsonSend(w, 200, a.statusJSON())
		return
	}
	if path == "/api/camera-snapshot" && r.Method == "POST" {
		if r.Header.Get("X-SC-Token") != a.nonce {
			jsonSend(w, 403, map[string]any{"error": "Invalid UI token"})
			return
		}
		a.mu.Lock()
		sc := a.scene
		a.mu.Unlock()
		if sc.Camera == "" {
			jsonSend(w, 400, map[string]any{"error": "Install / realign a webcam first"})
			return
		}
		o, e := a.obs()
		if e != nil {
			jsonSend(w, 400, map[string]any{"error": e.Error()})
			return
		}
		defer o.Close()
		b, e := a.capture(o, sc)
		if e != nil {
			jsonSend(w, 400, map[string]any{"error": e.Error()})
			return
		}
		st, e := frameStats(b)
		if e != nil {
			jsonSend(w, 400, map[string]any{"error": e.Error()})
			return
		}
		jsonSend(w, 200, map[string]any{"ok": true, "data": map[string]any{"image": "data:image/png;base64," + base64.StdEncoding.EncodeToString(b), "stats": st}})
		return
	}
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", 405)
		return
	}
	// Localhost-only app but prevent off-origin websites from issuing commands.
	if r.Header.Get("X-SC-Token") != a.nonce {
		jsonSend(w, 403, map[string]any{"error": "Invalid local UI token"})
		return
	}
	a.controlMu.Lock()
	defer a.controlMu.Unlock()
	a.mu.Lock()
	stopping := a.shuttingDown
	a.mu.Unlock()
	if stopping {
		jsonSend(w, 409, map[string]any{"error": "Shutdown is reconciling OBS; controls are temporarily locked"})
		return
	}
	var input struct {
		Password  string   `json:"password"`
		Port      int      `json:"port"`
		Camera    string   `json:"camera"`
		Direction string   `json:"direction"`
		Effect    string   `json:"effect"`
		Duration  float64  `json:"duration"`
		Density   int      `json:"density"`
		Settings  Settings `json:"settings"`
	}
	if err := readJSON(r, &input); err != nil {
		jsonSend(w, 400, map[string]any{"error": "Invalid request"})
		return
	}
	var data any
	var err error
	switch path {
	case "/api/recover":
		ctx, cancel := context.WithTimeout(r.Context(), 12*time.Second)
		err = a.recoverCamera(ctx)
		cancel()
		if err == nil {
			data = map[string]any{"cameraVisible": true, "fxCleared": true}
		}
	case "/api/quit":
		err = a.requestShutdown()
		data = map[string]any{"shuttingDown": err == nil}

	case "/api/connect":
		a.mu.Lock()
		busy := a.active
		a.mu.Unlock()
		if busy {
			err = errors.New("Cannot reconnect while a transition is running")
			break
		}
		if input.Port < 1 || input.Port > 65535 {
			err = errors.New("OBS port must be between 1 and 65535")
		} else {
			a.mu.Lock()
			old := a.settings
			s := old
			s.OBSPort = input.Port
			a.settings = s
			a.mu.Unlock()
			data, err = a.connect(input.Password)
			if err == nil {
				err = saveSettings(s)
			}
			if err != nil {
				a.mu.Lock()
				a.settings = old
				a.connected = false
				a.invalidateFrameLocked()
				a.mu.Unlock()
			}

		}
	case "/api/install":
		data, err = a.install(input.Camera)
	case "/api/effect":
		a.mu.Lock()
		busy := a.active
		a.mu.Unlock()
		if busy {
			err = errors.New("Cannot change the active effect during a transition")
			break
		}
		if !validEffect(input.Effect) {
			err = errors.New("Unknown effect")
		} else {
			a.mu.Lock()
			s := a.settings
			a.mu.Unlock()
			s.Effect = input.Effect
			_, err = a.applySettings(s)
			if err == nil {
				a.log("Selected active hotkey effect: " + input.Effect)
				data = map[string]any{"effect": input.Effect}
			}
		}
	case "/api/save":
		data, err = a.applySettings(input.Settings)

	case "/api/transition":
		a.mu.Lock()
		s := a.settings
		a.mu.Unlock()
		effect := s.Effect
		if validEffect(input.Effect) {
			effect = input.Effect
		}
		direction := input.Direction
		duration, density := s.Duration, s.Density
		if input.Duration != 0 {
			duration = input.Duration
		}
		if input.Density != 0 {
			density = input.Density
		}
		if duration < 1 || duration > 7 || density < 15 || density > 100 {
			err = errors.New("Invalid effect duration or density")
		} else if direction != "out" && direction != "in" {
			err = errors.New("Direction must be IN or OUT")
		} else {
			err = a.startTransition(effect, direction, duration, density)
		}
	default:
		err = errors.New("Unknown command")
	}
	if err != nil {
		a.log("Error: " + err.Error())
		jsonSend(w, 400, map[string]any{"error": err.Error()})
		return
	}
	jsonSend(w, 200, map[string]any{"ok": true, "data": data})
}
func (a *App) trigger(which string) {
	a.mu.Lock()
	s := a.settings
	busy := a.active || a.shuttingDown || a.recoveryPending
	a.mu.Unlock()
	if busy {
		return
	}
	direction := which
	if which == "toggle" {
		o, err := a.obs()
		if err != nil {
			a.log(err.Error())
			return
		}
		a.mu.Lock()
		sc := a.scene
		a.mu.Unlock()
		visible, err := a.visible(o, sc)
		o.Close()
		if err != nil {
			a.log(err.Error())
			return
		}
		if visible {
			direction = "out"
		} else {
			direction = "in"
		}
	}
	_ = a.startTransition(s.Effect, direction, s.Duration, s.Density)
}
func (a *App) serveAsset(w http.ResponseWriter, name, contentType string) {
	b, err := static.ReadFile(name)
	if err != nil {
		http.NotFound(w, nil)
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "no-store")
	w.Write(b)
}
func (a *App) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		b, _ := static.ReadFile("ui.html")
		b = bytes.ReplaceAll(b, []byte("__SC_TOKEN__"), []byte(a.nonce))
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		w.Write(b)
	})
	mux.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		a.serveAsset(w, "sc.ico", "image/x-icon")
	})
	mux.HandleFunc("/api/", a.apiHandler)
	mux.HandleFunc("/overlay.html", func(w http.ResponseWriter, r *http.Request) {
		a.serveAsset(w, "overlay.html", "text/html; charset=utf-8")
	})
	mux.HandleFunc("/expansion-effects.js", func(w http.ResponseWriter, r *http.Request) {
		a.serveAsset(w, "expansion-effects.js", "text/javascript; charset=utf-8")
	})
	mux.HandleFunc("/premium-vfx-meshes.js", func(w http.ResponseWriter, r *http.Request) {
		a.serveAsset(w, "premium-vfx-meshes.js", "text/javascript; charset=utf-8")
	})
	mux.HandleFunc("/money-vfx3d.js", func(w http.ResponseWriter, r *http.Request) {
		a.serveAsset(w, "money-vfx3d.js", "text/javascript; charset=utf-8")
	})
	// Locally installed professional simulation plates are strictly allowlisted.
	// Never allow arbitrary file paths or expose files outside the plate folder.
	mux.HandleFunc("/cinematic-plates.js", func(w http.ResponseWriter, r *http.Request) {
		a.serveAsset(w, "cinematic-plates.js", "text/javascript; charset=utf-8")
	})
	mux.HandleFunc("/cinematic-plates/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		base, err := os.UserCacheDir()
		status := map[string]any{"installed": []string{}, "directory": "unavailable"}
		if err == nil {
			dir := filepath.Join(base, "SCWebTransitions", "CinematicPlates")
			status["directory"] = dir
			files := []string{}
			for _, effect := range []string{"smoke", "toxic"} {
				for _, phase := range []string{"cover", "release", "in"} {
					name := effect + "_" + phase + ".webm"
					if st, e := os.Stat(filepath.Join(dir, name)); e == nil && st.Mode().IsRegular() && st.Size() > 0 {
						files = append(files, name)
					}
				}
			}
			status["installed"] = files
		}
		_ = json.NewEncoder(w).Encode(status)
	})
	mux.HandleFunc("/cinematic-plates/", func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimPrefix(r.URL.Path, "/cinematic-plates/")
		valid := false
		for _, effect := range []string{"smoke", "toxic"} {
			for _, phase := range []string{"cover", "release", "in"} {
				if name == effect+"_"+phase+".webm" {
					valid = true
				}
			}
		}
		if !valid {
			http.NotFound(w, r)
			return
		}
		base, err := os.UserCacheDir()
		if err != nil {
			http.NotFound(w, r)
			return
		}
		file, err := os.Open(filepath.Join(base, "SCWebTransitions", "CinematicPlates", name))
		if err != nil {
			http.NotFound(w, r)
			return
		}
		defer file.Close()
		st, err := file.Stat()
		if err != nil || !st.Mode().IsRegular() {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "video/webm")
		w.Header().Set("Cache-Control", "no-store")
		http.ServeContent(w, r, name, st.ModTime(), file)
	})
	mux.HandleFunc("/gas-vfx3d.js", func(w http.ResponseWriter, r *http.Request) {
		a.serveAsset(w, "gas-vfx3d.js", "text/javascript; charset=utf-8")
	})
	mux.HandleFunc("/ice-vfx3d.js", func(w http.ResponseWriter, r *http.Request) {
		a.serveAsset(w, "ice-vfx3d.js", "text/javascript; charset=utf-8")
	})
	mux.HandleFunc("/premium-crystal-accents.js", func(w http.ResponseWriter, r *http.Request) {
		a.serveAsset(w, "premium-crystal-accents.js", "text/javascript; charset=utf-8")
	})
	mux.HandleFunc("/vfx-assets/", func(w http.ResponseWriter, r *http.Request) {
		// Publicly distributable original asset kit. Never serve arbitrary paths.
		asset := strings.TrimPrefix(r.URL.Path, "/vfx-assets/")
		if asset == "" || strings.Contains(asset, "/") || strings.Contains(asset, "\\") || strings.Contains(asset, "..") {
			http.NotFound(w, r)
			return
		}
		ext := filepath.Ext(asset)
		mime := ""
		switch ext {
		case ".glb":
			mime = "model/gltf-binary"
		case ".png":
			mime = "image/png"
		case ".json":
			mime = "application/json"
		default:
			http.NotFound(w, r)
			return
		}
		data, err := static.ReadFile("vfx_assets/" + asset)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", mime)
		w.Header().Set("Cache-Control", "public, max-age=3600")
		_, _ = w.Write(data)
	})
	mux.HandleFunc("/crystal-hero3d.js", func(w http.ResponseWriter, r *http.Request) {
		a.serveAsset(w, "crystal-hero3d.js", "text/javascript; charset=utf-8")
	})
	mux.HandleFunc("/gpu-vfx3d.js", func(w http.ResponseWriter, r *http.Request) {
		a.serveAsset(w, "gpu-vfx3d.js", "text/javascript; charset=utf-8")
	})
	mux.HandleFunc("/webgl3d.js", func(w http.ResponseWriter, r *http.Request) {
		a.serveAsset(w, "webgl3d.js", "text/javascript; charset=utf-8")
	})
	mux.HandleFunc("/bill.png", func(w http.ResponseWriter, r *http.Request) { a.serveAsset(w, "bill.png", "image/png") })
	mux.HandleFunc("/heartbeat", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", 405)
			return
		}
		var beat struct {
			Version      string  `json:"version"`
			Effect       string  `json:"effect"`
			RendererID   string  `json:"rendererID"`
			FPS          float64 `json:"fps"`
			RenderP95    float64 `json:"renderP95"`
			RendererMode string  `json:"rendererMode"`
			Stage        string  `json:"stage"`
		}
		_ = json.NewDecoder(io.LimitReader(r.Body, 1024)).Decode(&beat)
		a.mu.Lock()
		if a.rendererID == "" || beat.RendererID != a.rendererID {
			a.mu.Unlock()
			jsonSend(w, 409, map[string]any{"error": "Incorrect renderer instance. Reinstall in OBS."})
			return
		}
		a.rendererSeen = time.Now()
		a.rendererVersion = beat.Version
		a.rendererEffect = beat.Effect
		a.rendererMode = beat.RendererMode
		a.rendererStage = beat.Stage
		if beat.FPS >= 0 && beat.FPS <= 240 {
			a.rendererFPS = beat.FPS
		}
		if beat.RenderP95 >= 0 && beat.RenderP95 <= 1000 {
			a.rendererP95 = beat.RenderP95
		}
		if a.active && a.job != nil && (beat.Stage == "play" || beat.Stage == "cover") && a.settings.AutoPerformance && a.settings.RendererMode == "gpu" {
			slow, healthy := rendererFrameHealth(beat.FPS, beat.RenderP95)
			if slow {
				a.slowBeats++
				a.healthyBeats = 0
			} else if healthy {
				a.healthyBeats++
				a.slowBeats = 0
			} else {
				a.slowBeats = 0
				a.healthyBeats = 0
			}
			if a.slowBeats >= 2 && a.performanceTier < 2 {
				a.performanceTier++
				a.slowBeats = 0
			}
			if a.healthyBeats >= 5 && a.performanceTier > 0 {
				a.performanceTier--
				a.healthyBeats = 0
			}
		}

		a.mu.Unlock()
		jsonSend(w, 200, map[string]any{"ok": true})
	})
	mux.HandleFunc("/state", func(w http.ResponseWriter, r *http.Request) {
		a.mu.Lock()
		valid := a.rendererID != "" && r.URL.Query().Get("rid") == a.rendererID
		a.mu.Unlock()
		if !valid {
			jsonSend(w, 409, map[string]any{"error": "Renderer instance is stale"})
			return
		}
		jsonSend(w, 200, a.stateJSON())
	})
	mux.HandleFunc("/frame.png", func(w http.ResponseWriter, r *http.Request) {
		a.mu.Lock()
		valid := a.rendererID != "" && r.URL.Query().Get("rid") == a.rendererID
		a.mu.Unlock()
		id, b := a.getFrame()
		if !valid || id == 0 || id != queryID(r) || len(b) == 0 {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "image/png")
		w.Header().Set("Cache-Control", "no-store")
		w.Write(b)
	})
	for _, action := range []string{"ready", "covered", "reveal", "done", "error"} {
		ac := action
		mux.HandleFunc("/"+ac, func(w http.ResponseWriter, r *http.Request) {
			if r.Method != "POST" {
				http.Error(w, "Method not allowed", 405)
				return
			}
			a.mu.Lock()
			valid := a.rendererID != "" && r.URL.Query().Get("rid") == a.rendererID
			a.mu.Unlock()
			if valid && (ac == "covered" || ac == "reveal") {
				frame, _ := strconv.Atoi(r.URL.Query().Get("frame"))
				confirmations, _ := strconv.Atoi(r.URL.Query().Get("confirmations"))
				valid = a.coverageEvidence(queryID(r), ac, frame, confirmations)
			}
			if !valid || !a.ack(queryID(r), ac, r.URL.Query().Get("reason"), func() float64 { v, _ := strconv.ParseFloat(r.URL.Query().Get("coverage"), 64); return v }()) {
				http.Error(w, "Stale renderer job", 409)
				return
			}
			jsonSend(w, 200, map[string]any{"ok": true})
		})
	}
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		jsonSend(w, 200, map[string]any{"status": "ok", "application": "SCWebTransitions", "version": appVersion, "sourceRevision": buildRevision})
	})
	// A localhost service is still accessible by other local processes and
	// browser requests. Reject DNS-rebinding Host headers and cross-origin
	// mutation attempts. OBS Browser Source uses same-origin fetches.
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host := strings.ToLower(r.Host)
		loopback := fmt.Sprintf("127.0.0.1:%d", rendererPort)
		localhost := fmt.Sprintf("localhost:%d", rendererPort)
		allowedHost := host == loopback || host == localhost
		origin := r.Header.Get("Origin")
		validOrigin := origin == "" || origin == "http://"+loopback || origin == "http://"+localhost
		if !allowedHost || !validOrigin {
			http.Error(w, "Forbidden local origin", 403)
			return
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Cache-Control", "no-store")
		mux.ServeHTTP(w, r)
	})
}
func queryID(r *http.Request) int {
	i, _ := strconv.Atoi(r.URL.Query().Get("id"))
	if i == 0 {
		i, _ = strconv.Atoi(r.URL.Query().Get("job"))
	}
	return i
}
func (a *App) startServer() error {
	listener, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", rendererPort))
	if err != nil {
		return err
	}
	a.server = &http.Server{Handler: a.routes(), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 7 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 35 * time.Second}
	go a.server.Serve(listener)
	return nil
}
func installedPath() string {
	base := os.Getenv("LOCALAPPDATA")
	if base == "" {
		dir, _ := os.UserHomeDir()
		base = dir
	}
	return filepath.Join(base, "Programs", "SC Web Transitions", "SC Web Transitions.exe")
}
func installSelf() error {
	if runtime.GOOS != "windows" {
		return nil
	}
	self, err := os.Executable()
	if err != nil {
		return err
	}
	target := installedPath()
	if strings.EqualFold(filepath.Clean(self), filepath.Clean(target)) {
		return nil
	}
	os.MkdirAll(filepath.Dir(target), 0755)
	src, err := os.Open(self)
	if err != nil {
		return err
	}
	defer src.Close()
	temp := target + ".new"
	dest, err := os.Create(temp)
	if err != nil {
		return err
	}
	_, err = io.Copy(dest, src)
	if e := dest.Close(); err == nil {
		err = e
	}
	if err != nil {
		return err
	}
	// Transactional update: preserve a full previous executable and restore
	// it if the replacement fails. Never delete an installed version just
	// because Rename failed (it may still be running or antivirus locked).
	backup := target + ".previous.exe"
	hadPrevious := false
	if _, statErr := os.Stat(target); statErr == nil {
		os.Remove(backup)
		if err = os.Rename(target, backup); err != nil {
			os.Remove(temp)
			return fmt.Errorf("close SC Web Transitions before updating (existing file is locked): %w", err)
		}
		hadPrevious = true
	}
	if err = os.Rename(temp, target); err != nil {
		if hadPrevious {
			_ = os.Rename(backup, target)
		}
		os.Remove(temp)
		return fmt.Errorf("update aborted and previous build restored: %w", err)
	}
	icon, _ := static.ReadFile("sc.ico")
	iconpath := filepath.Join(filepath.Dir(target), "SC Web Transitions.ico")
	os.WriteFile(iconpath, icon, 0644)
	createDesktopShortcut(target, iconpath)
	cmd := exec.Command(target, "--run")
	if err = cmd.Start(); err != nil {
		// Preserve the failed build for diagnosis and restore last version.
		backup := target + ".previous.exe"
		if _, statErr := os.Stat(backup); statErr == nil {
			_ = os.Rename(target, target+".failed.exe")
			_ = os.Rename(backup, target)
		}
		return err
	}
	return errInstalled
}

var errInstalled = errors.New("application installed and relaunched")

func engineRunning() bool {
	client := &http.Client{Timeout: 600 * time.Millisecond}
	resp, err := client.Get(fmt.Sprintf("http://127.0.0.1:%d/health", rendererPort))
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	var data struct {
		Application string `json:"application"`
		Version     string `json:"version"`
	}
	return resp.StatusCode == http.StatusOK && json.NewDecoder(io.LimitReader(resp.Body, 2048)).Decode(&data) == nil && data.Application == "SCWebTransitions" && data.Version != ""
}

func launchWindow() {
	url := fmt.Sprintf("http://127.0.0.1:%d/", rendererPort)
	if runtime.GOOS == "windows" {
		for _, p := range []string{
			filepath.Join(os.Getenv("ProgramFiles(x86)"), "Microsoft", "Edge", "Application", "msedge.exe"), filepath.Join(os.Getenv("ProgramFiles"), "Microsoft", "Edge", "Application", "msedge.exe"),
			filepath.Join(os.Getenv("ProgramFiles"), "Google", "Chrome", "Application", "chrome.exe"),
		} {
			if _, err := os.Stat(p); err == nil {
				exec.Command(p, "--app="+url, "--window-size=1090,790").Start()
				return
			}
		}
		exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
		return
	}
	if os.Getenv("SC_NO_BROWSER") == "1" {
		return
	}
	exec.Command("xdg-open", url).Start()
}
func main() {
	serveOnly := len(os.Args) > 1 && os.Args[1] == "--serve"
	// Diagnostic servers can coexist with the user's installed engine. This
	// override is ignored in normal operation and never broadens bind/Origin access.
	if serveOnly && os.Getenv("SC_DIAGNOSTIC_PORT") != "" {
		port, err := strconv.Atoi(os.Getenv("SC_DIAGNOSTIC_PORT"))
		if err != nil || port < 1024 || port > 65535 {
			log.Println("SC_DIAGNOSTIC_PORT must be between 1024 and 65535")
			return
		}
		rendererPort = port
	}
	if len(os.Args) > 1 && os.Args[1] == "--version" {
		fmt.Println(appVersion)
		return
	}
	// One EXE acts as first-run installer AND future launcher.
	if runtime.GOOS == "windows" && len(os.Args) > 1 && os.Args[1] == "--install" {
		if err := installSelf(); err != nil && err != errInstalled {
			log.Println(err)
		}
		return
	}
	if runtime.GOOS == "windows" && !serveOnly && !(len(os.Args) > 1 && os.Args[1] == "--run") {
		if !strings.EqualFold(filepath.Clean(os.Args[0]), filepath.Clean(installedPath())) && engineRunning() {
			showUpgradeWarning()
			return
		}
		if err := installSelf(); err != nil {
			if err == errInstalled {
				return
			}
			log.Println("Installation failed, launching current folder:", err)
		} else if filepath.Clean(os.Args[0]) != filepath.Clean(installedPath()) {
			return
		}
	}
	app := newApp()
	app.noHotkeys = serveOnly
	if err := app.startServer(); err != nil {
		if !serveOnly && engineRunning() {
			launchWindow()
		}
		log.Println("Cannot start local engine (port may belong to another application):", err)
		return
	}
	if !serveOnly {
		if err := configureHotkeys(app.settings.HotOut, app.settings.HotIn, app.settings.HotToggle, func(which string) { go app.trigger(which) }); err != nil {
			app.log("Hotkey warning: " + err.Error())
		}
	}
	log.Println("SC Web Transitions running locally on", rendererPort)
	if !serveOnly && os.Getenv("SC_NO_BROWSER") != "1" {
		time.Sleep(150 * time.Millisecond)
		launchWindow()
	}
	// Signals and Quit share the same bounded safety coordinator. A failed
	// reconciliation leaves the recovery interface alive instead of silently exiting.
	signals := make(chan os.Signal, 1)
	signal.Notify(signals, os.Interrupt)
	defer signal.Stop(signals)
	for {
		select {
		case <-app.exit:
			return
		case <-signals:
			if err := app.requestShutdown(); err != nil {
				app.log(err.Error())
			}
		}
	}

}
