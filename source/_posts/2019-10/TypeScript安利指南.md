---
title: TypeScript安利指南
date: 2019-10-08 23:35:07
cover: https://img11.360buyimg.com/jdphoto/s730x365_jfs/t1/50551/4/13032/13279/5d9f1c13E4cf58cdb/ce413415dfbb4521.jpg
thumbnail: https://img11.360buyimg.com/jdphoto/s730x365_jfs/t1/50551/4/13032/13279/5d9f1c13E4cf58cdb/ce413415dfbb4521.jpg
tags: 
  - TypeScript
categories: Web前端
---

> 作者：李逸君

骚年，你感受过debug一年找不到问题，最后发现是变量名写错时的绝望吗？
骚年，你感受过生产线上代码出现`Uncaught TypeError`时的恐惧吗？
骚年，你感受过写代码找一万个文件还找不到方法定义时委屈吗？

拿起键盘，让我们对谋害生命的代码拖进垃圾箱！(划掉)

## 前言

据了解，目前有相当一部分同学不想去学习ts，毕竟没(xue)时(bu)间(dong)。很不幸两个月前我也是其中的一员。在看到尤大大都用ts写vue3了，蠢蠢欲动的我小心翼翼的踏入了这个深坑。在经历了长达一天的摸爬滚打之后，领悟到了真谛
<!--more-->
![真香](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshbg55jj30gq0fqwqq.jpg)

经过了一段时间的理解之后，写了这篇文章，旨在给犹豫是否学习或者还在观望TypeScript的同学做个使用ts的收益分析，希望能够打动屏幕面前的你。

## 安利


ts难写吗？不难。最简单的做法三步就搞定。

1. 找一个js文件
2. 按下重命名
3. 把.js改成.ts

大功告成！


![打脸](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshckta9j30ec0bswhb.jpg)

（打人别打脸，还要靠它吃饭的…）

⬇️ ts初体验
![gif0](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshef2scg30ps0f77o6.gif)

#### <font color=green>-ts是什么</font>

ts是js的超集，意味着js本身的语法在ts里面也能跑的通。ts一方面是对js加上了很多条条框框的限制，另一方面是拓展了js的一些能力，就像es6提供了那么多神奇的语法糖一样。只要按照一定的规则去书写js，就能享受到ts带来的好处。

当然因为现在的ts足够强大，并且有自家的vscode保驾护航，才方便了我们这些过去想都不(lan)敢(de)想的苦逼程序员。

js改造成ts的工作量很大程度取决于你想对自己的代码限制的有多细致，描述的有多完善。最简单的就像上面说的，改个拓展名就行了(当然很大程度上可能会通过不了各种静态检查)。如果你写的越多，用你代码的同志就越大可能喜欢你写的东西。

下面先**简单**介绍一下ts语法，便于后面的理解。

#### <font color=green>-ts语法简介</font>

```ts
// 'xxx: number' 表示声明一个number类型
const num: number = 123

// 声明一个函数的参数类型(number以及any)和返回值(void)
function fn (arg1: number, arg2: any): void {
    // todo
}
fn(num, [1,2,3,4])

// 声明一个接口
interface IPerson {
    name: string // IPerson需要包含一个name属性，类型是string
    age: number // IPerson需要包含一个age属性，类型是number
    family: Array<string> // IPerson需要包含一个family属性，类型是数组，数组里面都是string类型的数据
    sex?: '男' | '女' // IPerson可选一个sex属性，值为'男'或者'女'或者undefined
}
// 使用IPerson接口定义一个对象，如果对象不符合IPerson的定义，编译器会飘红报错
const person: IPerson = {
    name: '小王',
    age: 12,
    family: ['爹', '娘'],
}

// type类似interface，以下写法等同用interface声明IPerson
type IPerson2 = {
    name: string
    age: number
    family: Array<string>
    sex?: '男' | '女'
}
// 因此可以直接定义过来
const person2: IPerson2 = person
```

可能有的同学看了上面的介绍，会说：

**"要写这么多其他代码，还增加了文件体积，搞个啥子咧"**

一般情况下，ts需要编译成js才能运行。编译后长这样：

```js
// 'xxx: number' 表示声明一个number类型
var num = 123;
// 声明一个函数的参数类型(number以及any)和返回值(void)
function fn(arg1, arg2) {
    // todo
}
fn(num, [1, 2, 3, 4]);
// 使用IPerson接口定义一个对象，如果对象不符合IPerson的定义，编译器会飘红报错
var person = {
    name: '小王',
    age: 12,
    family: ['爹', '娘'],
};
// 因此可以直接定义过来
var person2 = person;
```

