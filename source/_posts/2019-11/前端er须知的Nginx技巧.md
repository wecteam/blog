---
title: 前端er须知的Nginx技巧
date: 2019-11-24 21:50:45
tags:
	- Nginx
cover: https://img10.360buyimg.com/wq/jfs/t1/54499/32/14318/35612/5db6dd6cE20c98309/d9a497a04f84974f.png
thumbnail: https://img10.360buyimg.com/wq/jfs/t1/54499/32/14318/35612/5db6dd6cE20c98309/d9a497a04f84974f.png
categories: Web后端
---

> 作者：沐童

# 前述

Nginx 对于大多数开发者来说不算陌生，企业团队用它来搭建请求网关，我们私下用它 “科学上网”（价值观警告）。但对于前端 er 来说，平日里开发大多时候都只是专注于业务，根本不需要也没机会涉及到 Nginx 这一块的内容，也就导致我们也对它的了解少之甚少。随着 serverless 孕育普及，越来越多的人相信，不需要掌握任何运维知识，也能简单快速地实现自己的技术 idea。

然而事实上并不是这样的，Node 的兴起让前端工程师开始涉足后端领域，我们可以独立维护一些 BFF 服务，即使这只是一些简单的应用，也需要你掌握一定的运维技巧。另一方面，在快速变革的软件开发体系下，不同职责之间的部分边界变得越来越模糊，DevOps 理念的深入，也让我们不得不把目光投向应用运维，开始思考在新体系下如何构建一体化工程。所以，懂得一些简单易用的 Nginx 技巧，对于前端开发者来说，是非常必要的。

所谓 “技多不压身”，在你还在思考学不学的时候，有些人已经学完了。
<!--more-->
# Nginx 是什么

> Nginx 是一个开源且高性能、可靠的 http 中间件，代理服务。Nginx（发音同 engine x）是一个 Web 服务器，也可以用作反向代理，负载平衡器和 HTTP 缓存。

这是个经典的概述。Nginx 的 “高性能” 主要体现在支持海量并发的 webserver 服务，而 “可靠” 则意味着稳定性高、容错率大，同时，由于 Nginx 架构基于模块，我们大可以通过内置模块和第三方模块的自由组合，来构建适配自身业务的 Nginx 服务。正因如此，Nginx 才备受青睐，得以广泛出现在各种规模的企业团队中，成为技术体系的重要参与者。

对于 Nginx，我们可以深入探索的有很多，但对前端开发者而言，能够熟悉掌握和编写 Nginx 的核心配置文件 `nginx.conf`，其实已经能解决 80% 的问题了。

# Docker 快速搭建 Nginx 服务

