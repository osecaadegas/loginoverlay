//go:build windows

package main

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

var modUser32 = syscall.NewLazyDLL("user32.dll")
var procRegisterHotKey = modUser32.NewProc("RegisterHotKey")
var procUnregisterHotKey = modUser32.NewProc("UnregisterHotKey")
var procGetMessage = modUser32.NewProc("GetMessageW")
var procGetThreadID = syscall.NewLazyDLL("kernel32.dll").NewProc("GetCurrentThreadId")
var procPostThreadMessage = modUser32.NewProc("PostThreadMessageW")
var procMessageBox = modUser32.NewProc("MessageBoxW")

const wmHotkey = 0x0312
const wmQuit = 0x0012
const modNoRepeat = 0x4000

type point struct{ X, Y int32 }
type msg struct {
	Hwnd    uintptr
	Message uint32
	_       uint32
	Wparam  uintptr
	Lparam  uintptr
	Time    uint32
	Pt      point
	Private uint32
	_       [4]byte
}

var hotkeyMu sync.Mutex
var activeThread uintptr
var activeDone chan struct{}
var activeSignature string

func configureHotkeys(out, in, toggle string, callback func(string)) error {
	signature := out + "/" + in + "/" + toggle
	names := []string{"out", "in", "toggle"}
	codes := []string{out, in, toggle}
	var mod, key [3]uintptr
	for i := 0; i < 3; i++ {
		m, k, err := parseHotkey(codes[i])
		if err != nil {
			return err
		}
		mod[i], key[i] = m, k
	}
	for i := 0; i < 3; i++ {
		for j := 0; j < i; j++ {
			if mod[i] == mod[j] && key[i] == key[j] {
				return fmt.Errorf("Duplicate hotkey: %s", codes[i])
			}
		}
	}
	hotkeyMu.Lock()
	if activeThread != 0 && activeSignature == signature {
		hotkeyMu.Unlock()
		return nil
	}
	old := activeThread
	done := activeDone
	activeThread = 0
	hotkeyMu.Unlock()
	if old != 0 {
		procPostThreadMessage.Call(old, wmQuit, 0, 0)
		if done != nil {
			select {
			case <-done:
			case <-time.After(2 * time.Second):
			}
		}
	}
	newDone := make(chan struct{})
	started := make(chan error, 1)
	go func() {
		runtime.LockOSThread()
		defer runtime.UnlockOSThread()
		thread, _, _ := procGetThreadID.Call()
		var message msg
		registered := []int{}
		for i := 0; i < 3; i++ {
			ok, _, _ := procRegisterHotKey.Call(0, uintptr(i+1), mod[i], key[i])
			if ok == 0 {
				for _, j := range registered {
					procUnregisterHotKey.Call(0, uintptr(j))
				}
				started <- fmt.Errorf("Could not register %s hotkey %s: already used by another app", names[i], codes[i])
				return
			}
			registered = append(registered, i+1)
		}
		hotkeyMu.Lock()
		activeThread = thread
		activeDone = newDone
		activeSignature = signature
		hotkeyMu.Unlock()
		started <- nil
		for {
			ret, _, _ := procGetMessage.Call(uintptr(unsafe.Pointer(&message)), 0, 0, 0)
			if int32(ret) <= 0 {
				break
			}
			if message.Message == wmHotkey {
				index := int(message.Wparam) - 1
				if index >= 0 && index < 3 {
					go callback(names[index])
				}
			}
		}
		for _, id := range registered {
			procUnregisterHotKey.Call(0, uintptr(id))
		}
		close(newDone)
		hotkeyMu.Lock()
		if activeThread == thread {
			activeThread = 0
		}
		hotkeyMu.Unlock()
	}()
	return <-started
}
func createDesktopShortcut(exe, icon string) {
	// Safely embed the two installed paths as escaped PowerShell string literals.
	quote := func(s string) string { return "'" + strings.ReplaceAll(s, "'", "''") + "'" }
	script := `$w=New-Object -ComObject WScript.Shell;` +
		`$d=[Environment]::GetFolderPath('Desktop');` +
		`$link=$w.CreateShortcut((Join-Path $d 'SC Web Transitions.lnk'));` +
		`$link.TargetPath=` + quote(exe) + `;` +
		`$link.Arguments='--run';` +
		`$link.WorkingDirectory=` + quote(filepath.Dir(exe)) + `;` +
		`$link.IconLocation=` + quote(icon) + `;` +
		`$link.Description='SC Web Transitions | OBS camera effects';` +
		`$link.Save();` +
		`$start=[Environment]::GetFolderPath('Programs');` +
		`$sl=$w.CreateShortcut((Join-Path $start 'SC Web Transitions.lnk'));` +
		`$sl.TargetPath=` + quote(exe) + `;` +
		`$sl.Arguments='--run';` +
		`$sl.WorkingDirectory=` + quote(filepath.Dir(exe)) + `;` +
		`$sl.IconLocation=` + quote(icon) + `;` +
		`$sl.Save()`
	cmd := exec.Command("powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script)
	if err := cmd.Run(); err != nil {
		fmt.Println("Shortcut creation warning:", err)
	}
}

func showUpgradeWarning() {
	message, _ := syscall.UTF16PtrFromString("SC Web Transitions is already running.\n\nOpen its window, select Help & Setup, and click Quit SC Web Transitions. Then double-click this new EXE again to install the update.\n\nClosing the Edge window alone will NOT exit the local engine.")
	title, _ := syscall.UTF16PtrFromString("SC Web Transitions - close previous version")
	procMessageBox.Call(0, uintptr(unsafe.Pointer(message)), uintptr(unsafe.Pointer(title)), 0x30)
}
