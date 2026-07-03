@echo off
cd /d "D:\代码\one-man-army-office"
git restore src/pages/SocialMedia.tsx
git restore src/pages/Collaboration.tsx
git add src/pages/Settings.tsx
git add src/store/index.ts
git status
pause
