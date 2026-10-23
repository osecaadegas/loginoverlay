package main

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestMoneyCGIEmbeddedAndBoundToSafeHandoff(t *testing.T) {
	app := &App{nonce: "test"}
	mux := app.routes()
	for _, c := range []struct{ path, body, mime string }{
		{"/favicon.ico", "\x00\x00\x01\x00", "image/x-icon"},
		{"/money-vfx3d.js", "/* SC Web Transitions v3.16", "text/javascript"},
		{"/vfx-assets/golden_sheep_paper_normal.png", "\x89PNG", "image/png"},
		{"/vfx-assets/golden_sheep_paper_roughness.png", "\x89PNG", "image/png"},
		{"/vfx-assets/hero_bill_softcurl.glb", "glTF", "model/gltf-binary"},
	} {
		r := httptest.NewRecorder()
		mux.ServeHTTP(r, httptest.NewRequest(http.MethodGet, "http://127.0.0.1:18767"+c.path, nil))
		if r.Code != 200 {
			t.Fatalf("%s got status %d", c.path, r.Code)
		}
		if !bytes.HasPrefix(r.Body.Bytes(), []byte(c.body)) {
			t.Fatalf("asset signature: %s", c.path)
		}
		if !strings.Contains(r.Header().Get("Content-Type"), c.mime) {
			t.Fatalf("MIME: %s", c.path)
		}
	}
	html, err := static.ReadFile("overlay.html")
	if err != nil {
		t.Fatal(err)
	}
	s := string(html)
	for _, fragment := range []string{"moneyGPUActive()", "moneyCGI.draw", "moneyCoverage", "lastMeasuredCoverage>=.995", "moneyAssembled(1)", "money-vfx3d.js"} {
		if !strings.Contains(s, fragment) {
			t.Fatalf("money renderer or safety check missing: %s", fragment)
		}
	}
}