通过人肉diff，发现编译后的去掉了ts的所有代码。

可能就又有同学想问了：

**"学这些有啥好处?"**

别急，接着往下看🤓

## 应用场景

这块介绍ts的几个应用场景，给点启发~

#### <font color=green>-用我的代码就要听我的</font>

平时为了代码的健壮性，不得不对代码做很多容错的操作。

~~假如成功避免了因为自己年龄大了而眼睛花了，使用自己写的方法时这里漏了一个参数，那里传错了参数类型。~~
经常会有些不靠谱的使用者，不看你辛辛苦苦耕耘的api文档，瞎jb传参。最后出了问题还怪你没有做好兼容处理，领导群里一顿数落。

我们就得像孩子他妈一样，考虑熊孩子会传些什么乱七八糟的东西进来，然后在代码里面加上各种分支。

现在用ts，就可以在传参的时候友好的提示出来“你写了个什么玩意”的意思。

![-w149](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rsheua6aj308a09aac5.jpg)

首先用ts定义一个函数

```ts
interface IArgs {
    name: string
    age: string
}

function youFoo (arg1: string, arg2: 'a'|'b', arg3: IArgs) {
    // 这里啥都不干，你传参吧
}
```

假如同事小明这么写
```ts
youFoo('sss', 'c', {
    name: 'xiaoming',
    age: 18
})
```

他就会发现哪里好像不太对

![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshfbakyj30k703x3za.jpg)

第二个参数要求'a'或者'b'，于是小明默默的改过来了，但是又发现

![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshfth3aj30ll058abg.jpg)

原来`age`是要求传`string`类型。

于是小明一边心里mmp一边改了过来。

![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshgtgj7j3054030glt.jpg)

![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshhsfhmj305e04q3z1.jpg)

#### <font color=green>-找文档</font>

平时在干活的时候，我们一般喜欢多一个屏幕，可以开个chrome，查查问题找找文档等。不过经常还得看网速，用搜索去搜api啥的，遇到在乡下写代码，分分钟有想shi的心。

有了ts，我们就完(da)美(gai)的决掉了这个问题:

首先按照这样的结构去写方法：

```ts
/**
 * 一个方法：生成错误提示信息
 * 
 * @param {string} message 提示信息，比如`you have a error`
 * @param {number | string} code 错误码，数字和字符都行
 * @param {string} type 类型，请写`demo1`或者`demo2`
 * 
 * [还不懂？点这里吧](https://www.google.com)
 * 
 * // demo
 * genErrMsg('demo', 10086)
 * 
 */
export function genErrMsg (message: string, code: number | string, type?: ('demo1' | 'demo2')): string {
    return (message || `网络繁忙，请稍候再试`) + (code ? `(${code})` : ``)
}
```

然后在使用过程中的体验如下：

![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshinpuxg30l409wth2.gif)

在更完善的lib当中，体验更佳，除了开头的`jquery`外，还比如：


![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshjpvt1g30mq0n5wp4.gif)

#### <font color=green>-粗心大意</font>

阅读以下js代码，
提问：**分割线以下的代码有几处bug？**
```js
// careless.js
let foooo = 1
let fooo = 1
let fooooooo = 1
let foo = 1
let foooooo = 1
let test = 12
const obj = {
    fn1 () {},
    fn2 () {},
    fn4 () {},
}

/*************** 分割线以下的代码有哪些地方有bug？ **************** */

obj.fn3()

console.leg(fooooo)

function test () {
    alert(tast)
}
```

/*

**

**

***** 答案分界线 *****

**

**

*/

是不是觉得眼睛有点要瞎了？

试试把.js改成.ts

![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshkgb9oj30en0b2q5w.jpg)

#### <font color=green>-隐藏的问题</font>

如果说之前的js代码还能凭眼神立刻看出哪里不对，那么下面这些就没那么简单了

阅读以下js代码，
提问：**代码有几处bug？**

```js
import * as utils from './utils'

utils.genErrMsg(10086, 'this is error') // 上面提到的genErrMsg函数

let dom = window.document.getElementById('foo')
dom.className = 'add'
```

/*

**

**

***** 答案分界线 *****

**

**

*/

试试把.js改成.ts

![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshlfaz9j30bn04jjss.jpg)

可知问题如下：

1.`genErrMsg`的第一个参数应该是`string`

2.`getElementById`返回值还可能是`null`

![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshmbxiaj30b704adh5.jpg)


#### <font color=green>-接口数据不知道</font>

