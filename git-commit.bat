@echo off
cd /d D:\oma
git add -A
git commit -m "fix: 4 critical runtime issues - Collaboration DBFile import, SocialMedia publish ID fix, AIAssistant refresh, sendAIMessage graceful degradation"
git push origin master
