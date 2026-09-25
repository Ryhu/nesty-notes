import express from 'express'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = process.env.PORT || 3001
const root = path.dirname(fileURLToPath(import.meta.url))
const dataDirectory = path.join(root, 'data')
const dataFile = path.join(dataDirectory, 'accordions.json')

app.use(express.json({ limit: '1mb' }))

app.get('/api/accordions', async (_request, response) => {
  try {
    const data = await readFile(dataFile, 'utf8')
    response.json(JSON.parse(data))
  } catch (error) {
    console.error('Could not read accordion data:', error)
    response.status(500).json({ message: 'Could not load accordion data.' })
  }
})

app.put('/api/accordions', async (request, response) => {
  if (!Array.isArray(request.body)) {
    return response.status(400).json({ message: 'Accordion data must be an array.' })
  }

  try {
    await mkdir(dataDirectory, { recursive: true })
    const temporaryFile = `${dataFile}.tmp`
    await writeFile(temporaryFile, `${JSON.stringify(request.body, null, 2)}\n`, 'utf8')
    await rename(temporaryFile, dataFile)
    response.json({ saved: true })
  } catch (error) {
    console.error('Could not save accordion data:', error)
    response.status(500).json({ message: 'Could not save accordion data.' })
  }
})

app.listen(port, () => {
  console.log(`Accordion API listening at http://localhost:${port}`)
})
