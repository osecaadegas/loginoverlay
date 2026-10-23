package main

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	_ "image/png"
)

const minimumCoverage = .995

// CoverageReport rejects local holes as well as broad transparency. A global
// average alone can conceal a visible hole over the face in an otherwise large
// silhouette. Alpha is measured independently of RGB (black smoke is valid).
type CoverageReport struct {
	Coverage    float64
	MinimumTile float64
	Samples     int
}

func (r CoverageReport) Safe() bool {
	return r.Samples >= 30 && r.Coverage >= minimumCoverage && r.MinimumTile >= .98
}

// Check the entire rendered surface, including pixels outside the subject.
// A dark residual plume is still visible and must not pass an RGB-based check.
func effectIsClear(effectPNG []byte) (bool, error) {
	im, _, err := image.Decode(bytes.NewReader(effectPNG))
	if err != nil {
		return false, err
	}
	b := im.Bounds()
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			_, _, _, alpha := im.At(x, y).RGBA()
			if alpha > 257 {
				return false, nil
			}
		}
	}
	return true, nil
}

func cameraForeground(c color.Color) bool {
	r, g, b, a := c.RGBA()
	// Include antialiased hair/edges; the old 81% threshold ignored them.
	if a < 4096 {
		return false
	}
	if g > 18500 && int64(g)-int64(r) > 8700 && int64(g)-int64(b) > 7400 && g > r*126/100 && g > b*124/100 {
		return false
	}
	return true
}

// effectiveFXCoverage is retained for diagnostics and existing integrations.
func effectiveFXCoverage(cameraPNG, effectPNG []byte) (float64, error) {
	r, err := measureFXCoverage(cameraPNG, effectPNG)
	return r.Coverage, err
}

func measureFXCoverage(cameraPNG, effectPNG []byte) (CoverageReport, error) {
	result := CoverageReport{MinimumTile: 1}
	camera, _, err := image.Decode(bytes.NewReader(cameraPNG))
	if err != nil {
		return result, fmt.Errorf("camera image invalid: %w", err)
	}
	fx, _, err := image.Decode(bytes.NewReader(effectPNG))
	if err != nil {
		return result, fmt.Errorf("FX image invalid: %w", err)
	}
	cb, eb := camera.Bounds(), fx.Bounds()
	if cb.Dx() != eb.Dx() || cb.Dy() != eb.Dy() {
		return result, fmt.Errorf("image dimensions do not match: camera %dx%d, FX %dx%d", cb.Dx(), cb.Dy(), eb.Dx(), eb.Dy())
	}
	// Read every screenshot pixel once: sparse fixed-stride samples can miss
	// thin cracks and repeating gaps in otherwise opaque frost or banknotes.
	total, covered := 0, 0
	var tileTotal, tileCovered [96]int
	for y := cb.Min.Y; y < cb.Max.Y; y++ {
		for x := cb.Min.X; x < cb.Max.X; x++ {
			if !cameraForeground(camera.At(x, y)) {
				continue
			}
			total++
			tile := ((y-cb.Min.Y)*8/cb.Dy())*12 + (x-cb.Min.X)*12/cb.Dx()
			tileTotal[tile]++
			_, _, _, fxA := fx.At(x, y).RGBA()
			if fxA >= 254*257 {
				covered++
				tileCovered[tile]++
			}
		}
	}
	if total < 30 {
		return result, fmt.Errorf("camera foreground is absent or mask not keyed")
	}
	result.Samples = total
	result.Coverage = float64(covered) / float64(total)
	for i, n := range tileTotal {
		if n >= 16 {
			coverage := float64(tileCovered[i]) / float64(n)
			if coverage < result.MinimumTile {
				result.MinimumTile = coverage
			}
		}
	}
	return result, nil
}
