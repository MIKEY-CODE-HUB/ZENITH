package main

import (
	"encoding/binary"
	"encoding/json"
	"io"
	"strings"
	"time"
)

const extensionOrigin = "chrome-extension://iacdabhpidaenkpfpjgifigeknnjjlmi/"
const maxMessage = 64 * 1024

type message struct {
	Type              string   `json:"type"`
	SessionID         string   `json:"sessionId,omitempty"`
	Mode              string   `json:"mode,omitempty"`
	ExpiresAt         int64    `json:"expiresAt,omitempty"`
	AllowedApps       []string `json:"allowedApps,omitempty"`
	BlockedApps       []string `json:"blockedApps,omitempty"`
	CoreBlockedApps   []string `json:"coreBlockedApps,omitempty"`
	App               string   `json:"app,omitempty"`
	CanReadForeground bool     `json:"canReadForeground,omitempty"`
}

type window struct {
	handle uintptr
	app    string
}

type windowControl interface {
	foreground() window
	minimize(window) bool
}

func readFrame(r io.Reader) (message, error) {
	var size uint32
	if err := binary.Read(r, binary.LittleEndian, &size); err != nil {
		return message{}, err
	}
	if size == 0 || size > maxMessage {
		return message{}, io.ErrUnexpectedEOF
	}
	data := make([]byte, size)
	if _, err := io.ReadFull(r, data); err != nil {
		return message{}, err
	}
	var msg message
	return msg, json.Unmarshal(data, &msg)
}

func writeFrame(w io.Writer, msg message) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	frame := make([]byte, 4, len(data)+4)
	binary.LittleEndian.PutUint32(frame, uint32(len(data)))
	_, err = w.Write(append(frame, data...))
	return err
}

var windowsAliases = map[string]string{
	"msedge": "microsoft edge", "explorer": "file explorer", "code - insiders": "code",
	"epicgameslauncher": "epic games", "robloxplayerbeta": "roblox",
	"riotclientux": "riotclientservices", "leagueclientux": "leagueclient",
	"whatsapp.root": "whatsapp", "whatsappdesktop": "whatsapp", "telegramdesktop": "telegram",
	"discordcanary": "discord", "discordptb": "discord",
}

var systemApps = nameSet([]string{"Chrome", "Microsoft Edge", "File Explorer", "ApplicationFrameHost", "SystemSettings", "Taskmgr",
	"StartMenuExperienceHost", "SearchHost", "ShellExperienceHost", "LockApp", "WindowsTerminal"})

func appKey(app string) string {
	key := strings.TrimSuffix(strings.ToLower(strings.TrimSpace(app)), ".exe")
	if canonical, ok := windowsAliases[key]; ok {
		return canonical
	}
	return key
}

func nameSet(apps []string) map[string]bool {
	names := make(map[string]bool, len(apps))
	for _, app := range apps {
		if key := appKey(app); key != "" && len(key) <= 100 {
			names[key] = true
		}
	}
	return names
}

func runHost(in io.Reader, out io.Writer, desktop windowControl, tick <-chan time.Time, now func() time.Time) {
	messages := make(chan message)
	done := make(chan struct{})
	defer close(done)
	go func() {
		defer close(messages)
		for {
			msg, err := readFrame(in)
			if err != nil {
				return
			}
			select {
			case messages <- msg:
			case <-done:
				return
			}
		}
	}()

	var session message
	var allowed, blocked, coreBlocked map[string]bool
	var until time.Time
	var lastMinimized uintptr
	var lastAttempt time.Time
	for {
		select {
		case msg, ok := <-messages:
			if !ok {
				return
			}
			switch msg.Type {
			case "check_setup":
				if writeFrame(out, message{Type: "setup_status", CanReadForeground: desktop.foreground().handle != 0}) != nil {
					return
				}
			case "protect":
				current := now()
				lifetime := time.UnixMilli(msg.ExpiresAt).Sub(current)
				if msg.SessionID == "" || len(msg.SessionID) > 100 ||
					(msg.Mode != "BLOCK" && msg.Mode != "STRICT") || lifetime <= 0 || lifetime > 241*time.Minute {
					continue
				}
				if msg.SessionID != session.SessionID {
					if writeFrame(out, message{Type: "active", SessionID: msg.SessionID}) != nil {
						return
					}
				}
				session = msg
				until = current.Add(lifetime)
				allowed = nameSet(msg.AllowedApps)
				blocked = nameSet(msg.BlockedApps)
				coreBlocked = nameSet(msg.CoreBlockedApps)
			}
		case <-tick:
			current := now()
			if session.SessionID == "" || !current.Before(until) {
				continue
			}
			focused := desktop.foreground()
			key := appKey(focused.app)
			if focused.handle == 0 || systemApps[key] || (!coreBlocked[key] && (allowed[key] || !blocked[key])) {
				lastMinimized = 0
				continue
			}
			if focused.handle == lastMinimized && current.Sub(lastAttempt) < time.Second {
				continue
			}
			if now().Before(until) && desktop.minimize(focused) {
				lastMinimized, lastAttempt = focused.handle, current
				if writeFrame(out, message{Type: "blocked", SessionID: session.SessionID, App: focused.app}) != nil {
					return
				}
			}
		}
	}
}
