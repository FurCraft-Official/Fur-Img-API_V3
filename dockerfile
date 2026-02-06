# 使用最新的 Node.js Alpine 镜像
FROM node:alpine

# 设置工作目录
WORKDIR /app

# 将 package.json 和 package-lock.json 拷贝到工作目录
COPY package*.json ./

# 安装依赖 (使用 clean install 保证环境纯净)
RUN npm install --omit=dev
RUN mkdir -p img ssl public
# 拷贝源代码
COPY . .

# 设置匿名卷 (img, ssl, public)
# 匿名卷在容器启动时如果未挂载宿主机目录，Docker 会自动创建随机命名的卷
VOLUME ["/app/img", "/app/ssl", "/app/public"]

# 对外暴露 3000 端口
EXPOSE 3000

# 启动应用
CMD ["node", "index.js"]