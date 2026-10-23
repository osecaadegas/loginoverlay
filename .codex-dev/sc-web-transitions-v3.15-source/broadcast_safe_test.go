package main

import (
	"strings"
	"testing"
)

func TestAdaptiveQualityNeverIncreasesRequestedBudget(t *testing.T) {
	cases := []struct {
		input   string
		tier    int
		enabled bool
		want    string
	}{
		{"Ultra", 0, true, "Ultra"},
		{"Ultra", 1, true, "Cinematic"},
		{"Ultra", 2, true, "Balanced"},
		{"Cinematic", 1, true, "Balanced"},
		{"Cinematic", 2, true, "Performance"},
		{"Balanced", 2, true, "Performance"},
		{"Performance", 2, true, "Performance"},
		{"Ultra", 2, false, "Ultra"},
	}
	for _, tc := range cases {
		got := broadcastQuality(tc.input, tc.tier, tc.enabled)
		if got != tc.want {
			t.Errorf("broadcastQuality(%q,%d,%v)=%q, want %q", tc.input, tc.tier, tc.enabled, got, tc.want)
		}
	}
}

func TestFrameHealthUsesPresentationIntervalNotDrawTime(t *testing.T) {
	cases := []struct {
		fps, p95      float64
		slow, healthy bool
	}{
		{60, 16.67, false, true}, {58, 18.2, false, true}, {55, 19, false, false},
		{60, 33.3, true, false}, {30, 33.3, true, false}, {6, 160, true, false},
		{0, 0, false, false},
	}
	for _, tc := range cases {
		slow, healthy := rendererFrameHealth(tc.fps, tc.p95)
		if slow != tc.slow || healthy != tc.healthy {
			t.Errorf("fps=%v p95=%v: slow=%v healthy=%v", tc.fps, tc.p95, slow, healthy)
		}
	}
}

func TestCannotFinishIncomingWithoutReveal(t *testing.T) {
	a := newApp()
	a.job = &Job{ID: 17, Phase: "play", Effect: "money", Direction: "in"}
	a.errored = make(chan string, 1)
	a.done = make(chan struct{}, 1)
	a.reveal = make(chan struct{}, 1)
	if !a.ack(17, "done", "", 1) {
		t.Fatal("missing-reveal failure should be acknowledged as an error")
	}
	select {
	case reason := <-a.errored:
		if !strings.Contains(reason, "without a reveal") {
			t.Fatalf("unexpected reason %s", reason)
		}
	default:
		t.Fatal("missing reveal not rejected")
	}
	select {
	case <-a.done:
		t.Fatal("unsafe completion signaled")
	default:
	}
	if !a.ack(17, "reveal", "", 1) {
		t.Fatal("valid reveal rejected")
	}
	a.job.CameraReady = true
	if !a.ack(17, "done", "", 1) {
		t.Fatal("completion after reveal rejected")
	}
	select {
	case <-a.done:
	default:
		t.Fatal("correct IN not completed")
	}
}
