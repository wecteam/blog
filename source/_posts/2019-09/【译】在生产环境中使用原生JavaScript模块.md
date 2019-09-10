---
title: 【译】在生产环境中使用原生JavaScript模块
date: 2019-09-10 17:47:26
cover: https://img11.360buyimg.com/jdphoto/s800x350_jfs/t1/62365/21/9771/68519/5d770858Ec9e78573/093303e535ac7a36.jpg
thumbnail: https://img11.360buyimg.com/jdphoto/s800x350_jfs/t1/62365/21/9771/68519/5d770858Ec9e78573/093303e535ac7a36.jpg
tags: 
  - type="module"
  - 代码拆分
  - rollup打包
  - modulepreload
categories: Web开发
author:
    nick: 龚亮
    github_name: gongliang11
---

> 原文地址：https://philipwalton.com/articles/using-native-javascript-modules-in-production-today/
> 原文作者：PHILIP WALTON
> 译者：龚亮 ，校对：刘辉
> 声明：本翻译仅做学习交流使用，转载请注明来源

两年前，我写了一篇有关module/nomodule技术的[文章](https://philipwalton.com/articles/deploying-es2015-code-in-production-today/)，这项技术允许你在编写ES2015+代码时，使用打包器和转换器生成两个版本的代码库，一个具有现代语法的版本（通过`<script type="module">`加载）和一个使用ES5语法的版本（通过`<script nomodule>`加载）。该技术允许你向支持模块（*译者注：指ECMA制定的标准的export/import模块语法及其加载机制，又称为ES Module、ESM、ES6 Module、ES2015 Module，下文中将出现很多"模块"一词，都是这个含义*）的浏览器发送更少的代码，现在大多数Web框架和CLI都支持它。
<!--more-->
但是那时候，尽管能够在生产中部署现代JavaScript，大多数浏览器也都支持模块，我仍然建议打包你的代码。  

为什么？主要是因为我觉得在浏览器中加载模块很慢。尽管像HTTP/2这样的新协议理论上有效地支持加载大量小文件，但当时的所有性能研究都认为使用打包器更有效。  

其实当时的研究是不完整的。该研究所使用的模块测试示例由部署到生产环境中未优化和未缩小的源文件组成。它并没有将优化后的模块包与优化后的原始脚本进行比较。  

不过，当时并没有更好的方法来部署模块(*译者注：指遵循ES2015模块规范的文件*)。但是现在，打包技术取得了一些最新进展，可以将生产代码部署为ES2015模块(包含静态导入和动态导入)，从而获得比非模块(*译者注：指除ES2015模块外的传统部署方式*)更好的性能。实际上，这个站点(*译者注：指原文章所在的网站*)已经在生产环境中使用原生模块好几个月了。

# 对模块的误解
与我交流过的很多人都认为模块（*译者注：指遵循ES2015模块规范的部署方式*）是大规模生产环境下应用程序的一个选择罢了。他们中的许多人引用了我刚刚提到的研究，并建议不要在生产环境中使用模块，除非:
> ...小型web应用程序，总共只有不到100个模块，依赖树相对较浅(即最大深度小于5)。

如果你曾经查看过node_modules目录，可能知道即使是小型应用程序也很容易有超过100个模块依赖项。我们来看看npm上一些流行的工具包有多少个模块依赖项吧：
<table>
    <tbody>
        <tr>
            <th style="background-color: #eee;"><font style="vertical-align: inherit;"><font style="vertical-align: inherit;">包</font></font></th>
            <th style="background-color: #eee;"><font style="vertical-align: inherit;"><font style="vertical-align: inherit;">模块数量</font></font></th>
        </tr>
        <tr>
            <td><a href="https://www.npmjs.com/package/date-fns"><font style="vertical-align: inherit;"><font style="vertical-align: inherit;">date-fns</font></font></a></td>
            <td><font style="vertical-align: inherit;"><font style="vertical-align: inherit;">729</font></font></td>
        </tr>
        <tr>
            <td><a href="https://www.npmjs.com/package/lodash-es"><font style="vertical-align: inherit;"><font style="vertical-align: inherit;">lodash-es</font></font></a></td>
            <td><font style="vertical-align: inherit;"><font style="vertical-align: inherit;">643</font></font></td>
        </tr>
        <tr>
            <td><a href="https://www.npmjs.com/package/rxjs"><font style="vertical-align: inherit;"><font style="vertical-align: inherit;">rxjs</font></font></a></td>
            <td><font style="vertical-align: inherit;"><font style="vertical-align: inherit;">226</font></font></td>
        </tr>
    </tbody>
</table>

人们对模块的主要误解是，在生产环境中使用模块时只有两个选择：(1)按原样部署所有源代码(包括node_modules目录)，(2)完全不使用模块。

如果你仔细考虑我所引用研究给出的建议，它没有说加载模块比普通加载脚本慢，也没有说你不应该使用模块。它只是说，如果你将数百个未经过压缩的模块文件部署到生产环境中，Chrome将无法像加载单个经过压缩的模块一样快速的加载它们。所以建议继续使用打包器、编译器和压缩器（*译者注：原文是minifier，指去除空格注释等*）。  

实际情况是，**你可以在生产环境中使用上面所有技术的同时，也可以使用ES2015模块！**

事实上，因为浏览器已经知道如何加载模块（对不支持模块的浏览器可以做降级处理），所以模块才是我们应该打包出的格式。如果你检查大多数流行的打包器生成的输出代码，你会发现很多样板代码（*译者注：指rollup和webpack中的runtime的代码*），其唯一的目的是动态加载其它代码并管理依赖，但如果我们只使用带有`import`和`export`语句的模块，则不需要这些代码！

幸运的是，今天至少有一个流行的打包器（Rollup）支持模块作为输出格式，这意味着可以打包代码并在生产环境中部署模块（没有加载器样板代码）。由于Rollup（根据我的经验，这是最好的打包器）具有出色的tree-shaking，使得Rollup打包出的模块是目前所有打包器输出模块中代码最少的。

<p style="background:#f8f8f8;padding:10px;">
<font style="font-weight: bold">更新：</font> Parcel<a src="https://twitter.com/devongovett/status/1163792519764877312">计划</a>在下一版本中添加模块支持。Webpack目前不支持模块输出格式，但这里有一些相关讨论<a src="https://github.com/webpack/webpack/issues/2933">＃2933</a>，<a src="https://github.com/webpack/webpack/issues/8895">＃8895</a>，<a src="https://github.com/webpack/webpack/issues/8896">＃8896</a>。
</p>
另一个误解是，除非你的所有依赖项都使用模块，否则你不能使用模块。不幸的是大多数npm包仍然以CommonJS的形式发布(甚至有些包以ES2015编写，但在发布到npm之前转换为CommonJS)！

尽管如此，Rollup有一个插件（[rollup-plugin-commonjs](https://github.com/rollup/rollup-plugin-commonjs)），它可以将CommonJS源代码转换为`ES2015`。如果一开始你的依赖项采用ES2015模块管理肯定会[更好](https://rollupjs.org/guide/en/#why-are-es-modules-better-than-commonjs-modules)，但是有一些依赖关系不是这样管理的并不会阻止你部署模块。

在本文的剩余部分，我将向你展示如何打包到模块（包括使用动态导入和代码拆分的粒度），解释为什么它通常比原始脚本更高效，并展示如何处理不支持模块的浏览器。

# 最优打包策略
打包生产代码一直是需要权衡利弊。一方面，希望代码尽快加载和执行。另一方面，又不希望加载用户实际用不到的代码。

同时，还希望代码尽可能地被缓存。打包的一个大问题是，即使只是一行代码有修改也会使整个打包后的包缓存失效。如果直接使用ES2015模块部署应用程序（就像它们在源代码中一样），那么你可以自由地进行小的更改，同时让应用程序的大部分代码仍然保留在缓存中。但就像我已经指出的那样，这也意味着你的代码需要更长时间才能被新用户的浏览器加载完成。

因此，找到最优打包粒度的挑战是在加载性能和长期缓存之间取得适当的平衡。

默认情况下，大多数打包器在动态导入时进行代码拆分，但我认为仅动态导入的代码拆分粒度不够细，特别是对于拥有大量留存用户的站点（缓存很重要）。

在我看来，你应该尽可能细粒度地拆分代码，直到开始显著地影响加载性能为止。虽然我强烈建议你自己动手进行分析，但是查阅上文引用的研究可以得出一个大致的结论。当加载少于100个模块时，没有明显的性能差异。针对HTTP/2性能的研究发现，加载少于50个文件时没有明显的差异(尽管他们只测试了1、6、50和1000，所以100个文件可能就可以了)。

那么，最好的代码拆分方法是什么呢？除了通过动态导入做代码拆分外，我还建议以npm包为粒度做代码拆分，node_modules中的模块都合并到以其包名命名的文件中。

# 包级别的代码拆分
如上所述，打包技术的一些最新进展使得高性能模块部署成为可能。我提到的增强是指Rollup的两个新功能：通过动态`import()`时[自动代码拆分](https://rollupjs.org/guide/en/#code-splitting)（在v1.0.0中添加）和通过`manualChunks`选项进行[可编程的手动代码拆分](https://rollupjs.org/guide/en/#manualchunks)（在v1.11.0中添加）。

有了这两个功能，现在很容易在包级别进行代码拆分的构建配置。

这是一个使用`manualChunks`选项配置的例子，每个位于node_module里的模块将被合并到以包名命名的文件里(当然，这种模块路径里肯定包含node_modules)

```
export default {
  input: {
    main: 'src/main.mjs',
  },
  output: {
    dir: 'build',
    format: 'esm',
    entryFileNames: '[name].[hash].mjs',
  },
  manualChunks(id) {
    if (id.includes('node_modules')) {
      // Return the directory name following the last `node_modules`.
      // 返回最后一个node_modules后面跟着的目录名
      // Usually this is the package, but it could also be the scope.
      // 通常都会是一个包名，也有可能是一个私有域
      const dirs = id.split(path.sep);
      return dirs[dirs.lastIndexOf('node_modules') + 1];
    }
  },
}
```

`manualChunks`选项接收一个函数，该函数将模块文件路径作为惟一的参数，也可以返回一个文件名，参数中的模块将被加入到这个文件里。如果没有返回任何内容，参数中的模块将被添加到默认文件中。

考虑从`lodash-es`包中导入`cloneDeep()`、`debounce()`和`find()`模块的一个应用程序。上面的配置将把各个模块(以及它们导入的任何其它`lodash`模块)一起放入一个名为`npm.lodash-es.XXXX.mjs`的输出文件中，(其中XXXX是lodash-es模块文件的哈希值)。

在该文件的末尾，你会看到这样的导出语句(注意，它只包含添加到块中模块的导出语句，而不是所有lodash模块):
```
export {cloneDeep, debounce, find};
```
希望这个例子能清楚地说明使用Rollup手动拆分代码的工作原理。就我个人而言，我认为使用`import`和`export`语句的代码拆分比使用非标准的、特定于打包器实现的代码拆分更容易阅读和理解。

例如，跟踪这个文件中发生了什么很难(我以前使用webpack对一个项目做代码拆分后的实际输出)，而且在支持模块的浏览器中其实不需要这些代码:
```
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["import1"],{

/***/ "tLzr":
/*!*********************************!*\
  !*** ./app/scripts/import-1.js ***!
  \*********************************/
/*! exports provided: import1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "import1", function() { return import1; });
/* harmony import */ var _dep_1__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./dep-1 */ "6xPP");

const import1 = "imported: " + _dep_1__WEBPACK_IMPORTED_MODULE_0__["dep1"];

/***/ })

}]);
```

## 如果你有数百个npm依赖项怎么办？
我在上面说过，我认为包级别上的代码拆分是站点代码拆分的最佳状态，而又不会太激进。

当然，如果你的应用程序从数百个不同的npm包中导入模块，那么浏览器可能无法有效地加载所有模块。

但是，如果你确实有很多npm依赖项，那么先不要完全放弃这个策略。请记住，你可能不会在每个页面上加载所有的npm依赖项，因此检查实际加载了多少依赖项非常重要。

尽管如此，确实有一些非常大的应用程序具有如此多的npm依赖关系，以至于它们不能实际地对其中的每一个应用程序进行代码拆分。如果你是这种情况，我建议你找出一种方法来将一些依赖项分组到公共文件中。一般来说，你可以将可能在同一时间发生变化的包(例如，`React`和`react-dom`)分组，因为它们必须一起失效(例如，我稍后展示的示例应用程序将所有React依赖项[分组为同一个文件](https://github.com/philipwalton/rollup-native-modules-boilerplate/blob/da5e616c24d554dd8ffe562a7436709106be9eed/rollup.config.js#L159-L162))。

# 动态导入
使用原生`import`语句进行代码拆分和模块加载的一个缺点是，需要开发人员对不支持模块的浏览器做兼容处理。

如果你想使用动态`import()`懒加载代码，那么你还必须处理这样一个事实：有些浏览器[支持模块](https://caniuse.com/#feat=es6-module)，但[不支持动态`import()`](https://caniuse.com/#feat=es6-module-dynamic-import)（Edge 16–18, Firefox 60–66, Safari 11, Chrome 61–63）。

幸运的是，一个很小的(~400字节)、非常高性能的polyfill可用于动态`import()`。

向站点添加polyfill很容易。你所要做的是导入它并在应用程序的主入口点初始化它(在调用`import()`之前):
```
import dynamicImportPolyfill from 'dynamic-import-polyfill';

// This needs to be done before any dynamic imports are used. And if your
// modules are hosted in a sub-directory, the path must be specified here.
dynamicImportPolyfill.initialize({modulePath: '/modules/'});
```
最后要做的是告诉Rollup将输出代码中的动态`import()`重命名为你指定的另一个名称(通过[`output.dynamicImportFunction`](https://rollupjs.org/guide/en/#outputdynamicimportfunction)选项配置)。动态导入polyfill默认使用名称为__import__，但是可以[配置](https://github.com/GoogleChromeLabs/dynamic-import-polyfill#configuration-options)它。

需要重命名`import()`语句的原因是`import`是JavaScript中的一个关键字。这意味着不可能使用相同的名称来填充原生`import()`，因为这样做会导致语法错误。

让Rollup在构建时重命名它是很好的，这意味着你的源代码可以使用标准版本，并且在将来不再需要polyfill时，你将不必重新更改它。

## 高效加载JavaScript模块
当你使用代码拆分的时候，最好预加载所有马上要使用的模块(即主入口模块导入图中的所有模块)。

但是，当你加载实际的JavaScript模块（通过`<script type="module">`以及随后`import`语句引用的模块时），你将希望使用[`modulepreload`](https://developers.google.com/web/updates/2017/12/modulepreload)而不是传统的[`preload`](https://developer.mozilla.org/en-US/docs/Web/HTML/Preloading_content)(仅适用于原始脚本)。
```
<link rel="modulepreload" href="/modules/main.XXXX.mjs">
<link rel="modulepreload" href="/modules/npm.pkg-one.XXXX.mjs">
<link rel="modulepreload" href="/modules/npm.pkg-two.XXXX.mjs">
<link rel="modulepreload" href="/modules/npm.pkg-three.XXXX.mjs">
<!-- ... -->
<script type="module" src="/modules/main.XXXX.mjs"></script>
```
实际上，对于预加载原生的模块，`modulepreload`实际上比传统的`preload`要严格得多，它不仅下载文件，而且在主线程之外立即开始解析和编译文件。传统的预加载无法做到这一点，因为它不知道在预加载时该文件将用作模块脚本还是原始脚本。

这意味着通过`modulepreload`加载模块通常会更快，而且在实例化时不太可能导致主线程卡顿。

## 生成`modulepreload`列表
Rollup的[bundle](https://rollupjs.org/guide/en/#generatebundle)对象中的每个入口文件在其静态依赖关系图中包含完整的导入列表，因此在Rollup的[generateBundle](https://rollupjs.org/guide/en/#generatebundle)钩子中很容易获得需要预加载哪些文件的列表。

虽然在npm上确实存在一些modulepreload插件，但是为图中的每个入口点生成一个modulepreload列表只需要几行代码，所以我更愿意像这样手动创建它:
```
{
  generateBundle(options, bundle) {
    // A mapping of entry chunk names to their full dependency list.
    const modulepreloadMap = {};

    for (const [fileName, chunkInfo] of Object.entries(bundle)) {
      if (chunkInfo.isEntry || chunkInfo.isDynamicEntry) {
        modulepreloadMap[chunkInfo.name] = [fileName, ...chunkInfo.imports];
      }
    }

    // Do something with the mapping...
    console.log(modulepreloadMap);
  }
}
```
例如，这里是我如何为这个站点以及我的[demo应用](https://github.com/philipwalton/rollup-native-modules-boilerplate/blob/78c687bf757374b5e685508e3afc9560a86a3c96/rollup.config.js#L57-L84)生成[modulepreload列表的](https://github.com/philipwalton/blog/blob/90e914731c77296dccf2ed315599326c6014a080/tasks/javascript.js#L18-L43)。
<p style="background:#f8f8f8;padding:10px;">
注意：虽然对于模块脚本来说，modulepreload绝对比原始的preload更好，但它对浏览器的支持更差(目前只支持chrome)。如果你的流量中有相当一部分是非chrome流量，那么使用classic preload是有意义的。<br>
<br>
与使用modulepreload不同，使用preload时需要注意的一点是，预加载脚本不会放在浏览器的模块映射中，这意味着可能会不止一次地处理预加载的请求(例如，如果模块在浏览器完成预加载之前导入文件)。
</p>

# 为什么要部署原生模块？
如果你已经在使用像webpack这样的打包器，并且已经在使用细粒度代码拆分和预加载这些文件(与我在这里描述的类似)，那么你可能想知道是否值得改变策略，使用原生模块。下面是我认为你应该考虑它的几个原因，以及为什么打包到原生模块比使用带有模块加载代码的原始脚本要好。

### 更小的代码总量

当使用原生模块时，现代浏览器不必为用户加载任何不必要的模块加载或依赖关系管理代码。例如，如果使用原生模块，则根本不需要[webpack运行时和清单](https://webpack.js.org/concepts/manifest/)。

### 更好的预加载
正如我在前一节中提到的，使用`modulepreload`允许你加载代码并在主线程之外解析/编译代码。在其他条件相同的情况下，这意味着页面的交互速度更快，并且主线程在用户交互期间不太可能被阻塞。

因此，无论你如何细粒度地对应用程序进行代码拆分，使用import语句和`modulepreload`加载模块要比通过原始script标签和常规preload加载更有效(特别是如果这些标签是动态生成的，并在运行时添加到DOM中)。

换句话说，由Rollup打包出的20个模块文件将比由webpack打包出的20个原始脚本文件加载得更快(不是因为webpack，而是因为它不是原生模块)。

### 更面向未来
许多最令人兴奋的新浏览器特性都是构建在模块之上的，而不是原始的脚本。这意味着，如果你想使用这些特性中的任何一个，你的代码需要作为原生模块部署，而不是转换为ES5并通过原始的script标签加载(我在尝试使用实验性[KV存储API](https://developers.google.com/web/updates/2019/03/kv-storage)时曾提到过这个问题)。

以下是一些仅限模块才有的最令人兴奋的新功能：

* [内置模块](https://github.com/tc39/proposal-javascript-standard-library/)
* [HTML模块](https://github.com/w3c/webcomponents/blob/gh-pages/proposals/html-modules-explainer.md)
* [CSS模块](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/master/CSSModules/v1Explainer.md)
* [JSON模块](https://github.com/whatwg/html/pull/4407)
* [导入地图](https://github.com/WICG/import-maps)
* [workers、service workers和window之间共享模块](https://html.spec.whatwg.org/multipage/workers.html#module-worker-example)

# 支持旧版浏览器
在全球范围内，超过83%的浏览器原生支持JavaScript模块(包括动态导入)，因此对于你的大多数用户来说，不需要做任何处理就可以使用这项技术。

对于支持模块但不支持动态导入的浏览器，可以使用上面提到的[`dynamic-import-polyfill`](https://github.com/GoogleChromeLabs/dynamic-import-polyfill)。由于polyfill非常小，并且在可用时将使用浏览器的原生动态`import()`，因此添加这个polyfill几乎没有大小或性能成本。

对于根本不支持模块的浏览器，可以使用我前面提到的module/nomodule技术。

## 一个实际的例子
由于谈论跨浏览器兼容性总是比实际实现它要容易，所以我构建了一个[演示应用程序](https://rollup-native-modules-boilerplate.glitch.me/)，它使用了我在这里阐述的所有技术。
<figure style="margin:0;">
    <a href="https://rollup-native-modules-boilerplate.glitch.me/">
        <img srcset="https://wq.360buyimg.com/data/ppms/picture/native_javascript_modules_demo_1400w_82ff366688.png" src="https://wq.360buyimg.com/data/ppms/picture/native_javascript_modules_demo_1400w_82ff366688.png" alt="A demo app showing how to use native JavaScript modules with legacy browser support">
    </a>
</figure>

这个演示程序可以在不支持动态`import()`的浏览器中运行(如Edge 18和Firefox ESR)，也可以在不支持模块的浏览器中运行(如Internet Explorer 11)。

为了说明这个策略不仅适用于简单的用例，我还包含了当今复杂的JavaScript应用程序需要的许多特性:

* Babel转换（包括JSX）
* CommonJS的依赖关系（例如react，react-dom）
* CSS依赖项
* Asset hashing
* 代码拆分
* 动态导入（带有polyfill降级机制）
* module/nomodule降级机制

代码托管在[GitHub](https://github.com/philipwalton/rollup-native-modules-boilerplate)上(因此你可以派生repo并自己构建它)，而演示则托管在[Glitch](https://glitch.com/edit/#!/rollup-native-modules-boilerplate)上，因此你可以重新组合代码并使用这些特性。

最重要的是查看示例中使用的[Rollup配置](https://github.com/philipwalton/rollup-native-modules-boilerplate/blob/master/rollup.config.js)，因为它定义了如何生成最终模块。

# 总结
希望这篇文章让你相信，现在不仅可以在生产环境中部署原生JavaScript模块，而且这样做可以提高站点的加载和运行时性能。

以下是快速完成此工作所需步骤的摘要：
* 使用打包器，但要确保输出格式为ES2015模块
* 积极地进行代码拆分(如果可能的话，一直到node包)
* 预加载静态依赖关系图中的所有模块(通过`modulepreload`)
* 使用polyfill来支持不支持动态`import()`的浏览器
* 使用`<script nomodule>`支持根本不支持模块的浏览器

如果你已经在构建设置中使用了Rollup，我希望你尝试这里介绍的技术，并在生产环境中部署原生模块(带有代码拆分和动态导入)。如果你这样做了，请[告诉我](https://twitter.com/philwalton)进展如何，因为我既想听你的问题，也想听你的成功故事！

模块是JavaScript的明确未来，我希望我们所有的工具和依赖都能尽快包含模块。希望本文能在这个方向上起到一点推动作用。

> 译者评：
1.作者上一篇文章的译文：https://jdc.jd.com/archives/4911
2.另外一篇讲JavaScript原生模块的文章：https://www.jianshu.com/p/9aae3884b05b
