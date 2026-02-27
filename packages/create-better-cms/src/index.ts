import fs from 'node:fs'
import path from 'node:path'
import prompts from 'prompts'
import pc from 'picocolors'

const TEMPLATES = ['nextjs'] as const

async function main() {
  console.log()
  console.log(`  ${pc.bold(pc.cyan('create-better-cms'))} — scaffold a Better CMS client project`)
  console.log()

  // Parse CLI args
  const args = process.argv.slice(2)
  let projectName = args[0]
  let templateName: string | undefined

  // Check for --template flag
  const templateIdx = args.indexOf('--template')
  if (templateIdx !== -1) {
    templateName = args[templateIdx + 1]
  }

  // Prompt for project name if not provided
  if (!projectName || projectName.startsWith('--')) {
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

  // Process template files — replace {{PROJECT_NAME}} placeholders
  processTemplateFiles(targetDir, { projectName })

  // Rename .tmpl files (e.g. package.json.tmpl → package.json)
  renameTmplFiles(targetDir)

  // Rename _gitignore → .gitignore (npm strips .gitignore from published packages)
  const gitignoreSrc = path.join(targetDir, '_gitignore')
  if (fs.existsSync(gitignoreSrc)) {
    fs.renameSync(gitignoreSrc, path.join(targetDir, '.gitignore'))
  }

  // Print next steps
  console.log()
  console.log(`  ${pc.green('Done!')} Next steps:`)
  console.log()
  console.log(`  ${pc.cyan('cd')} ${projectName}`)
  console.log(`  ${pc.cyan('pnpm install')}        ${pc.dim('# or npm install / yarn')}`)
  console.log(`  ${pc.dim('# Get your token from the CMS dashboard → Project Settings')}`)
  console.log(`  ${pc.dim('# Add it to .env.local:')}`)
  console.log(`  ${pc.cyan('NEXT_PUBLIC_BETTER_CMS_TOKEN=')}${pc.dim('bcms_...')}`)
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
