package main

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestPremiumAssetPipelineEmbeddedAndServed(t *testing.T) {
	app := &App{nonce: "test"}
	router := app.routes()
	tests := []struct{ url, prefix, contentType string }{
		{"/premium-vfx-meshes.js", "/* SC Premium VFX", "text/javascript"},
		{"/premium-crystal-accents.js", "/* SC Premium VFX", "text/javascript"},
		{"/vfx-assets/SC_Premium_VFX_Asset_Collection.glb", "glTF", "model/gltf-binary"},
		{"/vfx-assets/crystal_albedo.png", "\x89PNG", "image/png"},
		{"/vfx-assets/petal_normal.png", "\x89PNG", "image/png"},
		{"/vfx-assets/ASSET_MANIFEST.json", "{", "application/json"},
	}
	for _, tc := range tests {
		request := httptest.NewRequest(http.MethodGet, tc.url, nil)
		request.Host = "127.0.0.1:18767"
		record := httptest.NewRecorder()
		router.ServeHTTP(record, request)
		if record.Code != 200 {
			t.Errorf("%s returned HTTP %d", tc.url, record.Code)
			continue
		}
		if !bytes.HasPrefix(record.Body.Bytes(), []byte(tc.prefix)) {
			t.Errorf("%s has invalid signature", tc.url)
		}
		if !strings.Contains(record.Header().Get("Content-Type"), tc.contentType) {
			t.Errorf("%s content-type: %q", tc.url, record.Header().Get("Content-Type"))
		}
	}
	for _, url := range []string{"/vfx-assets/missing.glb", "/vfx-assets/unknown.exe", "/vfx-assets/..%2Fmain.go"} {
		r := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodGet, url, nil)
		request.Host = "127.0.0.1:18767"
		router.ServeHTTP(r, request)
		if r.Code == 200 {
			t.Errorf("unexpected asset access at %s", url)
		}
	}
}

func TestPremiumScriptsLoadedBeforeGPURenderer(t *testing.T) {
	html, err := static.ReadFile("overlay.html")
	if err != nil {
		t.Fatal(err)
	}
	s := string(html)
	items := []string{"/premium-vfx-meshes.js", "/premium-crystal-accents.js", "/crystal-hero3d.js", "/gpu-vfx3d.js"}
	last := -1
	for _, item := range items {
		index := strings.Index(s, item)
		if index <= last {
			t.Fatalf("premium script %s missing or script order invalid", item)
		}
		last = index
	}
}
