import { type FormEvent, useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

type VideoMeta = {
  id: string
  title: string
  description: string
}

type WatchPayload = {
  id: string
  title: string
  description: string
  playUrl: string
}

function App() {
  const [videos, setVideos] = useState<VideoMeta[]>([])
  const [selected, setSelected] = useState<WatchPayload | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadVideos = async () => {
    setLoadingList(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/get-videos`)
      if (!res.ok) throw new Error('Failed to load videos')
      const data = (await res.json()) as VideoMeta[]
      setVideos(data)
      if (data.length && !selected) {
        await handleSelect(data[0].id)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    loadVideos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault()
    if (!uploadTitle.trim()) return setError('Title is required')
    if (!uploadFile) return setError('Choose a video file')

    const form = new FormData()
    form.append('title', uploadTitle.trim())
    form.append('description', uploadDescription.trim())
    form.append('file', uploadFile)

    setUploading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || 'Upload failed')
      }
      setUploadTitle('')
      setUploadDescription('')
      setUploadFile(null)
      await loadVideos()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const handleSelect = async (id: string) => {
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/watch-api?id=${id}`)
      if (!res.ok) throw new Error('Could not load video details')
      const data = (await res.json()) as WatchPayload
      setSelected(data)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const videoSource = useMemo(() => selected?.playUrl ?? '', [selected])

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">YouTube-ish</p>
          <h1>Mini video shelf</h1>
          <p className="sub">Upload a clip, see the list, click to play.</p>
        </div>
      </header>

      <section className="grid">
        <div className="panel">
          <div className="panel-head">
            <h2>Upload</h2>
            {uploading && <span className="pill">Uploading…</span>}
          </div>
          <form className="form" onSubmit={handleUpload}>
            <label className="field">
              <span>Title</span>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="My great video"
                required
              />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Describe your video..."
                rows={3}
              />
            </label>
            <label className="field">
              <span>File</span>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                required
              />
            </label>
            <button type="submit" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload video'}
            </button>
          </form>
          {error && <p className="error">{error}</p>}
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Library</h2>
            {loadingList && <span className="pill">Refreshing…</span>}
            <button className="ghost" onClick={loadVideos} disabled={loadingList}>
              Refresh
            </button>
          </div>
          {videos.length === 0 && <p className="muted">No videos yet. Upload one!</p>}
          <ul className="video-list">
            {videos.map((video) => (
              <li key={video.id}>
                <button
                  className={selected?.id === video.id ? 'link active' : 'link'}
                  onClick={() => handleSelect(video.id)}
                >
                  {video.title}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel player">
          <div className="panel-head">
            <h2>Player</h2>
            {selected && <span className="pill subtle">{selected.title}</span>}
          </div>
          {selected ? (
            <>
              <video key={selected.id} controls src={videoSource} />
              {selected.description && (
                <p className="video-description">{selected.description}</p>
              )}
            </>
          ) : (
            <p className="muted">Select a video to watch.</p>
          )}
        </div>
      </section>
    </div>
  )
}

export default App