在维护代码的过程中，可能经常遇到某个接口不知道有啥数据，通常这个时候我们需要去查接口文档。然而当次数一多，或者后台大佬一坑起来，改了字段，可能会查到怀疑人生。

如果使用ts，可能手里的剧本就不一样了

假如有个接口如下所示

![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshmuhsvj30id06o3zq.jpg)

我们针对这个接口写出了如下ts代码：

```ts
interface IPriceData {
    /** 标识 */
    cbf: string
    /** id */
    id: string
    /** 市场价格 */
    m: string
    /** 后台价 */
    op: string
    /** 前台价 */
    p: string
}

// 将IPriceData塞进数组里
type IPriceDataArray = Array<IPriceData>

function getPrice () {
    // Promise的泛型参数使用了IPriceDataArray类型，then里面返回的数据就是IPriceDataArray类型
    return new Promise<IPriceDataArray>((resolve, reject) => {
        $.get('https://xxxxxxx/prices/pgets?ids=P_100012&area=&source=', data => {
            resolve(data)
        })
    })
}
```

当调用`getPrice`函数时，体验如下：


![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshn9s8gg30mq0bm0vj.gif)

以后每次维护这段函数的时候都不需要去看文档啦。如果后台突然改了字段，在检查的过程中我们可以马上发现问题，然后拿着数据去质问：你tm改了东西让我来背锅...(此处省略1万个字)

#### <font color=green>-增强后的class和enum</font>

众所周知，js里面的class就是个语法糖，想学强类型语言，写法又是个半吊子。

但是在ts当中，class被增强了(当然还是个语法糖，只不过更甜了)

咱们看图说话：

![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshnr93cj30gt0huq6w.jpg)

vscode中对ts下的共有属性、私有属性、保护属性和静态属性开了小灶，实例下只有公有属性才会被允许使用和提示出来。

另外ts还提供了enum语法糖：

```ts
enum HttpCode {
    /** 成功 */
    '200_OK' = 200,
    /** 已生成了新的资源 */
    '201_Created' = 201,
    /** 请求稍后会被处理 */
    '202_Accepted' = 202,
    /** 资源已经不存在 */
    '204_NoContent' = 204,
    /** 被请求的资源有一系列可供选择的回馈信息 */
    '300_MultipleChoices' = 300,
    /** 永久性转移 */
    '301_MovedPermanently' = 301,
    /** 暂时性转移 */
    '302_MoveTemporarily' = 302,
}

HttpCode['200_OK']
HttpCode[200]
```

相比简单对象定义的key-value，只能通过key去访问value，不能通过value访问key。但是在enum当中，正反都可以当做key来用。

编译后的代码有兴趣的同学可以了解下~

```js
"use strict";
var HttpCode;
(function (HttpCode) {
    /** 成功 */
    HttpCode[HttpCode["200_OK"] = 200] = "200_OK";
    /** 已生成了新的资源 */
    HttpCode[HttpCode["201_Created"] = 201] = "201_Created";
    /** 请求稍后会被处理 */
    HttpCode[HttpCode["202_Accepted"] = 202] = "202_Accepted";
    /** 资源已经不存在 */
    HttpCode[HttpCode["204_NoContent"] = 204] = "204_NoContent";
    /** 被请求的资源有一系列可供选择的回馈信息 */
    HttpCode[HttpCode["300_MultipleChoices"] = 300] = "300_MultipleChoices";
    /** 永久性转移 */
    HttpCode[HttpCode["301_MovedPermanently"] = 301] = "301_MovedPermanently";
    /** 暂时性转移 */
    HttpCode[HttpCode["302_MoveTemporarily"] = 302] = "302_MoveTemporarily";
})(HttpCode || (HttpCode = {}));
HttpCode['200_OK'];
HttpCode[200];
```

## 优点以及不足

通过上面的几个栗子，大概可以看出使用了ts后，可以获得以下技能点：

- 清晰的函数参数/接口属性，增加了代码可读性和可维护性
- 静态检查
- 生成API文档
- 配合现代编辑器，各种提示
- 活跃的社区

以及对应的技术成本

|  | 维护者(包的作者) | 使用者 |
| --- | --- | --- |
| 收益 | 清晰的函数参数/接口属性 </br> 静态检查 </br> 生成api文档  | 清晰的函数参数/接口属性 </br> 配合现代编辑器，各种提示 |
| 代价 | 标记类型 </br> 声明(interface/type) | 和某些库结合的不是很完美(没错，说的就是vue 2.x) |

这里提到的vue2.x由于ts先天能力的不足，导致vue的ts语法需要使用class风格(运行时会被转换回原本的vue构造函数的语法)，和我们平时熟悉的vue风格有些差异

