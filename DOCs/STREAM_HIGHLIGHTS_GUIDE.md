# Stream Highlights Upload Guide

## Overview
Stream highlights now support **portrait-style videos** (9:16 aspect ratio, like TikTok/Instagram Reels) with narrower card displays.

## Features
- ✅ Portrait video support (9:16 ratio)
- ✅ Hover to autoplay preview
- ✅ Narrower cards: 150px wide on desktop, 130px on tablet, 120px on mobile
- ✅ Admin upload interface built into AdminPanel
- ✅ Video orientation tracking

---

## Uploading Highlights

### Method 1: Admin Panel (Recommended)
1. Log in as admin at `/admin`
2. Click **🎬 Stream Highlights** tab
3. Click **➕ Upload New Highlight**
4. Fill in the form:
   - **Title**: Short catchy title (e.g., "Epic 10K Win! 🎰")
   - **Description**: Optional description
   - **Video URL**: Direct link to your portrait video (`.mp4`, `.webm`, etc.)
   - **Thumbnail URL**: Optional thumbnail (shows before hover)
   - **Duration**: Video length (e.g., "0:30")
   - **Active**: Toggle to show/hide on site

### Method 2: Direct Database (Advanced)
Run SQL in Supabase:
```sql
INSERT INTO stream_highlights (
  title, 
  description, 
  video_url, 
  thumbnail_url, 
  duration, 
  orientation,
  is_active
) VALUES (
  'Epic Big Win!',
  'Won 10,000x on Book of Dead',
  'https://your-video-host.com/video.mp4',
  'https://your-video-host.com/thumbnail.jpg',
  '0:45',
  'portrait',
  true
);
```

---

## Video Hosting Options

### Option 1: Supabase Storage (Recommended)
1. Go to Supabase Dashboard → Storage
2. Create bucket: `stream_highlights` (public)
3. Upload your video
4. Copy public URL
5. Use URL in admin panel

### Option 2: External Hosting
- **Streamable**: https://streamable.com
- **Cloudinary**: https://cloudinary.com
- **Vimeo**: https://vimeo.com (use direct file link)
- **YouTube Shorts**: Extract video URL

---

## Video Specifications

### Portrait Video Format
- **Aspect Ratio**: 9:16 (1080x1920, 720x1280, etc.)
- **File Format**: MP4, WebM, or OGG
- **Recommended Size**: < 50MB for best performance
- **Duration**: 15-60 seconds ideal
- **Resolution**: 720x1280 or 1080x1920

### Creating Portrait Videos
1. **From existing streams**:
   - Use video editing software (DaVinci Resolve, Premiere Pro)
   - Crop to 9:16 aspect ratio
   - Export as MP4

2. **From phone recordings**:
   - Record vertically on phone
   - Upload directly (already portrait)

3. **Using tools**:
   - **Kapwing**: https://kapwing.com (crop/resize online)
   - **Clideo**: https://clideo.com/resize-video
   - **HandBrake**: Free desktop software

---

## Display Specifications

### Desktop
- Card width: 150px
- Video height: 267px (9:16 ratio)
- Grid: Horizontal scroll
- Interaction: Hover to autoplay

### Tablet (768px)
- Card width: 130px
- Video height: 231px
- Horizontal scroll with arrows

### Mobile (480px)
- Card width: 120px
- Video height: 213px
- Touch scroll

---

## Managing Highlights

### Admin Panel Functions
- **Toggle Active/Inactive**: Show/hide without deleting
- **Edit**: Update title, description, URLs
- **Delete**: Permanently remove
- **View Count**: Tracks engagement
- **Preview**: Play video in admin panel

### Database Management
```sql
-- View all highlights
SELECT * FROM stream_highlights 
ORDER BY created_at DESC;

-- Toggle active status
UPDATE stream_highlights 
SET is_active = NOT is_active 
WHERE id = 'your-uuid-here';

-- Update video URL
UPDATE stream_highlights 
SET video_url = 'new-url' 
WHERE id = 'your-uuid-here';

-- Delete inactive old highlights
DELETE FROM stream_highlights 
WHERE is_active = false 
AND created_at < NOW() - INTERVAL '30 days';
```

