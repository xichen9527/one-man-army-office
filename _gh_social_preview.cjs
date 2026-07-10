const https = require('https')
const fs = require('fs')
const path = require('path')

const token = 'gho_2v1zL1uVwG8xK9yH0jI3kL4mN5oP6qR7sT8uV9wX0yZ1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT1uV2wX3yZ4aB5'
const owner = 'xichen9527'
const repo = 'one-man-army-office'

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}${path}`,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'OpenClaw',
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data))
    
    const req = https.request(opts, res => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(body)
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(json)
          else reject(new Error(`${res.statusCode}: ${body}`))
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
    if (data) req.write(JSON.stringify(data))
    req.end()
  })
}

async function getFileSha(filepath) {
  try {
    const r = await request('GET', `/contents/${filepath}?ref=master`)
    return r.sha
  } catch (e) {
    return null
  }
}

async function uploadFile(filepath, content, message) {
  const sha = await getFileSha(filepath)
  const data = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch: 'master'
  }
  if (sha) data.sha = sha
  return request('PUT', `/contents/${filepath}`, data)
}

async function main() {
  const files = [
    'src/components/social-previews/WeiboPreview.tsx',
    'src/components/social-previews/BilibiliPreview.tsx',
    'src/components/social-previews/XiaohongshuPreview.tsx',
    'src/components/social-previews/DouyinPreview.tsx',
    'src/components/social-previews/WechatPreview.tsx',
    'src/components/social-previews/ZhihuPreview.tsx',
    'src/components/social-previews/KuaishouPreview.tsx',
    'src/components/social-previews/index.ts',
    'src/pages/SocialMedia.tsx'
  ]
  
  const basePath = 'D:\\oma'
  
  for (const file of files) {
    const fullPath = path.join(basePath, file)
    if (!fs.existsSync(fullPath)) {
      console.log(`Skip: ${file} (not found)`)
      continue
    }
    const content = fs.readFileSync(fullPath, 'utf8')
    console.log(`Uploading: ${file} (${content.length} bytes)`)
    await uploadFile(file, content, `feat: add ${path.basename(file)} - platform-specific social media previews`)
    console.log(`Done: ${file}`)
  }
  
  console.log('\nAll files uploaded!')
}

main().catch(console.error)
