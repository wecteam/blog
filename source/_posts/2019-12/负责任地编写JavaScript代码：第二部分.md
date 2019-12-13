---
title: 负责任地编写JavaScript代码：第二部分
date: 2019-12-13 16:25:46
tags:
	- Web性能优化
cover: https://img11.360buyimg.com/jdphoto/s900x383_jfs/t1/104367/28/6359/106875/5df34e12E53c7d823/b00b5eaed1b76510.png
thumbnail: https://img11.360buyimg.com/jdphoto/s900x383_jfs/t1/104367/28/6359/106875/5df34e12E53c7d823/b00b5eaed1b76510.png
categories: Web前端
---

> * 原文地址：[https://alistapart.com/article/responsible-javascript-part-2/](https://alistapart.com/article/responsible-javascript-part-2/)
> * 原文作者：Jeremy Wagner
> * 译者：马雪琴
> * 声明：本翻译仅做学习交流使用，转载请注明来源

> 你和开发团队的成员热情游说老板同意对公司的老网站进行全面的重构，你们的请求被管理层甚至是最高管理层都听到了，他们同意了。高兴之余，你和团队开始与设计、IA 等团队一起工作。没过多久，你们就写出了新代码。

重构工作一开始非常简单，就是到处安装 npm，这其实就是在快速安装生产依赖项，就像一个大学生在做桶支架，而不关心第二天早上的情况一样。

然后，你就启动了。

与大多数豪饮的后果不同，痛苦并不是第二天早上就开始的。但是……几个月后，产品所有者和中层管理人员开始感到恶心和头痛，他们想知道为什么产品推出以来，转化率和收入都下降了。然后事情会恶化到极点，CTO 周末从度假小屋回来，质问为什么网站加载速度如此之慢——如果它真的加载过。

重构时每个人都很开心，重构后没有人快乐了。欢迎来到你的第一个 “JavaScript 宿醉”。
<!--more-->
# 这并不是你的错

当你与严重的“宿醉”作斗争时，“我告诉过你”这句话将是你应得的，它代表了激怒和指责——假设你还可以在如此糟糕的状态下战斗。

说到 ”JavaScript 宿醉”，很多人要为此承担责任，但相互指责只是在浪费时间。当今的网络环境要求我们拥有比竞争对手更快的迭代速度，这种压力驱使我们可能会利用任何可用的手段来尽可能地提高生产力，因此，我们更有可能（但也不一定）构建出开销更大的应用程序，并可能会使用影响性能和可访问性的开发模式。

Web 开发并不容易，它是一个漫长的过程，我们很少在第一次尝试时就取得成功。然而，web 工作最好的地方也在于，我们不必一开始就把它弄得很完美，我们可以在事后进行改进，这正是本系列的第二部分的目的所在。要达到完美还有很长的路要走，现在，让我们在短期内通过改进站点的脚本来减弱 “JavaScript 宿醉”。

# 把惯犯抓起来

基本的优化列表可能看起来很机械，但是值得一试。大型开发团队，特别是那些跨多个库工作，或不使用优化样板文件的团队，很容易忽略这些。

## 摇树优化

首先，确保您的工具链配置了 [tree shaking](https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking)。如果你对 tree shaking 还不熟悉，我去年写了一篇 [tree shaking 指南](https://developers.google.com/web/fundamentals/performance/optimizing-javascript/tree-shaking/)，你可以参考一下。简而言之，tree shaking 是指将代码库中未使用的代码不再打包到生产包中的过程。

现代的一些打包工具，如 [webpack](https://webpack.js.org/), [Rollup](https://rollupjs.org/guide/en/) 以及 [Parcel](https://parceljs.org/) 都有现成的 tree shaking 功能。[Grunt](https://gruntjs.com/) 和 [Gulp](https://gulpjs.com/) 只是任务运行器，并不是打包工具，所以它们没有 tree shaking。任务运行器不会像打包工具那样构建一个[依赖关系图](https://webpack.js.org/concepts/dependency-graph/)，相反，它们根据提供的配置文件，用许多的插件来执行离散的任务。任务运行器可以使用插件进行扩展，所以你可以通过绑定打包工具来处理 JavaScript。如果这种方式对你来说存在问题，那么你可能就需要手动审计并删除未使用的代码。

要想让 tree shaking 生效，需要满足下面几个条件：
* 项目里安装的包以及编写的逻辑必须是 [ES6 模块](https://ponyfoo.com/articles/es6-modules-in-depth)，对 [CommonJS 模块](https://en.wikipedia.org/wiki/CommonJS)是不能进行 tree shaking 的。
* 打包工具在构建阶段不允许将 ES6 模块转换成别的模块格式。在使用 bable 作为工具链时，[@babel/preset-env 配置](https://babeljs.io/docs/en/babel-preset-env)必须指定 module:false，以防止 ES6 代码被转换为 CommonJS。

Tree shaking 在构建过程中不太可能没有作用，如果真的没有，那就让它发挥作用。当然，它的有效性也因情况而异，它还取决于你导入的模块是否会引入[副作用](https://en.wikipedia.org/wiki/Side_effect_(computer_science))，这些副作用可能会影响打包工具删除未使用的导出模块。

## 代码拆分
你很有可能正在使用某种形式的代码拆分，但是使用的方式值得重新评估。无论你如何拆分代码，有两个问题一定需要注意:
* 你是否在[入口点](https://webpack.js.org/concepts/entry-points/)[拆分了通用代码](https://developers.google.com/web/fundamentals/performance/optimizing-javascript/code-splitting/#removing_duplicate_code)?
* 你是否延迟加载了所有可以合理应用动态导入的功能?

这些都很重要，因为减少冗余代码对性能至关重要。延迟加载可以通过减少页面初始 JavaScript 大小来提高性能。使用诸如 [Bundle Buddy](https://github.com/samccone/bundle-buddy) 之类的分析工具可以帮助你发现是否存在代码冗余问题。


![](https://img11.360buyimg.com/jdphoto/s652x628_jfs/t1/62480/39/16305/22466/5ddd2619E61201b97/cbe2acc91baf1319.png)
*Bundle Buddy 可以检查 webpack 的编译统计数据，并明确你的 Bundle 之间共享了多少代码*

在考虑延迟加载时，很难知道从哪里开始。当我在现有项目中寻找时，我会在整个代码库中搜索用户交互点，例如单击和键盘事件，以及类似的候选项。任何需要用户交互才能运行的代码都可能是动态加载的好的选择。

当然，按需加载脚本可能会显著延迟交互性，因为必须先下载交互所需的脚本。如果不关心数据使用情况，可以考虑使用 [rel=prefetch 资源提示](https://www.w3.org/TR/resource-hints/#prefetch)以较低的优先级加载这些脚本，这些脚本就不会与关键资源争用带宽。[rel=prefetch 的支持度](https://caniuse.com/#feat=link-rel-prefetch)很好，并且即使浏览器不支持它，也不会有任何问题，因为浏览器会忽略它们不理解的标记。

## 外化第三方托管代码

理想情况下，你应该尽可能多地自托管站点的依赖项。如果由于某种原因必须从第三方加载依赖项，请在打包工具的配置中将它们标记为外部包，否则可能会导致你网站的访问者将从本地以及从第三方托管下载相同的代码。

让我们来看一个可能会出现的假设情况：假设你的站点从公共 CDN 加载 Lodash，你还在本地开发的项目中安装了 Lodash，但是，如果你没有将 Lodash 标记为外部的，那么你的产品代码最终将加载它的第三方副本，而不是绑定的本地托管副本。

如果你了解你的代码块，这似乎只是一个常识，但我看过这一常识被开发者忽视，这的确是值得你花时间检查确认的一件事情。

如果你不相信可以自行托管第三方依赖项，那么可以考虑为它们添加 [dns-prefetch](https://css-tricks.com/prefetching-preloading-prebrowsing/#article-header-id-0)、[preconnect](https://css-tricks.com/prefetching-preloading-prebrowsing/#article-header-id-1) 甚至 [preload](https://www.smashingmagazine.com/2016/02/preload-what-is-it-good-for/) 提示。这样可以减少站点的[交互时间](https://developers.google.com/web/tools/lighthouse/audits/time-to-interactive)，如果 JavaScript 对呈现内容至关重要，则可以减少站点的[速度指数](https://sites.google.com/a/webpagetest.org/docs/using-webpagetest/metrics/speed-index)。

# 更小的选择，更少的开销
[Userland JavaScript](https://nodejs.org/en/knowledge/getting-started/what-is-node-core-verus-userland/) 就像一个大得令人发指的糖果店，我们作为开发人员，对大量的开源产品感到十分敬畏，框架和库允许我们快速扩展应用程序，实现本来需要花费大量时间和精力的各种各样的功能。

虽然我个人倾向于在项目中尽量减少客户端框架和库的使用，但它们的价值是引人注目的。然而，我们确实有责任在我们安装的东西上采取强硬的态度，当我们构建并交付了一些依赖于大量已安装代码来运行的东西时，就代表我们接受了只有这些代码维护者才能实际去解决一些问题，对吧?

可能是也可能不是，这取决于所使用的依赖项。例如，React 非常流行，但 [Preact](https://preactjs.com/) 是一个[非常小](https://bundlephobia.com/result?p=preact@8.4.2)的替代品，它基本上拥有和 React 相同的 API，并与许多 React 插件兼容。[Luxon](https://moment.github.io/luxon/) 和 [date-fns](https://date-fns.org/) 比 [moment.js](https://momentjs.com/) 更简洁，但也不是很小。

像 [Lodash](https://lodash.com/) 这样的库提供了许多有用的方法，然而，其中一些很容易被原生 ES6 取代。例如，[Lodash 的 compact 方法](https://lodash.com/docs/4.17.11#compact)可以替换为 filter 数组方法。我们其实并不不需要引入大型工具库，我们可以轻松地[替换更多](https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_chunk)。

无论你喜欢的什么样的工具，思想都是一样的：做一些研究，看看是否有更小的选择，或者原生的语言特性是否就可以达到这个目的。你可能会惊讶地发现，要真正地减少应用程序的开销其实很简单。

# 差异化脚本服务

你很有可能在工具链中使用 Babel 将 ES6 源代码转换为可以在传统浏览器上运行的代码，这是否意味在传统浏览器完全消失之前，我们一定要给根本不需要它们的浏览器提供巨大的代码包？[当然不是](https://philipwalton.com/articles/deploying-es2015-code-in-production-today/)！差异服务通过将 ES6 源码生成两个不同版本的代码包，可以帮助我们解决这个问题:
* 代码包1，它包含在较传统浏览器上运行站点所需的所有转换和填充。你可能已经在提供这个包了。
* 代码包2，它几乎不包含任何转换和填充，因为它的目标是现代浏览器。这是你可能没有提供的包—至少现在还没有。

实现这一点有点复杂，[我写了一种实现方法](https://calendar.perfplanet.com/2018/doing-differential-serving-in-2019/)，在这里就不深究了，简而言之就是，你可以修改构建的配置来生成一份额外的更小版本的代码包，并且只提供给现代浏览器。最重要的是，这些都是可以在不牺牲任何特性或功能的情况下实现的节省。视你的应用程序代码而定，节省的成本可能会相当可观。

![](https://img11.360buyimg.com/jdphoto/s2560x793_jfs/t1/49022/36/16535/275179/5dde1053Ede2ed3c4/2bdeeecdda8bcccd.jpg)
*项目传统打包（左）与现代包（右）的 webpack-bundle-analyzer 分析*

将这些包提供给对应平台的[最简单模式](https://developers.google.com/web/fundamentals/primers/modules#browser)如下，它在现代浏览器中也很好用:

```
<!-- 现代浏览器加载这份文件： -->
<script type="module" src="/js/app.mjs"></script>
<!-- 传统浏览器加载这份文件： -->
<script defer nomodule src="/js/app.js"></script>
```

不幸的是，这种模式有一个警告：像 IE 11 这样的传统浏览器，甚至像 Edge 15 到 18 这样相对现代的浏览器，都会同时下载这两个包。如果这对你来说是可以接受的，那就没有问题。

如果你担心传统浏览器下载两组包有性能问题，那么你需要找一个解决方案。这里有一个潜在的方案，即使用脚本注入（而不是上面的脚本标签）来避免在受影响的浏览器上重复下载:

```
var scriptEl = document.createElement("script");

if ("noModule" in scriptEl) {
  // 设置现代脚本
  scriptEl.src = "/js/app.mjs";
  scriptEl.type = "module";
} else {
  // 设置传统脚本
  scriptEl.src = "/js/app.js";
  scriptEl.defer = true; // type="module" 默认会延迟, 这里需要手动设置。
}

// 注入！
document.body.appendChild(scriptEl);
```

这段脚本推断如果一个浏览器在脚本元素中支持 [nomodule 属性](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-nomodule)，它就能解析 type="module"。这确保了传统浏览器只能加载得到传统脚本，而现代浏览器只能加载得到现代脚本。但是需要注意的是，动态注入的脚本默认情况下是异步加载的，所以如果依赖顺序很重要，那么需要将 [async](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-async) 属性设置为 false。

# 更少的转换
![](https://img11.360buyimg.com/jdphoto/s758x421_jfs/t1/61042/39/16139/32592/5dde1373E6f6ec579/7971e94944d61f71.png)

我的意思并不是说要直接废弃 Bable，它是必不可少的，但是天哪，它在你不知道的情况下增加了很多额外的东西。检查一下它转换的代码是有好处的。在你的编程习惯上做一些小的改变就会对 Babel 的输出产生积极的影响。

默认参数是一个非常方便的 ES6 功能，你可能已经使用过:
```
function logger(message, level = "log") {
  console[level](message);
}
```

这里需要注意的是 level 参数，它的默认值是“log”。这意味着如果我们想用这个函数调用 console.log，我们不需要指定 level 参数。太好了，对吧？但 Babel 转换这个函数时，输出如下:

```
function logger(message) {
  var level = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "log";

  console[level](message);
}
```

这是一个例子：尽管我们的初衷是好的，但开发人员的便利可能会适得其反。源代码中仅有的几个字节现在已经在生产代码中转换为更大的字节。代码丑化对此也无能为力，因为 arguments 无法压缩掉。哦，不要认为 [rest 参数](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters)可能会是一种更好的解决方案，实际 Babel 将它们转换得更加庞大:

```
// 源码
function logger(...args) {
  const [level, message] = args;

  console[level](message);
}

// Babel 输出
function logger() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  const level = args[0],
        message = args[1];
  console[level](message);
}
```

更糟糕的是，Babel 甚至对 [@babel/preset-env](https://babeljs.io/docs/en/babel-preset-env) 配置了[针对现代浏览器](https://babeljs.io/docs/en/babel-preset-env#targetsesmodules)的项目也转换了这段代码，这意味差异服务中的 JavaScript 现代包也会受到影响！你可以使用 [loose transforms](https://babeljs.io/docs/en/babel-preset-env#loose) 来解决这一漏洞——这是一个好主意，因为它们通常比那些更符合规范的转换包要小得多——[但是，如果你稍后从构建管道中删除 Babel，启用 loose transforms 可能会导致问题](https://2ality.com/2015/12/babel6-loose-mode.html)。

无论你决定是否启用 loose transforms，这里有一种方法可以去掉置换的默认参数:
```
// Babel 不会转换它
function logger(message, level) {
  console[level || "log"](message);
}
```

当然，默认参数并不是唯一需要警惕的特性。例如，[展开语法](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax)会被转换，[箭头函数](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)和[其它一大堆东西](https://babeljs.io/repl/#?babili=false&browsers=%3E%200.25%25%2C%20ie%20%3E%2010%2C%20Firefox%20ESR%2C%20not%20dead&build=&builtIns=false&spec=false&loose=false&code_lz=MYGwhgzhAECyYDsCuAzMwAuSBOBTb0A3gFDTTAD2CEG2SmFBAFALaKrpZ7YA05FSBLQCeASiKky0DAAsAlhAB0bZGkw580ALzQVHddwDcksrIWLKgkdv5Xsw42QC-xF8VCQYAYTAFcADwxcBAATGHhVTg0CEjJKalp6DEZoVgoQ3BA-YVxfPkoQRj5FEt8AcwhxWKkIJAAHfCYSxXLKxykTaXklFnTMm16MkHbTbsUc3xsJ7BGu8wKUnQWZyRcySTw6sDkhVOWqzrMlZZtl9pc3eJpoNBY5EGEfAh0EXAB3aCemACIfFntvnxvgAmAAMoOBgOg3wAMoJJrAFBg4LgMGAQCA5MAod8ACoUYQUNE4gBSYC2CG-okMQA&debug=false&forceAllTransforms=false&shippedProposals=false&circleciRepo=&evaluate=true&fileSize=true&timeTravel=false&sourceType=module&lineWrap=true&presets=env&prettier=false&targets=&version=7.4.5&externalPlugins=)也会被转换。


如果你不想完全避免使用这些功能，以下几个方法可以减少它们的影响:

1. 如果你正在编写一个库，可以考虑使用 [@babel/runtime](https://babeljs.io/docs/en/babel-runtime) 替代 [@babel/plugin-transform-runtime](https://babeljs.io/docs/en/babel-plugin-transform-runtime) ，以防止 Babel 将帮助函数放入你的代码中。
2. 对于应用程序中的 polyfilled 功能，可以通过使用 [@babel/preset-env 的 useBuiltIns:“usage”](https://babeljs.io/docs/en/babel-preset-env#usebuiltins) 选项，选择性地引入 [@babel/polyfill](https://babeljs.io/docs/en/babel-polyfill)。

这只是我个人的看法，但我认为最好的选择是完全避免对为现代浏览器生成的包进行代码转换。但这不一定可行，如果你使用了 JSX，它就必须针对所有浏览器进行转换，或者如果你使用的是不被广泛支持的前沿语言特性。后一种情况中，我们有必要问一下，这些功能对于提供良好的用户体验是否真的是必需的（它们很少是必需的）。如果你认为一定要使用 Babel，那么你应该时不时地去看看它转换的内容，看看 Babel 可能会做哪些事情，你是否可以进行改进。

# 进步不是一场竞赛

当你按摩你的太阳穴，想知道这个可怕的 “JavaScript 宿醉”什么时候才会消失，你要知道，正是当我们急于得到一些东西的时候，用户体验才会受到影响。由于 web 开发社区热衷于以竞争的名义进行更快的迭代，所以你有必要[稍微放慢速度](https://en.wikipedia.org/wiki/Thinking,_Fast_and_Slow)。你会发现，这样做可能会使你的迭代速度不如竞争对手，但是你的产品将比他们的更快。

当你把这些建议应用到你的代码库中时，要知道进步不是一夜之间自然发生的。Web 开发是一项工作。真正有影响力的工作是在我们深思熟虑并致力于长期的工艺时完成的。专注于稳定的改进，度量、测试、重复，你的站点的用户体验将得到改善，并且随着时间的推移，你将一点一点地加快速度。