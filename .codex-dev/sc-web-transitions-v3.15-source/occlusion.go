package main

import (
	"bytes"
	"fmt"
	"image"
	_ "image/png"
)

// effectiveFXCoverage measures the real OBS screenshot over the original
// webcam foreground. Transparent/green background pixels do not count.
// 98.5% high-opacity coverage is required to avoid a visible camera cut.
func effectiveFXCoverage(cameraPNG, effectPNG []byte) (float64, error) {
	camera, _, err := image.Decode(bytes.NewReader(cameraPNG))
	if err != nil {
		return 0, fmt.Errorf("camera image invalid: %w", err)
	}
	fx, _, err := image.Decode(bytes.NewReader(effectPNG))
	if err != nil {
		return 0, fmt.Errorf("FX image invalid: %w", err)
	}
	cb, eb := camera.Bounds(), fx.Bounds()
	if cb.Dx() != eb.Dx() || cb.Dy() != eb.Dy() {
		return 0, fmt.Errorf("image dimensions do not match: camera %dx%d, FX %dx%d", cb.Dx(), cb.Dy(), eb.Dx(), eb.Dy())
	}
	step := cb.Dx() / 280
	if step < 1 {
		step = 1
	}
	total, covered := 0, 0
	for y := cb.Min.Y + step/2; y < cb.Max.Y; y += step {
		for x := cb.Min.X + step/2; x < cb.Max.X; x += step {
			r, g, b, a := camera.At(x, y).RGBA()
			// Alpha in RGBA() uses a 16-bit range and premultiplied channels.
			if a < 53000 {
				continue
			}
			if g > 18500 && int64(g)-int64(r) > 8700 && int64(g)-int64(b) > 7400 && g > r*126/100 && g > b*124/100 {
				continue
			}
			total++
			_, _, _, fxA := fx.At(x, y).RGBA()
			if fxA >= 64250 {
				covered++
			}
		}
	}
	if total < 30 {
		return 0, fmt.Errorf("camera foreground is absent or mask not keyed")
	}
	return float64(covered) / float64(total), nil
}
