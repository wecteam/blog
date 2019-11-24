---
title: Interection Observer如何观察变化
date: 2019-11-24 21:45:02
tags:
	- Interection Observer
cover: https://img11.360buyimg.com/jdphoto/s900x383_jfs/t1/79241/26/15985/79010/5dda8bffEe806263e/adf0d39a44140eaa.png
thumbnail: https://img11.360buyimg.com/jdphoto/s900x383_jfs/t1/79241/26/15985/79010/5dda8bffEe806263e/adf0d39a44140eaa.png
categories: Web前端
---

> 原文地址：https://css-tricks.com/an-explanation-of-how-the-intersection-observer-watches/
> 原文作者：Travis Almand
> 翻译：刘辉

有很多精彩的文章探讨了如何使用`Intersection Observer API`，包括Phil Hawksworth，Preethi和Mateusz Rybczonek等。 我这篇文章将讲一些不一样的东西。 我在今年早些时候有幸向达拉斯VueJS聚会介绍了VueJS过渡组件，我在CSS-Tricks的第一篇文章就是以此为基础的。 在演讲的问答环节中，有人问我基于滚动事件触发过渡怎么样 - 我说当然可以，但是一些听众建议我了解一下`Intersection Observer`。

这让我开始思考。我对`Intersection Observer`有基本的了解，并且能够用其完成简单的示例。 我是否知道它的工作原理而不仅仅是使用它？它到底为我们开发人员提供了什么？ 作为一个资深开发者，我如何向新手甚至不知道它存在的开发者解释它的工作原理？
<!--more-->
在花了一些时间进行研究，测试和验证后，我决定分享自己学到的东西。

## Intersection Observer 简述

W3C公共工作草案摘要（日期为2017年9月14日的初稿）将`Intersection Observer API`描述为：

> 本规范描述了一个API，可用于了解DOM元素（`targets`）相对于包含元素或顶级视口（`root`）的可见性和位置。 该位置是异步传递的，对于理解元素的可见性以及实现DOM内容的预加载和延迟加载很有用。

这个API的总体思路是提供一种观察子元素并在其进入其父元素之一的边界框内时得到通知的方法。 目标元素滚动到根元素视图中时最常用。 在引入`Intersection Observer`之前，此类功能是通过侦听滚动事件来完成的。

尽管`Intersection Observer`是针对此类功能的更高性能的解决方案，但我不建议我们将其视为滚动事件的替代品。 相反，我建议我们将此API视为与滚动事件在功能上互补的额外工具。 在某些情况下，两者可以一起解决特定的问题。

## 基本示例

我知道我有可能重复其他文章中已经讲过的内容，不过还是让我们先来看一个`Intersection Observer`的基本示例及其提供的能力。

Observer由四部分组成：

1. `root`，是观察者所绑定的父元素，可以是viewport
2. `target`，它是被观察的子元素，可以有多个
3. `options`对象，它定义了观察者某些方面的行为
4. 回调函数，每次观察到父子元素的交集变化时都会调用


基本示例的代码如下所示：

```js
const options = {
  root: document.body,
  rootMargin: '0px',
  threshold: 0
}

function callback (entries, observer) {
  console.log(observer);

  entries.forEach(entry => {
    console.log(entry);
  });
}

let observer = new IntersectionObserver(callback, options);
observer.observe(targetElement);

```
代码的第一部分是`options`对象，它具有`root`，`rootMargin`和`threshold`属性。

`root`是父元素，一般是有滚动条的元素，其中包含被观察的元素。根据需要，这几乎可以是页面上的任何单个元素。如果不提供该属性，或者该值设置为null，跟元素就是viewport。

`rootMargin`描述了根元素的外边距，由`rootMargin`规定的矩形的每一边都会被添加至root元素的边框盒(bounding box)的相应边。它的行为很像CSS margin属性。你可以使用类似10px 15px 20px的值，这使我们的顶部边距为10px，左侧和右侧边距为15px，底部边距为20px。仅边界框受影响，元素本身不受影响。请记住，唯一允许的长度是像素和百分比值，可以是负数或正数。另请注意，如果root元素不是页面上的实际元素（例如viewport），则`rootMargin`无效。

