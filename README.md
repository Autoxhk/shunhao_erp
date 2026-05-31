# 历史订单可视化

## 技术栈
- 前端：React + Vite + Tailwind CSS
- 后端：Flask + SQLite + SQLAlchemy

## 目录结构
- `frontend/`：前端页面
- `backend/`：Flask API
- `isuzu_data.xlsx`：历史订单数据源
- `data.db`：启动后自动生成的 SQLite 数据库

## 本地开发
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

说明：
- 前端开发地址：`http://127.0.0.1:5173`
- 后端开发地址：`http://127.0.0.1:5001`

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

## 生产环境说明
服务器当前是以下方式运行：
- `nginx` 对外提供站点访问
- `nginx` 直接读取 `frontend/dist` 下的静态文件
- `/api/` 请求反向代理到 `127.0.0.1:5001`
- 后端通过 `systemd` 管理，服务名为 `shunhao-erp-backend.service`
- 后端实际启动命令为：`/home/ubuntu/shunhao_erp/.venv/bin/gunicorn -w 2 -b 127.0.0.1:5001 app:app`
- 登录码只以加盐哈希形式保存在服务端 `auth.json`，不依赖明文 `AUTH_CODE.txt`

常用检查命令：
```bash
systemctl status shunhao-erp-backend.service --no-pager
systemctl status nginx --no-pager
ss -ltnp | grep -E ':80 |:443 |:5001 '
curl -s http://127.0.0.1:5001/api/orders?perPage=1 | head
```

## 服务器更新发布流程
如果代码已经推到远端，服务器上建议按下面流程更新：

### 1. 进入项目目录并检查本地状态
```bash
cd /home/ubuntu/shunhao_erp
git status
git fetch origin
```

如果 `git status` 里有你不想保留的已跟踪改动，先处理掉再拉代码；否则 `git pull` 可能失败。

### 2. 拉取最新代码
```bash
git pull --ff-only origin main
```

### 3. 前端重新构建
```bash
cd /home/ubuntu/shunhao_erp/frontend
npm install
npm run build
```

说明：线上不是用 `npm run dev` 对外提供服务，而是由 `nginx` 直接读取 `frontend/dist`。

### 4. 重启后端并重载 Nginx
```bash
sudo systemctl restart shunhao-erp-backend.service
sudo systemctl reload nginx
```

### 5. 发布后验证
```bash
systemctl is-active shunhao-erp-backend.service nginx
curl -I http://127.0.0.1
curl -k -I https://127.0.0.1 -H 'Host: data.shunhaoparts.com'
curl -s http://127.0.0.1:5001/api/orders?perPage=1 | head
```

## 推荐的一键更新命令
如果只是常规上线，可以直接执行：

```bash
cd /home/ubuntu/shunhao_erp \
	&& git fetch origin \
	&& git pull --ff-only origin main \
	&& cd frontend \
	&& npm install \
	&& npm run build \
	&& sudo systemctl restart shunhao-erp-backend.service \
	&& sudo systemctl reload nginx
```

## 推荐脚本
也可以直接使用仓库根目录的 `deploy.sh`：

```bash
cd /home/ubuntu/shunhao_erp
chmod +x deploy.sh
./deploy.sh
```

这个脚本会自动完成以下动作：
- 检查是否存在未提交的已跟踪改动
- `git fetch origin`
- `git pull --ff-only origin main`
- `frontend` 下执行 `npm install` 和 `npm run build`
- 重启 `shunhao-erp-backend.service`
- 重载 `nginx`
- 检查后端健康接口和 HTTPS 响应
- 如果后端刚重启时还没监听端口，脚本会自动重试几次再判定失败

## 注意事项
- 不要再用 `python app.py` 或 `npm run dev` 作为线上重启方式。
- 线上真正需要重启的是 `shunhao-erp-backend.service`；前端通常只需要重新 `build`。
- 如果 `git pull` 报错，先执行 `git status` 看是否有本地已跟踪文件改动阻塞更新。
- `data.db` 是线上数据文件，处理 Git 操作时不要误删。
