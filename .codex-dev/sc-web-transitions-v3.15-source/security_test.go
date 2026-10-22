package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLocalHostAndOriginRestrictions(t *testing.T) {
	a := newApp()
	h := a.routes()
	cases := []struct {
		host, origin string
		want         int
	}{
		{"evil.example:18767", "", http.StatusForbidden},
		{"127.0.0.1:18767", "https://evil.example", http.StatusForbidden},
		{"127.0.0.1:18767", "", http.StatusOK},
		{"localhost:18767", "http://localhost:18767", http.StatusOK},
	}
	for _, tc := range cases {
		req := httptest.NewRequest(http.MethodGet, "http://127.0.0.1:18767/health", nil)
		req.Host = tc.host
		if tc.origin != "" {
			req.Header.Set("Origin", tc.origin)
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, req)
		if w.Code != tc.want {
			t.Errorf("host=%q origin=%q got %d want %d", tc.host, tc.origin, w.Code, tc.want)
		}
	}
}
