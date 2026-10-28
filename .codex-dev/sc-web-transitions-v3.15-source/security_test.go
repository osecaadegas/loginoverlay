package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLocalHostAndOriginRestrictions(t *testing.T) {
	previous := rendererPort
	defer func() { rendererPort = previous }()
	for _, port := range []int{18767, 18768} {
		rendererPort = port
		a := newApp()
		h := a.routes()
		cases := []struct {
			host, origin string
			want         int
		}{
			{fmt.Sprintf("evil.example:%d", port), "", http.StatusForbidden},
			{fmt.Sprintf("127.0.0.1:%d", port), "https://evil.example", http.StatusForbidden},
			{fmt.Sprintf("127.0.0.1:%d", port), "", http.StatusOK},
			{fmt.Sprintf("localhost:%d", port), fmt.Sprintf("http://localhost:%d", port), http.StatusOK},
			{fmt.Sprintf("localhost:%d", port), fmt.Sprintf("http://localhost:%d", port+1), http.StatusForbidden},
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
}
