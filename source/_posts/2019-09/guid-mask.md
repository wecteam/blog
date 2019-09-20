---
title: 你还在用图片做引导蒙层？
subtitle: 本文讲述引导蒙层的6种实现方式
date: 2019-09-20 10:43:41
cover:  http://wq.360buyimg.com/data/ppms/picture/WechatIMG1.jpg
thumbnail: http://wq.360buyimg.com/data/ppms/picture/WechatIMG1.jpg
tags: 
  - 引导蒙层
  - canvas
categories: Web开发
---

> 作者：深山蚂蚁

引导蒙层通常在新业务上线、或者业务有变更时的给新用户的一个操作指引。下图页面即是一个蒙层，会在某个局部位置高亮我们需要重点突出的内容：  
<!--more-->
![阴影](https://raw.githubusercontent.com/antiter/blogs/master/images/image-guide_1.png)    

当前发现很多页面做蒙层引导，还是使用图片形式来做。

# 图片引导蒙层有几大缺点：
1. 图片大，影响加载
2. 图片的内容都是假的，和真实的底部内容没对上
3. 全屏蒙层图片，图片的宽高和屏幕宽高不一致，显示两边留黑，或者有压缩的效果。
4. 图片的引导位置不能点击。
5. low ？ not cool ？

# 本文讲述六种思路来实现引导蒙层

- z-index实现蒙层
- 动态opacity实现
- border实现
- box-shadow实现
- 节点复制实现
- canvas实现

> 以上六种引导蒙层实现思路，在一定情况下都能满足业务需求，从不同角度来实现了引导蒙层。z-index最简单，canvas最灵活，就个人而言，更加喜欢骨架屏式的动态opacity蒙层实现，更有趣更酷!!!  

## 思路一：使用z-index
- 新增一个div，设置为半透明区域，大小覆盖整个页面
- 半透明蒙层区域z-index大于页面元素
- 引导内容区域大于半透明蒙层区域z-index 

这个好理解，页面元素都是有层级的，我们只需要把引导内容区域设置为最顶层的层级，在引导内容区域之下设置一个遮罩层，其他内容元素的z-index都地域这个遮罩层即可。 我们来看一个简单例子。
```CSS
.z1{
  position:absolute;
  left:50px;
  top:50px;
  width:50px;
  height:50px;
  background:blue;
  z-index:1;
}
.z2{
  position:absolute;
  left:60px;
  top:60px;
  width:50px;
  height:50px;
  background:red;
  z-index:2;
}
.z3{
  position:absolute;
  left:70px;
  top:70px;
  width:50px;
  height:50px;
  background:yellow;
  z-index:3;
}
```
![z-index](https://raw.githubusercontent.com/antiter/blogs/master/images/image-guide_z-index_1.png)  

我们修改一下z2的样式。  
```css
.z2{
  position:absolute;
  left:50px;
  top:50px;
  width:50px;
  height:50px;
  background:black;
  opacity:0.5;
  z-index:2;
  animation:z_index 2s linear infinite alternate;
}
@keyframes z_index {
    from {
      left:50px;
      top:50px;
      width:50px;
      height:50px;
    }
    to {
      left:0px;
      top:0px;
      width:200px;
      height:200px;
    }
  }
```
![z-index](https://raw.githubusercontent.com/antiter/blogs/master/images/image-guide_z-index_2.gif)

只要在布局页面元素的时候，把需要做蒙层的元素确定好，配合js，动态的设置元素的z-index + opacity，就可以很好的做到页面的引导蒙层效果。  

## 思路二：使用opacity将非蒙层元素半透明
- 引导内容区域无需改动
- 页面其他节点元素半透明  

我们不再新增蒙层，而是完全操作页面节点，将需要遮罩的节点都设置为半透明，引导蒙层显现内容则完全显示出来。页面的效果和蒙层不太一样，对于空白地方，我们仍然是完全显示，只是将有内容的元素给半透明，类似骨架屏的效果。  
为了演示效果，我们看如下例子：  
页面设置6个元素。
```html
<div class="wrap">
    <div class="z z1"></div>
    <div class="z z2"></div>
    <div class="z z3"></div>
    <div class="z z4"></div>
    <div class="z z5"></div>
    <div class="z z6"></div>
  </div>
```
将元素内容用flex并排布局。
```CSS
.wrap{
  display:flex;
  flex-wrap:wrap;
  width:150px;
}
.z{
  width:50px;
  height:50px;
  transition:all 1s;
}
.z1{
  background:blue;
}
.z2{
  background:black;
}
.z3{
  background:yellow;
}
.z4{
  background:red;
}
.z5{
  background:green;
}
.z6{
  background:orange;
}
```
使用js操作，依次半透明其他元素，显示当前元素来模拟蒙层。
```js
let arry = Array.from(document.querySelectorAll(".z"));
let index = -1;
let direct = 1;
setInterval(()=>{
  if(index>=5) direct = -1;
  else if(index<=0) direct = 1;
  index = index+direct;
  arry.forEach((d,i)=>{
    d.style.opacity = 1;
  });
  setTimeout(()=>{
    arry.forEach((d,i)=>{
      if(i==index) return;
      d.style.opacity = 0.1;
    });
  },1000);
},2000)
```
![z-index](https://raw.githubusercontent.com/antiter/blogs/master/images/image-guide_z-index_3.gif)

看了这个例子，我们清晰的看到这个引导蒙层的实现过程。这种引导蒙层其实更好玩有趣，有点类似当前流行的骨架屏，其他已有元素需要遮罩的内容就是骨架屏的灰色部分，需要显现的就是重点的蒙层内容。  
有趣！！！

## 思路三：使用border的方式来实现
没错，就是普遍不能在普遍的border了，且看如下：  
```css
div {
    border:1px solid #red;
}
```
那用border怎么实现引导蒙层呢？  
### 1、先了解下三角形
先看一个简单的例子：     

```html
<div class="border_1"></div>
```
```CSS
.border_1{
    width: 100px;
    height: 100px;
    border-top:50px solid red;
    border-right: 50px solid transparent;
    border-bottom: 50px solid transparent;
    border-left: 50px solid transparent;
    box-sizing:border-box;
}
```
![border_1](https://raw.githubusercontent.com/antiter/blogs/master/images/image-guide_border_1.png)  

实现了一个倒三角,这个应用场景是不是就比较多了，很多tips的指引，标注等都会用到。我就看到过这种倒三角使用一张图片代替的做法。   
仔细看这段代码，主要有实现了三点：  
1. 四边都设置了边框
2. 宽高都为100px,即上下、左右表框之和，其实小于等于这个值都行。
3. 只有顶部边框是红色，其他边框是透明的。  

为了理解上面的实现，我们来看下如下代码：  
```CSS
.border_2{
    width: 100px;
    height: 100px;
    background-color:green;
    border-style:solid;
    border-color:red yellow blue black;
    border-width:50px;
    animation:border_ani 2s linear infinite alternate;
    box-sizing:border-box;
}
@keyframes border_ani {
    from {
        border-width:50px;
    }
    to {
      border-width:0;
    }
  }
```
![animation](https://raw.githubusercontent.com/antiter/blogs/master/images/image-guide_border_2.gif)

从图中我们可以清晰的看到，随着border-width的变化，整个div的绿色背景在跟随变化。 
- 当border-width=0的时候，整个页面只有绿色背景，即都是内容的大小
- 当border-width=50的时候，整个div的大小都被border给充满了，上下左右均分1/4，就是四个倒三角。  

这样我们就清晰的能得到:  
> 当border-right,border-left,border-bottom都transparent透明，border-top是红色的时候，所看到的就是一个倒三角。  

同理我们还可以设置边框的大小不一致，可以实现斜三角： 
```CSS 
.border_3{
    width: 0;
    height: 0;
    border-top:30px solid red;
    border-right: 10px solid transparent;
    border-bottom: 20px solid transparent;
    border-left: 100px solid transparent;
    box-sizing:border-box;
}
```
![斜三角](https://raw.githubusercontent.com/antiter/blogs/master/images/image-guide_border_3.png)

还可以实现工作中经常碰到的梯形：  
```CSS
.border_4{
    width: 150px;
    height: 150px;
    border-top:50px solid red;
    border-right: 50px solid transparent;
    border-bottom: 50px solid transparent;
    border-left: 50px solid transparent;
    box-sizing:border-box;
}
```
![梯形](https://raw.githubusercontent.com/antiter/blogs/master/images/image-guide_border_4.png)
 
好了，这里不累赘了，感兴趣的可以各种尝试。遇到这种简单边线图，就不要动不动使用图片了。  

### 2、再看实现引导蒙层

- 新增一个div，作为蒙层元素 
- div中间大小和引导内容元素大小完全一致，且位置恰好重叠
- div的border设置为半透明且无限放大

了解了上面的三角形的实现之后，估计你也能想出怎么做引导蒙层了。一个div有四个边框，如果我们把边框都设置成半透明，然后中间的区域（上面border_2的green）设置成全透明会不就可以实现区域引导蒙层了吗？然后再把边框设置成超过屏幕的大小呢，就是全景引导蒙层了！
```CSS
.border_5{
    width: 150px;
    height: 150px;
    border-top:50px solid rgba(0,0,0,.5);
    border-right: 50px solid rgba(0,0,0,.5);
    border-bottom: 50px solid rgba(0,0,0,.5);
    border-left: 50px solid rgba(0,0,0,.5);
    box-sizing:border-box;
}
```
![蒙层](https://raw.githubusercontent.com/antiter/blogs/master/images/image-guide_border_5.png)

这是一个150px的区域蒙层，我们看下如下示例就能很明白了：
```CSS
.border_6{
    width: 20px;
    height: 20px;
    border-style:solid;
    border-color:rgba(0,0,0,.5);
    border-width:20px;
    animation:border_ani 2s linear infinite alternate;
    box-sizing:content-box;
}
@keyframes border_ani {
    from {
        border-width:20px;
    }
    to {
      border-width:100px;
    }
  }
```
![蒙层](https://raw.githubusercontent.com/antiter/blogs/master/images/image-guide_border_6.gif)

当然，我们还可以设置border-radius来实现圆形的蒙层区域，如下：  

![border-radius](https://raw.githubusercontent.com/antiter/blogs/master/images/image-guide_border_7.png)   

当然，这里的边框大小值都是写死的，具体实现需要根据页面内容修改或者动态修改即可。  

如果是椭圆呢？

总结：
> border可以实现各种边线的形状，可以实现引导蒙层，页面指定区域透明，之外的都半透明来实现即可。

 
## 思路四、使用box-shadow来实现
- 新增一个div，作为蒙层元素 
- div大小和内容元素大小完全一致，且位置恰好重叠
- div的box-shadow的阴影尺寸设置为半透明且设置为比较大的约2000px大小

box-shadow，大伙都不陌生，就是盒子的阴影，我们先来了解下它的基本用法：  
```CSS
.boxshadow_1{
    width:50px;
    height:50px;
    background:blue;
    box-shadow: 10px 10px 5px 4px #000;
}
```
![阴影](https://raw.githubusercontent.com/antiter/blogs/master/images/image-guide_boxshadow_1.png)

在宽高为50px的div,它的阴影水平和垂直都是10px，阴影模糊距离是5px,阴影的尺寸是4px,阴影是#000的颜色(这里给body增加了一个yellow的背景色以便于区分)。  

首先我们把阴影透明：  
```CSS
.boxshadow_2{
    width:50px;
    height:50px;
    background:blue;
    box-shadow: 10px 10px 5px 4px rgba(0,0,0,.5);
}
```
![阴影](https://raw.githubusercontent.com/antiter/blogs/master/images/image-guide_boxshadow_2.png)  

那怎么让阴影遮盖整个页面呢？  
- 阴影的水平和垂直距离是指距离原dev的距离，这个调整达不到效果，只会让阴影更多的偏离元素。
- 阴影的模糊距离指阴影的边缘渐变模糊的距离，距离越长，只会让渐变模糊加长，蒙层大小不会变。
- 阴影的尺寸，这个是指多大的阴影，那我们将阴影尺寸设置很大呢？是的，就是这个了 

看如下的例子，我们调整阴影的尺寸：  
```CSS
.boxshadow_3 {
  width:50px;
  height:50px;
  background:blue;
  box-shadow: 0px 0px 5px 0px rgba(0,0,0,.5);
  animation:box_ani 2s linear infinite alternate;
}
@keyframes box_ani {
    from {
        box-shadow: 10px 10px 5px 0px rgba(0,0,0,.5);
    }
    to {
        box-shadow: 10px 10px 5px 100px rgba(0,0,0,.5);
    }
  }
```
如上，我们只需要把阴影尺寸加大就可以实现引导蒙层了。  
如果需要引导蒙层状态下还能响应事件呢？只需要加一个pointer-events属性即可。  

> box-shadow的阴影距离切勿盲目设置过大，经过测试这个值如果过大，比如4000px，在部分手机上阴影无法显示出来。经过实践，设置为2000px为佳。

## 思路五：使用页面节点复制
- 新增两个div，一个半透明蒙层元素和一个蒙层内容区域
- 将页面节点引导内容拷贝到蒙层内容区域
- 将蒙层内容区域的大小和位置与原节点引导内容完全重合

页面内容已经做好了，我们需要引导蒙层来显示某个元素，那么将元素复制到最外层，顶层增加一层蒙层来实现,需要突出的引导内容在蒙层之上即可实现。
```html
<div class="content one">我是第一个div，我是第一个div</div>
<div class="content two">我是第二个div，我是第二个div</div>
<div class="content three">我是第三个div，我是第三个div</div>
<div class="content four">我是第四个div，我是第四个div</div>
<div class="mask"></div>
<div id="maskContent"></div>
```
这里设置了一个固定蒙层，和一个固定的蒙层内容元素，我们只需要填充即可。
```CSS
.content{
    padding:10px;
    z-index:0;
}
.mask{
    position:fixed;
    left:0;
    top:0;
    width:100%;
    height:100%;
    background:rgba(0,0,0,.8);
    z-index:900
  }
  #maskContent{
    position:fixed;
    z-index:999;
    display:inline-block;
    background-color: #fff;
  }
```
这里内容区域都是0，然后mask是900，我们的蒙层元素是999，就是最上层了。
```js
function renderContent(cls){
    let targetNode = document.querySelector(`.${cls}`);
    let maskContent = document.getElementById("maskContent");
    maskContent.innerHTML = targetNode.outerHTML;
    let pos = targetNode.getBoundingClientRect();
    maskContent.style.top=pos.top+"px";
    maskContent.style.left=pos.left+"px";
    maskContent.style.width=pos.width+"px";
    maskContent.style.height=pos.height+"px";
 }
let i = 0;
setInterval(()=>{
    renderContent(['one','two','three','four'][i]);
    if(++i>=4) i = 0;
},1000)
```
这里为了演示效果，增加了一个定时器改变不同的遮罩层。易于理解，看下效果：  

![z-index](https://raw.githubusercontent.com/antiter/blogs/master/images/image-guide_content_1.gif)

## 思路六：使用canvas实现
- 新增一个canvas，绘制两次图形
- 第一次：绘制一个全屏的半透明阴影
- 第二次：使用xor绘制一个和引导内容区域的大小位置完全重合的区域  

第二次绘制的内容区域和第一次重叠，使用xor，所以会透明，该引导内容区域就会完全显示出来，这就是我们想要的效果了。   

使用canvas的globalCompositeOperation属性来实现,内容参考http://www.tutorialspoint.com/html5/canvas_composition.htm  

重点看xor：Shapes are made transparent where both overlap and drawn normal everywhere else.   
翻译： canvas绘制的形状在重叠处都会变成透明的，非重叠处的其他任何地方都正常绘制内容。  

所以我们就可以在canvas里面绘制一个canvas蒙层，然后在蒙层中需要显示的内容用xor来绘制重叠，然后重叠内容就会被透明，那么这个透明区域的内容就是我们想要的引导蒙层突出内容区域。具体看实例：  

```html
 <div class="content one">我是第一个div，我是第一个div</div>
<div class="content two">我是第二个div，我是第二个div</div>
<div class="content three">我是第三个div，我是第三个div</div>
<div class="conteent four">我是第四个div，我是第四个div</div>
<canvas id="mask"></canvas>
```
页面增加一个canvas节点。将canvas整体设置成半透明，然后再用xor来实现内容的绘制。   

```js
 function mask(cls){
    let targetNode = document.querySelector(`.${cls}`);
    let pos = targetNode.getBoundingClientRect();
    let canvas = document.getElementById("mask");
    let width = window.innerWidth;
    let height = window.innerHeight;;
    canvas.setAttribute("width", width);
    canvas.setAttribute("height",height);
    var ctx = canvas.getContext("2d"); 
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle ='rgba(255, 255, 255, 0.9)';
    ctx.fillRect(0, 0, width, height);
    ctx.fill();
    ctx.fillStyle ='white';
    ctx.globalCompositeOperation="xor";
    ctx.fillRect(pos.left,pos.top,pos.width,pos.height);
    ctx.fill();
 }
let array = ['one','two','three','four'];
let i = 0;
setInterval(()=>{
    mask(array[i]);
    i++;
    if(i>=4) i = 0;
},1000)
```

![z-index](https://raw.githubusercontent.com/antiter/blogs/master/images/image-guide_content_2.gif)  

看完以上实现，你最喜欢哪种实现方式呢？

