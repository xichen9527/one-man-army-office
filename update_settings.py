import sys

# 读取文件
with open('src/pages/Settings.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. 在 import 里添加 Video 图标（在 Bot, 后面添加 Video,）
new_lines = []
for i, line in enumerate(lines):
    if 'Bot,' in line and 'Plus,' in lines[i+1] if i+1 < len(lines) else False:
        # 找到 import 图标列表，在 Bot, 后添加 Video,
        new_lines.append(line)
        # 检查下一行是否是 Plus, 如果是，在 Bot, 和 Plus, 之间插入 Video,
        # 实际上更简单：直接在 Bot, 后面加 Video,
        # 但为了避免重复，我直接处理整个文件
        pass
    else:
        new_lines.append(line)

# 重新读取，用更简单的方法
with open('src/pages/Settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 添加 Video 到图标导入
content = content.replace('Bot,\n  Plus,', 'Bot,\n  Video,\n  Plus,')

# 2. 在 </TabsList> 前插入新的 Tab
content = content.replace(
    '            语言设置\n          </TabsTrigger>\n        </TabsList>',
    '            语言设置\n          </TabsTrigger>\n          <TabsTrigger value="videoconference">\n            <Video className="mr-2 h-4 w-4" />\n            视频会议\n          </TabsTrigger>\n        </TabsList>'
)

# 3. 在文件末尾的 </Tabs> 前插入 TabsContent
# 先找到 </Tabs> 的位置（最后一个）
last_tabs_close = content.rfind('</Tabs>')
if last_tabs_close > 0:
    videoconf_content = '''

        {/* 视频会议配置 */}
        <TabsContent value="videoconference" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>视频会议配置</CardTitle>
              <CardDescription>
                配置您的 LiveKit Cloud 凭证，用于应用内视频会议
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-800 mb-1">如何获取配置？</p>
                <ol className="list-decimal list-inside text-blue-600 space-y-1">
                  <li>访问 <a href="https://cloud.livekit.io" target="_blank" className="underline">cloud.livekit.io</a> 注册账号</li>
                  <li>创建项目，复制 Project URL</li>
                  <li>在 Settings → API Keys 创建新的 API Key</li>
                  <li>将 URL、Key、Secret 填入下方</li>
                </ol>
                <p className="text-blue-500 text-xs mt-2">免费额度：10,000 分钟/月</p>
              </div>
              <div>
                <Label>Server URL *</Label>
                <Input
                  value={videoConfConfig.url}
                  onChange={e => setVideoConfConfig(c => ({ ...c, url: e.target.value }))}
                  placeholder="wss://your-project.livekit.cloud"
                />
              </div>
              <div>
                <Label>API Key *</Label>
                <Input
                  value={videoConfConfig.apiKey}
                  onChange={e => setVideoConfConfig(c => ({ ...c, apiKey: e.target.value }))}
                  placeholder="APIxxxxxx"
                />
              </div>
              <div>
                <Label>API Secret *</Label>
                <Input
                  type="password"
                  value={videoConfConfig.apiSecret}
                  onChange={e => setVideoConfConfig(c => ({ ...c, apiSecret: e.target.value }))}
                  placeholder="xxxxxx"
                />
              </div>
              <Button onClick={saveVideoConfConfig}>
                <Save className="w-4 h-4 mr-1" />
                保存配置
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
'''
    content = content[:last_tabs_close] + videoconf_content + '\n      ' + content[last_tabs_close:]

# 写回文件
with open('src/pages/Settings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Settings.tsx updated successfully')