`threshold`是用于确定何时触发交集改变事件的值。数组中可以包含多个值，以便同一目标可以多次触发交集改变事件。不同的值是使用0到1的百分比，非常类似于CSS中的不透明度，因此将0.5的值视为50％，依此类推。这些值与目标的交叉比例有关，稍后将对其进行说明。阈值为0时，目标元素的第一个像素与根元素相交就会触发交集改变事件。阈值为1时，整个目标元素都在根元素内部时才会触发交集改变事件。


代码的第二部分是回调函数，只要观察到交集改变，就会调用该函数。传递了两个参数；`entries`是个数组，代表触发交集更改的每个目标元素。这提供了很多信息为开发人员所用。第二个参数是有关观察者本身的信息。如果目标绑定到多个观察者，可以通过此参数识别是哪个观察者。

代码的第三部分是观察者本身的创建以及观察对象。创建观察者时，回调函数和`options`对象可以放在观察者外部。 如果需要，可以在多个观察者之间使用相同的回调和`options`对象。然后，将需要观察的目标元素传递给`observe()`方法。它只能接受一个目标，但是可以在同一观察者上针对多个目标重复调用该方法。

注意代码中的console.log，可以看看控制台输出了什么。

### 观察者对象

传递给回调函数的观察者数据如下：

```js
IntersectionObserver
  root: null
  rootMargin: "0px 0px 0px 0px"
  thresholds: Array [ 0 ]
  <prototype>: IntersectionObserverPrototype { }

```

...本质上是创建对象时传递给观察者的选`options`对象。 这可用于确定相交所绑定的根元素。 注意即使原始选项对象的`rootMargin`值为0px，该对象也将其转为0px 0px 0px 0px，这是CSS边距规范所需要的。然后是观察者正在使用的一系列阈值。

### entry对象

传递给回调函数的`entry`对象数据如下：

```js
IntersectionObserverEntry
  boundingClientRect: DOMRect
    bottom: 923.3999938964844, top: 771
    height: 152.39999389648438, width: 411
    left: 9, right: 420
    x: 9, y: 771
    <prototype>: DOMRectPrototype { }
  intersectionRatio: 0
  intersectionRect: DOMRect
    bottom: 0, top: 0
    height: 0, width: 0
    left: 0, right: 0
    x: 0, y: 0
    <prototype>: DOMRectPrototype { }
  isIntersecting: false
  rootBounds: null
  target: <div class="item">
  time: 522
  <prototype>: IntersectionObserverEntryPrototype { }

```

可以看到，这里做了很多工作。

对于大多数开发人员而言，最可能有用的两个属性是`intersectionRatio`和`isIntersecting`。 `isIntersecting`属性是一个布尔值，在交集更改时目标元素与根元素是否相交。`intersectionRatio`是当前与根元素相交的目标元素的百分比。它也是零到一之间的百分比表示，非常类似于观察者的`options`对象中`threshold`。

三个属性（`boundingClientRect`，`intersectionRect`和`rootBounds`）表示交集相关的三个方面的具体数据。 `boundingClientRect`属性为目标元素的边界框提供从viewport左上角开始的bottom，left，right和top值，就像`Element.getBoundingClientRect()`一样。然后，将目标元素的高度和宽度作为X和Y坐标提供。 `rootBounds`属性为根元素提供相同形式的数据。`intersectionRect`提供相似的数据，它描述了由目标元素在根元素内部的相交区域形成的矩形，该区域也被用于计算`intersectionRatio`值。传统的滚动事件需要手动完成此计算。

要注意的是，代表这些不同元素的所有这些形状始终都是矩形。无论所涉及元素的实际形状如何，它们总是会缩小到包含该元素的最小矩形。

`target`属性是指正在观察的目标元素。在观察者包含多个目标的情况下，这是确定哪个目标元素触发了此相交更改的简便方法。

`time`属性提供从首次创建观察者到触发此交集改变的时间（以毫秒为单位）。通过这种方式，你可以跟踪观看者遇到特定目标所花费的时间。即使稍后将目标再次滚动到视图中，此属性也会提供新的时间。这可用于跟踪目标进入和离开根元素的时间。

