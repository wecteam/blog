---
title: V8引擎和JavaScript优化建议
date: 2019-10-23 17:12:03
cover: https://img11.360buyimg.com/jdphoto/s873x468_jfs/t1/78957/13/13275/56500/5dad9422E1ab45cbb/0a9ecdcfb11ed007.jpg
thumbnail: https://img11.360buyimg.com/jdphoto/s873x468_jfs/t1/78957/13/13275/56500/5dad9422E1ab45cbb/0a9ecdcfb11ed007.jpg
tags:
	- V8引擎
categories: Web前端
---


> * 原文地址：[https://alligator.io/js/v8-engine/](https://alligator.io/js/v8-engine/)
> * 翻译：马雪琴

 
>V8 是谷歌用于编译 JavaScript 的引擎，Firefox 同样也有一个，叫 SpiderMonkey，它和 V8 有一些不同，但总体颇为相似。我们将在本篇文章中讨论 V8。

V8 引擎的一些基础点：

* 用 C++ 语言实现，使用在 Chrome 浏览器和 Node.js 中（以及最新版的 Microsoft Edge）
* 遵循 ECMA-262 标准
<!--more-->
# JavaScript 旅程

当我们把压缩、混淆以及做了各种处理的 JavaScript 放到 V8 引擎中解析时，到底发生了些什么？

下图阐述了整个流程，接下来我们会对其中的每个步骤进行详细说明：
![](https://img11.360buyimg.com/jdphoto/s873x468_jfs/t1/78957/13/13275/56500/5dad9422E1ab45cbb/0a9ecdcfb11ed007.jpg)

在本篇文章中，我们将探讨 JavaScript 代码是如何被解析的，以及如何最大程度的优化 JavaScript 的编译效率。V8 里的优化编译器（又名 Turbofan）拿到 JavaScript 代码之后，会将其转化成高效率的机器码，因此，我们能向其输入越多的代码，我们的应用就会越快。附注一点，Chrome 里的解释器称作 Ignition。

# JavaScript 解析

整个过程中的第一步是解析 JavaScript。首先探讨什么是解析。

解析有两个阶段：

* Eager（全解析）- 立即解析所有的代码
* Lazy（预解析）- 按需做最少的解析，剩下的留到后面

哪一种方式更好则需要根据实际情况来决定。

下面来看一段代码。

```
// 变量声明会被立即解析
const a = 1;
const b = 2;

// 目前不需要的暂时不解析
function add(a, b) {
  return a + b;
}

// add 方法被执行到了，所以需要返回解析该方法
add(a, b);
```

变量声明会被立即解析，函数则会被懒解析，但上述代码里紧接着就执行了 add(a, b)，说明 add 方法是马上就需要用到的，所以这种情况下，把 add 函数进行即时解析会更高效。

为了让 add 方法被立即解析，我们可以这样做：

```
// 变量声明会被立即解析
const a = 1;
const b = 2;

// eager parse this too
var add = (function(a, b) {
  return a + b;
})();

// add 方法已经被解析过了，所以这段代码可以立即执行
add(a, b);
```

这就是大多数模块被创建的过程。那么，立即解析会是高效 JavaScript 应用的最好方式吗？

我们可以用 [optimize-js](https://nolanlawson.github.io/test-optimize-js/) 这个工具对公共库代码进行完全的立即解析处理，比如对比较有名的 lodash 进行处理后，优化效果是很显著的：

* 没有使用 optimize-js：11.86ms
* 使用了 optimize-js：11.24ms

必须声明的是，该结果是在 Chrome 浏览器中得到的，其它环境的结果则无法保证：

![](https://img11.360buyimg.com/jdphoto/s780x342_jfs/t1/75143/19/13407/57666/5dad9422E39e89ead/e7e04d5c564ce44a.jpg)

如果您需要优化应用，必须在所有的环境中进行测试。

另一个解析相关的建议是不要让函数嵌套：

```
// 糟糕的方式
function sumOfSquares(a, b) {
  // 这里将被反复懒解析
  function square(num) {
    return num * num;
  }

  return square(a) + square(b);
}
```

改进后的方式如下：

```
function square(num) {
  return num * num;
}

// 好的方式
function sumOfSquares(a, b) {
  return square(a) + square(b);
}

sumOfSquares(a, b);
```

上述示例中，square 方法只被懒解析了一次。

# 内联函数

Chrome 有时候会重写 JavaScript 代码，内联函数即是这样一种情况。

下面是一个代码示例：

```
const square = (x) => { return x * x }

const callFunction100Times = (func) => {
  for(let i = 100; i < 100; i++) {
    // func 参数会被调用100次
    func(2)
  }
}

callFunction100Times(square)
```

上述代码会被 V8 引擎进行如下优化：

```
const square = (x) => { return x * x }

const callFunction100Times = (func) => {
  for(let i = 100; i < 100; i++) {
    // 函数被内联后就不会被持续调用了
    return x * x
  }
}

callFunction100Times(square)
```
从上面可以看出，V8 实际上会把 square 函数体内联，以消除调用函数的步骤。这对提高代码的性能是很有用处的。

# 内联函数问题

上述方法存在一点问题，让我们看看下面这段代码：

```
const square = (x) => { return x * x }
const cube = (x) => { return x * x * x }

const callFunction100Times = (func) => {
  for(let i = 100; i < 100; i++) {
    // 函数被内联后就不会被持续调用了
    func(2)
  }
}

callFunction100Times(square)
callFunction100Times(cube)
```
上面的代码中先会调用 square 函数100次，紧接着又会调用 cube 函数100次。在调用 cube 之前，我们必须先对 callFunction100Times 进行反优化，因为我们已经内联了 square 函数。在这个例子中，square 函数似乎会比 cube 函数快，但实际上，因为反优化的这个步骤，使得整个执行过程变得更长了。

# 对象
谈到对象，V8 引擎底层有个类型系统可以区分它们：

## 单态
对象具有相同的键，这些键没有区别。

```
// 单态示例
const person = { name: 'John' }
const person2 = { name: 'Paul' }
```

## 多态
对象有相似的结构，并存在一些细微的差别。

```
// 多态示例
const person = { name: 'John' }
const person2 = { name: 'Paul', age: 27 }
```

## 复杂态
这两个对象完全不同，不能比较。

```
// 复杂态示例
const person = { name: 'John' }
const building = { rooms: ['cafe', 'meeting room A', 'meeting room B'], doors: 27 }
```
现在我们了解了 V8 里的不同对象，接下来看看 V8 引擎是如何优化对象的。

## 隐藏类
隐藏类是 V8 区分对象的方式。

让我们将这个过程分解一下。

首先声明一个对象：

```
const obj = { name: 'John'}
```

V8 会为这个对象声明一个 classId。

```
const objClassId = ['name', 1]
```

然后对象会按如下方式被创建：

```
const obj = {...objClassId, 'John'}
```

然后当我们获取对象里的 name 属性时：

```
obj.name
```

V8 会做如下查找：

```
obj[getProp(obj[0], name)]
```

这就是 V8 创建对象的过程，接下来看看如何优化对象以及重用 classId。

## 创建对象的建议
应该尽量将属性放在构造器中声明，以保证对象的结构不变，从而让 V8 可以优化对象。
```
class Point {
  constructor(x,y) {
    this.x = x
    this.y = y
  }
}

const p1 = new Point(11, 22) // 隐藏的 classId 被创建
const p2 = new Point(33, 44)
```

应该保证属性的顺序不变，如下面这个示例：
```
const obj = { a: 1 } // 隐藏的 classId 被创建
obj.b = 3

const obj2 = { b: 3 } // 另一个隐藏的 classId 被创建
obj2.a = 1

// 这样会更好
const obj = { a: 1 } // 隐藏的 classId 被创建
obj.b = 3

const obj2 = { a: 1 } // 隐藏类被复用
obj2.b = 3
```

# 其它的优化建议
接下来我们看一下其它的 JavaScript 代码优化建议。

## 修正函数参数类型
当参数被传进函数中时，保证参数的类型一致是很重要的。如果参数的类型不同，Turbofan 在尝试优化4次之后就会放弃。

下面是一个例子：

```
function add(x,y) {
  return x + y
}

add(1,2) // 单态
add('a', 'b') // 多态
add(true, false)
add({},{})
add([],[]) // 复杂态 - 在这个阶段, 已经尝试了4+次, 不会再做优化了

```
另一个建议是保证在全局作用域下声明类：
```

// 不要这样做
function createPoint(x, y) {
  class Point {
    constructor(x,y) {
      this.x = x
      this.y = y
    }
  }

  // 每次都会重新创建一个 point 对象
  return new Point(x,y)
}

function length(point) {
  //...
}
```

# 结论
希望大家学到了一些 V8 底层的知识，知道如何去编写更优的 JavaScript 代码。
