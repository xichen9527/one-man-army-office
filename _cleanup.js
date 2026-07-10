import { existsSync, unlinkSync, readdirSync } from 'fs'

const projectPath = 'D:\\oma'
const tempFiles = [
  '_commit_msg.txt', '_gen_fix_files_rls.js', '_git_status.js',
  '_git_commit_push.js', '_git_commit_push2.js', '_git3.js',
  '_cleanup.js',
]

// Also find temp scripts to clean
const allJs = readdirSync(projectPath).filter(f => 
  f.startsWith('_gen_') || f.startsWith('_gh_') || 
  f.startsWith('_scan_') || f.startsWith('_find_') ||
  f.startsWith('_verify_') || f.startsWith('_check_') ||
  f.startsWith('_fix_') || f.startsWith('diagnostic_') ||
  f === 'check-ts.ps1' || f === 'run-ts-check.cjs' || 
  f === 'run-ts-check.js' || f === 'run-ts.ps1' ||
  f === 'ts-errors.txt' || f === 'COMMIT_MSG.txt'
).filter(f => f.endsWith('.js') || f.endsWith('.cjs') || f.endsWith('.ps1') || f.endsWith('.txt') || f.endsWith('.md'))

for (const f of allJs) {
  try {
    unlinkSync(`${projectPath}\\${f}`)
    console.log('Deleted:', f)
  } catch (e) {
    console.log('Skip (not found or error):', f)
  }
}
