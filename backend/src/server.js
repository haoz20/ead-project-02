const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const { initDatabase, getAllVideos, getVideoById, createVideo } = require('./db')
const { upload, getSignedStreamUrl } = require('./s3')

const PORT = process.env.PORT || 4000
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'
const app = express()

// CORS configuration
app.use(cors({
  origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(','),
  credentials: true
}))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.status(200).send('ok')
})

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const title = req.body.title?.trim()
    const description = req.body.description?.trim() || ''
    const file = req.file

    if (!title) {
      return res.status(400).json({ error: 'title is required' })
    }

    if (!file) {
      return res.status(400).json({ error: 'file is required' })
    }

    const id = req.uploadId
    const videoRecord = {
      id,
      title,
      description,
      filename: file.key.split('/').pop(),
      s3_key: file.key,
      mime_type: file.mimetype || 'application/octet-stream',
      original_name: file.originalname,
    }

    await createVideo(videoRecord)

    res.status(201).json({ id, title })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: 'Upload failed: ' + err.message })
  }
})

app.get('/api/get-videos', async (_req, res) => {
  try {
    const videos = await getAllVideos()
    const list = videos.map(({ id, title, description }) => ({
      id,
      title,
      description: description || '',
    }))
    res.json(list)
  } catch (err) {
    console.error('Get videos error:', err)
    res.status(500).json({ error: 'Failed to fetch videos' })
  }
})

app.get('/api/watch-api', async (req, res) => {
  try {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id required' })

    const video = await getVideoById(id)
    if (!video) return res.status(404).json({ error: 'not found' })

    // Generate presigned URL for secure private S3 access
    const playUrl = await getSignedStreamUrl(video.s3_key)

    res.json({
      id: video.id,
      title: video.title,
      description: video.description || '',
      playUrl,
    })
  } catch (err) {
    console.error('Watch API error:', err)
    res.status(500).json({ error: 'Failed to fetch video details' })
  }
})

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase()
    console.log('Database connection established')

    const server = app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`)
      console.log(`AWS Region: ${process.env.AWS_REGION}`)
      console.log(`S3 Bucket: ${process.env.S3_BUCKET_NAME}`)
      console.log(`CORS Origin: ${CORS_ORIGIN}`)
      console.log(`Using S3 presigned URLs for video delivery`)
    })

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`${signal} received, closing server gracefully...`)
      server.close(() => {
        console.log('HTTP server closed')
        process.exit(0)
      })

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout')
        process.exit(1)
      }, 10000)
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

startServer()
