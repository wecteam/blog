---
title: CSS Houdini实现动态波浪纹
subtitle: CSS Houdini号称CSS领域最令人振奋的革新，它直接将CSS的API暴露给开发者，以往完全黑盒的浏览器解析流开始对外开放，开发者可以自定义属于自己的CSS属性，从而定制和扩展浏览器的展示行为。
cover: http://img12.360buyimg.com/jdphoto/s800x530_jfs/t1/74847/21/5179/217476/5d35b8afEa7d7bcb6/685be624382850e6.jpg
thumbnail: http://img12.360buyimg.com/jdphoto/s800x530_jfs/t1/74847/21/5179/217476/5d35b8afEa7d7bcb6/685be624382850e6.jpg
date: 2019-07-12 19:00:00
tags:
  - CSS
  - CSS Houdini
categories: Web开发
ckey: 22
author:
  nick: 黄浩群
  github_name: huanghaoqun
---

> 作者：黄浩群 

CSS Houdini 号称 CSS 领域最令人振奋的革新。CSS 本身长期欠缺语法特性，可拓展性几乎为零，并且新特性的支持效率太低，兼容性差。而 Houdini 直接将 CSS 的 API 暴露给开发者，以往完全黑盒的浏览器解析流开始对外开放，开发者可以自定义属于自己的 CSS 属性，从而定制和扩展浏览器的展示行为。
<!--more-->
## 背景

我们知道，浏览器在渲染页面时，首先会解析页面的 HTML 和 CSS，生成渲染树（rendering tree），再经由布局（layout）和绘制（painting），呈现出整个页面内容。在 Houdini 出现之前，这个流程上我们能操作的空间少之甚少，尤其是 layout 和 painting 环节，可以说是完全封闭，使得我们很难通过 polyfill 等类似的手段为欠支持的 CSS 特性提供兼容。而另一方面，语法特性的缺失也极大地限制了 CSS 的编程灵活性，社区中 sass、less、stylus 等 CSS 预处理技术的出现大多都源于这个原因，它们都希望通过预编译，突破 CSS 的局限性，让 CSS 拥有更强大的组织和编写能力。所以慢慢地，我们都不再手写 CSS，更方便、更灵活的 CSS 扩展语言成了 web 开发的主角。看到这样的情况，CSS Houdini 终于坐不住了。

## 什么是 CSS Houdini？

CSS Houdini 对外开放了浏览器解析流程的一系列 API，这些 API 允许开发者介入浏览器的 CSS engine 运作，带来了更多的 CSS 解决方案。

