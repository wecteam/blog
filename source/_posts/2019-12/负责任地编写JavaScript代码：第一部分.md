---
title: 负责任地编写JavaScript代码：第一部分
date: 2019-12-13 16:25:29
tags:
	- Web性能优化
cover: https://img11.360buyimg.com/jdphoto/s900x383_jfs/t1/87996/40/6326/106389/5df34e12E2e3b2856/9018f5e7fbf8fc03.png
thumbnail: https://img11.360buyimg.com/jdphoto/s900x383_jfs/t1/87996/40/6326/106389/5df34e12E2e3b2856/9018f5e7fbf8fc03.png
categories: Web前端
---

> 原文地址：https://alistapart.com/article/responsible-javascript-part-1/
> 原文作者：Jeremy Wagner
> 译者：刘辉 
> 声明：本翻译仅做学习交流使用，转载请注明来源


从统计数据上看，[JavaScript是性能的关键](https://httparchive.org/reports/state-of-javascript#bytesJs)。以现在的趋势，中等大小的页面很快就会至少发送 400 KB 的 JavaScript，而这仅仅是传输时的大小，并且还是压缩后的。


不幸的是，虽然减少资源传输时间是整个性能的重要组成部分，但是压缩并不会影响浏览器处理整个脚本所需的时间。如果服务器发送了 400 KB 的压缩 JavaScript，则解压缩后浏览器需要处理的实际大小超过 1 MB。如何应对这些繁重的工作负载，取决于设备本身。 关于[各种设备如何处理大批量JavaScript](https://medium.com/@addyosmani/the-cost-of-javascript-in-2018-7d8950fbb5d4)的文章很多，但事实是，在不同的设备之间，即使是微不足道的处理时间也会有相差很大差距。
<!--more-->
以我的这个[一次性项目](https://devmode.jeremy.codes/)为例，该项目提供约 23 KB 的未压缩 JavaScript。 在 2017 年中的 MacBook Pro 上，Chrome 耗时约 25 毫秒。但是，在[诺基亚 2 Android](https://www.gsmarena.com/nokia_2-8513.php)手机上，该数字迅速增加到 190 毫秒。这不是很短的时间，但是在任何一种情况下，页面的交互速度都相当快。

现在有个大问题：你如何看待诺基亚 2 在这些普通页面上的表现呢？它有些卡，即使是网络连接很快，浏览网页也是一种耐心的练习，因为 JavaScript 驱动的网页会花费很长的时间。

![图1](https://img-blog.csdnimg.cn/20191126205451229.png)

图 1. 在一个页面上浏览诺基亚 2 Android 手机的性能时间表概述，其中过多的 JavaScript 阻塞了主线程。

尽管设备和网络都在不断进步，但是 JavaScript 的不断膨胀吞噬了这些收益。我们需要负责任地使用 JavaScript。首先要了解我们正在构建的内容以及构建方式。

## 「网站」和「应用」


怪异的命名可能让我们不能准确的认识事物的本质。蜜蜂和黄蜂差异很大，但是有时候我们会把蜜蜂说成黄蜂。然而蜜蜂是益虫，黄蜂不是。

网站和 WEB 应用程序的区别并不像黄夹克和蜜蜂之间的区别那么明显，但是如果把一个网站和一个功能齐全的 WEB 应用程序搞混，开发者和使用者都会非常痛苦。
如果你要为企业创建一个信息网站，则不太可能使用重量级的框架来管理DOM的变化或者使用客户端路由。使用不合适的工具不但会给用户造成损失，还会降低效率。

当我们构建一个 WEB 应用程序时，必须要注意：我们正在安装的模块可能会带来数百（甚至数千）个依赖，[其中一些甚至不确定是不是安全的](https://snyk.io/blog/malicious-code-found-in-npm-package-event-stream/)。 我们还要编写复杂的配置来打包。在这种疯狂却无处不在的开发环境中，我们需要摸清它们来确保构建的内容是快速且可访问的。 如果你对此不够了解，请在项目的根目录中运行 npm ls --prod，[看看是否能识别该列表中的所有内容](https://gist.github.com/malchata/dae0a011033846e2cb44d315b0496f0d)。即使这样，也不能保证第三方脚本完全没有问题，我相信您的网站中至少有一些这样的脚本。

我们很容易忘记，网站和 WEB 应用程序所处的环境是一样的。两者都承受着来自各种各样的网络和设备的相同的环境压力。当我们决定构建「应用程序」时，这些限制不会突然消失，用户的手机也不会获得神奇的新功能。

我们有责任评估谁在使用我们的产品，并认识到他们访问互联网的条件可能与我们预想的条件不同。我们需要知道我们要实现的目标，然后才可以构建出可以达到目标的产品，[即使构建起来并不令人兴奋](https://css-tricks.com/simple-boring/)。

这意味着需要重新评估对 JavaScript 的依赖，以及使用 JavaScript 的方式。排斥 HTML 和 CSS 会让我们走向不可持续的开发方式，从而损害性能和可访问性。

## 不要让框架迫使您陷入不可持续的模式

在团队合作中，我发现了一些奇怪的代码，这些团队依赖于框架来帮助他们提高生产力。这些奇怪代码的共同特征是会导致可访问性和性能变差。以下面的 React 组件为例：

```js
import React, { Component } from "react";
import { validateEmail } from "helpers/validation";

class SignupForm extends Component {
  constructor (props) {
    super(props);

    this.handleSubmit = this.handleSubmit.bind(this);
    this.updateEmail = this.updateEmail.bind(this);
    this.state.email = "";
  }

  updateEmail (event) {
    this.setState({
      email: event.target.value
    });
  }

  handleSubmit () {
    // If the email checks out, submit
    if (validateEmail(this.state.email)) {
      // ...
    }
  }

  render () {
    return (
      
        Enter your email:
        
        Sign Up
      
    );
  }
}

```

这里有一些值得注意的可访问性问题：

1. 不使用 form 元素的表单不是表单。确实，你可以通过在父 div 中指定 role="form" 来对此进行说明，但是如果您要构建表单（肯定看起来像一个表单），请使用具有适当操作和方法属性的 form 元素。 action 属性至关重要，因为它可以确保表单在缺少 JavaScript 的情况下仍然可以执行某些操作，当然，只要组件是由服务器呈现的。
   
2. span 元素不能替代 label 元素，label 元素能够提供可访问性而 span 元素不能。
   
3. 如果我们打算在提交表单之前在客户端做某事，那么我们应该将绑定到 button 元素的 onClick 的逻辑移到 form 元素的 onSubmit 上。

4. 顺便说一下，所有支持 HTML5 的浏览器，包括 IE10，都提供表单验证控件，为什么还要使用 JavaScript 来验证电子邮件地址？这里可以使用浏览器原生的验证功能，但请注意，要使其与屏幕阅读器配合使用，[还需要一点技巧](https://developer.paciellogroup.com/blog/2019/02/required-attribute-requirements/)。


5. 尽管不是可访问性问题，但是此组件不依赖任何状态或生命周期方法，这意味着可以将其重构为无状态功能组件，这样可以让 JavaScript 更少。

了解了这些内容，我们可以重构此组件：


```js
import React from "react";

const SignupForm = props => {
  const handleSubmit = event => {
    // Needed in case we're sending data to the server XHR-style
    // (but will still work if server-rendered with JS disabled).
    event.preventDefault();

    // Carry on...
  };
  
  return (
    <form method="POST" action="/signup" onSubmit={handleSubmit}>
      <label for="email" class="email-label">Enter your email:</label>
      <input type="email" id="email" required />
      <button>Sign Up</button>
    </form>
  );
};

```

现在这个组件不仅 JavaScript 减少了，而且可访问性也提高了很多。[浏览器为我们提供了很多免费的功能](https://alistapart.com/article/paint-the-picture-not-the-frame)，我们应该优先使用浏览器原生的功能。

这并不是说只有在使用框架时才会出现无法访问的模式，而是对 JavaScript 的唯一偏爱最终会在我们对 HTML 和 CSS 的理解上出现差距。这些知识鸿沟通常会导致我们甚至可能没有意识到的错误。框架是提高我们生产力的有用工具，但是无论我们选择使用哪种工具，核心网络技术的持续学习对于创造良好的体验都是必不可少的。

## 依靠 web 平台，您将走得更快，更远

当我们讨论框架问题时，必须说 web 平台本身就是一个强大的框架。如上一部分所示，我们可以更好地依靠已经成熟的模式和浏览器自身特性。重复造轮子来替代它们只会让我们自己更痛苦。

### 单页应用

开发者最容易掉入的陷阱之一就是盲目采用单页应用「SPA」模型，即使该模型不适合该项目。是的，通过 SPA 的客户端路由，用户确实可以获得更好的体验，但是你会失去什么呢？ 浏览器自己的导航功能（尽管是同步的）提供了很多好处。 比如，根据[规范](https://html.spec.whatwg.org/#the-history-interface)来管理历史记录。 没有 JavaScript 的用户（[无论是否由他们自己选择](https://kryogenix.org/code/browser/everyonehasjs.html)）都不会完全失去访问权限。 要使 SPA 在没有 JavaScript 的情况下仍然可用，服务器端渲染就成了你必须考虑的事情。

![图2](https://img-blog.csdnimg.cn/20191126215224436.png)

图2.慢网络环境下一个示例应用程序加载的比较。左侧的应用完全取决于 JavaScript 来呈现页面。右侧的应用程序在服务器上呈现响应，但随后使用客户端映射将组件附加到现有的服务器提供的标记上。

如果客户端路由无法让人们知道页面上的内容已更改，则可访问性也会受到损害。这会使那些依靠辅助技术浏览页面的人无法确定页面上发生了什么改变，解决这个问题是一项艰巨的任务。

然后是我们的老对手：系统开销。很多客户端路由库非常小，但是当你的项目使用[React](https://bundlephobia.com/result?p=react-dom@16.8.2)，[React Router](https://bundlephobia.com/result?p=react-router@4.3.1)，甚至再加上一个[状态管理库](https://bundlephobia.com/result?p=redux@4.0.1)作为基础时，你将接受大约135KB永远无法优化的代码。请仔细考虑这样的构建方式以及客户端路由是否真的有必要。通常情况下，能不用就不用。

如果担心导航性能，可以用 rel = prefetch 来预加载同源的文档。 预加载的文档在缓存中，跳转时立即可用，因此对改善页面的感知加载性能具有显著作用。由于预加载的优先级较低，因此它们与关键资源抢带宽的可能性也较小。

![图3](https://img-blog.csdnimg.cn/20191126220432689.png)

图3.在初始页面上预加载了 writing/ 的 HTML。 当用户请求 writing/ 时，会立即从浏览器缓存中加载其HTML。

链接预加载的主要缺点是你需要意识到它可能会造成浪费。 [Quicklink](https://github.com/GoogleChromeLabs/quicklink)是Google的一个很小的链接预加载脚本，它通过检查当前客户端是否处于慢网络环境或启用了[数据保护程序模式](https://support.google.com/chrome/answer/2392284?co=GENIE.Platform%3DAndroid&hl=en)，来判断是否进行预加载，并且默认情况下不进行跨域的预加载。


无论我们是否使用客户端路由，[Service workers](https://adactio.com/articles/13796) 可以极大地提升回头用户的体验。当我们[用 Service workers 预缓存路由](https://developers.google.com/web/ilt/pwa/caching-files-with-service-worker)时，我们将获得与链接预加载相同的好处，但是对请求和响应的控制程度更高。无论你是否将你的站点视为「应用程序」，向其添加Service workers都是当今存在的最负责任的 JavaScript 用法之一。

### JavaScript 并非布局难题的解决方案

如果我们打算通过安装第三方模块来解决布局问题，那应该先想想，“我到底要做什么？” CSS [旨在完成此工作](https://twitter.com/rachelandrew/status/1088870059240505344)，并且不需要任何抽象即可有效使用。 如今，JavaScript模块试图解决的大多数布局问题，例如盒子放置，对齐和调整大小，管理文本溢出，甚至整个布局系统，都可以使用 CSS 解决。 像 Flexbox 和 Grid 这样的现代布局引擎得到了很好的支持，因此我们不需要使用任何布局框架来作为构建项目的基础。CSS 本来就是框架。我们可以通过[feature queries](https://hacks.mozilla.org/2016/08/using-feature-queries-in-css/)，渐进式的增强布局，[这并不困难](https://hacks.mozilla.org/2016/08/using-feature-queries-in-css/)。

```js
/* Your mobile-first, non-CSS grid styles goes here */

/* The @supports rule below is ignored by browsers that don't
   support CSS grid, _or_ don't support @supports. */
@supports (display: grid) {
  /* Larger screen layout */
  @media (min-width: 40em) {
    /* Your progressively enhanced grid layout styles go here */
  }
}


```

使用 JavaScript 解决方案来解决布局和展示问题并不是什么新鲜事。 我们在 2009 年就是这么干的，网站在每个浏览器里看起来都应该完全一样，不管是在 IE6 里还是在更强大的浏览器里。 如果我们在 2019 年仍然追求这个，那应重新评估我们的开发目标。 总会有一些我们必须支持的浏览器无法完成那些现代浏览器所能完成的工作。 所有平台上的全部视觉均等只是徒劳的追求，[渐进增强](https://alistapart.com/article/understandingprogressiveenhancement)才是的主要目标。

## 我不是要杀死JavaScript

没错，我对 JavaScript 没有恶意。它给了我一份职业，而且，如果我对自己说实话，那将是十多年的享受之源。像任何长期的关系一样，我花的时间越多，对它的了解就越多。这是一种成熟的，功能丰富的语言，而且随着时间的流逝，它只会变得越来越有能力和更优雅。

但是，JavaScript 让我感到有些矛盾。我对 JavaScript 持批判的态度，或许更准确地说，我对于`把 JavaScript 作为构建 WEB 的首要手段的趋势`持批判态度。当我拆开一个捆成一团的圣诞树灯一样的东西时，很明显，JavaScript 已经泛滥成灾。

在后续的系列文章中，我将提供更多实用的建议来阻止过度的使用 JavaScript，以便为 WEB 构建的内容对每个地方的每个人都可用。一些建议是预防性的，一些则是以毒攻毒的，无论哪种，都是为了相同的目标。我相信我们所有人都喜欢 WEB，并希望通过 WEB 做正确的事，但是我希望我们思考如何使它对所有人更具弹性和包容性。