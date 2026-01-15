# Crime Loading Videos Setup Guide

## 📹 Video Requirements

### File Specifications
- **Format**: WebM (VP9 codec) - best for web
- **Duration**: 1-3 seconds max
- **Resolution**: 720p (1280x720) or lower for mobile
- **Frame Rate**: 24-30 fps
- **File Size**: < 500KB per video (< 1MB max)
- **Audio**: None (videos are muted)
- **Loop**: Not needed (plays once)

### Naming Convention
Videos should be named based on the crime name (lowercase, spaces replaced with hyphens):

```
/public/crime-videos/
├── default-crime.webm          # Fallback video
├── petty-theft.webm           # For "Petty Theft"
├── pickpocket.webm            # For "Pickpocket"
├── shop-lifting.webm          # For "Shop Lifting"
├── beat-the-granny.webm       # For "Beat The Granny"
├── car-jacking.webm           # For "Car Jacking"
├── bank-robbery.webm          # For "Bank Robbery"
├── drug-deal.webm             # For "Drug Deal"
└── [crime-name].webm          # Pattern: crime name → lowercase → spaces to hyphens
```

## 🎬 Video Content Suggestions

### Per Crime Type:
1. **Petty Theft** - Quick grab motion, hand snatching
2. **Car Jacking** - Car door opening, steering wheel
3. **Bank Robbery** - Vault door, money bags, safe
4. **Drug Deal** - Hand exchange, package drop
5. **Assault** - Punch/fight motion blur
6. **Default** - Generic criminal silhouette, running figure

### Visual Style:
- Dark/gritty aesthetic
- Action-focused (not still images)
- Motion blur for drama
- High contrast

## 🛠️ How to Create/Convert Videos

### Option 1: Free Online Tools
**CloudConvert** (cloudconvert.com)
1. Upload your video/GIF
2. Convert to WebM (VP9)
3. Set resolution to 720p
4. Download

**EzGIF** (ezgif.com)
1. Upload video/GIF
2. Optimize → Reduce file size
3. Convert to WebM

### Option 2: FFmpeg (Command Line)
```bash
# Convert any video to optimized WebM
ffmpeg -i input.mp4 -c:v libvpx-vp9 -b:v 500k -s 1280x720 -r 24 -an -t 2 output.webm

# From GIF to WebM
ffmpeg -i input.gif -c:v libvpx-vp9 -b:v 400k -s 1280x720 -r 24 -an output.webm

# Crop to square (for better fit)
ffmpeg -i input.mp4 -vf "crop=ih:ih" -c:v libvpx-vp9 -b:v 500k -s 720:720 -r 24 -an -t 2 output.webm
```

### Option 3: Stock Video Sites
**Free sources:**
- Pexels Videos (pexels.com/videos)
- Pixabay Videos (pixabay.com/videos)
- Mixkit (mixkit.co)

**Search terms:**
- "crime scene"
- "robbery"
- "stealing"
- "money heist"
- "action blur"
- "criminal silhouette"

## 📁 Folder Setup

Create this folder structure:
```
NEWWEBSITE-master/
└── public/
    └── crime-videos/
        ├── README_VIDEO_SETUP.md (this file)
        ├── default-crime.webm
        └── [your crime videos].webm
```

## 🚀 Quick Start - Default Video

**Temporary placeholder until you add real videos:**

Create a simple default video using a solid color animation or download a generic "loading" clip.

**Quick test video (text-based):**
You can use any 1-3 second video as `default-crime.webm` initially. The system will fallback to this if a crime-specific video doesn't exist.

## ⚡ Performance Tips

### Optimization Checklist:
- ✅ Use WebM format (smallest size, best browser support)
- ✅ Keep videos under 500KB each
- ✅ Limit to 2-3 seconds duration
- ✅ Remove audio track (reduces file size)
- ✅ Use 720p or lower resolution
- ✅ Test on mobile devices

### Expected Performance:
- **Load time**: < 100ms (cached after first load)
- **Bandwidth**: ~500KB per unique crime type
- **Browser support**: Chrome, Firefox, Edge (95%+ coverage)
- **Mobile impact**: Minimal (videos are small and short)

## 🎨 Video Ideas by Crime

### Low Level Crimes (1-10):
- **Petty Theft**: Hand grabbing wallet/phone
- **Pickpocket**: Crowd scene, hand in pocket
- **Vandalism**: Spray paint motion
- **Shoplifting**: Store aisle, item grab

### Mid Level Crimes (11-50):
- **Car Jacking**: Car interior, steering wheel
- **Burglary**: Window break, door kick
- **Mugging**: Alley scene, confrontation
- **Drug Deal**: Hand exchange, package

### High Level Crimes (51+):
- **Bank Robbery**: Vault, money stacks
- **Heist**: Laser grid, safe cracking
- **Kidnapping**: Rope, hostage silhouette
- **Murder**: Red flash, dramatic blur

## 🔧 Testing Your Videos

1. Add video to `/public/crime-videos/`
2. Name it correctly (lowercase, hyphens)
3. Commit crime in-game
4. Video should play for 1 second during loading

**Check:**
- Does video play smoothly?
- Is file size reasonable?
- Does it loop properly?
- Is fallback working if video missing?

## 📱 Mobile Considerations

- Use `playsInline` attribute (already added)
- Muted autoplay works on iOS
- Keep file sizes extra small for mobile data
- Test on real devices, not just emulator

## 🐛 Troubleshooting

**Video not playing:**
- Check file path: `/public/crime-videos/[name].webm`
- Verify naming matches crime name pattern
- Ensure video is WebM format
- Check browser console for errors

**Performance issues:**
- Reduce video resolution (try 480p)
- Shorten duration (1-2 seconds max)
- Compress further with FFmpeg
- Remove unnecessary frames

**Fallback not working:**
- Make sure `default-crime.webm` exists
- Check console for 404 errors

## 📊 Current Implementation

The system automatically:
- Takes crime name (e.g., "Bank Robbery")
- Converts to filename (e.g., "bank-robbery.webm")
- Loads from `/crime-videos/` folder
- Falls back to `default-crime.webm` if specific video missing
- Plays video for duration of crime processing (1 second)

## 🎯 Next Steps

1. Create/find 1 default video
2. Test with one crime
3. Gradually add crime-specific videos
4. Optimize based on performance

**Priority order:**
1. `default-crime.webm` (required)
2. Most popular crimes (Bank Robbery, Car Jacking, etc.)
3. Remaining crimes as needed

---

## Example: Finding and Converting a Video

1. Go to Pexels.com/videos
2. Search "robbery"
3. Download a 1-3 second clip
4. Use CloudConvert to convert to WebM
5. Rename to match crime name
6. Place in `/public/crime-videos/`
7. Commit and push to Vercel

Done! 🎉
