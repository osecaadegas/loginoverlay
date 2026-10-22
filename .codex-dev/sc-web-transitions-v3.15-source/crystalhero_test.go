package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCrystalHeroGPUAssetAvailable(t *testing.T) {
	app := &App{nonce: "test"}
	router := app.routes()
	req := httptest.NewRequest(http.MethodGet, "http://127.0.0.1:18767/crystal-hero3d.js", nil)
	r := httptest.NewRecorder()
	router.ServeHTTP(r, req)
	if r.Code != 200 {
		t.Fatalf("asset route status=%d: %s", r.Code, r.Body.String())
	}
	for _, needle := range []string{"SCCrystalHero", "triangulateCells", "uMask", "uCrack"} {
		if !strings.Contains(r.Body.String(), needle) {
			t.Errorf("missing shader or geometry code %q", needle)
		}
	}
}
