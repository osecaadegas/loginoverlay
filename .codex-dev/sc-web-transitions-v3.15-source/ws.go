package main

import (
	"bufio"
	"crypto/rand"
	"crypto/sha1"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"strings"
	"sync"
	"time"
)

type WSClient struct {
	conn   net.Conn
	reader *bufio.Reader
	mu     sync.Mutex
}

func connectWS(address string, timeout time.Duration) (*WSClient, error) {
	conn, err := net.DialTimeout("tcp", address, timeout)
	if err != nil {
		return nil, fmt.Errorf("OBS unreachable at %s: %w", address, err)
	}
	conn.SetDeadline(time.Now().Add(timeout))
	var random [16]byte
	_, err = rand.Read(random[:])
	if err != nil {
		conn.Close()
		return nil, err
	}
	key := base64.StdEncoding.EncodeToString(random[:])
	host := address
	handshake := fmt.Sprintf("GET / HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: %s\r\n\r\n", host, key)
	if _, err = io.WriteString(conn, handshake); err != nil {
		conn.Close()
		return nil, err
	}
	rd := bufio.NewReader(conn)
	status, err := rd.ReadString('\n')
	if err != nil {
		conn.Close()
		return nil, err
	}
	if !strings.Contains(status, " 101 ") {
		conn.Close()
		return nil, fmt.Errorf("OBS WebSocket handshake failed: %s", strings.TrimSpace(status))
	}
	expectedHash := sha1.Sum([]byte(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"))
	expected := base64.StdEncoding.EncodeToString(expectedHash[:])
	accept := ""
	for {
		line, e := rd.ReadString('\n')
		if e != nil {
			conn.Close()
			return nil, e
		}
		if line == "\r\n" {
			break
		}
		pair := strings.SplitN(line, ":", 2)
		if len(pair) == 2 && strings.EqualFold(strings.TrimSpace(pair[0]), "Sec-WebSocket-Accept") {
			accept = strings.TrimSpace(pair[1])
		}
	}
	if accept != expected {
		conn.Close()
		return nil, errors.New("OBS WebSocket accept key mismatch")
	}
	return &WSClient{conn: conn, reader: rd}, nil
}
func (w *WSClient) Close() {
	if w != nil && w.conn != nil {
		w.conn.Close()
	}
}
func (w *WSClient) sendFrame(op byte, payload []byte) error {
	w.mu.Lock()
	defer w.mu.Unlock()
	header := []byte{0x80 | op}
	n := len(payload)
	if n < 126 {
		header = append(header, 0x80|byte(n))
	} else if n < 65536 {
		header = append(header, 0x80|126, byte(n>>8), byte(n))
	} else {
		header = append(header, 0x80|127)
		var x [8]byte
		binary.BigEndian.PutUint64(x[:], uint64(n))
		header = append(header, x[:]...)
	}
	var mask [4]byte
	if _, err := rand.Read(mask[:]); err != nil {
		return err
	}
	header = append(header, mask[:]...)
	masked := make([]byte, n)
	for i, v := range payload {
		masked[i] = v ^ mask[i%4]
	}
	if _, err := w.conn.Write(header); err != nil {
		return err
	}
	_, err := w.conn.Write(masked)
	return err
}
func (w *WSClient) recv() ([]byte, error) {
	for {
		var head [2]byte
		if _, err := io.ReadFull(w.reader, head[:]); err != nil {
			return nil, err
		}
		opcode := head[0] & 0x0f
		length := uint64(head[1] & 0x7f)
		if length == 126 {
			var n [2]byte
			if _, err := io.ReadFull(w.reader, n[:]); err != nil {
				return nil, err
			}
			length = uint64(binary.BigEndian.Uint16(n[:]))
		} else if length == 127 {
			var n [8]byte
			if _, err := io.ReadFull(w.reader, n[:]); err != nil {
				return nil, err
			}
			length = binary.BigEndian.Uint64(n[:])
		}
		if length > 100*1024*1024 {
			return nil, errors.New("OBS websocket frame too large")
		}
		var mask [4]byte
		if head[1]&0x80 != 0 {
			if _, err := io.ReadFull(w.reader, mask[:]); err != nil {
				return nil, err
			}
		}
		data := make([]byte, int(length))
		if _, err := io.ReadFull(w.reader, data); err != nil {
			return nil, err
		}
		if head[1]&0x80 != 0 {
			for i := range data {
				data[i] ^= mask[i%4]
			}
		}
		switch opcode {
		case 0x8:
			code := 0
			if len(data) > 1 {
				code = int(binary.BigEndian.Uint16(data[:2]))
			}
			if code == 4009 {
				return nil, errors.New("OBS WebSocket authentication rejected (4009): check password")
			}
			return nil, fmt.Errorf("OBS closed the WebSocket connection (code %d)", code)
		case 0x9:
			_ = w.sendFrame(0xA, data)
			continue
		case 0xA:
			continue
		case 0x1, 0x2, 0:
			return data, nil
		default:
			continue
		}
	}
}
func (w *WSClient) SendJSON(v any) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	return w.sendFrame(1, b)
}
func (w *WSClient) RecvJSON(v any) error {
	b, err := w.recv()
	if err != nil {
		return err
	}
	return json.Unmarshal(b, v)
}

type OBS struct {
	ws      *WSClient
	counter uint64
	version string
}

func DialOBS(host string, port int, password string) (*OBS, error) {
	if host != "127.0.0.1" && host != "localhost" && host != "::1" {
		return nil, errors.New("For security, OBS must connect to this PC (127.0.0.1)")
	}
	ws, err := connectWS(net.JoinHostPort(host, fmt.Sprint(port)), 8*time.Second)
	if err != nil {
		return nil, err
	}
	result := &OBS{ws: ws}
	var hello struct {
		Op int `json:"op"`
		D  struct {
			OBSStudioVersion string `json:"obsStudioVersion"`
			Authentication   *struct {
				Salt      string `json:"salt"`
				Challenge string `json:"challenge"`
			} `json:"authentication"`
		} `json:"d"`
	}
	if err = ws.RecvJSON(&hello); err != nil {
		ws.Close()
		return nil, err
	}
	if hello.Op != 0 {
		ws.Close()
		return nil, errors.New("OBS did not send a v5 Hello packet")
	}
	identify := map[string]any{"rpcVersion": 1, "eventSubscriptions": 0}
	if hello.D.Authentication != nil {
		if password == "" {
			ws.Close()
			return nil, errors.New("OBS requires a WebSocket password")
		}
		secret := sha256.Sum256([]byte(password + hello.D.Authentication.Salt))
		b64secret := base64.StdEncoding.EncodeToString(secret[:])
		digest := sha256.Sum256([]byte(b64secret + hello.D.Authentication.Challenge))
		identify["authentication"] = base64.StdEncoding.EncodeToString(digest[:])
	}
	if err = ws.SendJSON(map[string]any{"op": 1, "d": identify}); err != nil {
		ws.Close()
		return nil, err
	}
	var auth struct {
		Op int `json:"op"`
	}
	if err = ws.RecvJSON(&auth); err != nil {
		ws.Close()
		return nil, err
	}
	if auth.Op != 2 {
		ws.Close()
		return nil, errors.New("OBS WebSocket failed to identify client")
	}
	result.version = hello.D.OBSStudioVersion
	_ = ws.conn.SetDeadline(time.Time{})
	return result, nil
}
func (o *OBS) Close() { o.ws.Close() }
func (o *OBS) Request(name string, params map[string]any) (map[string]json.RawMessage, error) {
	o.counter++
	id := fmt.Sprintf("sc-%d", o.counter)
	if params == nil {
		params = map[string]any{}
	}
	// One bounded RPC deadline covers both write and read. A disconnected OBS
	// must not stall the webcam controller for 15s per request.
	timeout := 5 * time.Second
	if name == "GetSourceScreenshot" {
		timeout = 9 * time.Second
	}
	_ = o.ws.conn.SetDeadline(time.Now().Add(timeout))
	defer o.ws.conn.SetDeadline(time.Time{})
	err := o.ws.SendJSON(map[string]any{"op": 6, "d": map[string]any{"requestType": name, "requestId": id, "requestData": params}})
	if err != nil {
		return nil, err
	}
	for {
		var pkt struct {
			Op int `json:"op"`
			D  struct {
				RequestID     string `json:"requestId"`
				RequestStatus struct {
					Result  bool   `json:"result"`
					Code    int    `json:"code"`
					Comment string `json:"comment"`
				} `json:"requestStatus"`
				ResponseData map[string]json.RawMessage `json:"responseData"`
			} `json:"d"`
		}
		if err = o.ws.RecvJSON(&pkt); err != nil {
			return nil, fmt.Errorf("%s: %w", name, err)
		}
		if pkt.Op != 7 || pkt.D.RequestID != id {
			continue
		}
		if !pkt.D.RequestStatus.Result {
			return nil, fmt.Errorf("OBS %s: %s (code %d)", name, pkt.D.RequestStatus.Comment, pkt.D.RequestStatus.Code)
		}
		return pkt.D.ResponseData, nil
	}
}
func field[T any](fields map[string]json.RawMessage, key string) (T, error) {
	var value T
	raw, ok := fields[key]
	if !ok {
		return value, fmt.Errorf("OBS omitted %s", key)
	}
	err := json.Unmarshal(raw, &value)
	return value, err
}
