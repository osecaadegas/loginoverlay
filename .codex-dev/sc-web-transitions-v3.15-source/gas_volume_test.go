package main

import (
  "net/http"
  "net/http/httptest"
  "strings"
  "testing"
)

func TestRaymarchedGasModuleIsServed(t *testing.T) {
  app := newApp()
  req := httptest.NewRequest(http.MethodGet, "http://127.0.0.1:18767/gas-vfx3d.js", nil)
  rr := httptest.NewRecorder()
  app.routes().ServeHTTP(rr,req)
  if rr.Code != http.StatusOK {t.Fatalf("module HTTP status: %d", rr.Code)}
  body:=rr.Body.String()
  for _, expected := range []string{"sampler3D", "plumeDensity", "SCGasVolume", "measureCoverage", "render"} {
    if !strings.Contains(body, expected) {t.Errorf("missing gas renderer token %q", expected)}
  }
}