---

## SQL Schema

### Table Structure
```sql
CREATE TABLE stream_highlights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration VARCHAR(10),
  orientation VARCHAR(20) DEFAULT 'portrait',
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Run Migrations
```sql
-- Run in Supabase SQL Editor:

-- 1. Create table (if not exists)
\i migrations/create_stream_highlights.sql

-- 2. Add orientation column
\i migrations/add_highlight_orientation.sql
```

---

## Troubleshooting

### Video Not Playing
- ✅ Check video URL is direct link (ends in `.mp4`, `.webm`)
- ✅ Ensure video is public/accessible
- ✅ Test URL in browser first
- ✅ Check browser console for CORS errors

### Thumbnail Not Showing
- ✅ Verify thumbnail URL is correct
- ✅ Image should be publicly accessible
- ✅ Leave blank to use video first frame

### Card Layout Issues
- ✅ Clear browser cache
- ✅ Rebuild project: `npm run build`
- ✅ Check responsive breakpoints in CSS

### Upload Errors
- ✅ Verify admin permissions
- ✅ Check Supabase RLS policies
- ✅ Ensure all required fields filled
- ✅ Validate URLs are properly formatted

---

## Best Practices

### Content
- ✅ Keep videos under 60 seconds
- ✅ Use exciting moments (big wins, bonuses)
- ✅ Add engaging titles with emojis
- ✅ Include timestamps in titles ("0:30 of pure chaos!")

### Technical
- ✅ Compress videos before upload
- ✅ Use consistent aspect ratio (9:16)
- ✅ Add thumbnail for instant preview
- ✅ Set accurate duration
- ✅ Test on mobile before publishing

### Organization
- ✅ Rotate old highlights monthly
- ✅ Keep 10-15 active highlights max
- ✅ Archive instead of delete
- ✅ Monitor view counts for popular content

---

## Example Upload

### Good Example
```javascript
{
  title: "10K Win on Gates! 🤑",
  description: "Bonus buy went crazy!",
  video_url: "https://storage.supabase.co/highlights/big-win.mp4",
  thumbnail_url: "https://storage.supabase.co/thumbnails/big-win.jpg",
  duration: "0:45",
  orientation: "portrait",
  is_active: true
}
```

### Bad Example
```javascript
{
  title: "video", // Too generic
  video_url: "https://youtube.com/watch?v=123", // Not direct link
  // Missing thumbnail
  // Missing duration
  orientation: "landscape" // Wrong format for current setup
}
```

---

## API Reference

### Get Active Highlights
```javascript
const { data, error } = await supabase
  .from('stream_highlights')
  .select('*')
  .eq('is_active', true)
  .order('created_at', { ascending: false });
```

### Increment View Count
```javascript
await supabase.rpc('increment_highlight_views', {
  highlight_id: 'uuid-here'
});
```

### Upload New Highlight
```javascript
const { error } = await supabase
  .from('stream_highlights')
  .insert([{
    title: 'Epic Win!',
    video_url: 'https://...',
    is_active: true
  }]);
```

---

## Files Modified

- `src/components/StreamHighlights/StreamHighlights.jsx` - Portrait display
- `src/components/StreamHighlights/StreamHighlights.css` - Narrower cards, portrait ratio
- `src/components/Admin/HighlightUpload.jsx` - Standalone upload component
- `src/components/Admin/HighlightUpload.css` - Upload UI styles
- `src/components/AdminPanel/AdminPanel.jsx` - Already has highlights tab
- `migrations/create_stream_highlights.sql` - Table creation
- `migrations/add_highlight_orientation.sql` - Orientation column

---

## Support

Need help? Check:
1. Browser console for errors
2. Supabase logs for database issues
3. Network tab for failed video loads
4. AdminPanel for upload status

Last Updated: January 8, 2026