纯手工安装 Nginx 经典的步骤是 “四项确认、两项安装、一次初始化”，过程繁琐而且容易踩坑，但是利用 Docker，我们完全没必要这么麻烦。Docker 是一个基于 Golang 的开源的应用容器引擎，支持开发者打包他们的应用以及依赖包到一个轻量可移植的沙箱容器中，因此我们可以使用 Docker 轻而易举地在我们本地搭建一个 Nginx 服务，完全跳过安装流程。关于 Docker 这里不做细讲，有兴趣的同学可以自行了解 [Docker](https://www.docker.com/)。

为了简便演示，我们使用更加高效的 Docker-Compose 来构建我们的 Nginx 服务。Docker-Compose 是 Docker 提供的一个命令行工具，用来定义和运行由多个容器组成的应用。使用 Docker-Compose，我们可以通过 YAML 文件声明式的定义应用程序的各个服务，并由单个命令完成应用的创建和启动。

要完成接下来的操作，首先你需要安装 Docker，不同的操作系统有不同的 [安装](https://docs.docker.com/install/) 方式。

环境就位后，我们新建一个项目 `nginx-quick`，在根目录新建一个 `docker-compose.yml` 文件，这是 Docker-Compose 的配置文件：

```yaml
version: "3"

services:
  nginx: # 服务的名称
    image: nginx
    volumes: # 文件夹映射
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf # nginx 配置文件
    ports: # 端口转发
      - "8080:80"
```

我们定义了一组服务 nginx，用于启动一个 docker 容器。容器对应的镜像是 `nginx`，在容器内 Nginx 服务的启动端口是 80，外部访问端口是 8080，同时，我们把本地自定义的 Nginx 配置文件 `./nginx/nginx.conf` 对应同步到容器中的 `/etc/nginx/nginx.conf` 路径。

新建 `nginx/nginx.conf`：

```conf
# 全局配置
user  nginx;         # 配置用户或者组
worker_processes  1; # 允许生成的进程数

error_log  /var/log/nginx/error.log warn; # 错误日志路径，warn 代表日志级别，级别越高记录越少
pid        /var/run/nginx.pid;            # Nginx 进程运行文件存放地址

events {
  accept_mutex on;          # 设置网路连接序列化，防止惊群现象发生
  multi_accept on;          # 设置一个进程是否同时接受多个网络连接
  worker_connections  1024; # 每个进程的最大连接数，因此理论上每台 Nginx 服务器的最大连接数 = worker_processes * worker_connections
}

# HTTP 配置
http {
  include       /etc/nginx/mime.types;    # 文件扩展名与文件类型映射表
  default_type  application/octet-stream; # 默认文件类型

  log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"'; # 日志格式

  access_log  /var/log/nginx/access.log  main; # 访问日志路径

  sendfile        on; # 允许 sendfile 方式传输文件

  keepalive_timeout  65; # 连接超时时间

  server {
    listen       80;         # 监听端口
    server_name  localhost;  # 监听地址

    location / {                    # 请求的url过滤，正则匹配
      root   /usr/share/nginx/html; # 根目录
      index  index.html index.htm;  # 默认页
    }
  }
}
```

这是一份最基础的 Nginx 配置，相关配置项及对应详细的释义可以看看注释，这里我们简单配置了一个 `localhost:80` 的访问监听（注意这里的 localhost 不是本地，是容器内部）。

执行 `docker-compose up -d` 创建服务，访问 `localhost:8080` 可以看到 Nginx 的默认主页 `Welcome to nginx!`。

执行 `docker exec -it nginx-quick_nginx_1 bash` 进入容器内部，再执行 `cat /etc/nginx/nginx.conf`，可以看到我们自定义的 Nginx 配置文件成功覆盖了默认的 Nginx 配置。

# Nginx 的 HTTP 配置

HTTP 配置是 Nginx 配置最关键，同时也是 Nginx 实用技巧中最常涉及的部分。Nginx 的 HTTP 配置主要分为三个层级的上下文：http — server — location。

## http

http 主要存放协议级别的配置，包括常用的诸如文件类型、连接时限、日志存储以及数据格式等网络连接配置，这些配置对于所有的服务都是有效的。

## server

server 是虚拟主机配置，主要存放服务级别的配置，包括服务地址和端口、编码格式以及服务默认的根目录和主页等。部分特殊的配置各级上下文都可以拥有，比如 `charest` (编码格式) `access_log` （访问日志）等，因此你可以单独指定该服务的访问日志，如果没有则默认向上继承。

## location

location 是请求级别的配置，它通过 url 正则匹配来指定对某个请求的处理方式，主要包括代理配置、缓存配置等。location 配置的语法规则主要为：

```yml
# location [修饰符] 匹配模式 { ... }
location [=|~|~*|^~] pattern { ... }
```

1）没有任何修饰符时表示路径前缀匹配，下边这个例子，匹配 `http://www.jd.com/test` 和 `http://www.jd.com/test/may`。

```
server {
  server_name www.jd.com;
  location /test { }
}
```

2）`=` 表示路径精确匹配，下边这个例子，只匹配 `http://www.jd.com/test`。

```
server {
  server_name www.jd.com;
  location = /test { }
}
```

3）`~` 表示正则匹配时要区分大小写，下边这个例子，匹配 `http://www.jd.com/test`，但不匹配 `http://www.jd.com/TEST`。

```
server {
  server_name www.jd.com;
  location ~ ^/test$ { }
}
```

4）`~*` 表示正则匹配时不需要区分大小写，下边这个例子，既匹配 `http://www.jd.com/test`，也匹配 `http://www.jd.com/TEST`。

```
server {
  server_name www.jd.com;
  location ~* ^/test$ { }
}
```

5）`^~` 表示如果该符号后面的字符是最佳匹配，采用该规则，不再进行后续的查找。

Nginx location 有自己的一套匹配优先级：

- 先精确匹配 `=`
- 再前缀匹配 `^~`
- 再按文件中顺序的正则匹配 `~` 或 `~*`
- 最后匹配不带任何修饰的前缀匹配

下边这个例子，`http://www.jd.com/test/may` 虽然命中了两个 location 规则，但是由于 `^~` 匹配优先级高于 `~*` 匹配，所以将优先使用第二个 location。

```
server {
  server_name www.jd.com;
  location ~* ^/test/may$ { }
  location ^~ /test { }
}
```

# Nginx 实用技巧

了解完一些 Nginx 的基础语法，我们再来看看在前端人手里，Nginx 可以有哪些实用的场景及技巧。

## 正向代理

代理转发是 Nginx 最为普遍的使用场景，正向代理就是其中一种。

![](//img10.360buyimg.com/wq/jfs/t1/96243/11/1355/36810/5dbe33e4E2f671c25/93a95ebdb52f2597.png)

客户端通过访问一个代理服务，由它将请求转发到目标服务，再接受目标服务的请求响应并最终返回给客户端，这就是一个代理的过程。“科学上网” 就是一种典型的正向代理，在这个过程中，Nginx 就充当了代理中介的角色。

我们在根目录下新建 `web/` 目录，添加一个 `index1.html`，作为目标服务的访问主页：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Web服务主页</title>
  <style>
  p {
    margin: 80px 0;
    text-align: center;
    font-size: 28px;
  }
  </style>
</head>
<body>
  <p>这是 Web1 服务的首页</p>
</body>
</html>
```

修改 `docker-compose.yml`，新增一个 Nginx 服务 `web1` 作为目标服务，用自定义的 html 去覆盖默认的主页 html，同时，我们用 `link: - web1:web1` 建立起代理服务 `nginx` 和目标服务 `web1` 之间的容器连接：

```yml
version: "3"

services:
  nginx: # 服务的名称
    image: nginx
    links:
      - web1:web1
    volumes: # 文件夹映射
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf # nginx 配置文件
    ports: # 端口转发
      - "8080:80"
  web1:
    image: nginx
    volumes:
      - ./web/index1.html:/usr/share/nginx/html/index.html
    ports:
      - "80"
```

修改 Nginx 的 location 配置，利用 `proxy_pass` 属性让主路径访问请求转发到目标服务 `web1`：

```
// ...
location / {
  proxy_redirect off;
  proxy_pass http://web1; ## 转发到web1
}
// ...
```

重启容器，访问 `localhost:8080`，可以发现代理服务成功将我们的请求转发到目标 Web 服务：

![](//img10.360buyimg.com/wq/jfs/t1/97309/38/1341/115137/5dbdaf1bEc543e175/e4584a7d18996f8f.png)

## 负载均衡

代理还包括反向代理，我们业务中最常提到的负载均衡，就是一种典型的反向代理。当网站的访问量达到一定程度后，单台服务器不能满足用户的请求时，就需要用多台服务器构建集群服务了，此时多台服务器将以合理的方式分担负载，避免出现某台服务器负载高宕机而某台服务器闲置的情况。

![](//img10.360buyimg.com/wq/jfs/t1/71670/9/14524/41921/5dbe33bfEe3438ed2/1972475a33bd27fe.png)

利用 Nginx 的 `upstream` 配置，我们可以简单地实现负载均衡。负载均衡需要多个目标服务，因此我们在 `web` 目录下新建 `index2.html` 和 `index3.html`，作为新增服务的访问主页。

修改 `docker-compose.yml`，新增两个服务 `web2` 和 `web3`，并建立容器连接：

```yml
# ...

services:
  nginx: # 服务的名称
    # ...
    links:
      # ...
      - web2:web2
      - web3:web3

  # ...

  web2:
    image: nginx
    volumes:
      - ./web/index2.html:/usr/share/nginx/html/index.html
    ports:
      - "80"
  web3:
    image: nginx
    volumes:
      - ./web/index3.html:/usr/share/nginx/html/index.html
    ports:
      - "80"
```

`nginx.conf` 中，我们创建了一个 upstream 配置 `web-app`，`web-app` 配置了三个目标服务，因此我们的请求将经由 `web-app` 代理到目标服务。Nginx 自带的负载均衡策略有多种，包括默认的轮询方式、权重方式、依据 IP 分配的 ip_hash 方式以及最少连接的 least_conn 方式等，采取哪种策略需要根据不同的业务和并发场景而定，这里我们使用 `least_conn` 策略来处理请求的分发。

```
// ...
upstream web-app {
  least_conn;   # 最少连接，选取活跃连接数与权重weight的比值最小者，为下一个处理请求的server
  server web1 weight=10 max_fails=3 fail_timeout=30s;
  server web2 weight=10 max_fails=3 fail_timeout=30s;
  server web3 weight=10 max_fails=3 fail_timeout=30s;
}

server {
  listen       80;         # 监听端口
  server_name  localhost;  # 监听地址

  location / {
    proxy_redirect off;
    proxy_pass http://web-app; ## 转发到web-app
  }
}
// ...
```

重新启动容器，可以发现多次请求时，代理服务都转发到了不同的目标 Web 服务：

![](//img12.360buyimg.com/jdphoto/jfs/t1/103799/7/1407/298411/5dbe65f0E17ac1cca/5ab9ca099d2d2c5d.gif)

## Server-side Include

Server-side Include（简称 SSI）是一种简单的解释型服务端脚本语言，是指在页面被获取时，服务器端能够进行 SSI 指令解析，对现有 HTML 页面增加动态生成的内容。SSI 是早期 Web 实现模块化的一个重要手段，适用于多种运行环境，且解析效率比 JSP 高，目前仍然在一些大型网站中广泛应用。

在 HTML 中使用 SSI 的格式就像这样：

```html
<!--#include virtual="/global/foot.html"-->
```

一行注释，通过服务端的 SSI 解析，会被置换成 `/global/foot.html` 的内容，virtual 可以是绝对路径，也可以是相对路径。

Nginx 可以简单快速地支持 SSI，让你的页面实现动态引入其他 HTML 内容。我们在 `web` 目录下新建一个 HTML 页面片 `sinclude.html`：

```html
<style>
* {
  color: red;
}
</style>
```

修改 `web/index1.html`，加上 SSI 指令，引入页面片 `./sinclude.html`：

```html
<head>
  <!-- ... -->
  <!--#include virtual="./sinclude.html"-->
</head>
```

修改 `docker-compose.yml`，把 `sinclude.html` 也放到 web 服务的访问根目录下：

```yml
version: "3"

services:
  nginx: # 服务的名称
    image: nginx
    links:
      - web1:web1
    volumes: # 文件夹映射
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf # nginx 配置文件
    ports: # 端口转发
      - "8080:80"
  web1:
    image: nginx
    volumes:
      - ./web/index1.html:/usr/share/nginx/html/index.html
      - ./web/sinclude.html:/usr/share/nginx/html/sinclude.html
    ports:
      - "80"
```

最后在 `nginx.conf` 中简单配置以下两个属性，开启 Nginx 的 SSI 支持，其中 `ssi_silent_errors` 表示处理 SSI 文件出错时需要输出错误提示：

```
location / {
  ssi on;
  ssi_silent_errors on; # 处理 SSI 文件出错时输出错误提示，默认 off
  
  proxy_redirect off;
  proxy_pass http://web1; ## 转发到web1
}
```

效果如下，Nginx 成功解析 SSI 指令，并将页面片插入到 HTML 页面中：

![](//img10.360buyimg.com/wq/jfs/t1/104329/12/1338/342854/5dbe6747E3e7bc702/90d88f4ccd3afc06.png)

需要注意的是，如果这里使用了反向代理，存在多个 web 服务，那么请保证每一个 web 服务都存在 `sinclude.html` 文件并且路径相同，因为获取 `index.html` 和获取 `sinclude.html` 是两趟分发，除非使用了 ip_hash 策略，否则就有可能转发到两个不同的服务上，导致获取不到页面片文件。

## GZIP 压缩

HTTP 传输主要以文本为主，其中大量是一些静态资源文件，包括 JS / CSS / HTML / IMAGE 等。GZIP 压缩可以在传输的过程中对内容进行压缩，减少带宽压力的同时提高用户访问速度，是一个有效的 Web 页面性能优化手段。

Nginx 利用 `gzip` 属性配置来开启响应内容的 GZIP 压缩：

```
location / {
  # ...
  gzip on;
  gzip_min_length 1k; # 大于1K的文件才会压缩
  
  # ...
}
```

`gzip_min_length` 指定接受压缩的最小数据大小，以上是小于 1K 的不予压缩，压缩后的请求响应头中多了 `Content-Encoding: gzip`。我们可以给 HTML 文件中多放点内容，这样才能让压缩效果更加明显，下边是 GZIP 开启前和开启后的效果对比：

1）压缩前，HTML 大小 3.3 KB

![](//img10.360buyimg.com/wq/jfs/t1/92335/3/1357/114829/5dbe6e29E41072b55/2535e62e298f936b.png)

2）开启 GZIP 压缩后，HTML 大小 555 B

![](//img10.360buyimg.com/wq/jfs/t1/58486/32/14956/115547/5dbe6e70E2e4a0192/e603c20a243b8b1c.png)

## 防盗链

某些情况下我们不希望自己的资源文件被外部网站使用，比如有时候我会把 JD 图片服务上的图片链接直接复制到 GitHub 上使用，这个时候假如 JD 要禁用来自 GitHub 的图片访问，可以怎么做呢？很简单：

```
location ~* \.(gif|jpg|png|webp)$ {
   valid_referers none blocked server_names jd.com *.jd.com;
   if ($invalid_referer) {
    return 403;
   }
   return 200 "get image success\n";
}
```

我们利用 Nginx 自带的 `valid_referers` 指令，对所有图片请求做了一个 referer 校验，只有 `jd.com` 及其子域下的图片请求才能成功，其他的都走 403 禁止，变量 `$invalid_referer` 的值正是校验结果。我们测试一下访问结果，可以发现，非法 referer 的请求都被拦截禁止了：

```
ECCMAC-48ed2e556:nginx-quick hankle$ curl -H 'referer: http://jd.com' http://localhost:8080/test.jpg
get image success
ECCMAC-48ed2e556:nginx-quick hankle$ curl -H 'referer: http://wq.jd.com' http://localhost:8080/test.jpg
get image success
ECCMAC-48ed2e556:nginx-quick hankle$ curl -H 'referer: http://baidu.com' http://localhost:8080/test.jpg
<html>
<head><title>403 Forbidden</title></head>
<body>
<center><h1>403 Forbidden</h1></center>
<hr><center>nginx/1.17.5</center>
</body>
</html>
```

## HTTPS

HTTPS 大家都比较熟悉了，它是在 HTTP 基础上引入 SSL 层来建立安全通道，通过对传输内容进行加密以及身份验证，避免数据在传输过程中被中间人劫持、篡改或盗用的一种技术。 Chrome 从 62 版本开始将带有输入数据的 HTTP 站点和以隐身模式查看的所有 HTTP 站点自动标记为 “不安全” 站点，可见在网络安全规范普及下，HTTPS 化是未来 Web 网站的一大趋势。

Nginx 可以简单快速地搭建起 HTTPS 服务，需要依赖于 http_ssl_module 模块。`nginx -V` 能够列出 Nginx 的编译参数，查看是否已安装 http_ssl_module 模块。

搭建 HTTPS 服务需要生成密钥和自签 SSL 证书（测试用，正式的需要签署第三方可信任的 SSL 证书），我们需要利用到 openssl 库。新建 `nginx/ssl_cert` 目录：

1）生成密钥 `.key`

```
openssl genrsa -out nginx_quick.key 1024
```

2）生成证书签名请求文件 `.csr`

```
openssl req -new -key nginx_quick.key -out nginx_quick.csr
```

3）生成证书签名文件 `.crt`

```
openssl x509 -req -days 3650 -in nginx_quick.csr -signkey nginx_quick.key -out nginx_quick.crt
```

完成这三步后，我们也就生成了 HTTPS 所需的密钥和 SSL 证书，直接配置到 `nginx.conf` 中：

```
# ...
server {
  listen       443 ssl;    # 监听端口
  server_name  localhost;  # 监听地址

  ssl_certificate /etc/nginx/ssl_cert/nginx_quick.crt;
  ssl_certificate_key /etc/nginx/ssl_cert/nginx_quick.key;

  # ...
}
```

修改 `docker-compose.yml`，把自定义证书文件传到 Nginx 的对应路径下：

```yml
services:
  nginx: # 服务的名称
    # ...
    volumes: # 文件夹映射
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf # nginx 配置文件
      - ./nginx/ssl_cert:/etc/nginx/ssl_cert # 证书文件
    ports: # 端口转发
      - "443:443"
```

重启后访问 `https://localhost`，发现页面被 Chrome 标记为不安全访问，这是因为自签证书是无效证书导致的，点击「继续前往」可正常访问到页面：

![](//img10.360buyimg.com/wq/jfs/t1/105761/29/1412/230363/5dbe9369Ead6e1a5d/79a14865c54784ed.png)

## 页面缓存

我们常说的页面缓存主要分为三类：客户端缓存、代理缓存、服务端缓存，这里重点讨论的是代理缓存。

当 Nginx 做代理时，假如接收的大多是一些响应数据不怎么变化的请求，比如静态资源请求，使用 Nginx 缓存将大幅度提升请求速度。Nginx 中的缓存是以文件系统上的分层数据存储的形式实现的，缓存键可配置，并且可以使用不同的特定于请求的参数来控制进入缓存的内容。

Nginx 利用 `proxy_cache_path` 和 `proxy_cache` 来开启内容缓存，前者用来设置缓存的路径和配置，后者用来启用缓存：

```
http {
  # ...
  proxy_cache_path /data/nginx/cache levels=1:2 keys_zone=mycache:10m max_size=10g inactive=60m;

  server {
    # ...

    proxy_cache mycache;

    # ...
  }
}
```

上边我们设置了一个缓存 `mycache`，并在 server 中启用：

1）`/data/nginx/cache` 指定了本地缓存的根目录；

2）`level` 代表缓存目录结构是两层的，最多设置3层，数字代表命名长度，比如 `1:2` 就会生成诸如 `/data/nginx/cache/w/0d` 的目录，对于大量缓存场景，合理的分层缓存是必要的；

3）`keys_zone` 设置了一个共享内存区，`10m` 代表内存区的大小，该内存区用于存储缓存键和元数据，保证 Nginx 在不检索磁盘的情况下能够快速判断出缓存是否命中；

4）`max_size` 设置了缓存的上限，默认是不限制；

5）`inactive` 设置了缓存在未被访问时能够持续保留的最长时间，也就是失活时间。

# 尾言

以上是一些简单实用的 Nginx 应用场景和使用技巧，对于前端开发来说，Nginx 依然还是很有必要深入了解的。但是面对繁琐复杂的 Nginx 配置和不堪入目的官方文档，不少人都要叫苦了，并且就算语法熟练编写无障碍，也会因为调试困难等各种问题浪费大量时间来排查错误。这里推荐一个 [Nginx 配置在线生成工具](https://nginxconfig.io/)，可以简单快速地生成你需要的 `nginx.conf` 配置，妈妈再也不用担心我学不好 Nginx 了！