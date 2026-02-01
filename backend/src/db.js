const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

async function initDatabase() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id UUID PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        filename VARCHAR(255) NOT NULL,
        s3_key VARCHAR(512) NOT NULL,
        mime_type VARCHAR(100),
        original_name VARCHAR(255),
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Database initialized successfully')
  } catch (err) {
    console.error('Failed to initialize database:', err)
    throw err
  } finally {
    client.release()
  }
}

async function getAllVideos() {
  const result = await pool.query(
    'SELECT id, title, description FROM videos ORDER BY uploaded_at DESC'
  )
  return result.rows
}

async function getVideoById(id) {
  const result = await pool.query('SELECT * FROM videos WHERE id = $1', [id])
  return result.rows[0]
}

async function createVideo(video) {
  const { id, title, description, filename, s3_key, mime_type, original_name } = video
  const result = await pool.query(
    `INSERT INTO videos (id, title, description, filename, s3_key, mime_type, original_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, title, description || '', filename, s3_key, mime_type, original_name]
  )
  return result.rows[0]
}

module.exports = {
  pool,
  initDatabase,
  getAllVideos,
  getVideoById,
  createVideo,
}
