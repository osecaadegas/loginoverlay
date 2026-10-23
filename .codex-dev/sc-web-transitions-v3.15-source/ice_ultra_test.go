package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestIceUltraEmbeddedAndCoverGate(t *testing.T) {
	a := &App{nonce: "test"}
	r := httptest.NewRecorder()
	a.routes().ServeHTTP(r, httptest.NewRequest(http.MethodGet, "http://127.0.0.1:18767/ice-vfx3d.js", nil))
	if r.Code != 200 || !strings.Contains(r.Body.String(), "Ice Shatter Ultra") {
		t.Fatalf("ice shader endpoint missing %d", r.Code)
	}
	data, _ := static.ReadFile("overlay.html")
	s := string(data)
	for _, need := range []string{"iceGPUActive()", "iceGPU.prepare(shards,iceFrozenLayer", "iceOpticalCoverage()", "job.effect==='ice')iceCoverage=result", "lastMeasuredCoverage>=.995", "ice-vfx3d.js"} {
		if !strings.Contains(s, need) {
			t.Errorf("Ice safety or renderer missing: %s", need)
		}
	}
}
