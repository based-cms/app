import fs from 'node:fs'
import path from 'node:path'
import { exec } from 'node:child_process'
import prompts from 'prompts'
import pc from 'picocolors'

const TEMPLATES = ['nextjs'] as const
const TOKEN_PREFIX = 'bcms_'

interface TokenPayload {
  v: number
  url: string
  slug: string
  key: string
}

function tryDecodeToken(token: string): TokenPayload | string {
  if (!token.startsWith(TOKEN_PREFIX)) {
    return `Token must start with "${TOKEN_PREFIX}"`
  }
  try {
    const parsed = JSON.parse(atob(token.slice(TOKEN_PREFIX.length))) as TokenPayload
    if (!parsed.url || !parsed.slug || !parsed.key) {
      return 'Token is missing required fields (url, slug, key)'
    }
    if (parsed.v !== 1) {
      return `Unsupported token version: ${String(parsed.v)}`
    }
    return parsed
  } catch {
    return 'Token is malformed — could not decode'
  }
}

function openBrowser(url: string) {
  const cmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start'
        : 'xdg-open'
  exec(`${cmd} ${url}`)
}

async function main() {
  console.log()
  console.log(`  ${pc.bold(pc.cyan('create-better-cms'))} — scaffold a Better CMS client project`)
  console.log()

  // Parse CLI args
  const args = process.argv.slice(2)
  let projectName = args[0]
  let templateName: string | undefined

  // Check for flags
  const templateIdx = args.indexOf('--template')
  if (templateIdx !== -1) {
    templateName = args[templateIdx + 1]
  }
  const localMode = args.includes('--local')

  // Filter out flags from project name
  if (projectName?.startsWith('--')) {
    projectName = undefined
  }

  // Prompt for project name if not provided
  if (!projectName) {
    const response = await prompts({
      type: 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: 'my-cms-app',
      validate: (value: string) =>
        /^[a-zA-Z0-9_-]+$/.test(value) || 'Only alphanumeric characters, dashes, and underscores',
    })
    if (!response.projectName) {
      console.log(pc.red('Cancelled.'))
      process.exit(1)
    }
    projectName = response.projectName as string
  }

  // Prompt for template if not provided and multiple exist
  if (!templateName) {
    if (TEMPLATES.length === 1) {
      templateName = TEMPLATES[0]
    } else {
      const response = await prompts({
        type: 'select',
        name: 'template',
        message: 'Template:',
        choices: TEMPLATES.map((t) => ({ title: t, value: t })),
      })
      if (!response.template) {
        console.log(pc.red('Cancelled.'))
        process.exit(1)
      }
      templateName = response.template as string
    }
  }

  // ─── Token setup ─────────────────────────────────────────────────────────────

  let token: string | undefined
  const { tokenChoice } = await prompts({
    type: 'select',
    name: 'tokenChoice',
    message: 'Connect to Better CMS:',
    choices: [
      {
        title: 'Paste token',
        value: 'paste',
        description: 'I have a token from the CMS dashboard',
      },
      {
        title: 'Open CMS dashboard',
        value: 'open',
        description: 'Create a project and get a token',
      },
      {
        title: 'Skip for now',
        value: 'skip',
        description: "I'll add the token later",
      },
    ],
  })

  if (tokenChoice === undefined) {
    console.log(pc.red('Cancelled.'))
    process.exit(1)
  }

  if (tokenChoice === 'paste') {
    const { pastedToken } = await prompts({
      type: 'text',
      name: 'pastedToken',
      message: 'Token:',
      validate: (value: string) => {
        if (!value.trim()) return 'Token cannot be empty'
        const result = tryDecodeToken(value.trim())
        if (typeof result === 'string') return result
        return true
      },
    })
    if (!pastedToken) {
      console.log(pc.red('Cancelled.'))
      process.exit(1)
    }
    token = (pastedToken as string).trim()
    const decoded = tryDecodeToken(token) as TokenPayload
    console.log()
    console.log(`  ${pc.green('Token valid')}`)
    console.log(`  ${pc.dim('Project:')} ${decoded.slug}`)
    console.log(`  ${pc.dim('Convex:')}  ${decoded.url}`)
  } else if (tokenChoice === 'open') {
    // Ask for the CMS URL
    const { cmsUrl } = await prompts({
      type: 'text',
      name: 'cmsUrl',
      message: 'CMS dashboard URL:',
      initial: 'https://cms.your-domain.com',
      validate: (value: string) => {
        try {
          new URL(value)
          return true
        } catch {
          return 'Enter a valid URL'
        }
      },
    })

    if (cmsUrl) {
      console.log()
      console.log(`  ${pc.dim('Opening CMS dashboard...')}`)
      openBrowser(cmsUrl as string)
      console.log(`  ${pc.dim('Create a project → go to Project Settings → Generate Token')}`)
      console.log()

      // Wait for them to come back with a token
      const { pastedToken } = await prompts({
        type: 'text',
        name: 'pastedToken',
        message: 'Paste your token (or press Enter to skip):',
      })
      if (pastedToken) {
        const trimmed = (pastedToken as string).trim()
        const result = tryDecodeToken(trimmed)
        if (typeof result === 'string') {
          console.log(`  ${pc.yellow('Warning:')} ${result} — skipping token setup`)
        } else {
          token = trimmed
          console.log()
          console.log(`  ${pc.green('Token valid')}`)
          console.log(`  ${pc.dim('Project:')} ${result.slug}`)
          console.log(`  ${pc.dim('Convex:')}  ${result.url}`)
        }
      }
    }
  }

  // ─── Scaffold ────────────────────────────────────────────────────────────────

  // Validate template exists
  const templateDir = path.join(__dirname, '..', 'templates', templateName)
  if (!fs.existsSync(templateDir)) {
    console.log(pc.red(`Template "${templateName}" not found.`))
    process.exit(1)
  }

  // Create target directory
  const targetDir = path.resolve(process.cwd(), projectName)
  if (fs.existsSync(targetDir)) {
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: `Directory "${projectName}" already exists. Overwrite?`,
      initial: false,
    })
    if (!overwrite) {
      console.log(pc.red('Cancelled.'))
      process.exit(1)
    }
    fs.rmSync(targetDir, { recursive: true, force: true })
  }

  // Copy template
  console.log()
  console.log(`  ${pc.green('Scaffolding')} ${pc.bold(projectName)}...`)
  fs.cpSync(templateDir, targetDir, { recursive: true })

  // Process template files — replace {{PROJECTNAME}} placeholders
  processTemplateFiles(targetDir, { projectName })

  // Rename .tmpl files (e.g. package.json.tmpl → package.json)
  renameTmplFiles(targetDir)

  // Rename _gitignore → .gitignore (npm strips .gitignore from published packages)
  const gitignoreSrc = path.join(targetDir, '_gitignore')
  if (fs.existsSync(gitignoreSrc)) {
    fs.renameSync(gitignoreSrc, path.join(targetDir, '.gitignore'))
  }

  // --local: rewrite cms-client dependency to file: path
  if (localMode) {
    const cmsClientDir = path.join(__dirname, '..', '..', 'cms-client')
    const pkgJsonPath = path.join(targetDir, 'package.json')
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) as {
      dependencies: Record<string, string>
    }
    pkgJson.dependencies['cms-client'] = `file:${cmsClientDir}`
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n')
    console.log(`  ${pc.green('Local mode:')} cms-client → ${pc.dim(cmsClientDir)}`)
  }

  // Write .env.local if token was provided
  if (token) {
    fs.writeFileSync(
      path.join(targetDir, '.env.local'),
      `NEXT_PUBLIC_BETTER_CMS_TOKEN=${token}\n`
    )
    console.log(`  ${pc.green('Wrote')} .env.local with token`)
  }

  // ─── Next steps ──────────────────────────────────────────────────────────────

  console.log()
  console.log(`  ${pc.green('Done!')} Next steps:`)
  console.log()
  console.log(`  ${pc.cyan('cd')} ${projectName}`)
  console.log(`  ${pc.cyan('pnpm install')}        ${pc.dim('# or npm install / yarn')}`)
  if (!token) {
    console.log(`  ${pc.dim('# Get your token from the CMS dashboard → Project Settings')}`)
    console.log(`  ${pc.dim('# Add it to .env.local:')}`)
    console.log(`  ${pc.cyan('NEXT_PUBLIC_BETTER_CMS_TOKEN=')}${pc.dim('bcms_...')}`)
  }
  console.log(`  ${pc.cyan('pnpm dev')}`)
  console.log()
}

function processTemplateFiles(dir: string, vars: { projectName: string }) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      processTemplateFiles(fullPath, vars)
    } else if (entry.isFile()) {
      let content = fs.readFileSync(fullPath, 'utf-8')
      let changed = false
      for (const [key, value] of Object.entries(vars)) {
        const placeholder = `{{${key.toUpperCase()}}}`
        if (content.includes(placeholder)) {
          content = content.replaceAll(placeholder, value)
          changed = true
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content)
      }
    }
  }
}

function renameTmplFiles(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      renameTmplFiles(fullPath)
    } else if (entry.name.endsWith('.tmpl')) {
      fs.renameSync(fullPath, fullPath.slice(0, -5))
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
