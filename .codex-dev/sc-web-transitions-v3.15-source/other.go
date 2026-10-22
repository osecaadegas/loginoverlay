//go:build !windows

package main

func configureHotkeys(out, in, toggle string, callback func(string)) error { return nil }
func createDesktopShortcut(exe, icon string)                               {}

func showUpgradeWarning() {}
