---
title: 手把手教你写一个AST解析器
date: 2019-10-17 12:07:18
cover: http://img10.360buyimg.com/jdphoto/jfs/t1/60663/11/12316/608013/5d9c0c97E87cc646c/283a78ebaa056e47.png
thumbnail: http://img10.360buyimg.com/jdphoto/jfs/t1/60663/11/12316/608013/5d9c0c97E87cc646c/283a78ebaa056e47.png
categories: Web前端
tags: 
  - AST
---

> 作者：深山蚂蚁

AST 解析器工作中经常用到，Vue.js中的VNode就是如此！  
其实如果有需要将 非结构化数据转 换成 结构化对象用 来分析、处理、渲染的场景，我们都可以用此思想做转换。

## 如何解析成 AST ？

我们知道 HTML 源码只是一个文本数据，尽管它里面包含复杂的含义和嵌套节点逻辑，但是对于浏览器，Babel 或者 Vue 来说，输入的就是一个长字符串，显然，纯粹的一个字符串是表示不出来啥含义，那么就需要转换成结构化的数据，能够清晰的表达每一节点是干嘛的。字符串的处理，自然而然就是强大的正则表达式了。 <!--more--> 

本文阐述 AST 解析器的实现方法和主要细节，简单易懂~~~~~~~~，总共解析器代码不过百行！

## 目标

本次目标，一步一步将如下 HTML 结构文档转换成 AST 抽象语法树
```html
<div class="classAttr" data-type="dataType" data-id="dataId" style="color:red">我是外层div
    <span>我是内层span</span>
</div>
```
结构比较简单，外层一个div,内层嵌套一个span，外层有class,data，stye等属性。  
麻雀虽小，五脏俱全，基本包含我们经常用到的了。其中转换后的 AST 结构 有哪些属性，需要怎样的形式显示，都可以根据需要自己定义即可。   
本次转换后的结构：  
```js
{
    "node": "root",
    "child": [{
        "node": "element",
        "tag": "div",
        "class": "classAttr",
        "dataset": {
            "type": "dataType",
            "id": "dataId"
        },
        "attrs": [{
            "name": "style",
            "value": "color:red"
        }],
        "child": [{
            "node": "text",
            "text": "我是外层div"
        }, {
            "node": "element",
            "tag": "span",
            "dataset": {},
            "attrs": [],
            "child": [{
                "node": "text",
                "text": "我是内层span"
            }]
        }]
    }]
}
```
不难发现，外层是根节点，然后内层用child一层一层标记子节点，有 attr 标记节点的属性，classStr 来标记 class 属性，data来标记 data- 属性，type 来标记节点类型，比如自定义的 data-type="title" 等。   

## 回顾正则表达式
先来看几组简单的正则表达式：  

- ^ 匹配一个输入或一行的开头，/^a/匹配"ab"，而不匹配"ba"
- $ 匹配一个输入或一行的结尾，/a$/匹配"ba"，而不匹配"ab"
- * 匹配前面元字符0次或多次，/ab*/将匹配a,ab,abb,abbb  
- + 匹配前面元字符1次或多次，/ab+/将匹配ab,abb,但是不匹配a
- [ab] 字符集匹配，匹配这个集合中的任一一个字符(或元字符)，/[ab]/将匹配a,b,ab
- \w 组成单词匹配，匹配字母，数字，下划线，等于[a-zA-Z0-9]

## 匹配标签元素
首先我们将如下的 HTML 字符串用正则表达式表示出来：    
```html
<div>我是一个div</div>
```
这个字符串用正则描述大致如下：  

以 < 开头 跟着 div 字符，然后接着 > ，然后是中文 “我是一个 div”，再跟着 </ ，然后继续是元素 div 最后已 > 结尾。   

1. <div>  

div 是HTML的标签，我们知道HTML标签是已字母和下划线开头，包含字母、数字、下滑线、中划线、点号组成的，对应正则如下：  
```js
const ncname = '[a-zA-Z_][\w-.]*'
```
于是组合的正则表达式如下：  
```js
`<${ncname}>`
```
2. <div></div>  
根据上面分析，很容易得出正则表达式为下：   
```js
`<${ncname}></${ncname}>`
```
3. <div>我是一个div</div>  

标签内可以是任意字符，那么任意字符如何描述呢？   
\s 匹配一个空白字符
\S 匹配一个非空白字符
\w 是字母数字数字下划线   
\W 是非\w的   
同理还有\d和\D等。   
我们通常采用\s和\S来描述任何字符（1、通用，2、规则简单，利于正则匹配）：   
```js
`<${ncname}>[\s\S]*</${ncname}>`
```
## 匹配标签属性

