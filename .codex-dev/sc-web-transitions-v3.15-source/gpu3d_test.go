package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestGPU3DIsEmbeddedAndServedLocally(t *testing.T) {
	app := &App{nonce: "test"}
	req := httptest.NewRequest(http.MethodGet, "http://127.0.0.1:18767/gpu-vfx3d.js", nil)
	req.Host = "127.0.0.1:18767"
	rec := httptest.NewRecorder()
	app.routes().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("GPU module GET returned %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "drawArraysInstanced") || !strings.Contains(rec.Body.String(), "webgl2") {
		t.Fatal("GPU module response missing WebGL2 instanced rendering implementation")
	}
}

func TestRendererModeRoundTrip(t *testing.T) {
	s := defaultSettings()
	if s.RendererMode != "gpu" {
		t.Fatalf("expected GPU default, got %q", s.RendererMode)
	}
	s.RendererMode = "2d"
	data, err := json.Marshal(s)
	if err != nil {
		t.Fatal(err)
	}
	var restored Settings
	if err = json.Unmarshal(data, &restored); err != nil {
		t.Fatal(err)
	}
	if restored.RendererMode != "2d" {
		t.Fatalf("expected persistent compatibility setting, got %q", restored.RendererMode)
	}
	job := Job{RendererMode: s.RendererMode}
	j, err := json.Marshal(job)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(j), `"renderer_mode":"2d"`) {
		t.Fatal("renderer mode is not available to the OBS Browser Source")
	}
}