![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rsho98utj30is0icqa9.jpg)

这里是因为vue的this下的环境比较复杂，对于ide来说需要在运行时才能确定，因此在编写ts的时候需要手动去设置属性(比如props,data,methods等)到this下面，非常麻烦。早期ts并不支持手动编写this的作用域，后来专门为其设计了一个`ThisType`的方法。

在上面的代码里用了`class`的写法，本身所有需要的属性就在this下，规避了运行时才能确定this下需要的作用域的问题。

另一方面，由于ts提示能力比较局限，比如在函数场景中，如果数据来源是独立的对象，体验就会比较糟糕。

请阅读以下栗子(这一块稍微超纲了标题'安利'的范畴，不太理解的新同学可以入坑以后再消化~)

```ts
interface IOptions {
    name: string
    age: number
    extra: {
        data: Object
        methods: Object
    }
}

// 参数options要求符合IOptions定义的规则
function sthConstructor (options: IOptions) {}

// options对象当中并没有任何ts的静态检查和提示
const options = {
    name: 'peter',
    age: '13', // error: age应该为数字
    extra: {
        data: [],
        methods: {}
    }
}
// options飘红报错，然而提示内容废话太多，关键信息藏得太深
sthConstructor(options)
```

![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshpnx95j31420naqe6.jpg)

在上面的场景，我们希望在options当中能够获得完整的ts检查能力。达成这个目的有三种方法：

1.将options里面的东西挪进函数当中

![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshqpfvpj30d2092mz4.jpg)

2.将`options`用IObject定义

![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshrnhupj30e607y76i.jpg)

3.提供一个helper方法

![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshrynz2j30gq0dijvy.jpg)

这三种方式当中：

方法1是最简单的方式，但是在大型项目当中，这样的写法反而很少见到。

方法2是维护者常用的方式，但是对于使用者而言，成本较高。因为使用者需要去lib里翻到方法对应的type类型，将它import进来。

方法3是个人觉得相对比较好的方式，只要维护者提供一个类似`helper`的函数包装一下，就可以获得对应的提示。是不是很像vue ts的装饰器?

但上述三种解决方式我觉得都不优雅，这就是ts当前的不足之一。

![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshsz0uyj30ie0g2n6g.jpg)

## ts在js中的玩法

TypeScript是和vscode都是微软的亲儿子，他们兄弟俩相互协作肯定会有更多小花样，甚至你用的只是js文件，也可以享受到。

这里抛砖引玉列出两条：

#### <font color=green>-配置文件自动提示</font>

只要有types文件，所有配置都可以自动提示：

```
/**
 * webpack配置自动提示
 * 
 * 先安装对应的types包： `npm i @types/webpack -D`
 * 
 * @type {import('webpack').Configuration}
 */
const config = {
    
}
```

![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshu44dog30nl0d1dkw.gif)

#### <font color=green>-js语法检查</font>

在js中也可以获得自动提示和静态检查。只要在vscode的setting当中勾上`Check JS`即可。虽然你的js代码可能会被各种飘红🤪

![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshvit6ij30oy0a741k.jpg)

⬇️ 之前的例子在js中也可以提示出一些bug了

![](https://tva1.sinaimg.cn/large/006y8mN6gy1g7rshwi2eij30io0eaadl.jpg)

## 写在最后

有的同学会问：我才学js，可以学ts吗？可以，并且建议，因为会对js基础知识加深理解。有用法问题在stackoverflow上搜搜就解决了。

那么这么有用的工具，去哪可以学到呢？或许你可以参考下我学习的轨迹：

[传送门--TypeScript 入门教程 (墙裂推荐)](https://github.com/xcatliu/typescript-tutorial/blob/master/README.md)

[传送门--为 Vue3 学点 TypeScript , 体验 TypeScript](https://juejin.im/entry/5d19adb3f265da1b7b31a28b)

[传送门--一篇朴实的文章带你30分钟捋完TypeScript,方法是正反对比](https://juejin.im/post/5d53a8895188257fad671cbc)

[传送门--stack overflow (墙裂推荐)](https://stackoverflow.com/)

[传送门--google](https://www.google.com/)

今年ts突然遍地开花，似乎成为了潮流。各种ts改造、学习教程、心得出现在了各大学习、交友网站上。
有的同学可能也发现了：这不就就是java这类语言玩剩了的东西了吗？

那年轻的时候谁不都想自由嘛，然而随着年龄大了都被管的服服帖帖的

![](https://user-gold-cdn.xitu.io/2019/9/28/16d769e2fca9b963?w=380&h=584&f=png&s=160807)
