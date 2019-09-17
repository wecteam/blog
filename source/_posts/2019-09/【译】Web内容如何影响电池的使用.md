---
title: 【译】Web内容如何影响电池的使用
date: 2019-09-17 09:37:44
cover:  https://img11.360buyimg.com/jdphoto/s800x350_jfs/t1/56997/19/11003/158528/5d8039dcE9902aa49/f5c7d0573e9d1f97.jpg
thumbnail: https://img11.360buyimg.com/jdphoto/s800x350_jfs/t1/56997/19/11003/158528/5d8039dcE9902aa49/f5c7d0573e9d1f97.jpg
tags: 
  - web内容
  - 电池电量
  - 性能优化
categories: Web开发
---

> 原文地址：https://webkit.org/blog/8970/how-web-content-can-affect-power-usage/
> 原文作者：Benjamin Poulain & Simon Fraser
> 译者：刘辉    校验：李刚松


现在用户上网大多使用移动设备或者笔记本电脑。对这两者来说，电池寿命都很重要。在这篇文章里，我们将讨论影响电池寿命的因素，以及作为一个web开发者，我们如何让网页耗电更少，以便用户有更多时间来关注我们的内容。

# 是什么在耗电？

移动设备的电力消耗有以下几个因素：

* CPU （核心处理器）
* GPU （图形处理）
* 网络 （wifi或者蜂窝移动网络）
* 屏幕

屏幕功耗相对稳定，并且主要由用户控制（通过屏幕使用时间和亮度），但是对于其他组件，例如CPU，GPU，网络模块，功耗是动态变化的，而且变化范围很大。
<!--more-->
系统根据当前正在处理的任务调整CPU和GPU性能，包括在Web浏览器中用户正在交互的网页以及使用Web内容的其他应用程序。这是通过打开或关闭某些组件以及通过更改其时钟频率来完成的。总的来说，芯片所需的性能越高，其功率效率就越低。硬件可以非常快速地提升到高性能（但是需要很大的功率），然后迅速恢复到更高效的低功耗状态。

# 良好用电的一般原则

为了最大限度地延长电池寿命，你必须尽量减少硬件处于高功率状态的时间，让硬件尽可能的处于空闲状态。

对于web开发者来说，有三种交互场景需要注意：

* 用户主动与内容交互
* 页面处于前台，但是用户没有交互
* 页面处于后台

### 高效的用户交互

用户交互的时候肯定会耗电。页面需要快速的加载，并且能够快速的响应触摸。在大多数场景中，减少首次渲染时间也会降低功耗。不过，在初始页面加载后继续加载资源和运行脚本时要小心。我们要尽快让系统返回空闲状态。总的来说，浏览器已经完成了布局和渲染，js执行的越少，耗电越少。

一旦页面加载完，用户可能会滚屏或者点击页面，这同样会产生耗电（主要是CPU和GPU）,这是必要的消耗。要确保尽快返回空闲状态。并且，最好使用浏览器本身提供的功能。- 举例：普通的页面滚动肯定比用js自定义的滚动更高效。

### 让空闲状态耗电趋向于零

当用户没有和页面交互时，尽可能的使页面不耗电，例如：

