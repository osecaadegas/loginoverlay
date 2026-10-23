package main

import (
	"math"
	"testing"
)

func protocolFixture() *App {
	return &App{active: true, job: &Job{ID: 10, Phase: "cover", Effect: "smoke", Direction: "out"}, transitionCancel: make(chan struct{}), acknowledged: make(map[string]bool), ready: make(chan struct{}, 1), covered: make(chan struct{}, 1), reveal: make(chan struct{}, 1), done: make(chan struct{}, 1), errored: make(chan string, 1)}
}

func TestRendererAcknowledgmentsAreIdempotentAndJobScoped(t *testing.T) {
	a := protocolFixture()
	if !a.ack(10, "covered", "", 1) {
		t.Fatal("coverage rejected")
	}
	<-a.covered
	a.job.Phase = "play"
	if !a.ack(10, "covered", "", 1) {
		t.Fatal("lost-response retry was rejected")
	}
	if len(a.covered) != 0 {
		t.Fatal("duplicate coverage emitted a second switch signal")
	}
	if a.ack(9, "covered", "", 1) {
		t.Fatal("stale job accepted")
	}
	if a.ack(10, "ready", "", 1) {
		t.Fatal("out of order ready accepted")
	}
}

func TestIncomingRevealRequiresMeasuredCoverageAndConfirmedCamera(t *testing.T) {
	for _, coverage := range []float64{0, .985, 1.01, math.NaN(), math.Inf(1)} {
		a := protocolFixture()
		a.job.Phase = "play"
		a.job.Direction = "in"
		a.ack(10, "reveal", "", coverage)
		if a.revealAck || len(a.reveal) != 0 || len(a.errored) != 1 {
			t.Fatalf("unsafe coverage %v accepted", coverage)
		}
	}
	a := protocolFixture()
	a.job.Phase = "play"
	a.job.Direction = "in"
	if !a.ack(10, "reveal", "", 1) {
		t.Fatal("valid reveal rejected")
	}
	a.ack(10, "done", "", 1)
	if len(a.done) != 0 || len(a.errored) != 1 {
		t.Fatal("renderer completed before camera confirmation")
	}
	<-a.errored
	a.job.CameraReady = true
	a.ack(10, "done", "", 1)
	if len(a.done) != 1 {
		t.Fatal("confirmed completion rejected")
	}
}

func TestRecoveryCancelsDelayedSignalsAndCameraChanges(t *testing.T) {
	a := protocolFixture()
	close(a.transitionCancel)
	if a.ack(10, "covered", "", 1) {
		t.Fatal("cancelled renderer accepted")
	}
	if a.checkTransition(10) == nil {
		t.Fatal("cancelled camera switch allowed")
	}
	a = protocolFixture()
	if a.checkTransition(9) == nil {
		t.Fatal("stale camera switch allowed")
	}
	if a.checkTransition(10) != nil {
		t.Fatal("active camera switch rejected")
	}
}

func TestRepeatedJobCyclesDoNotReuseAcknowledgments(t *testing.T) {
	a := protocolFixture()
	for id := 10; id < 60; id++ {
		a.job = &Job{ID: id, Phase: "play", Direction: "in", CameraReady: true}
		a.acknowledged = make(map[string]bool)
		a.revealAck = false
		if !a.ack(id, "reveal", "", 1) || !a.ack(id, "done", "", 1) {
			t.Fatalf("cycle %d failed", id)
		}
		<-a.reveal
		<-a.done
		if a.ack(id-1, "done", "", 1) || len(a.errored) != 0 {
			t.Fatalf("cycle %d leaked stale state", id)
		}
	}
}
