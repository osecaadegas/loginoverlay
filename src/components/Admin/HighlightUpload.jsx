import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import './HighlightUpload.css';

export default function HighlightUpload() {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    duration: '',
    is_active: true
  });

  useEffect(() => {
    loadHighlights();
  }, []);

  const loadHighlights = async () => {
    try {
      const { data, error } = await supabase
        .from('stream_highlights')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHighlights(data || []);
    } catch (err) {
      console.error('Error loading highlights:', err);
      alert('Error loading highlights: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      const { error } = await supabase
        .from('stream_highlights')
        .insert([{
          title: formData.title,
          description: formData.description || null,
          video_url: formData.video_url,
          thumbnail_url: formData.thumbnail_url || null,
          duration: formData.duration || null,
          is_active: formData.is_active
        }]);

      if (error) throw error;

      alert('✅ Highlight uploaded successfully!');
      setFormData({
        title: '',
        description: '',
        video_url: '',
        thumbnail_url: '',
        duration: '',
        is_active: true
      });
      loadHighlights();
    } catch (err) {
      console.error('Error uploading highlight:', err);
      alert('❌ Error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('stream_highlights')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadHighlights();
    } catch (err) {
      console.error('Error toggling status:', err);
      alert('Error: ' + err.message);
    }
  };

  const deleteHighlight = async (id) => {
    if (!confirm('Are you sure you want to delete this highlight?')) return;

    try {
      const { error } = await supabase
        .from('stream_highlights')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadHighlights();
    } catch (err) {
      console.error('Error deleting highlight:', err);
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="highlight-upload-container">
      <div className="upload-header">
        <h1>📹 Stream Highlights Manager</h1>
        <p>Upload portrait-style videos (9:16 aspect ratio recommended)</p>
      </div>

      <div className="upload-form-card">
        <h2>Upload New Highlight</h2>
        <form onSubmit={handleSubmit} className="highlight-form">
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Epic Big Win! 🎰"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description of the highlight..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Video URL * (Portrait video recommended)</label>
            <input
              type="url"
              value={formData.video_url}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              placeholder="https://your-video-url.mp4"
              required
            />
            <small>Upload your video to a hosting service and paste the direct URL</small>
          </div>

          <div className="form-group">
            <label>Thumbnail URL (optional)</label>
            <input
              type="url"
              value={formData.thumbnail_url}
              onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
              placeholder="https://your-thumbnail.jpg"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Duration (e.g., "0:30")</label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="0:30"
              />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                Active (visible to users)
              </label>
            </div>
          </div>

          <button type="submit" disabled={uploading} className="submit-btn">
            {uploading ? '⏳ Uploading...' : '✅ Upload Highlight'}
          </button>
        </form>
      </div>

      <div className="highlights-list-card">
        <h2>Existing Highlights ({highlights.length})</h2>
        {loading ? (
          <div className="loading">Loading...</div>
        ) : highlights.length === 0 ? (
          <div className="empty-state">No highlights yet. Upload your first one above!</div>
        ) : (
          <div className="highlights-grid">
            {highlights.map(highlight => (
              <div key={highlight.id} className="highlight-item">
                <div className="highlight-preview">
                  {highlight.thumbnail_url ? (
                    <img src={highlight.thumbnail_url} alt={highlight.title} />
                  ) : (
                    <video src={highlight.video_url} muted />
                  )}
                  {highlight.duration && (
                    <span className="duration-badge">{highlight.duration}</span>
                  )}
                </div>
                <div className="highlight-details">
                  <h3>{highlight.title}</h3>
                  {highlight.description && <p>{highlight.description}</p>}
                  <div className="highlight-meta">
                    <span>👁️ {highlight.view_count || 0} views</span>
                    <span className={`status ${highlight.is_active ? 'active' : 'inactive'}`}>
                      {highlight.is_active ? '✅ Active' : '❌ Inactive'}
                    </span>
                  </div>
                  <div className="highlight-actions">
                    <button 
                      onClick={() => toggleActive(highlight.id, highlight.is_active)}
                      className="toggle-btn"
                    >
                      {highlight.is_active ? 'Hide' : 'Show'}
                    </button>
                    <button 
                      onClick={() => deleteHighlight(highlight.id)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
