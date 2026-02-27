import { defineConfig } from 'tsup'
import fs from 'node:fs'
import path from 'node:path'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react.ts',
    'server/index': 'src/server/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'next', 'convex'],
  async onSuccess() {
    // Prepend 'use client' to react entry outputs so Next.js treats them as client modules
    const reactFiles = ['dist/react.js', 'dist/react.mjs']
    for (const file of reactFiles) {
      const filePath = path.resolve(file)
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8')
        fs.writeFileSync(filePath, `'use client';\n${content}`)
      }
    }
  },
})
