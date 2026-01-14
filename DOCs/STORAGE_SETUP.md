# Supabase Storage Setup for Redemption Images

## Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New Bucket**
4. Configure the bucket:
   - **Name**: `public-assets`
   - **Public bucket**: ✅ **Check this box** (to allow public access to images)
   - Click **Create bucket**

## Step 2: Set Up Bucket Policies

After creating the bucket, you need to set up policies to allow uploads:

1. Click on the `public-assets` bucket
2. Go to **Policies** tab
3. Click **New Policy**

### Policy 1: Allow Public Read Access
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'public-assets' );
```

### Policy 2: Allow Authenticated Users to Upload
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'public-assets' );
```

### Policy 3: Allow Users to Update Their Uploads
```sql
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'public-assets' );
```

### Policy 4: Allow Users to Delete Their Uploads
```sql
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'public-assets' );
```

## Step 3: Verify Setup

1. The bucket should now be visible in your Storage section
2. Test by uploading an image through the Points Manager
3. Images will be stored in the `redemption-images/` folder within the bucket

## Folder Structure

```
public-assets/
└── redemption-images/
    ├── abc123-1234567890.jpg
    ├── def456-1234567891.png
    └── ...
```

## Important Notes

- Images are automatically made public and can be accessed via URL
- File names are generated randomly to avoid conflicts
- Supported formats: JPG, PNG, GIF, WebP
- Recommended image size: 800x600px or similar aspect ratio
- Maximum file size: 5MB (configurable in Supabase settings)
