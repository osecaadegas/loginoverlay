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
var procPeekMessage = modUser32.NewProc("PeekMessageW")
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
var hotkeyWorker *windowsHotkeyWorker

const wmConfigure = 0x8001

type hotkeyCommand struct {
	codes    [3]string
	callback func(string)
	result   chan error
}
type windowsHotkeyWorker struct {
	thread   uintptr
	commands chan hotkeyCommand
	done     chan struct{}
}

func configureHotkeys(out, in, toggle string, callback func(string)) error {
	codes := [3]string{out, in, toggle}
	if _, err := hotkeyBindings(codes); err != nil {
		return err
	}
	hotkeyMu.Lock()
	defer hotkeyMu.Unlock()
	if hotkeyWorker == nil {
		worker := &windowsHotkeyWorker{commands: make(chan hotkeyCommand, 1), done: make(chan struct{})}
		ready := make(chan struct{})
		go func() {
			runtime.LockOSThread()
			defer runtime.UnlockOSThread()
			defer close(worker.done)
			worker.thread, _, _ = procGetThreadID.Call()
			var message msg
			// Ensure PostThreadMessage has a queue before publishing this worker.
			procPeekMessage.Call(uintptr(unsafe.Pointer(&message)), 0, 0, 0, 0)
			close(ready)
			var registered []hotkeyBinding
			var callback func(string)
			nextID := 100
			defer func() {
				for _, b := range registered {
					procUnregisterHotKey.Call(0, uintptr(b.id))
				}
			}()
			for {
				ret, _, _ := procGetMessage.Call(uintptr(unsafe.Pointer(&message)), 0, 0, 0)
				if int32(ret) <= 0 {
					return
				}
				if message.Message == wmConfigure {
					cmd := <-worker.commands
					bindings, err := replaceHotkeyBindings(registered, cmd.codes, &nextID,
						func(b hotkeyBinding) error {
							ok, _, _ := procRegisterHotKey.Call(0, uintptr(b.id), b.mods, b.key)
							if ok == 0 {
								return fmt.Errorf("Shortcut %s is already used by another application", b.code)
							}
							return nil
						},
						func(b hotkeyBinding) { procUnregisterHotKey.Call(0, uintptr(b.id)) })
					if err == nil {
						registered = bindings
						callback = cmd.callback
					}
					cmd.result <- err
				} else if message.Message == wmHotkey && callback != nil {
					for _, b := range registered {
						if uintptr(b.id) == message.Wparam {
							go callback(b.action)
							break
						}
					}
				}
			}
		}()
		<-ready
		hotkeyWorker = worker
	}
	cmd := hotkeyCommand{codes, callback, make(chan error, 1)}
	hotkeyWorker.commands <- cmd
	ok, _, _ := procPostThreadMessage.Call(hotkeyWorker.thread, wmConfigure, 0, 0)
	if ok == 0 {
		<-hotkeyWorker.commands
		return fmt.Errorf("Windows hotkey thread is unavailable")
	}
	select {
	case err := <-cmd.result:
		return err
	case <-hotkeyWorker.done:
		hotkeyWorker = nil
		return fmt.Errorf("Windows hotkey service stopped")
	}
}

func stopHotkeys() error {
	hotkeyMu.Lock()
	defer hotkeyMu.Unlock()
	if hotkeyWorker == nil {
		return nil
	}
	worker := hotkeyWorker
	procPostThreadMessage.Call(worker.thread, wmQuit, 0, 0)
	select {
	case <-worker.done:
		hotkeyWorker = nil
		return nil
	case <-time.After(2 * time.Second):
		return fmt.Errorf("Windows hotkey release timed out")
	}
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
