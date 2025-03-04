const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

// 加载环境变量
dotenv.config();

const app = express();

// 配置 CORS
app.use(cors({
  origin: '*',  // 允许所有来源
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// 添加请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('请求头:', req.headers);
  console.log('请求体:', req.body);
  next();
});

// 内存存储
let stories = [];

// 配置多邮箱服务支持
function createMailTransporter(email) {
  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

// 验证邮件服务
const defaultTransporter = createMailTransporter(process.env.EMAIL_USER);
defaultTransporter.verify(function (error, success) {
  if (error) {
    console.log('邮件服务配置错误:', error);
  } else {
    console.log('邮件服务准备就绪');
  }
});

// 创建故事路由
app.post('/api/stories', async (req, res) => {
  try {
    console.log('收到创建故事请求:', req.body);
    
    const newStory = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString()
    };
    
    console.log('新故事数据:', newStory);
    stories.push(newStory);

    // 如果提醒时间在一小时内，立即发送邮件
    const reminderDate = new Date(newStory.reminderDate);
    const now = new Date();
    if (reminderDate <= new Date(now.getTime() + 60 * 60 * 1000)) {
      console.log('故事创建后立即发送提醒邮件');
      const mailOptions = {
        from: `"Pastbox 时间胶囊" <${process.env.EMAIL_USER}>`,
        to: newStory.email,
        subject: '您的 Pastbox 时间胶囊已送达',
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="color: #2c3e50; text-align: center;">您的时间胶囊已送达</h2>
            <p style="color: #666;">亲爱的用户：</p>
            <p style="color: #666;">这是您在 ${new Date(newStory.createdAt).toLocaleDateString()} 写下的故事：</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #2c3e50; line-height: 1.6;">${newStory.content}</p>
            </div>
            <p style="color: #666; text-align: center; margin-top: 30px;">感谢使用 Pastbox 时间胶囊</p>
          </div>
        `,
      };

      try {
        const transporter = createMailTransporter(newStory.email);
        await transporter.sendMail(mailOptions);
        console.log(`立即提醒邮件已发送至 ${newStory.email}`);
      } catch (error) {
        console.error('发送立即提醒邮件失败:', error);
      }
    }

    res.status(201).json(newStory);
  } catch (error) {
    console.error('创建故事失败:', error);
    res.status(400).json({ 
      error: error.message,
      details: '创建故事时发生错误，请检查输入数据是否正确'
    });
  }
});

// 获取公开故事路由
app.get('/api/stories/public', (req, res) => {
  try {
    const publicStories = stories
      .filter(story => story.isPublic)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(({ email, ...story }) => story);
    res.json(publicStories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 测试邮件路由
app.post('/api/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: '请提供邮箱地址' });
    }

    console.log('正在发送测试邮件到:', email);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '测试邮件 - Time Capsule',
      html: `
        <h1>测试邮件</h1>
        <p>这是一封来自 Time Capsule 的测试邮件。</p>
        <p>如果你收到这封邮件，说明邮件服务配置正确。</p>
      `
    };

    const transporter = createMailTransporter(email);
    const info = await transporter.sendMail(mailOptions);
    console.log('邮件发送成功:', info);

    res.json({ 
      success: true, 
      message: '测试邮件发送成功',
      messageId: info.messageId 
    });
  } catch (error) {
    console.error('发送邮件失败:', error);
    res.status(500).json({ 
      error: '发送邮件失败',
      details: error.message 
    });
  }
});

// 健康检查路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 启动服务器
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 