![](http://img10.360buyimg.com/wq/jfs/t1/68616/22/5220/46079/5d35ae6cE910a7d93/c4847bf0290cc197.png)

CSS Houdini 目前主要提供了以下几个 API：

#### CSS Properties and Values API

![](http://img10.360buyimg.com/wq/jfs/t1/62083/29/7239/130597/5d552adfE3e66fe18/f2cd80f6ff6b96ef.png)

允许在 CSS 中定义变量和使用变量，是目前支持程度最高的一个 API。CSS 变量以 `--` 开头，通过 `var()` 调用：

```css
div {
  --font-color: #9e4a9b;
  color: var(--font-color);
}
```

此外，CSS 变量也可以在其他节点中使用，只不过是有作用域限制的，也就是说自身定义的 CSS 变量只能被自身或自身的子节点使用：

```css
.container {
  --font-color: #9e4a9b;
}
.container .text {
  color: var(--font-color);
}
```

定义和使用 CSS 变量可以让我们的 CSS 代码变得更加简洁明了，比如我们可以单纯通过改变变量来改变 box-shadow 的颜色：

 ```css
.text {
  --box-shadow-color: #3a4ba2;
  box-shadow: 0 0 30px var(--box-shadow-color);
}
.text:hover {
  --box-shadow-color: #7f2c2b;
}
 ```

#### Painting API

![](http://img10.360buyimg.com/wq/jfs/t1/44659/25/7169/119642/5d552a70Ea58b14ae/de69915b1641efad.png)

允许开发者编写自己的 Paint Module，自定义诸如 background-image 这类的绘制属性。自定义的重点在于，"怎么画" 的逻辑需要我们来描述，因此我们利用 registerPaint 来描述我们的绘制逻辑：

```js
registerPaint('rect', class {
  paint(ctx, size, properties, args) {
    // @TODO
  }
});
```

registerPaint 方法注册了一个 Paint 类 rect 以供调用，这个类的核心在于它的 paint 方法。paint 方法用于描述自定义的绘制逻辑，它接收四个参数：

- `ctx`：一个 Canvas 的 Context 对象，因此 paint 中的绘制方式跟 canvas 绘制是一样的。
- `size`：包含节点的尺寸信息，同时也是 canvas 可绘制范围（画板）的尺寸信息。
- `properties`：包含节点的 CSS 属性，需要调用静态方法 `inputProperties` 声明注入。
- `args`: CSS 中调用 Paint 类时传入的参数，需要调用静态方法 `inputArguments` 声明注入。

编写完 Paint 类之后，我们在 CSS 中只需要这样调用，就能应用到我们自定义的绘制逻辑：

```css
.wrapper {
  background-image: paint(rect);
}
```

Painting API 目前在高版本 Chrome、Opera 浏览器已有支持，且实现起来比较简单，后边我们还将通过 demo 进一步演示。

#### Layout API

允许开发者编写自己的 Layout Module，自定义诸如 display 这类的布局属性。同样的，"如何布局" 的逻辑需要我们自己编写：

```js
registerLayout('block-like', class {
  layout(children, edges, constraints, properties, breakToken) {
    // @TODO
    return {
      // inlineSize: number,
      // blockSize: number,
      // autoBlockSize: number,
      // childFragments: sequence<LayoutFragment>
    }
  }
})
```

registerLayout 方法用于注册一个 Layout 类以供调用，它的 layout 方法用于描述自定义的布局逻辑，最终返回一个包含布局后的位置尺寸信息和子节点序列信息的对象，引擎将根据这个对象进行布局渲染。

同样的，调用时只需：

```css
.wrapper {
  display: layout('block-like');
}
```

因此利用 Layout API，你完全可以实现对 flex 布局的手工兼容。相比 Painting，Layout 的编写显得更加复杂，涉及到盒模型的深入概念，且支持度不高，这里就不细讲了。

#### Worklets

registerPaint、registerLayout 这些 API 在全局上并不存在，为什么可以直接调用呢？这是因为上述的 JS 代码并不是直接执行的，而是通过 Worklets 载入执行的。Worklets 类似于 Web Worker，是一个运行于主代码之外的独立工作进程，但比 Worker 更为轻量，负责 CSS 渲染任务是最合适的了。和 Web Worker 一样，Worklets 拥有一个隔离于主进程的全局空间，在这个空间里，没有 window 对象，却有 registerPaint、registerLayout 这些全局 API。因此，我们需要这样引入自定义 JS 代码：

```js
if ("paintWorklet" in CSS) {
  CSS.paintWorklet.addModule("paintworklet.js");
}
```

```js
if ("layoutWorklet" in CSS) {
  CSS.layoutWorklet.addModule("layoutworklet.js");
}
```


## 基础：三步用上 Painting API

我们来自定义 background-image 属性，它将用于给作用节点绘制一个矩形背景，背景色值由该节点上的一个 CSS 变量 `--rect-color` 指定。

#### 1、编写一个 Paint 类：

新建一个 paintworklet.js，利用 registerPaint 方法注册一个 Paint 类 rect，定义属性的绘制逻辑：

```js
registerPaint("rect", class {
  static get inputProperties() {
    return ["--rect-color"];
  }
  paint(ctx, geom, properties) {
    const color = properties.get("--rect-color")[0];
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, geom.width, geom.height);
  }
});
```

上边定义了一个名为 rect 的 Paint 类，当 rect 被使用时，会实例化 rect 并自动触发 paint 方法执行渲染。paint 方法中，我们获取节点 CSS 定义的 `--rect-color` 变量，并将元素的背景填充为指定颜色。由于需要使用属性 `--rect-color`，我们需要在静态方法 `inputProperties` 中声明。

#### 2、Worklets 加载 Paint 类：

HTML 中通过 Worklets 载入上一步骤实现的 paintworklet.js 并注册 Paint 类：

```html
<div class="rect"></div>
<script>
  if ("paintWorklet" in CSS) {
    CSS.paintWorklet.addModule("paintworklet.js");
  }
</script>
```

#### 3、使用 Paint 类：

CSS 中使用的时候，只需要调用 paint 方法：

```css
.rect {
  width: 100vw;
  height: 100vh;
  background-image: paint(rect);
  --rect-color: rgb(255, 64, 129);
}
```

可以看得出利用 CSS Houdini，我们可以像操作 canvas 一样灵活自如地实现我们想要的样式功能。

## 进阶：实现动态波纹

根据上述步骤，我们演示一下如何用 CSS Painting API 实现一个动态波浪的效果：

```html
<!-- index.html -->
<div id="wave"></div>

<style>
  #wave {
    width: 20%;
    height: 70vh;
    margin: 10vh auto;
    background-color: #ff3e81;
    background-image: paint(wave);
  }
</style>

<script>
  if ("paintWorklet" in CSS) {
    CSS.paintWorklet.addModule("paintworklet.js");

    const wave = document.querySelector("#wave");
    let tick = 0;  
    requestAnimationFrame(function raf(now) {
      tick += 1;
      wave.style.cssText = `--animation-tick: ${tick};`;
      requestAnimationFrame(raf);
    });
  }
</script>
```

```js
// paintworklet.js
registerPaint('wave', class {
  static get inputProperties() {
    return ['--animation-tick'];
  }
  paint(ctx, geom, properties) {
    let tick = Number(properties.get('--animation-tick'));
    const {
      width,
      height
    } = geom;
    const initY = height * 0.4;
    tick = tick * 2;

    ctx.beginPath();
    ctx.moveTo(0, initY + Math.sin(tick / 20) * 10);
    for (let i = 1; i <= width; i++) {
      ctx.lineTo(i, initY + Math.sin((i + tick) / 20) * 10);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.lineTo(0, initY + Math.sin(tick / 20) * 10);
    ctx.closePath();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
  }
})
```

paintworklet 中，利用 sin 函数绘制波浪线，由于 AnimationWorklets 尚处于实验阶段，开放较少，这里我们在 worklet 外部用 requestAnimationFrame API 来做动画驱动，让波浪纹动起来。完成后能看到下边这样的效果。

![](http://img11.360buyimg.com/jdphoto/jfs/t1/62725/39/5284/51731/5d370c8dE7f7aa85c/742a46388ea6a1c6.gif)

然而事实上这个效果略显僵硬，sin 函数太过于规则了，现实中的波浪应该是不规则波动的，这种不规则主要体现在两个方面：

##### 1）波纹高度（Y）随位置（X）变化而不规则变化

![](http://img14.360buyimg.com/jdphoto/s900x500_jfs/t1/40083/3/12170/6523/5d3671ebE5dd16e72/2b687d898da5cd39.jpg)

把图按照 x-y 正交分解之后，我们希望的不规则，可以认为是固定某一时刻，随着 x 轴变化，波纹高度 y 呈现不规则变化；

##### 2）固定某点（X 固定），波纹高度（Y）随时间推进而不规则变化

动态过程需要考虑时间维度，我们希望的不规则，还需要体现在时间的影响中，比如风吹过的前一秒和后一秒，同一个位置的波浪高度肯定是不规则变化的。

提到不规则，有朋友可能想到了用 Math.random 方法，然而这里的不规则并不适合用随机数来实现，因为前后两次取的随机数是不连续的，而前后两个点的波浪是连续的。这个不难理解，你见过长成锯齿状的波浪吗？又或者你见过上一刻 10 米高、下一刻就掉到 2 米的波浪吗？

为了实现这种连续不规则的特征，我们弃用 sin 函数，引入了一个包 simplex-noise。由于影响波高的有两个维度，位置 X 和时间 T，这里需要用到 noise2D 方法，它提前在一个三维的空间中，构建了一个连续的不规则曲面：

```js
// paintworklet.js
import SimplexNoise from 'simplex-noise';
const sim = new SimplexNoise(() => 1);

registerPaint('wave', class {
  static get inputProperties() {
    return ['--animation-tick'];
  }

  paint(ctx, geom, properties) {
    const tick = Number(properties.get('--animation-tick'));

    this.drawWave(ctx, geom, 'rgba(255, 255, 255, 0.4)', 0.004, tick, 15, 0.4);
    this.drawWave(ctx, geom, 'rgba(255, 255, 255, 0.5)', 0.006, tick, 12, 0.4);
  }
  
  /**
   * 绘制波纹
   */
  drawWave(ctx, geom, fillColor, ratio, tick, amp, ih) {
    const {
      width,
      height
    } = geom;
    const initY = height * ih;
    const speedT = tick * ratio;

    ctx.beginPath();
    for (let x = 0, speedX = 0; x <= width; x++) {
      speedX += ratio * 1;
      var y = initY + sim.noise2D(speedX, speedT) * amp;
      ctx[x === 0 ? 'moveTo' : 'lineTo'](x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.lineTo(0, initY + sim.noise2D(0, speedT) * amp);
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.fill();
  }
})
```

修改峰值和偏置项等参数，可以再画多一个不一样的波浪纹，效果如下，完工！

![](http://img10.360buyimg.com/wq/jfs/t1/53549/28/5908/185285/5d388198E26af6da0/3a083165ba78d400.gif)

## 参考文章

> [CSS Painting API Level 1](https://www.w3.org/TR/css-paint-api-1/)
> [CSS Layout API Level 1](https://www.w3.org/TR/2018/WD-css-layout-api-1-20180412/)
> [CSS 魔術師 Houdini API 介紹](https://blog.techbridge.cc/2017/05/23/css-houdini/)