* 尽量少用定时器以避免唤醒CPU,可以把基于定时器的任务合并，使用尽可能少的定时器。大量滥用定时器会导致CPU被频繁唤醒，这比把这些任务合并处理要糟糕的多。
* 最大限度地减少动画内容，如动画图像和自动播放视频。要特别注意"loading"用的gif图片或css动画，这些动画会不断触发渲染，即使看不到也会触发。[IntersectionObserver](https://webkit.org/blog/8582/intersectionobserver-in-webkit/)可以用来在可见时才运行动画。
* 尽量用css做动画和过渡，这些动画不可见时，浏览器会进行优化，并且css动画比js动画要高效的多。
* 避免通过轮询来获取服务器更新，可以用websocket或者持久连接来代替轮询。

看起来处于空闲状态的页面，如果正在后台进行工作，其用户交互的响应效率也会降低，因此最小化后台活动也可以提高响应能力以及电池寿命。

### 页面在后台时CPU零使用

这几种场景时，页面变为非活动状态(不是用户的首要焦点)，例如：

* 用户切换到其他tab
* 用户切换到其他app
* 浏览器窗口最小化
* 浏览器窗口失去焦点
* 浏览器窗口在其他窗口后面
* 窗口所在的空间不是当前空间（MacOS才有空间的概念）

当页面不活动时，webkit会自动做以下处理来减少耗电：

* 停止调用requestAnimationFrame
* CSS和SVG动画会暂停
* 定时器会节流
  
此外，WebKit利用操作系统提供的能力来最大限度地提高效率：

* 在iOS上，不用的选项卡(tab页)会完全暂停。
* 在macOS上，选项卡会响应[App Nap](https://developer.apple.com/library/archive/documentation/Performance/Conceptual/power_efficiency_guidelines_osx/AppNap.html)功能，这意味着不可视更新的选项卡的Web进程优先级较低，并且其计时器会做节流处理。

但是，页面可以通过计时器（setTimeout和setInterval），消息，网络事件等触发CPU唤醒。页面在后台时应避免这些唤醒，有两个API对此有用：

* [页面可见性API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)提供了一种响应页面转换为后台或前台的方法。这是一种避免页面在后台时更新UI的好方法。用visibilitychange事件，在页面可见时更新页面内容。
* 页面失去焦点时会发出blur事件。这时，页面依然可见，但是不是聚焦窗口。可以考虑暂停动画。
  
查找问题最简单的方式就是用浏览器控制台的时间线功能。页面在后台时，时间线记录中不应该有任何事件发生。

# 找到问题所在

现在我们知道了web页面主要的耗电因素，并且给出了一些创建高效页面的一般规则。 接下来讨论一下怎样找出并解决导致功耗过大的问题。

### 脚本

如上所述，现代CPU能够把功率从空闲态的非常低提升到非常高来满足用户交互和其他任务的要求。 也正因为如此，CPU是导致电池寿命减少的主要原因。页面加载期间CPU要做一连串工作包括加载、解析、渲染资源，并且执行js。在大多数现代web页面上，执行js花费的时间远远高出浏览器用在其余加载过程中花费的时间。因为尽量减少js执行时间对省电有最大的效益。

测量CPU使用的最佳方法是使用Web Inspector，就像之前文章里所说的，时间线面板可以显示任意选定时间范围内的CPU活动。

![Web-Inspector-CPU-Timeline-Overview-Dark](https://webkit.org/wp-content/uploads/Web-Inspector-CPU-Timeline-Overview-Dark.png)

为了高效地使用CPU，WebKit尽可能在多核上分配工作（使用Workers的页面也可以使用多核）。Web Inspector提供与页面主线程同时运行的线程的细分图表。例如，以下屏幕截图显示了滚动具有复杂渲染和视频播放的页面时的线程：

![Power-heavy-website-light](https://webkit.org/wp-content/uploads/Power-heavy-website-light.png)

在寻找优化点时，应关注主线程，因为js运行在主线程上（除非您正在使用Workers）。我们可以使用时间线面板的 “JavaScript and Events” 项来了解触发脚本的内容。也许你在响应用户或滚动事件或从requestAnimationFrame触发隐藏元素的更新时做了太多工作。你需要了解你在页面上使用的JavaScript库和第三方脚本所做的工作。如果要深入挖掘，你可以使用Web Inspector的[JavaScript profiler](https://webkit.org/blog/6539/introducing-jscs-new-sampling-profiler/)来查看时间都用在哪些地方。

“WebKit线程”中的活动主要由与JavaScript相关的工作触发：JIT编译和垃圾收集。因此减少运行的脚本数量并减少短生命周期的JavaScript对象可以降低webkit线程的活动。

WebKit调用的各种其他系统框架都使用线程，“Other thread” 包括了这些工作; “Other thread” 最主要的工作是渲染，我们将在下面讨论。

### 渲染

主线程CPU使用也可以通过大量布局和绘制来触发；这些通常由脚本触发，但是除了transform，opacity和filter之外的属性的CSS动画也可以触发它们。查看时间线面板的 “Layout and Rendering” 项将帮助你了解导致活动的原因。

如果 “Layout and Rendering” 显示的渲染过程不能清楚展示页面正在发生什么变化，可以启用 [Paint Flashing](https://developer.mozilla.org/en-US/docs/Tools/Paint_Flashing_Tool)：

![Enable-Paint-Flashing-dark](https://webkit.org/wp-content/uploads/Enable-Paint-Flashing-dark.png)

这部分渲染将用红色背景的高亮显示，你可以滚动页面查看。注意，WebKit会保留一些“透视”图块以允许平滑滚动，因此视口中不可见的图形仍然可以正常工作以使屏幕外图块保持最新。如果渲染展示在时间轴中，说明它正在工作。

除了导致CPU耗电外，渲染通常还会触发GPU工作。macOS和iOS上的WebKit使用GPU进行渲染，因此触发渲染可以显着增加耗电。额外的CPU使用通常显示在时间线面板 “CPU” 项中的 “Other threads” 下。

GPU还用于canvas渲染，包括2D画布和WebGL / WebGPU。为了最小限度使用绘图，canvas上显示的内容没有变化时不要调用canvas API，并尝试优化canvas绘制代码。


许多Mac笔记本电脑都有两个GPU，一个与CPU相同内核的集成GPU，功能不强但功耗低，一个功能更强大但是功耗也更高的独立GPU。 WebKit默认使用集成GPU；你可以使用[powerPreference](https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2.1)上下文创建参数请求独立GPU，但只有在你可以证明电源成本合理时才执行此操作。

### 网络

无线网络会以意想不到的方式影响电池寿命。手机有功能更强大的无线模块（WiFi和蜂窝网络芯片）和更小的电池，因此受到的影响最大。 遗憾的是，在实验室外测量网络的功率影响并不容易，但可以通过遵循一些简单的规则来减少。

降低网络功耗的最直接方法是最大限度地利用浏览器的缓存。 减少页面加载时间的所有最佳实践也可以通过减少无线模块需要打开的时间来使电池受益。

另一个重要方面是在时间上将网络请求组合在一起。每当有新请求到来时，操作系统都需要打开无线模块，连接到基站或蜂窝塔，并传输字节。在发送分组之后，在发送更多分组的情况下，无线电保持供电少量时间。

如果页面非经常性的发送少量数据，则开销可能会大于传输数据所需的能量。

![Networking-Power-Overhead-of-two-small-transmissions](https://webkit.org/wp-content/uploads/Networking-Power-Overhead-of-two-small-transmissions.png)

可以从 Web Inspector 的时间线面板的 “Network Requests” 项中发现此类问题。例如，以下屏幕截图显示了几秒钟内发送的四个单独请求：

![Network-requests-should-be-grouped-dark](https://webkit.org/wp-content/uploads/Network-requests-should-be-grouped-dark.png)

同时发送所有请求将提高网络用电效率。


# 总结

我们可以对网页做很多优化来延长电池寿命。

在Web Inspector中测量对电池影响并降低损耗非常重要。 这样做可以改善用户体验并延长电池寿命。

提高电池寿命的最直接方法是最大限度地降低CPU使用率。 新的Web Inspector提供了强大的工具可以全程监控。

为了让电池寿命更长，我们要：

* 在空闲时将CPU使用率降至零
* 在用户交互期间最大化性能以快速恢复空闲