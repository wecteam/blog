---
title: Electron 实践笔记
date: 2019-10-11 14:45:38
cover: https://tva1.sinaimg.cn/large/006y8mN6gy1g7u9fky1oqj30z40ia406.jpg
thumbnail: https://tva1.sinaimg.cn/large/006y8mN6gy1g7u9fky1oqj30z40ia406.jpg
tags:
	- Electron
	- 桌面开发
categories: Node.js
---

> 作者：周全

社交魔方平台是京东的 SNS 活动搭建平台，其内置了很多模板，每一个模板都有一个模板 JSON 用于生成表单，运营同学、商家配置了这个表单后就可以生成活动页面了。
模板 JSON 是标准的结构化数据，包含名称、类型、控件类型、校验器、默认值等等字段。以往都是采用手写 JSON 的方式，这是非常低效的，而且容易出错。针对其结构化数据的特点可以用 GUI 的方式去编辑，我们基于 [Electron](http://electronjs.org) 参考 [Github Desktop 客户端](https://github.com/desktop/desktop) 的架构编写了一个 [编辑器](http://git.jd.com/zhouquan31_repos/cubic)，通过填写表单的方式生成 JSON。所以在这里记录下这个 Electron 编辑器开发过程中可以记录的点和从 Github Desktop 客户端代码中值得学习的点。
<!--more-->
![APP](http://img13.360buyimg.com/jdphoto/jfs/t1/69749/12/12614/548388/5d9f4cebE13fe8229/6b2bb3d8394c8a5b.jpg)

## 一、关于 Electron
> Electron是由Github开发，用HTML，CSS和JavaScript来构建跨平台桌面应用程序的一个开源库。 Electron通过将Chromium和Node.js合并到同一个运行时环境中，并将其打包为Mac，Windows和Linux系统下的应用来实现这一目的。

上面是来自 Electron 官方的介绍。基于 Electron 平台，我们可以使用熟悉的前端技术栈来开发桌面应用。Electron 运行 package.json 的 main 脚本的进程被称为主进程（以下简称main）。 在主进程中运行的脚本通过创建 web 页面来展示用户界面（以下简称 renderer）。 一个 Electron 应用总是有且只有一个主进程。main 用于创建应用，创建浏览器窗口，它就是一个彻底的 Node 进程，获取不到 DOM, BOM 这些接口。在 main 创建的浏览器窗口中运行的就是 renderer 进程，它既可以获取 DOM, BOM 这些接口，也可以使用 Node 的 API。两类进程之间可以通过 Electron 提供的 IPC 接口通信。


## 二、开发环境搭建

我们了解到 Electron 分为两类进程，main 和 renderer。所以搭建开发环境时不能像普通的前端应用一样一个 webpack 配置搞定。并且我们想要实现

1. 一键启动开发环境
2. 一键打包
3. 一键发布

那么就需要两个 webpack 配置文件。

一个用于开发环境 -- `webpack.dev.ts`。

```ts
// webpack.dev.ts
const mainConfig = merge({}, base.mainConfig, config, {
  watch: true
})

const rendererConfig = merge({}, base.rendererConfig, config, {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.styl$/,
        use: ['style-loader', 'css-loader', 'stylus-loader'],
      }
    ]
  },
  devServer: {
    contentBase: path.join(__dirname, base.outputDir),
    port: 8000,
    hot: true,
    inline: true,
    historyApiFallback: true,
    writeToDisk: true
  },
})

module.exports = [rendererConfig, mainConfig]
```

另一个用于生产环境 -- `webpack.prod.ts`。

```ts
const config: webpack.Configuration = {
  mode: 'production',
  devtool: 'source-map',
}

const mainConfig = merge({}, base.mainConfig, config)

const rendererConfig = merge({}, base.rendererConfig, config, {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.styl$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'stylus-loader'],
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: 'renderer.css' }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'renderer.report.html',
    }),
  ],
})

module.exports = [mainConfig, rendererConfig]
```

这里参考了 Desktop 使用 Typescript 编写 webpack 配置文件。配合 interface 可以实现 webpack 配置文件的编辑器自动补全。具体使用方法可参考 webpack 文档 https://webpack.js.org/configuration/configuration-languages/#typescript

每一个配置文件导出一个数组，分别是 main, renderer 的配置对象。

使用 webpack-dev-server 启动能实现 renderer 的热更新，main 则是使用 webpack 的 watch 模式。

```json
{
  "compile:dev": "webpack-dev-server --config scripts/webpack.dev.ts"
}
```

使用 [nodemon](https://nodemon.io) 监听 main 编译后的产物，nodemon 监听到改动则重新运行 `electron .` 重启应用,这样间接实现了 main 的 livereload。

> Nodemon is a utility that will monitor for any changes in your source and automatically restart your server.

```json
{
  "app": "electron .",
  "app:watch": "nodemon --watch 'dest/main.js' --exec npm run app",
}
```

这样就实现了一键启动开发环境，且能够监听代码变化，重新启动应用。

> Tips: 开源社区有更好的 [electron-webpack](https://github.com/electron-userland/electron-webpack), HMR for both renderer and main processes

生产环境则使用 webpack 顺序编译 main 和 renderer。编译完成后使用 [electron-builder](https://www.electron.build) 打包。这样就实现了一键打包。

由于工具链的缺失实现不了一键发布，就只能打包后手动发布了（后面详细说明）。

下面就是完整的 scripts。

```json
{
  "scripts": {
    "start": "run-p -c compile:dev typecheck:watch app:watch",
    "dist": "npm run compile:prod && electron-builder build --win --mac",
    "compile:dev": "webpack-dev-server --config scripts/webpack.dev.ts",
    "compile:prod": "npm run clean && webpack --config scripts/webpack.prod.ts",
    "app": "electron .",
    "app:watch": "nodemon --watch 'dest/main.js' --exec npm run app",
    "clean": "rimraf dest dist",
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "lint": "eslint src --ext .ts,.js --fix",
    "release:patch": "standard-version --release-as patch && git push --follow-tags origin master && npm run dist",
    "release:minor": "standard-version --release-as minor && git push --follow-tags origin master && npm run dist",
    "release:major": "standard-version --release-as major && git push --follow-tags origin master && npm run dist",
    "repush": "git push --follow-tags origin master && npm run dist"
  },
}
```

## 三、目录结构

### 1. 项目目录结构

```sh
src
├── lib
│   ├── cube
│   ├── databases
│   ├── enviroment
│   ├── files
│   ├── local-storage
│   ├── log
│   ├── shell
│   ├── stores
│   ├── update
│   ├── validator
│   └── watcher
├── main
│   ├── app-window.ts
│   ├── event-bus.ts
│   ├── index.ts
│   ├── keyboard
│   └── menu
├── models
│   ├── popup.ts
│   └── project.ts
└── renderer
    ├── App.tsx
    ├── assets
    ├── components
    ├── index.html
    ├── index.tsx
    ├── pages
    └── types
```

在目录结构上模仿了 Desktop。main 目录存放 main 进程相关代码，包括应用入口，窗口创建，菜单，快捷键等等；而 renderer 目录则是整个 UI 渲染层的代码。lib 目录则是一些和 UI 无关也和 main 无强相关的业务逻辑代码。models 则存放一些领域模型。

### 2. CSS 规范

在这个 React 中项目中没有使用 css-modules 这类方案。而是使用 BEM 这类能形成命名空间的规范来实现模块化，这样做的好处是能够比较好的对样式进行覆盖。

在文件的组织方式上采用一个独立的 React 组件搭配一个独立的样式文件，这样在重构的时候，我们想要修改一个组件的样式只需要找到对应的样式文件进行修改即可，提高重构的效率。

```
stylesheets
  ├── common.styl
  ├── components
  │   ├── editor.styl
  │   ├── empty-guide.styl
  │   ├── find-in-page.styl
  │   ├── reindex.styl
  │   ├── sidebar.styl
  │   ├── source-viewer.styl
  │   └── upload.styl
  ├── index.styl
  └── reset.styl
```


## 三、IPC 通信

> 进程间通信（IPC，InterProcess Communication）是指在不同进程之间传播或交换信息。 

Electron 的 main 进程和 renderer 进程的通信是通过 Electron 提供的 `ipcMain` 和 `ipcRenderer` 来实现的。

### 1. main 端

在 main 中向某一个窗口 renderer 发送消息可以使用 `window.webContents.send`。
在 main 端监听 renderer 消息可以使用 `ipcMain.on`。

```js
// 在主进程中.
const { ipcMain } = require('electron')
ipcMain.on('asynchronous-message', (event, arg) => {
  console.log(arg) // prints "ping"
  event.reply('asynchronous-reply', 'pong')
})

ipcMain.on('synchronous-message', (event, arg) => {
  console.log(arg) // prints "ping"
  event.returnValue = 'pong'
})
```

### 2. renderer 端

回复同步消息可以使用 `event.returnValue`。同步消息的返回值可以直接读取。
回复异步消息可以使用 `event.reply`。那么在 renderer 就要监听回复的 channel 得到返回值。

```ts
//在渲染器进程 (网页) 中。
const { ipcRenderer } = require('electron')
console.log(ipcRenderer.sendSync('synchronous-message', 'ping')) // prints "pong"

ipcRenderer.on('asynchronous-reply', (event, arg) => {
  console.log(arg) // prints "pong"
})
ipcRenderer.send('asynchronous-message', 'ping')
```

可以看到 renderer 可以使用 `ipcRenderer.send` 向主进程发送异步消息。用 `ipcRenderer.sendSync` 发送同步消息。

## 四、数据持久化及状态管理

### 1. 复杂数据持久化

数据持久化可选的方案有很多，比如 [electron-store](https://github.com/sindresorhus/electron-store#readme)等基于 JSON 文件实现的存储方案。对于更复杂的应用场景还可以使用 [lowdb](https://github.com/typicode/lowdb)，[nedb](https://github.com/louischatriot/nedb) ，`sqlite`等。

最初我使用的是 `electron-store`, 并且一直有一个执念是对磁盘的读写只能在 main 进程进行，renderer 进程只负责渲染界面。所以在最初设计的是在 renderer 进程渲染数据或者更新数据的时候都需要通过 IPC 到 main 进程来完成最终的磁盘读写。除去读写正常的情况，还要考虑读写磁盘的异常，这样导致数据流异常的绕。而且还需要自己维护 ID 的生成。借鉴了 Desktop 的代码后，重构了数据持久化部分，也采用了 [Dexie](https://github.com/dfahlander/Dexie.js)，它是对浏览器标准数据库 indexedDB 的一个封装。从它的 Readme 可以看到它主要解决了indexedDB 的三个问题：

1. 不明确的异常处理
2. 查询很烂
3. 代码复杂


```ts
import Dexie from 'dexie';

export interface IDatabaseProject {
  id?: number;
  name: string;
  filePath: string;
}

export class ProjectsDatabase extends Dexie {
  public projects: Dexie.Table<IDatabaseProject, number>;
  constructor() {
    super('ProjectsDatabase');

    this.version(1).stores({
      projects: '++id,&name,&filePath',
    });

    this.projects = this.table('projects');
  }
}
```

继承 Dexie 来实现我们自己的数据库类，在构造函数中声明数据库的版本，表的 schema 等等。具体可以参考 [Dexie 官方文档](https://dexie.org/docs/)。


### 2. 简单数据持久化

一些 UI 状态的标志位存储（比如某个弹窗是否显示过），我们一般会把这种标志位存储到 `localStorage` 中。
在查看 Desktop 的源码过程中，发现他们对 `number`, `boolean` 类型的数据的 get, set 进行了简单的封装。使用起来非常方便，这里贴一下对于 `boolean` 型数据的处理。

```typescript
export function getBoolean(key: string): boolean | undefined
export function getBoolean(key: string, defaultValue: boolean): boolean
export function getBoolean(
  key: string,
  defaultValue?: boolean
): boolean | undefined {
  const value = localStorage.getItem(key)
  if (value === null) {
    return defaultValue
  }

  if (value === '1' || value === 'true') {
    return true
  }

  if (value === '0' || value === 'false') {
    return false
  }

  return defaultValue
}

export function setBoolean(key: string, value: boolean) {
  localStorage.setItem(key, value ? '1' : '0')
}
```

[源码详见](https://github.com/desktop/desktop/blob/development/app/src/lib/local-storage.ts)



## 五、功能实现

### 1. 磁盘/编辑器版本实时同步

一般情况下，在编辑器中我们编辑的内容其实是编辑器读取磁盘文件到内存中的副本。所以说如果磁盘的文件发生了改动，比如 Git 切换分支造成文件变动，抑或是删除了磁盘文件，重命名等等都会造成内存版本和磁盘版本的不一致，即磁盘版本领先于内存版本，这个时候就可能产生冲突。解决这个问题很简单，可以使用 fs.watch/watchFile 监听当前编辑的文件，一旦发生变化，就重新读取磁盘版本，更新内存版本来实现同步。但是 fs.watch 这个 API 在工程上不是可以开箱即用的，有许多兼容问题和一些 bug。比如说

Node.js fs.watch:

- Doesn't report filenames on MacOS.
- Doesn't report events at all when using editors like Sublime on MacOS.
- Often reports events twice.
- Emits most changes as rename.
- Does not provide an easy way to recursively watch file trees.

Node.js fs.watchFile:

- Almost as bad at event handling.
- Also does not provide any recursive watching.
- Results in high CPU utilization.

上面列举的点来自 [chokidar](https://github.com/paulmillr/chokidar)，它是一个 Node 模块，提供了开箱可用的监听文件变化的能力。只需要监听 `add`, `unlink`, `change` 等事件读取最新版本的文本到编辑器就可以实现磁盘/编辑器版本的同步了。


### 2. Context-Menu

Desktop 的 `contextmenu` (右键菜单)的实现基于原生 IPC 的，比较绕。

首先我们需要知道的是 `Menu` 类是 `main process only` 的。

在需要 `contextmenu` 的 `JSX.Element` 上绑定 `onContextMenu` 事件。构造对象数组 `Array<MenuItem>`, 并且为每个 MenuItem 对象绑定触发事件，再通过 IPC 将对象传递至 main 进程，值得一提的是这个时候将 MenuItem 数组赋值给了一个全局对象，暂存起来。在 main 进程构造出真正的 MenuItem 实例，绑定 MenuItem 的点击事件，触发 MenuItem 点击事件的时候记录 MenuItem 的 序列号 index，再将 index 通过 event.sender.send 将 index 传递到 renderer 进程。renderer 进程拿到 index 之后根据之前保存的全局对象取出单个 MenuItem， 执行绑定的事件。

```
onContextMenu => showContextualMenu (暂存MenuItems，ipcRenderer.send) => icpMain => menu.popup() => MenuItem.onClick(index) => event.sernder.send(index) => MenuItem.action()
```

所以在我的应用中使用了 remote 对象屏蔽上述复杂的 IPC 通信。在 renderer 进程完成 Menu 的构造展示和事件的绑定触发。

```ts
import { remote } from 'electron';
const { MenuItem, dialog, getCurrentWindow, Menu } = remote;

const onContextMenu = (project: Project) => {
  const menu = new Menu();

  const menus = [
    new MenuItem({
      label: '在终端中打开',
      visible: __DARWIN__,
      click() {
        const accessor = new FileAccessor(project.filePath);
        accessor.openInTerminal();
      },
    }),
    new MenuItem({
      label: '在 vscode 中打开',
      click() {
        const accessor = new FileAccessor(project.filePath);
        accessor.openInVscode();
      },
    }),
  ];

  menus.forEach(menu.append);
  menu.popup({ window: getCurrentWindow() });
};
```

## 六、日志

完善的日志不论是开发环境还是生产环境都是非常重要的，大致记录 UI 状态迁移背后的数据变动，流程的分支走向，能很好的辅助开发。

参考 Desktop，他们的日志基于日志库：[winston](https://github.com/winstonjs/winston#readme)。

在 main 进程和 renderer 进程都提供了全局 log 对象，接口都是一致的。分别是 `debug`, `info`, `warn`, `error`。在 renderer 进程，简单的封装了 `window.console` 对象上的 `debug`, `info`, `warn`, `error` 方法，日志打印到浏览器控制台的时候也通过 IPC 传递到 main 进程，由 main 进程统一管理。 

main 进程接收了来自 renderer 进程的日志信息和 main 进程自身的日志信息。设置了两个 `transports`。`winston.transports.Console` 和 `winston.transports.DailyRotateFile` 分别用于将日志信息打印在终端控制台和存储在磁盘文件。DailyRotateFile 以天为单位，设置了最多存储 14 天的上限。

在 main 进程和 renderer 进程启动时分别引入日志安装模块。因为 log 方法都是暴露在全局，因此只需要在进程启动时引入一次即可。同时在 TS 环境中还需要添加 log 方法的类型声明。


## 七、打包，发布及更新

开源世界已经有非常完善的打包和发布的工具 -- [electron-builder](https://www.electron.build)。它集多平台打包，签名，自动更新，发布到Github等平台等等功能于一身。

鉴于这个工具只能在内网使用，不能发布到 Github 而且也没有没有苹果开发者工具无法进行签名，只能利用 `electron-builder` 在本机打包，发布的话只能使用手动打包上传了，用户也只能手动下载安装包覆盖安装，不能像 VSCODE 这样实现自动更新。

既然不能自动更新，那么新版本下发后，如何通知到用户去下载新版本安装包更新呢？
从用户这一端来看，在应用每次启动的时候可以做一次请求，查询是否有版本更新，或者是在应用菜单栏提供入口，让用户手动触发更新查询。查询到服务端的最新版本后，使用 [sermver](https://www.npmjs.com/package/semver) 比较本机版本是否低于服务器版本，如果是就下发通知给用户，提示用户去下载更新。

在有限的条件下怎么实现这个功能呢？

实现这个功能必需的三个元素：服务端标识着最新版本的可读文件；托管各个版本安装包的云空间；应用代码中的更新逻辑。

服务端标识着最新版本的可读文件：每次打包时都会更新 `package.json`，所以我们直接把 `package.json` 上传到某个不带鉴权的 CDN 就可以，更新的时候就请求这个文件。

托管各个版本安装包的云空间：这个可以使用云盘，云盘可以生成分享链接，把这个链接手动拷贝到 Gitlab 该版本的 tag 的 Notes 中。

应用代码中的更新逻辑：

```ts
import got from 'got';
import semver from 'semver';
import { app, remote, BrowserWindow } from 'electron';

const realApp = app || remote.app;
const currentVersion = realApp.getVersion();

export async function checkForUpdates(window: BrowserWindow, silent: boolean = false) {
  const url = `http://yourcdn/package.json?t=${Date.now()}`;
  try {
    const response = await got(url);
    const pkg = JSON.parse(response.body);
    log.debug('检查更新，云端版本：', pkg.version);
    log.debug('当前版本', currentVersion);
    if (semver.lt(currentVersion, pkg.version)) {
      window.webContents.send('update-available', pkg.version);
    } else {
      window.webContents.send('update-not-available', silent);
    }
  } catch (error) {
    window.webContents.send('update-error', silent);
  }
}

```

分别在应用主进程启动、用户点击应用菜单`检查更新`时调用这个方法，从而通知 UI 进程下发通知。我们期望应用主进程启动时的更新是在失败或者无更新时是静默的，不用打扰用户，所以在 IPC 管道可以提供一个 `silent` 参数。检测到更新后就可以通知用户，用户点击更新后就可以跳转到最新版本的 Gitlab tags ，引导用户下载最新版本进行手动安装。


## 八、其他

### 1. devtools

开发 Electron 应用中 renderer 端也是使用 Chrome devtools 来调试的。对于 React, Mobx 这类框的 devtools 扩展也可以通过 `electron-devtools-installer` 来安装。应用窗口创建之后调用`electron-devtools-installer` 进行 `mobx`、`react` 等扩展的安装。

```ts
const { default: installExtension, MOBX_DEVTOOLS, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');
const extensions = [REACT_DEVELOPER_TOOLS, MOBX_DEVTOOLS];
for (const extension of extensions) {
  try {
    installExtension(extension);
  } catch (e) {
    // log.error(e);
  }
}
```

### 2. 保持窗口大小

对于桌面应用，一个常见的需求就是关闭后重新打开，需要恢复到上次打开时的窗口大小，位置。实现这个比较简单，监听窗口的 resize 事件，把窗口信息记录到当前用户的应用数据文件夹, 即 `app.getPath(appData)`。下次启动应用创建窗口时读取这个文件设置窗口信息即可。开源社区已经有对这个功能封装好的库：[electron-window-state](https://github.com/mawie81/electron-window-state#readme)


```js
const windowStateKeeper = require('electron-window-state');
let win;

app.on('ready', function () {
  let mainWindowState = windowStateKeeper({
    defaultWidth: 1000,
    defaultHeight: 800
  });

  win = new BrowserWindow({
    'x': mainWindowState.x,
    'y': mainWindowState.y,
    'width': mainWindowState.width,
    'height': mainWindowState.height
  });

  mainWindowState.manage(win);
});
```

只需要提供缺省窗口大小，剩余的事情 `electron-window-state` 都帮我们搞定了。