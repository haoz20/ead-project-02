const { S3Client } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { GetObjectCommand } = require('@aws-sdk/client-s3')
const multer = require('multer')
const multerS3 = require('multer-s3')
const { v4: uuidv4 } = require('uuid')
const path = require('path')

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
})

const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname })
    },
    key: function (req, file, cb) {
      const id = uuidv4()
      const ext = path.extname(file.originalname)
      const key = `videos/${id}${ext}`
      req.uploadId = id
      cb(null, key)
    },
  }),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true)
    } else {
      cb(new Error('Only video files are allowed'))
    }
  },
})

async function getSignedStreamUrl(s3Key) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: s3Key,
  })
  
  // URL valid for 1 hour
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
  return url
}

module.exports = {
  s3Client,
  upload,
  getSignedStreamUrl,
}
