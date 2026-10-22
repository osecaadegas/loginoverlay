package main

import "testing"

func TestInfernoCoverRequiresMeasuredOpacity(t *testing.T) {
	a := &App{job: &Job{ID: 7, Phase: "cover", Effect: "inferno"}, covered: make(chan struct{}, 1), errored: make(chan string, 1)}
	if !a.ack(7, "covered", "", .984) {
		t.Fatal("coverage acknowledgement was not handled")
	}
	select {
	case <-a.covered:
		t.Fatal("camera must not hide below 98.5% coverage")
	default:
	}
	select {
	case <-a.errored:
	default:
		t.Fatal("coverage failure must reach the error channel")
	}
	if !a.ack(7, "covered", "", .995) {
		t.Fatal("valid coverage acknowledgement refused")
	}
	select {
	case <-a.covered:
	default:
		t.Fatal("valid coverage must enable the controlled OBS hide path")
	}
}