HTML标签上的属性名称有哪些呢，常见的有class,id,style,data-属性，当然也可以用户随便定义。但是属性名称我们也需要遵循原则，通常是用字母、下划线、冒号开头(Vue的绑定属性用:开头，通常我们不会这么定义)的，然后包含字母数字下划线中划线冒号和点的，正则描述如下：  
```js
const attrKey = /[a-zA-Z_:][-a-zA-Z0-9_:.]*/
```
HTML的属性的写法目前有以下几种：  
1. class="title"
2. class='title'
3. class=title

```js
const attr = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)=("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)/
```
attrKey 跟着 = ，然后跟着三种情况:  

1. ” 开头 跟着多个不是 " 的字符，然后跟着 ” 结尾
2. ' 开头 跟着多个不是 ‘ 的字符，然后跟着 ' 结尾
3. 不是（空格，”，’,=,<,>）的多个字符

我们测试一下attr的正则   
```JS
"class=abc".match(attr);
// output
(6) ["class=abc", "class", "abc", undefined, undefined, "abc", index: 0, input: "class=abc", groups: undefined]

"class='abc'".match(attr);
// output
(6) ["class='abc'", "class", "'abc'", undefined, "abc", undefined, index: 0, input: "class='abc'", groups: undefined]
```
我们发现，第二个带单引号的，匹配的结果是"‘abc’"，多了一个单引号‘，因此我们需要用到正则里面的非匹配获取（?:）了。  
例子：  
```js
"abcde".match(/a(?:b)c(.*)/);   输出 ["abcde", "de", index: 0, input: "abcde"]
```
这里匹配到了b，但是在output的结果里面并没有b字符。   
场景：正则需要匹配到存在b，但是输出结果中不需要有该匹配的字符。      
于是我么增加空格和非匹配获取的属性匹配表达式如下：  
```js
const attr = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/
```
 = 两边可以增加零或多个空格，= 号右边的匹配括号使用非匹配获取，那么类似 = 号右侧的最外层大括号的获取匹配失效，而内层的括号获取匹配的是在双引号和单引号里面。效果如下：  

 ![正则](https://raw.githubusercontent.com/antiter/blogs/master/images/ast_1.png?raw=true)   

 从图中我们清晰看到，匹配的结果的数组的第二位是属性名称，第三位如果有值就是双引号的，第四位如果有值就是单引号的，第五位如果有值就是没有引号的。

## 匹配节点

有了上面的标签匹配和属性匹配之后，那么将两者合起来就是如下：  

```js
/<[a-zA-Z_][\w\-\.]*(?:\s+([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))*>[\s\S]*<\/[a-zA-Z_][\w\-\.]*>/
```
上述正则完整描述了一个节点，理解了签名的描述，现在看起来是不是很简答啦~

## AST 解析实战

有了前面的HTML节点的正则表达式的基础，我们现在开始解析上面的节点元素。   
显然，HTML 节点拥有复杂的多层次的嵌套，我们无法用一个正则表达式就把 HTML 的结构都一次性的表述出来，因此我们需要一段一段处理。   
我们将字符串分段处理，总共分成三段：  
1. 标签的起始   
2. 标签内的内容
3. 标签的结束  

于是将上述正则拆分：  
```js
const DOM = /<[a-zA-Z_][\w\-\.]*(?:\s+([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))*>[\s\S]*<\/[a-zA-Z_][\w\-\.]*>/;
// 增加()分组输出
const startTag = /<([a-zA-Z_][\w\-\.]*)((?:\s+([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))*)\s*(\/?)>/;

const endTag = /<\/([a-zA-Z_][\w\-\.]*)>/;

const attr = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g

// 其他的就是标签里面的内容了
```
不难发现，标签已 < 开头，为标签起始标识位置，已 </ 开头的为标签结束标识位置。  
我们将 HTML 拼接成字符串形式，就是如下了。  
```js
let html = '<div class="classAttr" data-type="dataType" data-id="dataId" style="color:red">我是外层div<span>我是内层span</span></div>';
```
我们开始一段一段处理上面的 html 字符串吧~  
```js
const bufArray = [];
const results = {
    node: 'root',
    child: [],
};
let chars;
let match;
while (html&&last!=html){
    last = html;
    chars = true;// 是不是文本内容
    // do something parse html
}
```
bufArray: 用了存储未匹配完成的起始标签   
results: 定义一个开始的 AST 的节点。  
我们再循环处理HTML的时候，如果已经处理的字符，则将其删除，这里判断 last!=html 如果处理一轮之后，html 还是等于 last，说明没有需要处理的了，结束循环。   

首先判断是否是 </ 开头，如果是则说明是标签结尾标识
```js
if(html.indexOf("</")==0){
    match = html.match(endTag);
    if(match){
        chars = false;
        html = html.substring(match[0].length);
        match[0].replace(endTag, parseEndTag);
    }
}
```
已 </ 开头，且能匹配上实时截止标签的正则，则该 html 字符串内容要向后移动匹配到的长度，继续匹配剩下的。   
这里使用了 replace 方法，parseEndTag 的参数就是"()"匹配的输出结果了，已经匹配到的字符再 parseEndTag 处理标签。  

如果不是已 </ 开头的，则判断是否是 < 开头的，如果是说明是标签起始标识，同理，需要 substring 来剔除已经处理过的字符。  
```js
else if(html.indexOf("<")==0){
    match = html.match(startTag);
    if(match){
        chars = false;
        html = html.substring(match[0].length);
        match[0].replace(startTag, parseStartTag);
    }
}
```
如果既不是起始标签，也不是截止标签，或者是不符合起始和截止标签的正则，我们统一当文本内容处理。 
```js
if(chars){
    let index = html.indexOf('<');
    let text;
    if(index < 0){
        text = html;
        html = '';
    }else{
        text = html.substring(0,index);
        html = html.substring(index);;
    }
    const node = {
        node: 'text',
        text,
    };
    pushChild(node);
}
```
如果是文本节点，我们则加入文本节点到目标 AST 上，我们着手 pushChild 方法，bufArray 是匹配起始和截止标签的临时数组，存放还没有找到截止标签的起始标签内容。  

```js
function pushChild (node) {
    if (bufArray.length === 0) {
        results.child.push(node);
    } else {
        const parent = bufArray[bufArray.length - 1];
        if (typeof parent.child == 'undefined') {
            parent.child = [];
        }
        parent.child.push(node);
    }
}
```
如果没有 bufArray ，说明当前Node是一个新Node，不是上一个节点的嵌套子节点，则新push一个节点；否则 取最后一个bufArray的值，也就是最近的一个未匹配标签起始节点，将当前节点当做为最近节点的子节点。  
```html
<div><div></div></div>
```
显然，第一个 <\/div> 截止节点，匹配这里的第二个起始节点 <div> ，即最后一个未匹配的节点。   

在每一轮循环中，如果是符合预期，HTML字符串会越来越少，直到被处理完成。   

接下来我们来处理  parseStartTag 方法，也是稍微复杂一点的方法。     

```js
function parseStartTag (tag, tagName, rest) {
    tagName = tagName.toLowerCase();

    const ds = {};
    const attrs = [];
    let unary = !!arguments[7];

    const node = {
        node: 'element',
        tag:tagName
    };
    rest.replace(attr, function (match, name) {
        const value = arguments[2] ? arguments[2] :
            arguments[3] ? arguments[3] :
                arguments[4] ? arguments[4] :'';
        if(name&&name.indexOf('data-')==0){
            ds[name.replace('data-',"")] = value;
        }else{
            if(name=='class'){
                node.class = value;
            }else{
                attrs.push({
                    name,
                    value
                });
            }
        }
    });
    node.dataset = ds;
    node.attrs = attrs;
    if (!unary){
         bufArray.push(node);
    }else{
        pushChild(node);
    }
}
```
遇到起始标签，如果该起始标签不是一个结束标签(unary为true，如：<img />,如果本身是截止标签，那么直接处理完即可)，则将起始标签入栈，等待找到下一个匹配的截止标签。    
起始标签除了标签名称外的属性内容，我们将 dataset 内容放在dataset字段，其他属性放在attrs   

我们接下来看下处理截止标签   
```js
function parseEndTag (tag, tagName) {
    let pos = 0;
    for (pos = bufArray.length - 1; pos >= 0; pos--){
        if (bufArray[pos].tag == tagName){ 
            break; 
        }
    }
    if (pos >= 0) {
        pushChild(bufArray.pop());
    }
}
```
记录还未匹配到的起始标签的bufArray数组，从最后的数组位置开始查找，找到最近匹配的标签。  
比如：  
```html
<div class="One"><div class="Two"></div></div>
```
class One的标签先入栈，class Two的再入栈，然后遇到第一个<\/div>，匹配的则是class Two的起始标签，然后再匹配的是class One的起始标签。

到此，一个简单的 AST解析器已经完成了。  

当然，本文是实现一个简单的 AST解析器，基本主逻辑已经包含，完整版参考如下：  

[完整解析参考：vue-html-parse](https://github.com/vuejs/vue/blob/dev/src/compiler/parser/html-parser.js)


本文的 AST解析器的完整代码如下：  

[easy-ast](https://github.com/antiter/blogs/tree/master/code-mark/easy-ast.js)