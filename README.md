# 历史订单可视化

## 技术栈
- 前端：React + Vite + Tailwind CSS
- 后端：Flask + SQLite + SQLAlchemy

## 目录结构
- `frontend/`：前端页面
- `backend/`：Flask API
- `isuzu_data.xlsx`：历史订单数据源
- `orders.db`：启动后自动生成的 SQLite 数据库

## 启动方式
### 1. 启动后端
```bash
cd backend
../.venv/bin/python app.py
```

### 2. 启动前端
```bash
cd frontend
npm install
npm run dev
```

### 3. 局域网访问（同一 Wi-Fi）
- 本机访问：`http://127.0.0.1:5173`
- 其他电脑访问：`http://<你的电脑局域网IP>:5173`

可用以下命令查看本机局域网 IP（macOS）：
```bash
ipconfig getifaddr en0
```

如果你使用的是有线网卡，可尝试：
```bash
ipconfig getifaddr en1
```
