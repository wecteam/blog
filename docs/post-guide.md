# 如何参与本博客文章的编写

本博客基于[hexo](https://hexo.io/zh-cn/docs/)搭建，hexo是一个著名的基于[markdown](https://www.jianshu.com/p/191d1e21f7ed)语法的静态博客工具。你只要按照以下基本操作，即可参与文章的编写！

#### 克隆项目地址
首先在你本机创建一个空目录，然后在该目录下执行一下命令
``` bash
$ git clone https://github.com/wecteam/blog
```
如果没有权限，请联系steelli添加权限。

#### 安装hexo

``` bash
$ npm install hexo-cli -g

```
写文章时建议在本地查看和预览，确认OK了才提交，因此强烈建议安装此工具，官方文档为[hexo概述](https://hexo.io/zh-cn/docs/)。

#### 创建文章
在项目根目录下执行以下命令
``` bash
$ hexo new your_title  //直接创建post，可以直接查看
$ hexo new draft your_title  //创建草稿先（草稿不能直接被预览），需要执行publish命令发布到post目录才可以查看
```
创建文章的相关命令参见[hexo写作](https://hexo.io/zh-cn/docs/writing)。

#### 进入文章目录
``` bash
$ cd blogs/source/_posts/{year}-{month}/ //若直接创建文章,{year}-{month}/表示文章所在目录，形如2019-08
$ cd blogs/source/_drafts/{year}-{month}/ //若创建的是草稿,{year}-{month}/表示文章所在目录，形如2019-08
```
如果一切正常，你将会看到以下目录结构：
```
├── your-title    //目录，用于存放图片等资源
└── your-title.md //文章内容
```

#### 写文章

用你喜欢的IDE或者普通的文本编辑器编写文章。文章的内容包括两部分：元信息和内容主体。

文章元信息(metadata)格式如下：
```
---
title: 你的文章的标题
date: 创建时间，自动生成
cover:  封面图，请用绝对地址
thumbnail: 缩略图，请用绝对地址
tags: 
  - 标签1
  - 标签2
  - 标签数量任意，请根据文章的内容来填写
categories: 文章分类，目前仅 Node.js 和 Web前端 两个选项，后续有需要再添加
---
```
此信息被hexo称为[Front-matter](https://hexo.io/zh-cn/docs/front-matter),语法采用[YMAL](https://www.jianshu.com/p/97222440cd08)语法。

内容主体紧接着元信息，采用标准的[markdown](https://www.jianshu.com/p/191d1e21f7ed)语法编写。
如果你已在其他地方编写好文章内容，直接复制过来贴在主体部分即可。

另外，每篇文章在首页显示的时候，仅显示文章开头一两段即可，完整的内容在文章详情页显示，因此这部分需要分隔出来，hexo是用HTML的注释‘<!--more-->’来隔开。
如下为示例：

```md
# 是什么在耗电？

移动设备的电力消耗有以下几个因素：

* CPU （核心处理器）
* GPU （图形处理）
* 网络 （wifi或者蜂窝移动网络）
* 屏幕

屏幕功耗相对稳定，并且主要由用户控制（通过屏幕使用时间和亮度），但是对于其他组件，例如CPU，GPU，网络模块，功耗是动态变化的，而且变化范围很大。

<!--more-->

系统根据当前正在处理的任务调整CPU和GPU性能，包括在Web浏览器中用户正在交互的网页以及使用Web内容的其他应用程序。这是通过打开或关闭某些组件以及通过更改其时钟频率来完成的。总的来说，芯片所需的性能越高，其功率效率就越低。硬件可以非常快速地提升到高性能（但是需要很大的功率），然后迅速恢复到更高效的低功耗状态。
```

#### 本地预览
编写的时候，建议先在本地预览确保内容OK。
``` bash
$ hexo s //直接预览文章
$ hexo s --draft  //预览文章和草稿
```
此会启动一个server，默认地址为http://localhost:4000 。你可以在本地进行预览。
更多hexo的命令参见[hexo命令](https://hexo.io/zh-cn/docs/commands)。

#### 草稿转为正式文章
如果你创建的是草稿，请执行以下命令，将文章转成正式的post，从而让可以看到。
``` bash
$ hexo publish your_title
```
此命令将文章从_draft目录移动到_post目录。

#### 生成静态HTML
本博客托管在github page上，部署之前需要先将markdown文件生成为静态HTML文件，执行以下命令生成：
``` bash
$ hexo clean //清理缓存
$ hexo g //全量生成HTML文件
```

#### 部署到官网
生成的静态HTML文件通过以下命令部署到官网。
``` bash
$ hexo d
```
此命令将HTML文件提交到github pages，大概2分钟之后刷新[https://wecteam.io](https://wecteam.io)就可以看到了。

#### 提交到git
确认你的文章OK之后，直接提交到git即可。
``` bash
$ git add *
$ git commit -m "feat:add new post:{your_title}"
$ git push
```

#### 文档排版规范
写文章前，请先看一下[文档排版规范](https://github.com/wecteam/blog/blob/master/docs/document-guide.md)。

#### 图床工具
写文章免不了要做图片传图片，推荐使用iPic工具，不论屏幕截图、还是复制图片，都可以自动上传、保存 Markdown 格式的链接，直接粘贴插入。[神器地址]（https://toolinbox.net/iPic/）