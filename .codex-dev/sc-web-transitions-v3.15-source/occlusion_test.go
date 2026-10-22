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