除了每次观察到交集改变时我们可以获得这些信息外，观察者第一次启动时也会向我们提供这些信息。例如，在页面加载时，页面上的观察者将立即调用回调函数，并提供它正在观察的每个目标元素的当前状态。

`Intersection Observer`以非常高效的方式提供了有关页面上元素之间关系的数据。

## Intersection Observer 可用的方法

Intersection Observer 主要有三个方法：observe()，unobserve()和disconnect()。

* observe()：observe方法用来添加观察者要监视的目标元素。 观察者可以具有多个目标元素，但是此方法一次只能接受一个目标。
* unobserve()：unobserve方法用来从观察的元素列表中移除元素。
* disconnect()：disconnect方法用来停止观察其所有目标元素。观察者本身仍处于活动状态，但没有目标。在disconnect()之后，目标元素仍然可以通过observe()传递给观察者。

这些方法提供了监视和取消监视目标元素的功能，但是一旦创建，便无法更改传递给观察者的`options`对象。 如果需要修改，则必须手动重新创建观察者。

## Intersection Observer和滚动事件的性能对比

在探索Intersection Observer以及将其与使用滚动事件进行比较时，我需要进行一些性能测试。我只想大致了解两者之间的性能差异，为此我创建了三个简单的测试。

首先，我创建了一个样本HTML文件，该文件包含一百个设置了高度的div，以此创建一个长滚动页面。把页面放在静态服务器上，然后我用Puppeteer加载了HTML文件，启动了跟踪，让页面以预设的增量向下滚动到底部，一旦到达底部，就停止了跟踪，最后保存跟踪的结果。这样测试可以重复多次并输出每次的结果数据。然后，我复制了样本HTML，并为要运行的每种测试类型在脚本标签中编写了js。每个测试都有两个文件：一个用于`Intersection Observer`，另一个用于滚动事件。

所有测试的目的是检测目标元素何时以25％的增量向上滚动通过视口。每次增加时，都会应用CSS类来更改元素的背景颜色。换句话说，每个元素都应用了DOM修改，这将触发重绘。每次测试都在两台不同的计算机上运行了五次：我的开发用的Mac是最新的设备，而我的个人Windows 7计算机可能是当前的平均水平。记录脚本，渲染，绘画和系统的跟踪结果，然后取平均值。


第一个测试有一个观察者或一个滚动事件，每个事件都有一个回调。对于观察者和滚动事件，这是一个相当标准的设置。尽管在这种情况下，滚动事件还有很多工作要做，因为滚动事件试图模仿观察者默认提供的数据。完成所有这些计算后，就像观察者一样，将数据存储在条目数组中。然后，在两者之间删除和应用类的功能完全相同。另外我使用了`requestAnimationFrame`对滚动事件进行了节流处理。

第二个测试有100个观察者或100个滚动事件，每种类型都有一个回调。每个元素都分配有自己的观察者和事件，但回调函数相同。这实际上是低效的，因为每个观察者和事件的行为都完全相同，但是我想要一个简单的压力测试，而不必创建100个唯一的观察者和事件-尽管我已经看到了许多以这种方式使用观察者的示例。

第三次测试具有100个观察者或100个滚动事件，每种类型具有100个回调。这意味着每个元素都有其自己的观察器，事件和回调函数。当然，这是极其低效的，因为这是存储在巨大阵列中的所有重复功能。但是这种低效率是该测试的重点。

