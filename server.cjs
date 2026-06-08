const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// tencent-meeting-mcp skill 路径
const SKILL_PATH = 'D:\\Qclaw\\resources\\openclaw\\config\\skills\\tencent-meeting-mcp';

/**
 * 执行腾讯会议 MCP Python 脚本
 */
function executeMCP(method, params = {}) {
  return new Promise((resolve, reject) => {
    const paramsJson = JSON.stringify(params).replace(/"/g, '\\"');
    const command = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; python "${SKILL_PATH}\\scripts\\tencent_meeting.py" ${method} "${paramsJson}"`;
    
    exec(`powershell -Command "${command}"`, { encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing ${method}:`, stderr);
        reject({ error: stderr || error.message });
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        // 如果输出不是 JSON，返回原始文本
        resolve({ output: stdout.trim() });
      }
    });
  });
}

/**
 * API 端点：创建快速会议
 */
app.post('/api/meetings/create', async (req, res) => {
  try {
    const { subject, start_time, end_time, timezone = 'Asia/Shanghai' } = req.body;
    
    const params = {
      subject: subject || '快速会议',
      start_time: start_time || new Date().toISOString(),
      end_time: end_time || new Date(Date.now() + 3600000).toISOString(),
      timezone
    };
    
    const result = await executeMCP('schedule_meeting', params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API 端点：获取会议列表
 */
app.get('/api/meetings/list', async (req, res) => {
  try {
    const { page_size = 10, page_token = '' } = req.query;
    
    const params = {
      page_size: parseInt(page_size),
      page_token
    };
    
    const result = await executeMCP('list_meetings', params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API 端点：取消会议
 */
app.post('/api/meetings/:meetingId/cancel', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { reason = '用户取消' } = req.body;
    
    const params = {
      meeting_id: meetingId,
      reason
    };
    
    const result = await executeMCP('cancel_meeting', params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API 端点：获取会议详情
 */
app.get('/api/meetings/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    const params = {
      meeting_id: meetingId
    };
    
    const result = await executeMCP('get_meeting_info', params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 健康检查
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`✅ 本地代理服务器启动成功：http://localhost:${PORT}`);
  console.log(`📝 API 端点：`);
  console.log(`   POST /api/meetings/create - 创建会议`);
  console.log(`   GET  /api/meetings/list - 会议列表`);
  console.log(`   POST /api/meetings/:meetingId/cancel - 取消会议`);
  console.log(`   GET  /api/meetings/:meetingId - 会议详情`);
  console.log(`   GET  /health - 健康检查`);
});
