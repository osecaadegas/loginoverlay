package main

import (
	"bufio"
	"encoding/json"
	"net"
	"sync/atomic"
	"testing"
)

// Exercise the real OBS v5 request/response framing over an in-memory socket.
// This is protocol simulation, not a claim of live OBS or camera testing.
func simulatedOBS(t *testing.T, respond func(string, map[string]json.RawMessage) map[string]any) *OBS {
	t.Helper()
	client, server := net.Pipe()
	o := &OBS{ws: &WSClient{conn: client, reader: bufio.NewReader(client)}}
	peer := &WSClient{conn: server, reader: bufio.NewReader(server)}
	finished := make(chan struct{})
	go func() {
		defer close(finished)
		for {
			var request struct {
				D struct {
					Type string                     `json:"requestType"`
					ID   string                     `json:"requestId"`
					Data map[string]json.RawMessage `json:"requestData"`
				} `json:"d"`
			}
			if err := peer.RecvJSON(&request); err != nil {
				return
			}
			data := respond(request.D.Type, request.D.Data)
			// An unrelated event must never count as our confirmation.
			if err := peer.SendJSON(map[string]any{"op": 5, "d": map[string]any{"eventType": "SceneItemEnableStateChanged"}}); err != nil {
				return
			}
			if err := peer.SendJSON(map[string]any{"op": 7, "d": map[string]any{"requestId": request.D.ID, "requestStatus": map[string]any{"result": true}, "responseData": data}}); err != nil {
				return
			}
		}
	}()
	t.Cleanup(func() { client.Close(); server.Close(); <-finished })
	return o
}

func simulatedSceneResponse(name string) map[string]any {
	if name == "GetCurrentProgramScene" {
		return map[string]any{"currentProgramSceneName": "Studio"}
	}
	if name == "GetSceneItemList" {
		return map[string]any{"sceneItems": []SceneItem{{SourceName: "Camera", SceneItemID: 84}, {SourceName: sceneFX, SceneItemID: 85}}}
	}
	return map[string]any{}
}

func TestOBSWaitsForReadbackAndUsesFreshSceneItemID(t *testing.T) {
	a := protocolFixture()
	a.settings = defaultSettings()
	var readbacks, switched atomic.Int32
	var wrongItem atomic.Bool
	o := simulatedOBS(t, func(name string, p map[string]json.RawMessage) map[string]any {
		if name == "SetSceneItemEnabled" {
			id, _ := field[int](p, "sceneItemId")
			if id != 84 {
				wrongItem.Store(true)
			}
			switched.Add(1)
		}
		if name == "GetSceneItemEnabled" {
			return map[string]any{"sceneItemEnabled": readbacks.Add(1) < 3}
		}
		return simulatedSceneResponse(name)
	})
	err := a.changeVisibleForJob(o, Scene{Name: "Studio", Camera: "Camera", CamID: 3, FXID: 4}, false, 10)
	if err != nil {
		t.Fatal(err)
	}
	if readbacks.Load() != 3 || switched.Load() != 1 || wrongItem.Load() {
		t.Fatalf("readback=%d set=%d staleID=%v", readbacks.Load(), switched.Load(), wrongItem.Load())
	}
}

func TestOBSRecoveryCancellationCannotWriteLateVisibility(t *testing.T) {
	a := protocolFixture()
	a.settings = defaultSettings()
	var writes atomic.Int32
	o := simulatedOBS(t, func(name string, p map[string]json.RawMessage) map[string]any {
		if name == "GetSceneItemList" {
			close(a.transitionCancel)
		}
		if name == "SetSceneItemEnabled" {
			writes.Add(1)
		}
		return simulatedSceneResponse(name)
	})
	if err := a.changeVisibleForJob(o, Scene{Name: "Studio", Camera: "Camera"}, false, 10); err == nil {
		t.Fatal("late switch was not cancelled")
	}
	if writes.Load() != 0 {
		t.Fatal("cancelled job wrote camera visibility")
	}
}

func TestOBSChangedProgramSceneCannotChangeCamera(t *testing.T) {
	a := protocolFixture()
	a.settings = defaultSettings()
	var writes atomic.Int32
	o := simulatedOBS(t, func(name string, p map[string]json.RawMessage) map[string]any {
		if name == "GetCurrentProgramScene" {
			return map[string]any{"currentProgramSceneName": "Other scene"}
		}
		if name == "SetSceneItemEnabled" {
			writes.Add(1)
		}
		return simulatedSceneResponse(name)
	})
	if err := a.changeVisibleForJob(o, Scene{Name: "Studio", Camera: "Camera"}, false, 10); err == nil {
		t.Fatal("scene mismatch accepted")
	}
	if writes.Load() != 0 {
		t.Fatal("camera changed after program scene changed")
	}
}
