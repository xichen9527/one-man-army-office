import subprocess, os, sys

os.chdir(r'D:\oma')
node_bin = r'D:\Qclaw\v0.2.31.600\resources\openclaw\config/bin/node'
env = os.environ.copy()
env['PATH'] = node_bin + os.pathsep + env.get('PATH', '')
env['PATHEXT'] = '.CMD;.EXE;.BAT;.COM' + os.pathsep + env.get('PATHEXT', '')

def run(cmd):
    print("=== " + cmd + " ===")
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=400, env=env, cwd=r'D:\oma')
    print("rc=", r.returncode)
    if r.stdout: print(r.stdout[-2500:])
    if r.stderr: print(r.stderr[-2500:])
    return r

# 1. TypeScript check
r = run('npx tsc --noEmit')
if r.returncode != 0:
    print("TSC FAILED"); sys.exit(1)

# 2. Build
r = run('npx vite build')
if r.returncode != 0:
    print("BUILD FAILED"); sys.exit(1)

# 3. Git commit + push (only the source fix)
r = run('git add src/components/layouts/MainLayout.tsx')
r = run('git commit -m "fix(MainLayout): 修复 TDZ 错误 - Workspace/Shield 图标提前声明"')
if r.returncode != 0:
    print("COMMIT FAILED"); sys.exit(1)
r = run('git push origin master')
if r.returncode != 0:
    print("PUSH FAILED"); sys.exit(1)
print("DONE")