![Intersection Observer和滚动事件的压力测试对比](https://res.cloudinary.com/css-tricks/image/upload/c_scale,w_1165,f_auto,q_auto/v1568831070/observer-01_wzz6he.png)


在上面的图表中，你可以看到，第一列代表我们的基准，根本没有运行JavaScript。接下来的两列代表第一种测试类型。 Mac的运行都非常好，符合我对开发用高端计算机的预期。 Windows机器给了我们一个不一样的结果。对我来说，主要的兴趣点是红色所代表的脚本。在Mac上，观察者的差异约为88毫秒，而滚动事件的差异约为300毫秒。在Mac上，每种测试的总体结果都相当接近，但是脚本在滚动事件方面表现出色。对于Windows机器，它要差得多得多。观察者大约是150毫秒，而第一次和最简单的测试是1400毫秒。

对于第二个测试，我们开始看到滚动测试的效率变得更加明显。 Mac和Windows机器都运行了观察者测试，结果与以前几乎相同。对于滚动事件测试，脚本陷入了更多困境，无法完成给定的任务。 Mac跃升到几乎一整秒的脚本编写时间，而Windows计算机跃升到惊人的3200ms。

对于第三次测试，情况没有变坏。结果与第二项测试大致相同。要注意的一件事是，在所有三个测试中，观察者的结果对于两台计算机都是一致的。尽管没有为提高观察者测试的效率做出任何优化，但`Intersection Observer`的性能表现还是远远超过了滚动事件。

因此，在我自己的两台机器上进行了非科学性测试之后，我感到对滚动事件和`Intersection Observer`之间的性能差异有一个不错的了解。 我敢肯定，我可以通过一些努力使滚动事件更有效，但这值得吗？ 在某些情况下，滚动事件的精度是必需的，但是在大多数情况下，`Intersection Observer`就足够了-尤其是因为它看起来更加高效，而无需付出任何努力。

## 搞清intersectionRatio属性

`IntersectionObserverEntry`给我们提供的`intersectionRatio`属性，表示目标元素在交集更改上的根元素边界内的百分比。 我发现我一开始不太了解这个值的实际含义。 由于某种原因，我认为这是目标元素外观的一种简单的0％到100％的表示形式。 它与创建时传递给观察者的阈值相关。 例如，它可用于确定哪个阈值是刚刚触发相交更改的原因。 但是，它提供的值并不总是很简单。

以这个demo为例：

  [demo](https://codepen.io/talmand/embed/VwZXpaj?height=632&theme-id=1&default-tab=result&user=talmand&slug-hash=VwZXpaj&pen-title=Intersection%20Observer%3A%20intersectionRatio&name=cp_embed_1)

在此demo中，已为观察者分配了父容器作为根元素。 具有目标背景的子元素已分配为目标元素。 已创建阈值数组，其中包含100个条目，其顺序为0、0.01、0.02、0.03，依此类推，直到1。观察者触发目标元素在根元素内部出现或消失的每一个百分比，以便每当比率 更改至少百分之一，此框下方的输出文本将更新。 如果您感到好奇，可以使用以下代码来完成此阈值：

```js
[...Array(100).keys()].map(x => x / 100) }
```

我不建议你以这种方式为项目中的具体用途设置阈值。

首先，目标元素完全包含在根元素中，并且按钮上方的输出将显示比率1。它应该是第一次加载的，但是我们很快就会发现该比率并不总是精确的；该数字可能在0.99到1之间。这似乎很奇怪，但是有可能发生，因此，如果你对等于特定值的比率进行检查，请记住这一点。

单击“left”按钮将使目标元素向左转换，以使其一半在根元素中，另一半不在。然后，ratioRatio应该更改为0.5，或者接近0.5。现在我们知道目标元素的一半与根元素相交，但是我们不知道它在哪里。以后再说。

单击“top”按钮具有相同的功能。它将目标元素转换为根元素的顶部，并再次将其移入和移出。再一次，交集比率应该在0.5左右。即使目标元素位于与以前完全不同的位置，结果比率也相同。

再次单击“corner”按钮，会将目标元素转换为根元素的右上角。此时，目标元素中只有四分之一位于根元素内。intersectionRatio应以大约0.25的值反映出来。单击“center”会将目标元素转换回中心并完全包含在根元素中。

如果单击“large”按钮，则将目标元素的高度更改为高于根元素。相交比应为0.8左右。这是依赖intersectionRatio的棘手部分。根据提供给观察者的阈值创建代码可以使阈值永远不会触发。在此“large”示例中，基于阈值1的任何代码都将无法执行。还要考虑可以调整根元素大小的情况，例如将视口从纵向旋转为横向。


## 查找位置

那么，我们如何知道目标元素相对于根元素的位置呢？此数据由`IntersectionObserverEntry`提供，因此我们只需要进行简单的比较即可。

看这个demo:

[demo2](https://codepen.io/talmand/embed/dybmvZN?height=631&theme-id=1&default-tab=result&user=talmand&slug-hash=dybmvZN&pen-title=Intersection%20Observer%3A%20Finding%20the%20Position&name=cp_embed_2)


该演示的设置与之前的设置大致相同。 父容器是根元素，内部具有目标背景的子容器是目标元素。 阈值是一个0、0.5和1的数组。在根元素中滚动时，将出现目标，并且其位置将在按钮上方的输出中报告。

下面执行这些检查的代码：

```js
const output = document.querySelector('#output pre');

function io_callback (entries) {
  const ratio = entries[0].intersectionRatio;
  const boundingRect = entries[0].boundingClientRect;
  const intersectionRect = entries[0].intersectionRect;

  if (ratio === 0) {
    output.innerText = 'outside';
  } else if (ratio < 1) {
    if (boundingRect.top < intersectionRect.top) {
      output.innerText = 'on the top';
    } else {
      output.innerText = 'on the bottom';
    }
  } else {
    output.innerText = 'inside';
  }
}

```

我应该指出，我没有遍历entrys数组，因为我知道总是只有一个条目，因为只有一个目标。我走了捷径，使用`entries[0]`。

您会发现比率为零会将目标置于“外部”。小于1的比率将其放在顶部或底部。这样一来，我们就可以查看目标的“顶部”是否小于交集矩形的顶部，这实际上意味着目标在页面上更高，并被视为“顶部”。实际上，检查根元素的“顶部”也可以解决此问题。从逻辑上讲，如果目标不在顶部，则它必须在底部。如果比率恰好等于1，则它在根元素“内部”。除了使用left或right属性检查水平位置外，其他检查方法相同。

这是高效使用`Intersection Observer`的一部分。开发人员无需在节流的滚动事件上从多处请求此数据，然后进行计算。它是由观察者提供的，所需要的只是一个简单的if检查。

首先，目标元素要比根元素高，因此永远不会将其报告为“内部”。单击“切换目标大小”按钮以使其小于根。现在，上下滚动时目标元素可以位于根元素内部。

通过再次单击“toggle target size”，然后单击“toggle root size”按钮，将目标元素恢复为其原始大小。这将调整根元素的大小，使其比目标元素高。再次，当上下滚动时，目标元素可能位于根元素内部。

此demo演示了有关`Intersection Observer`的两件事：如何确定目标元素相对于根元素的位置以及调整两个元素的大小时会发生什么。这种对调整大小的响应让我们看到了`Intersection Observer`相对于滚动事件的另一个优势-不用再单独处理resize事件。


## 创建位置粘性事件

[CSS position属性的“sticky”](https://css-tricks.com/almanac/properties/p/position/#article-header-id-3)是一个有用的功能，但在CSS和JavaScript方面却有一些限制。粘性节点的样式只能是一种设计，无论是处于其正常状态还是处于其粘性状态内。没办法让js知道这些变化。到目前为止，还没有伪类或js事件使我们知道元素的状态变化。

我已经看到了使用滚动事件和`Intersection Observer`进行粘性定位事件的示例。使用滚动事件的解决方案始终存在与将滚动事件用于其他目的相似的问题。观察者的通常解决方案是用一个定位元素，仅作为观察者的目标元素使用。我喜欢避免使用诸如此类的单一目的的元素，因此我决定修改这个特定的想法。

在此demo中，上下滚动以查看章节标题对各自章节的粘性反应。

[demo3](https://codepen.io/talmand/embed/ExYLayz?height=400&theme-id=1&default-tab=result&user=talmand&slug-hash=ExYLayz&pen-title=Intersection%20Observer%3A%20Position%20Sticky%20Event&name=cp_embed_3)

这个示例检测粘性元素何时位于滚动容器顶部，然后给其添加一个css类。 这是通过在给观察者特定的`rootMargin`时利用DOM的一个有趣的特性来实现的。 给出的值是：

```js
rootMargin: '0px 0px -100% 0px'
```

这样会将根边界的底部边缘推到根元素的顶部，从而留下一小部分可用于相交检测的零像素区域。 可以说，即使目标元素碰触到零像素区域，也会触发相交变化，即使它不存在于数字中也是如此。 考虑一下，我们可以在DOM中具有折叠高度为零的元素。

该解决方案通过识别粘性元素始终位于根元素顶部的“粘性”位置来利用这一优势。 随着滚动的继续，粘性元素最终移出视野，并且相交停止。 因此，我们根据输入对象的`isIntersecting`属性添加和删除类。

下面是HTML：

```HTML
<section>
  <div class="sticky-container">
    <div class="sticky-content">
      <span>&sect;</span>
      <h2>Section 1</h2>
    </div>
  </div>

  {{ content here }}

</section>

```

class为`sticky-container`的外部div是观察者的目标。 该div将被设置为粘性元素并充当容器。 用于根据粘性状态设置样式和更改元素的元素是class为`sticky-content`的div及其子元素。 这样可以确保实际的粘性元素始终与根元素顶部缩小的`rootMargin`接触。

下面是CSS：

```css
.sticky-content {
  position: relative;
  transition: 0.25s;
}

.sticky-content span {
  display: inline-block;
  font-size: 20px;
  opacity: 0;
  overflow: hidden;
  transition: 0.25s;
  width: 0;
}

.sticky-content h2 {
  display: inline-block;
}

.sticky-container {
  position: sticky;
  top: 0;
}

.sticky-container.active .sticky-content {
  background-color: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 10px;
}

.sticky-container.active .sticky-content span {
  opacity: 1;
  transition: 0.25s 0.5s;
  width: 20px;
}
```

你会看到`.sticky-container`在top为0的位置创建了我们的粘滞元素。 其余部分是`.sticky-content`中的常规状态和`.active .sticky-content`中的粘滞状态样式的混合。 同样，您几乎可以在粘性内容div中做任何您想做的事情。 在此demo中，当粘滞状态处于活动状态时，在延迟的过渡中会出现一个隐藏的章节符号。没有`Intersection Observer`之类的辅助手段，很难达到这种效果。

JavaScript：

```js
const stickyContainers = document.querySelectorAll('.sticky-container');
const io_options = {
  root: document.body,
  rootMargin: '0px 0px -100% 0px',
  threshold: 0
};
const io_observer = new IntersectionObserver(io_callback, io_options);

stickyContainers.forEach(element => {
  io_observer.observe(element);
});

function io_callback (entries, observer) {
  entries.forEach(entry => {
    entry.target.classList.toggle('active', entry.isIntersecting);
  });
}
```

这实际上是使用`Intersection Observer`完成此任务的非常简单的示例。 唯一的例外是`rootMargin`中的-100％值。 请注意，这对于其他三个方面也可以重复； 它只需要一个具有自己独特的`rootMargin`的新观察者，对于相应方面，它具有-100％的值。 将会有更多独特的粘性容器，它们具有自己的类，例如`sticky-container-top`和`sticky-container-bottom`。

这样做的限制是，粘性元素的top，right，bottom或left属性必须始终为零。 从技术上讲，你可以使用其他值，但随后必须进行数学运算以找出`rootMargin`的正确值。 这很容易做到，但是如果调整大小，不仅需要再次进行数学运算，还必须停止观察者并使用新值重新启动它。 将position属性设置为零，并使用内部元素以所需的方式设置样式更加容易。

## 和滚动事件结合

到目前为止，我们已经在一些演示中看到了，`intersectionRatio`可能不精确且有些局限。使用滚动事件可以更精确，但会降低性能的效率。那把两者结合起来怎么样？

[demo4](https://cdpn.io/talmand/fullembedgrid/wvwjBry?type=embed&animations=run)

在此demo中，我们创建了一个`Intersection Observer`，并且回调函数的唯一目的是添加和删除侦听根元素上的scroll事件的事件侦听器。 当目标首次进入根元素时，将创建滚动事件侦听器，然后在目标离开根元素时将其删除。 滚动时，输出仅显示每个事件的时间戳，以实时显示事件的变化-比单独的观察者要精确得多。

下面是JavaScript。

```js
const root = document.querySelector('#root');
const target = document.querySelector('#target');
const output = document.querySelector('#output pre');
const io_options = {
  root: root,
  rootMargin: '0px',
  threshold: 0
};
let io_observer;

function scrollingEvents (e) {
  output.innerText = e.timeStamp;
}

function io_callback (entries) {
  if (entries[0].isIntersecting) {
    root.addEventListener('scroll', scrollingEvents);
  } else {
    root.removeEventListener('scroll', scrollingEvents);
    output.innerText = 0;
  }
}

io_observer = new IntersectionObserver(io_callback, io_options);
io_observer.observe(target);
```

这是一个相当标准的例子。 请注意，我们希望阈值为零，因为如果阈值不止一个，我们将同时获得多个事件监听器。 回调函数是我们感兴趣的，甚至是一个简单的设置：在if-else块中添加和删除事件监听器。 事件的回调函数仅更新输出中的div。 每当目标触发相交变化并且不与根相交时，我们会将输出设置回零。

这个实例利用了`Intersection Observer`和滚动事件的优点。 考虑使用一个滚动动画库，该动画库仅在页面上需要它的部分实际可见时才起作用。 库和滚动事件在整个页面中并非无效地活动。

## 浏览器的有趣差异

您可能想知道`Intersection Observer`有多少浏览器支持。 实际上，还蛮多的！

该浏览器支持数据来自Caniuse，更多信息。 数字表示浏览器支持该版本及更高版本的功能。

![Caniuse](https://img11.360buyimg.com/jdphoto/s939x589_jfs/t1/47754/22/12887/54388/5d9eec58Ea352f2c4/d56f0ccaa8a322a3.png)

所有主要的浏览器都已经支持了一段时间。和预期一样，IE在任何级别都不支持它，但是W3C提供了一个[polyfill](https://github.com/w3c/IntersectionObserver/tree/master/polyfill)来解决这个问题。

当我使用`Intersection Observer`尝试不同的想法时，我确实遇到了两个示例在Firefox和Chrome之间的行为有所不同。我不会在生产站点上使用这些示例，但是这些行为很有趣。

这是第一个示例：

[example1](https://cdpn.io/talmand/fullembedgrid/oNvdQOR?type=embed&animations=run)

目标元素通过CSS transform属性在根元素内移动。 该演示具有CSS动画，该动画可在水平轴上将目标元素移入和移出根元素。 当目标元素进入或离开根元素时，`intersectionRatio`会更新。

如果您在Firefox中查看此演示，则应在目标元素前后滑动时正确地看到`intersectionRatio`更新。 Chrome的行为有所不同，完全不更新`intersectionRatio`。 Chrome似乎没有保留使用CSS转换过的目标元素的标签。 但是，如果我们在目标元素移入和移出根元素时在浏览器中四处移动鼠标，则`intersectionRatio`确实会更新。 我的猜测是，只有在存在某种形式的用户交互时，Chrome才会“激活”观察者。

这是第二个示例：

[example2](https://cdpn.io/talmand/fullembedgrid/mdbLQZJ?type=embed&animations=run)

这次，我们[对一个剪裁路径进行动画处理](https://css-tricks.com/animating-with-clip-path/)，该剪裁路径将一个正方形变成重复循环中的一个圆形。正方形与根元素的大小相同，因此我们得到的`intersectionRatio`将始终小于1。随着剪裁路径的动画化，Firefox根本不会更新`intersectionRatio`。这次移动鼠标不起作用。Firefox只是忽略元素大小的变化。另一方面，Chrome实际上会实时更新`intersectionRatio`显示。即使没有用户交互，也会发生这种情况。

之所以会发生这种情况，是因为规范的一部分指出[交集区域（intersectionRect）的边界](https://www.w3.org/TR/intersection-observer/#calculate-intersection-rect-algo)应包括剪裁目标元素。

> 如果容器具有溢出剪裁或css[剪裁路径](https://www.w3.org/TR/css-masking-1/#propdef-clip-path)属性，请通过应用容器的剪裁来更新intersectionRect。

因此，当剪裁目标时，将重新计算相交区域的边界。 Firefox显然尚未实现。

## Intersection Observer, version 2

那么，该API的未来前景如何？

[Google提供了一些建议](https://developers.google.com/web/updates/2019/02/intersectionobserver-v2)，这些建议会为观察者添加一个有趣的功能。 即使Intersection Observer告诉我们目标元素何时跨越根元素的边界，也不一定意味着该元素实际上对用户是可见的。 它可能具有零不透明度，或者可能被页面上的另一个元素覆盖。 观察者能不能被用来确定这些事情？

请记住，我们仍在早期阶段才使用此功能，因此不应在生产代码中使用它。 这是[更新后的提案](https://szager-chromium.github.io/IntersectionObserver/)，其中突出显示了与规范第一个版本的差异。

如果您一直在使用Chrome浏览本文中的演示，则可能已经注意到控制台中的几件事-例如Firefox中未出现的`entries`对象属性。 这是Firefox在控制台中打印内容的示例：

```js
IntersectionObserver
  root: null
  rootMargin: "0px 0px 0px 0px"
  thresholds: Array [ 0 ]
  <prototype>: IntersectionObserverPrototype { }

IntersectionObserverEntry
  boundingClientRect: DOMRect { x: 9, y: 779, width: 707, ... }
  intersectionRatio: 0
  intersectionRect: DOMRect { x: 0, y: 0, width: 0, ... }
  isIntersecting: false
  rootBounds: null
  target: <div class="item">
  time: 261
  <prototype>: IntersectionObserverEntryPrototype { }

  ```
  现在，这是来自Chrome中相同控制台代码的输出：

  ```js

  IntersectionObserver
  delay: 500
  root: null
  rootMargin: "0px 0px 0px 0px"
  thresholds: [0]
  trackVisibility: true
  __proto__: IntersectionObserver

IntersectionObserverEntry
  boundingClientRect: DOMRectReadOnly {x: 9, y: 740, width: 914, height: 146, top: 740, ...}
  intersectionRatio: 0
  intersectionRect: DOMRectReadOnly {x: 0, y: 0, width: 0, height: 0, top: 0, ...}
  isIntersecting: false
  isVisible: false
  rootBounds: null
  target: div.item
  time: 355.6550000066636
  __proto__: IntersectionObserverEntry

  ```

在一些属性（例如`target`和`prototype`）的显示方式上存在一些差异，但是它们在两种浏览器中的操作相同。区别在于Chrome具有Firefox中不会显示的一些其他属性。`observer`对象具有一个称为`trackVisibility`的布尔值，一个称为`delay`的数字，并且`entry`对象具有一个称为`isVisible`的布尔值。这些是新提议的属性，这些属性试图确定目标元素是否实际上对用户可见。

我将对这些属性进行简要说明，但如果您需要更多详细信息，请阅读[此文章](https://developers.google.com/web/updates/2019/02/intersectionobserver-v2)。

`trackVisibility`属性是在`options`对象中提供给观察者的布尔值。此属性可以使浏览器承担确定目标元素的真实可见性的任务。

`delay`属性用途的猜测：它将交集改变的回调方法延迟指定的时间（以毫秒为单位）。这有点类似于将回调函数的代码包装在`setTimeout`中。为了使`trackVisibility`起作用，该值是必需的，并且必须至少为100。如果未提供适当的值，则控制台将显示此错误，并且将不会创建观察者。

```
Uncaught DOMException: Failed to construct 'IntersectionObserver': To enable the
'trackVisibility' option, you must also use a 'delay' option with a value of at
least 100. Visibility is more expensive to compute than the basic intersection;
enabling this option may negatively affect your page's performance.
Please make sure you really need visibility tracking before enabling the
'trackVisibility' option.
```

目标`entry`对象中的`isVisible`属性是报告可见性跟踪输出的布尔值。可以将它用作任何代码的一部分，就像使用`isIntersecting`一样。

在我使用这些功能进行的所有实验中，看到它实际上有时候有效有时候无效。 例如，当元素清晰可见时，延迟始终有效，但是isVisible并不总是报告true（至少对我而言）。 有时这是设计使然，因为规范确实允许出现[第二类错误](https://szager-chromium.github.io/IntersectionObserver/#calculate-visibility-algo)。这将有助于解释不一致的结果。

我个人迫不及待地希望这项功能尽快完成，并在所有支持`Intersection Observer`的浏览器中都能正常工作。

## 写在最后

我对`Intersection Observer`的研究到此结束。 我花了很多晚上研究，试验和构建示例，以了解其工作原理。 这篇文章涉及了一些有关如何利用观察者的不同功能的新想法。除此之外，我觉得我可以清晰的解释观察者的工作原理。希望本文对你有所帮助。
