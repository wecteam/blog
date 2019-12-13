---
title: Node.js项目TypeScript改造指南
cover: https://img11.360buyimg.com/jdphoto/s640x295_jfs/t1/92732/2/2241/14632/5dcd00f7E4deea209/f9ed9663a079e504.jpg
thumbnail: https://img11.360buyimg.com/jdphoto/s640x295_jfs/t1/92732/2/2241/14632/5dcd00f7E4deea209/f9ed9663a079e504.jpg
date: 2019-11-26 22:00:00
tags: 
  - TypeScript
  - CLI
categories: Node.js
---

> 作者：陈晓强
> 声明：原创文章，转载请注明来源


## 前言
如果你有一个 Node.js 项目，并想使用 TypeScript 进行改造，那本文对你或许会有帮助。TypeScript 越来越火，本文不讲为什么要使用 TypeScript，也不讲基本概念。本文讲的是如何将一个旧的 Node.js 项目使用 TypeScript 进行改造，包括目录结构调整、TypeScript-ESLint 配置、tsconfig 配置、调试、常见错误处理等。由于篇幅有限，Node.js 项目能集成的技术也是五花八门，未覆盖到的场景还请见谅。
<!--more-->
## 步骤一、调整目录结构
Node.js 程序，由于对新语法的支持比较快(如async/await从v7.6.0开始支持)，大部分场景是不需要用到 babel、webapck 等编译工具的，因此也很少有编译文件的dist目录，而 TypeScript 是需要编译的，所以重点是要独立出一个`源码目录`和`编译目标目录`，推荐的目录结构如下，另外，根据不同技术栈还有一堆其他的配置文件如 prettier、travis 等等这里就省略了。
```
|-- assets            # 存放项目的图片、视频等资源文件
|-- bin               # CLI命令入口，require('../dist/cli')，注意文件头加上#!/usr/bin/env node
|-- dist              # 项目使用ts开发，dist为编译后文件目录，注意package.json中main字段要指向dist目录
|-- docs              # 存放项目相关文档
|-- scripts           # 对应package.json中scripts字段需要执行的脚本文件
|-- src               # 源码目录，注意此目录只放ts文件，其他文件如json、模板等文件放templates目录
    |-- sub           # 子目录
    |-- cli.ts        # cli入口文件
    |-- index.ts      # api入口文件
|-- templates         # 存放json、模板等文件
|-- tests             # 测试文件目录
|-- typings           # 存放ts声明文件，主要用于补充第三方包没有ts声明的情况
|-- .eslintignore     # eslint忽略规则配置
|-- .eslintrc.js      # eslint规则配置
|-- .gitignore        # git忽略规则
|-- package.json      # 
|-- README.md         # 项目说明
|-- tsconfig.json     # typescript配置，请勿修改
```

## 步骤二、TypeScript安装与配置
目录结构调整后，在你的项目根目录执行
1. `npm i typescript -D`，安装 typescript，保存到 dev 依赖
2. `node ./node_modules/.bin/tsc --init`，初始化 TypeScript 项目，生成一个 tsconfig.json 配置文件
> 如果第1步选择全局安装，那第2步中可以直接使用`tsc --init`

执行初始化命令后会生成一份默认配置文件，更详细的配置及说明可以自行查阅官方文档，这里根据前面的项目结构贴出一份基本的`推荐配置`，部分配置下文会解释。
```json
{
  "compilerOptions": {
    // "incremental": true,                   /* 增量编译 提高编译速度*/
    "target": "ES2019",                       /* 编译目标ES版本*/
    "module": "commonjs",                     /* 编译目标模块系统*/
    // "lib": [],                             /* 编译过程中需要引入的库文件列表*/
    "declaration": true,                      /* 编译时创建声明文件 */
    "outDir": "dist",                         /* ts编译输出目录 */
    "rootDir": "src",                         /* ts编译根目录. */
    // "importHelpers": true,                 /* 从tslib导入辅助工具函数(如__importDefault)*/
    "strict": true,                           /* 严格模式开关 等价于noImplicitAny、strictNullChecks、strictFunctionTypes、strictBindCallApply等设置true */
    "noUnusedLocals": true,                   /* 未使用局部变量报错*/
    "noUnusedParameters": true,               /* 未使用参数报错*/
    "noImplicitReturns": true,                /* 有代码路径没有返回值时报错*/
    "noFallthroughCasesInSwitch": true,       /* 不允许switch的case语句贯穿*/
    "moduleResolution": "node",               /* 模块解析策略 */
    "typeRoots": [                            /* 要包含的类型声明文件路径列表*/
      "./typings",
      "./node_modules/@types"
      ],                      
    "allowSyntheticDefaultImports": false,    /* 允许从没有设置默认导出的模块中默认导入，仅用于提示，不影响编译结果*/
    "esModuleInterop": false                  /* 允许编译生成文件时，在代码中注入工具类(__importDefault、__importStar)对ESM与commonjs混用情况做兼容处理*/

  },
  "include": [                                /* 需要编译的文件 */
    "src/**/*.ts",
    "typings/**/*.ts"
  ],
  "exclude": [                                /* 编译需要排除的文件 */
    "node_modules/**"
  ],
}
```

