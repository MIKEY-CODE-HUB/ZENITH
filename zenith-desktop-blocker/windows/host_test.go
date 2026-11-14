package main

import (
	"bytes"
	"io"
	"testing"
	"time"
)

type desktopStub struct {
	focus     window
	minimized chan window
}

func (d desktopStub) foreground() window     { return d.focus }
func (d desktopStub) minimize(w window) bool { d.minimized <- w; return true }

func TestHostEnforcesBuiltInPolicyUntilDeadline(t *testing.T) {
	origin := time.Now()
	now := origin
	in, write := io.Pipe()
	read, out := io.Pipe()
	defer read.Close()
	defer write.Close()
	defer in.Close()
	defer out.Close()
	tick := make(chan time.Time)
	minimized := make(chan window, 1)
	done := make(chan struct{})
	go func() {
		runHost(in, out, desktopStub{window{1, "RobloxPlayerBeta.exe"}, minimized}, tick, func() time.Time { return now })
		close(done)
	}()

	if err := writeFrame(write, message{Type: "protect", SessionID: "session", Mode: "BLOCK",
		ExpiresAt: origin.Add(time.Minute).UnixMilli(), AllowedApps: []string{"RobloxPlayerBeta.exe"}, CoreBlockedApps: []string{"Roblox"},
	}); err != nil {
		t.Fatal(err)
	}
	if msg, err := readFrame(read); err != nil || msg.Type != "active" {
		t.Fatalf("activation: %+v %v", msg, err)
	}
	tick <- now
	if msg, err := readFrame(read); err != nil || msg.Type != "blocked" || msg.App != "RobloxPlayerBeta.exe" {
		t.Fatalf("block: %+v %v", msg, err)
	}
	<-minimized

	now = origin.Add(2 * time.Minute)
	tick <- now
	write.Close()
	<-done
	if len(minimized) != 0 {
		t.Fatal("window minimized after expiry")
	}
}

func TestMalformedNativeFrame(t *testing.T) {
	if _, err := readFrame(bytes.NewReader([]byte{0xff, 0xff, 0xff, 0xff})); err == nil {
		t.Fatal("oversized native message was accepted")
	}
}
