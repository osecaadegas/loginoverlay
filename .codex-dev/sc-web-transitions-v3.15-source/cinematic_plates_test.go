package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestProfessionalPlateScriptsBundled(t *testing.T) {
	b, err := static.ReadFile("cinematic-plates.js")
	if err != nil || !strings.Contains(string(b), "SCCinematicPlates") {
		t.Fatal("cinematic player not embedded")
	}
}
func TestCinematicPlateRoutes(t *testing.T) {
	base := t.TempDir()
	t.Setenv("XDG_CACHE_HOME", base)
	directory := filepath.Join(base, "SCWebTransitions", "CinematicPlates")
	if err := os.MkdirAll(directory, 0700); err != nil {
		t.Fatal(err)
	}
	data := []byte("qa-video-only")
	if err := os.WriteFile(filepath.Join(directory, "smoke_cover.webm"), data, 0600); err != nil {
		t.Fatal(err)
	}
	a := &App{}
	h := a.routes()
	for _, test := range []struct {
		url    string
		status int
	}{
		{"/cinematic-plates/status", 200},
		{"/cinematic-plates/smoke_cover.webm", 200},
		{"/cinematic-plates/toxic_cover.webm", 404},
		{"/cinematic-plates/main.go", 404},
	} {
		req := httptest.NewRequest(http.MethodGet, test.url, nil)
		req.Host = "127.0.0.1:18767"
		w := httptest.NewRecorder()
		h.ServeHTTP(w, req)
		if w.Code != test.status {
			t.Errorf("%s status %d, want %d", test.url, w.Code, test.status)
		}
	}
	req := httptest.NewRequest(http.MethodGet, "/cinematic-plates/smoke_cover.webm", nil)
	req.Host = "127.0.0.1:18767"
	req.Header.Set("Range", "bytes=0-1")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if w.Code != http.StatusPartialContent || w.Body.String() != "qa" {
		t.Fatalf("HTTP range failed: %d %q", w.Code, w.Body.String())
	}
}