## 步骤三、源码文件调整

### 将所有.js文件改为.ts文件
这一步比较简单，可以根据自身项目情况，借助 gulp 等工具将所有文件后缀改成ts并提取到src目录。

### 模板文件提取
由于 TypeScript 在编译时只能处理 ts、tsx、js、jsx 这几类文件，因此项目中如果用到了一些模板如 json、html 等文件，这些是不需要编译的，可以提取到 templates 目录。

### package.json中添加scripts
前面我们将 typescript 包安装到项目依赖后，避免每次执行编译时都需要输入`node ./node_modules/.bin/tsc`(全局安装忽略，不建议这么做，其他同学可能已经全局安装了，但可能会与你项目所依赖的 typescript 版本不一致)，在 package.json 中添加以下脚本。后续就可以直接通过`npm run build`或者`npm run watch`来编译了。
```json
{
  "scripts":{
    "build":"tsc",
    "watch":"tsc --watch"
  }
}
```

## 步骤四、TypeScript代码规范
假设你用的 IDE 是 VSCode，~~TypeScript 与 VSCode 都是微软亲儿子，用 TypeScript 你就老老实实用 VSCode 吧~~，上述步骤以后，ts 文件中会出现大量飘红警告。类似这样：
![报错](https://img11.360buyimg.com/jdphoto/s1916x312_jfs/t1/102862/38/2279/69486/5dcd437bE46651252/2a8a6fb8aab33071.jpg)
先不要着急去解决错误，因为还需要对 TypeScript 添加 ESLint 配置，避免改多遍，先把 ESLint 配置好，当然，你如果喜欢 Prettier，可以把它加上，本文就不介绍如何集成 Prettier 了。

### TypeScript-ESLint
早期的 TypeScript 项目一般使用 TSLint ，但2019年初 TypeScript 官方决定全面采用 ESLint，因此 TypeScript 的规范，直接使用 ESLint 就好，首先安装依赖：  
`npm i eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin -D`
接着在根目录下新建`.eslintrc.js`文件，最简单的配置如下
```js
module.exports = {
  'parser':'@typescript-eslint/parser',  //ESLint的解析器换成 @typescript-eslint/parser 用于解析ts文件
  'extends': ['plugin:@typescript-eslint/recommended'], // 让ESLint继承 @typescript-eslint/recommended 定义的规则
  'env': {'node': true}
}
```
由于 @typescript-eslint/recommended 的规则并不完善，因此还需要补充ESLint的规则，如禁止使用多个空格(no-multi-spaces)等。可以使用[standard](https://standardjs.com/readme-zhcn.html)，安装依赖。
> 如果你项目已经在使用 ESLint，并有自己的规范，则不用再安装依赖，直接调整 .eslintrc.js 配置即可

`npm i eslint-config-standard eslint-plugin-import eslint-plugin-node eslint-plugin-promise eslint-plugin-standard -D`   
以上几个包，eslint-config-standard 是规则集，后面几个都是它的依赖。接来下调整. eslintrc.js 配置：
```js
module.exports = {
  'parser':'@typescript-eslint/parser', 
  'extends': ['standard','plugin:@typescript-eslint/recommended'], //extends这里加上standard规范
  'env': {'node': true}
}
```
### VSCode中集成ESLint配置
为了开发方便我们可以在 VSCode 中集成 ESLint 的配置，一是用于实时提示，二是可以在保存时自动 fix。
![vscode-demo](https://img11.360buyimg.com/jdphoto/jfs/t1/51130/39/15972/304254/5dcd4f2fEa59731e0/52822d14af424f7d.gif)
1. 安装 VSCode 的 ESLint 插件
2. 修改 ESLint 插件配置：设置 => 扩展 => ESLint => 打钩(Auto Fix On Save) => 在 settings.json 中编辑，如图：
![VSCode配置ESLint](https://img11.360buyimg.com/jdphoto/s1310x826_jfs/t1/100657/23/2287/119039/5dcd4fbdE834d740a/326fc124e9814499.jpg)  
3. 由于 ESLint 默认只校验 .js 文件，因此需要在 settings.json 中添加 ESLint 相关配置：
```js
{
    "eslint.enable": true,  //是否开启vscode的eslint
    "eslint.autoFixOnSave": true, //是否在保存的时候自动fix 
    "eslint.options": {    //指定vscode的eslint所处理的文件的后缀
        "extensions": [
            ".js",
            // ".vue",
            ".ts",
            ".tsx"
        ]
    },
    "eslint.validate": [     //确定校验准则
        "javascript",
        "javascriptreact",
        // {
        //     "language": "html",
        //     "autoFix": true
        // },
        // {
        //     "language": "vue",
        //     "autoFix": true
        // },
        {
            "language": "typescript",
            "autoFix": true
        },
        {
            "language": "typescriptreact",
            "autoFix": true
        }
    ]
}
```
4. 若遇到 VSCode 无法提示，可尝试重启下 ESLint 插件、将项目移出工作区再重新加回来。

## 步骤五、解决报错
这个步骤内容有点多，可以细品一下。注意，下述解决报错有些地方用了“any大法”(`不推荐`)，这是为了能让项目尽快 run 起来，毕竟是旧项目改造，不可能一步到位。

### 找不到模块
Node.js 项目是 commonjs 规范，使用 require 导出一个模块：`const path = require('path')`;首先看到的是 require 处的错误:
```
Cannot find name 'require'. Do you need to install type definitions for node? Try `npm i @types/node`.ts(2580)
```
此时你可能会想到改成 TypeScript 的 import 写法：`import * as path from 'path'`，接着你会看到在 path 处的错误:
```
找不到模块“path”。ts(2307)
```
这两个是同一个问题，path 模块和 require 都是 Node.js 的东西，需要安装 Node.js 的声明文件，`npm i @types/node -D`。

### TypeScript的import问题
安装完 Node 的声明文件后，之前的写法：`const path = require('path')`在 require 处仍然会报错，不过这次不是 TypeScript 报错，而是 ESLint 报错：
```
Require statement not part of import statement .eslint(@typescript-eslint/no-var-requires)
```
意思是不推荐这种导入写法，因为这种 commonjs 写法导出来的对象是 any，没有类型支持。这也是为啥前面说不用着急改，先做好 ESLint 配置。  

接着我们将模块导入改成 TypeScript 的 import，这里共有4种写法，分别讲一下需要注意的问题。

#### import * as mod from 'mod'
针对 commonjs 模块，使用此写法，我们来看看编译前后的区别，注意我们改造的是 Node.js 项目，因此我们 tsconfig 中配置`"module": "commonjs"`。  
test.ts 文件：
```js
import * as path from 'path'
console.log(path);
```
编译后的 test.js 文件：
```js
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
console.log(path);
```
可以看到，TypeScript 对编译后给模块加上了`__esModule:true,`标识这是一个 ES6 模块，如果你在 tsconfig 中配置`"esModuleInterop":true`，编译后的 test.js 文件如下：
```js
"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
console.log(path);
```
可以看到针对 import * 写法，在编译成 commonjs 后包裹了一个`__importStar`工具函数，其作用是：如果导入模块 __esModule 属性为 true，则直接返回 module.exports。否则返回module.exports.defalut = module.exports(消除了循环引用)。  
如果你不想在编译后的每个文件中都注入这么一段工具函数，可以配置`"importHelpers":true`，编译后的 test.js 文件如下：
```js
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path = tslib_1.__importStar(require("path"));
console.log(path);
```
细心的同学可能会发现，`"esModuleInterop":true`这个配置添加的`__importStar`在以上场景除了增加 require 复杂度，没什么其他作用。那是否可以去掉这个配置呢，我们接着往下看。

> 如果你用 import 导入的项目内的其他源文件，由于原先 commonjs 写法，会提示你`文件“/path/to/project/src/mod.ts”不是模块。ts(2306)`,此时，需要将被导入的模块修改为 ES6 的 export 写法

#### import { fun } from 'mod'
修改 test.ts 文件，依然是配置了：`"esModuleInterop":true`
```js
import { resolve } from 'path'
console.log(resolve)
```
编译后的 test.js 文件
```js
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
console.log(path_1.resolve);
```
可以看出导出单个属性时，并不会添加工具类，但会将单个属性导出修改为整个模块导出，并将原来的函数调用表达式修改为成员函数调用表达式。

#### import mod from 'mod'
这个语法是导出默认值，要特别注意。  

照例修改 test.ts 文件，配置`"esModuleInterop":true`，为了方便展示，配置`"importHelpers":false`：
```js
import path from 'path'
console.log(path)
```
编译后的 test.js 文件：
```js
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
console.log(path_1.default);

```
可以看到针对 import mod 这种写法，在编译成 commonjs 后包裹了一个`__importDefault`工具函数，其作用是：如果导入模块`__esModule`为 true，则直接返回`module.exports`。 否则返回`{default:module.exports}`。这个是针对没有默认导出的模块的一种兼容，fs 模块是 commonjs，并没有`__esModule`属性，使用`modules.exports`导出。上述代码中的`path_1`实际是`{default:module.exports}`，因此`path_1.default`指向的是原 path 模块，可以看出转换是正常的。  

但这种方式是有个`陷阱`，举个例子，如果有第三方模块，其文件是用 babel 或者也是 ts 转换过的，那其模块代码很有可能包含了 __esModule 属性，但同时没有`exports.default`导出，此时就会出现 mod.default 指向的是`undefined`。`更要命的是，IDE和编译器没有任何报错`。如果这个最基本的类型检查都解决不了，那我要 TypeScript 何用？  

所幸，tsconfig 提供了一个配置`allowSyntheticDefaultImports`，意思是允许从没有设置默认导出的模块中默认导入，需要注意的是，这个属性并不会对代码的生成有任何影响，仅仅是给出提示。另外，在配置`"module": "commonjs"`时，其值是和`esModuleInterop`同步的，也就是说我们前面设置了`"esModuleInterop":true`，相当于同时设置了`"allowSyntheticDefaultImports":true`。这个允许也就是不会提示。

手动修改`"allowSyntheticDefaultImports":false`后，会发现 ts 文件中`import path from 'path'`处出现提示`模块“"path"”没有默认导出。ts(1192)`，通过这个提示，我们将其修改为`import * as path from path`，可以有效避免上述`陷阱`。

#### import mod = require('mod');
这种写法有点奇怪，乍一看，一半的 ES6 模块写法和一半的 commonjs 写法。其实这是针对早期的声明文件，使用了`export = mod`语法进行导出。因此如果碰上这种声明文件，就使用此种写法。拿第三方包 moment 举例：  
你原来的写法是`const moment = require('moment'); moment();`  
当你改成`import * as moment from 'moment'`时，`moment();`语句处会提示：
```
This expression is not callable.
  Type 'typeof moment' has no call signatures.ts(2349)
gulp-task.ts(15, 1): Type originates at this import. A namespace-style import cannot be called or constructed, and will cause a failure at runtime. Consider using a default import or import require here instead.
```
提示你使用default导入或import require写法，当你改成default导入时：`import moment from'moment'; moment();` ，则在导入语句处会提示：
```
Module '"/path/to/project/src/moment"' can only be default-imported using the 'esModuleInterop' flagts(1259)
moment.d.ts(736, 1): This module is declared with using 'export =', and can only be used with a default import when using the 'esModuleInterop' flag.
```
改成`import moment = require('moment')`，则没有任何报错，对应的类型检测也都正常。

> 新的 ts 声明文件写法(declare module 'mod')，如前面所说的path模块，也支持此种 Import assignment 写法，但建议还是不要这样写了。

#### import小结
看完后再来回顾前面的问题：是否可以去掉这个配置`"esModuleInterop":true`  
个人认为在 Node.js 场景是可以去掉的~~我并不想看到那两个多余的工具函数~~。
但考虑到一些导入 ES6 模块的场景，可能需要保留，这里就不再讨论了，需要注意的是手动配置`"allowSyntheticDefaultImports":false`避免`陷阱`。  
解决了 import 问题，其实问题就解决一大半了，确保了你编译后的文件引入的模块不会出现 undefined。  

### 找不到声明文件
部分第三方包，其包内没有 ts 声明文件，此时报错如下:
```
无法找到模块“mod”的声明文件。“/path/to/project/src/index.js”隐式拥有 "any" 类型。
  Try `npm install @types/mod` if it exists or add a new declaration (.d.ts) file containing `declare module 'mod';`ts(7016)
```
根据提示安装对应包即可，注意添加 -D 保存到 dev 依赖，注意安装对应版本。比如你安装了 gulp@3 的版本，就不要安装 gulp@4 的 @types/gulp  

极少情况，第三方包内既没有声明文件，对应的@types/mod包也没有，此时为了解决报错，只能自己给第三方包添加声明文件了。我们将声明文件补充到`typings`文件夹中，以包名作为子目录名，最简单的写法如下，这样 IDE 和 TypeScript 编译便不会报错了。
```js
declare module 'mod'
```
> 至于为什么需要放在 typings 目录，并且以包名作为子包目录，因为不这样写，ts-node(下文会提到)识别不了，暂且按照 ts-node 的规范来吧。


### Class构造函数this.xx初始化报错
在 Class 的构造函数中对 this 属性进行初始化是常见做法，但在 ts 中，你得先定义。所有 this 属性，都要先声明，类似这样:
```js
class Person {
  name: string;
  constructor (name:string) {
    this.name = name;
  }
}
```
当然，如果你代码比较多，改造太耗时间，那就用'any大法'吧，每一个属性直接用 any 就完事了。
### 对象属性赋值报错
动态对象是 js 的特色，我先定义个对象，不管啥时候我都可以直接往里面加属性，这种报错，最快的改造办法就是给对象声明 any 类型。再次声明，正确的姿势是声明 Interface 或者 Type，而不是 any，此处用 any 只是为了快速改造旧项目让其能先 run 起来。
```js
let obj:any = {};
obj.name = 'string'
```
### 参数“arg”隐式具有“any”类型
```js
const init = (opt: any) => {
  console.log(opt)
}
```
除了参数隐式 any 外，此处还会有警告`Missing return type on function.eslint(@typescript-eslint/explicit-function-return-type)`，意思是方法需要有返回值，只是警告，不影响项目运行，先忽略，后续再完善。

### 未使用的函数参数
```js
const result = code.replace(/version=(1)/g, function (_a: string, b: number): string {
  return `version=${++b}`
})
```
有些回调函数参数可能是用不上的，将参数名字改成`_`或者`_开头`。

### 函数中使用this
根据写法不同，大概会有以下4种报错：
1. `类型“NodeModule”上不存在属性“name”。ts(2339)`
2. `类型“typeof globalThis”上不存在属性“name”。ts(2339)`
3. `"this" 隐式具有类型 "any"，因为它没有类型注释。ts(2683)`
4. `The containing arrow function captures the global value of 'this'.ts(7041)`  

处理方式是将 this 作为函数参数，并作为第一个参数，编译后会自动去掉第一个 this 参数。
```js
export default function (this:any,one:'string') {
  this.name = 'haha';
}
```

## 步骤六、调试配置
经过以上步骤，你的项目就能 run 起来了，虽然有很多警告和 any，但好歹已经算是走过来了，接下来就是解决调试问题。

### 方法一、调试生成后的dist文件
VSCode 参考配置(/path/to/project/.vscode/launch.json)如下

```json
{
  "configurations": [{
    "type": "node",
    "request": "launch",
    "name": "debug",
    "program": "/path/to/wxa-cli/dist/cli.js",
    "args": [
        "xx"
    ]
  }]
}
```
![VSCode调试js](https://img11.360buyimg.com/jdphoto/s1316x828_jfs/t1/63238/24/15509/196547/5dcd53a5E88bf1041/54a3fc35410bc072.jpg)  

### 方法二、直接调试ts文件
使用 ts-node进 行调试，VSCode 参考配置如下，详见[ts-node](https://github.com/TypeStrong/ts-node#visual-studio-code)
```json
{
  "configurations": [{
    "type": "node",
    "request": "launch",
    "name": "debug",
    "runtimeArgs": [
      "-r",
      "ts-node/register"
    ],
    "args": [
      "${workspaceFolder}/src/cli.ts",
      "xx"
    ]
  }]
}
```
![VSCode调试ts](https://img11.360buyimg.com/jdphoto/s1302x936_jfs/t1/92568/4/2181/170988/5dcd53a5E09da2717/d6ce8f89fccc10cd.jpg)

## 步骤七、类型加强、消除any
接下来要做的就是补充 Interface、Type，逐步将代码中的被业界喷得体无完肤的 any 干掉，但不要妄想去掉所有 any ，js 语言说到底还是动态语言，TypeScript 虽然是其超集往静态语言靠，但要做到 Java 这种纯静态语言程度还是有一段距离的。  

到这就算结束了，文中只涉及到了工具类的 Node.js 项目改造，场景有限，并不能代表所有 Node.js 项目，希望能对大家有所帮助。