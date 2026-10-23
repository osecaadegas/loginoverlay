package main

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"testing"
)

func pngBytes(img image.Image) []byte { var b bytes.Buffer; _ = png.Encode(&b, img); return b.Bytes() }
func TestEffectiveFXCoverage(t *testing.T) {
	cam := image.NewNRGBA(image.Rect(0, 0, 640, 360))
	fx := image.NewNRGBA(cam.Bounds())
	for y := 70; y < 330; y++ {
		for x := 195; x < 450; x++ {
			cam.Set(x, y, color.NRGBA{40, 90, 170, 255})
			fx.Set(x, y, color.NRGBA{20, 45, 50, 255})
		}
	}
	c, e := pngBytes(cam), pngBytes(fx)
	got, err := effectiveFXCoverage(c, e)
	if err != nil || got < .999 {
		t.Fatalf("expected full cover got %f err %v", got, err)
	}
	for y := 70; y < 330; y++ {
		for x := 195; x < 355; x++ {
			fx.Set(x, y, color.NRGBA{})
		}
	}
	got, err = effectiveFXCoverage(c, pngBytes(fx))
	if err != nil || got > .5 {
		t.Fatalf("expected partial cover got %f err %v", got, err)
	}
}

func TestCoverageRejectsLocalHoleEvenWhenGlobalAveragePasses(t *testing.T) {
	cam := image.NewNRGBA(image.Rect(0, 0, 600, 400))
	fx := image.NewNRGBA(cam.Bounds())
	for y := 0; y < 400; y++ {
		for x := 0; x < 600; x++ {
			cam.SetNRGBA(x, y, color.NRGBA{100, 100, 100, 255})
			fx.SetNRGBA(x, y, color.NRGBA{0, 0, 0, 255})
		}
	}
	// 10x10 visible hole: <0.05% globally, but 4% of its occupied tile.
	for y := 5; y < 15; y++ {
		for x := 5; x < 15; x++ {
			fx.SetNRGBA(x, y, color.NRGBA{})
		}
	}
	report, err := measureFXCoverage(pngBytes(cam), pngBytes(fx))
	if err != nil {
		t.Fatal(err)
	}
	if report.Coverage < minimumCoverage {
		t.Fatal("test fixture must pass global threshold")
	}
	if report.Safe() {
		t.Fatalf("visible local hole accepted: %+v", report)
	}
}

func TestCoverageIncludesAntialiasedCameraEdges(t *testing.T) {
	cam := image.NewNRGBA(image.Rect(0, 0, 60, 40))
	fx := image.NewNRGBA(cam.Bounds())
	for y := 0; y < 40; y++ {
		for x := 0; x < 60; x++ {
			alpha := uint8(255)
			if x < 8 {
				alpha = 120
			}
			cam.SetNRGBA(x, y, color.NRGBA{100, 80, 80, alpha})
			if x >= 8 {
				fx.SetNRGBA(x, y, color.NRGBA{0, 0, 0, 255})
			}
		}
	}
	report, err := measureFXCoverage(pngBytes(cam), pngBytes(fx))
	if err != nil {
		t.Fatal(err)
	}
	if report.Safe() || report.Samples != 2400 {
		t.Fatalf("soft edge ignored: %+v", report)
	}
}

func TestCoverageRejectsTranslucencyAndDimensionMismatch(t *testing.T) {
	cam := image.NewNRGBA(image.Rect(0, 0, 60, 40))
	fx := image.NewNRGBA(cam.Bounds())
	for y := 0; y < 40; y++ {
		for x := 0; x < 60; x++ {
			cam.SetNRGBA(x, y, color.NRGBA{100, 80, 80, 255})
			fx.SetNRGBA(x, y, color.NRGBA{0, 0, 0, 250})
		}
	}
	report, err := measureFXCoverage(pngBytes(cam), pngBytes(fx))
	if err != nil || report.Safe() {
		t.Fatalf("translucent seal accepted: %+v %v", report, err)
	}
	if _, err = measureFXCoverage(pngBytes(cam), pngBytes(image.NewNRGBA(image.Rect(0, 0, 20, 20)))); err == nil {
		t.Fatal("mismatched source dimensions accepted")
	}
}

func TestCleanupRejectsDarkPixelsOutsideSilhouette(t *testing.T) {
	fx := image.NewNRGBA(image.Rect(0, 0, 60, 40))
	clear, err := effectIsClear(pngBytes(fx))
	if err != nil || !clear {
		t.Fatal("clear FX rejected", err)
	}
	fx.SetNRGBA(59, 39, color.NRGBA{0, 0, 0, 20})
	clear, err = effectIsClear(pngBytes(fx))
	if err != nil || clear {
		t.Fatal("black residual plume accepted", err)
	}
}
