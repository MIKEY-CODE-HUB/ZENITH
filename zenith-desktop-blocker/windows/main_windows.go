package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

var (
	user32                    = syscall.NewLazyDLL("user32.dll")
	kernel32                  = syscall.NewLazyDLL("kernel32.dll")
	getForegroundWindow       = user32.NewProc("GetForegroundWindow")
	getWindowThreadProcessID  = user32.NewProc("GetWindowThreadProcessId")
	showWindowAsync           = user32.NewProc("ShowWindowAsync")
	messageBox                = user32.NewProc("MessageBoxW")
	openProcess               = kernel32.NewProc("OpenProcess")
	queryFullProcessImageName = kernel32.NewProc("QueryFullProcessImageNameW")
	closeHandle               = kernel32.NewProc("CloseHandle")
)

type windowsDesktop struct{}

func (windowsDesktop) foreground() window {
	handle, _, _ := getForegroundWindow.Call()
	if handle == 0 {
		return window{}
	}
	var pid uint32
	getWindowThreadProcessID.Call(handle, uintptr(unsafe.Pointer(&pid)))
	if pid == 0 {
		return window{handle: handle}
	}
	const queryLimitedInformation = 0x1000
	process, _, _ := openProcess.Call(queryLimitedInformation, 0, uintptr(pid))
	if process == 0 {
		return window{handle: handle}
	}
	defer closeHandle.Call(process)
	path := make([]uint16, 32768)
	length := uint32(len(path))
	ok, _, _ := queryFullProcessImageName.Call(process, 0, uintptr(unsafe.Pointer(&path[0])), uintptr(unsafe.Pointer(&length)))
	if ok == 0 {
		return window{handle: handle}
	}
	name := filepath.Base(syscall.UTF16ToString(path[:length]))
	return window{handle: handle, app: strings.TrimSuffix(name, filepath.Ext(name))}
}

func (windowsDesktop) minimize(focused window) bool {
	handle, _, _ := getForegroundWindow.Call()
	if handle != focused.handle {
		return false
	}
	const minimize = 6
	ok, _, _ := showWindowAsync.Call(handle, minimize)
	return ok != 0
}

func dialog(text string, flags uintptr) {
	body, _ := syscall.UTF16PtrFromString(text)
	title, _ := syscall.UTF16PtrFromString("Zenith Shield")
	messageBox.Call(0, uintptr(unsafe.Pointer(body)), uintptr(unsafe.Pointer(title)), flags)
}

func install() error {
	local := os.Getenv("LOCALAPPDATA")
	if !filepath.IsAbs(local) {
		return fmt.Errorf("could not find your Local AppData folder")
	}
	dir := filepath.Join(local, "Zenith", "Shield")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	source, err := os.Executable()
	if err != nil {
		return err
	}
	host := filepath.Join(dir, "ZenithShield.exe")
	if !strings.EqualFold(source, host) {
		if err := copyHost(source, host); err != nil {
			return err
		}
	}

	manifest := filepath.Join(dir, "app.zenith.focus.json")
	config, err := json.MarshalIndent(map[string]any{
		"name": "app.zenith.focus", "description": "Zenith Windows app blocker",
		"path": host, "type": "stdio", "allowed_origins": []string{extensionOrigin},
	}, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(manifest, config, 0600); err != nil {
		return err
	}
	system := os.Getenv("SystemRoot")
	if !filepath.IsAbs(system) {
		return fmt.Errorf("could not find the Windows system folder")
	}
	key := `HKCU\Software\Google\Chrome\NativeMessagingHosts\app.zenith.focus`
	for _, view := range []string{"/reg:32", "/reg:64"} {
		command := exec.Command(filepath.Join(system, "System32", "reg.exe"), "add", key, "/ve", "/t", "REG_SZ", "/d", manifest, "/f", view)
		command.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		if output, err := command.CombinedOutput(); err != nil {
			return fmt.Errorf("could not register the Chrome helper: %s (%w)", strings.TrimSpace(string(output)), err)
		}
	}
	return nil
}

func copyHost(source, target string) error {
	file, err := os.Open(source)
	if err != nil {
		return err
	}
	defer file.Close()
	staged, err := os.CreateTemp(filepath.Dir(target), "shield-*.tmp")
	if err != nil {
		return err
	}
	defer os.Remove(staged.Name())
	_, copyErr := io.Copy(staged, file)
	closeErr := staged.Close()
	if copyErr != nil {
		return copyErr
	}
	if closeErr != nil {
		return closeErr
	}
	return os.Rename(staged.Name(), target)
}

func main() {
	switch {
	case len(os.Args) == 1:
		if dialogResult := messageBoxConfirmation(); !dialogResult {
			return
		}
		if err := install(); err != nil {
			dialog("Setup could not finish. Close Chrome before updating an existing install and try again.\n\n"+err.Error(), 0x10)
			return
		}
		dialog("Windows app protection is installed. In Zenith, select Distraction Shield → Check setup.", 0x40)
	case os.Args[1] == extensionOrigin:
		ticker := time.NewTicker(300 * time.Millisecond)
		defer ticker.Stop()
		runHost(os.Stdin, os.Stdout, windowsDesktop{}, ticker.C, time.Now)
	}
}

func messageBoxConfirmation() bool {
	body, _ := syscall.UTF16PtrFromString("Install Zenith's Windows app protection for the current user? Chrome starts it during protected focus sessions.")
	title, _ := syscall.UTF16PtrFromString("Zenith Shield")
	result, _, _ := messageBox.Call(0, uintptr(unsafe.Pointer(body)), uintptr(unsafe.Pointer(title)), 0x21)
	return result == 1
}
