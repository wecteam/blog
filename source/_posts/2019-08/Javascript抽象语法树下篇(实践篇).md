---
title: Javascript抽象语法树下篇(实践篇)
subtitle: AST应用
cover: https://img11.360buyimg.com/jdphoto/s1206x333_jfs/t1/50930/18/7113/140191/5d4b8ef0Effa8d6bc/e776e627fe5e3f93.png
date: 2019-07-20 22:00:00
tags: 
  - AST
categories: NodeJS
author:
    nick: 陈晓强
    github_name: chenxiaoqiang12
---

上篇已经对AST基础做了介绍，本篇介绍AST的运用

## AST应用的三个要点
1. 需要一个解析器，将代码转换为AST
2. 需要一个遍历器，能够遍历AST,并能够方便的对AST节点进行增删改查等操作
3. 需要一个代码生成器，能够将AST转换为代码

## esprima与babel
常用的满足上述3个要点的工具包有两个，一个是`esprima`，一个是`babel `

esprima相关包及使用如下
```js
const esprima = require('esprima');   // code => ast
const estraverse = require('estraverse'); //ast遍历
const escodegen = require('escodegen'); // ast => code
let code = 'const a = 1';
const ast = esprima.parseScript(code);
estraverse.traverse(ast, {
    enter: function (node) {
        //节点操作
    }
});
const transformCode = escodegen.generate(ast);
```

babel相关包及使用如下
```js
const parser = require('@babel/parser');  //code => ast
const traverse = require('@babel/traverse').default; // ast遍历，节点增删改查，作用域处理等
const generate = require('@babel/generator').default; // ast => code
const t = require('@babel/types'); // 用于AST节点的Lodash式工具库,各节点构造、验证等
let code = 'const a = 1';
let ast = parser.parse(sourceCode);
traverse(ast, {
  enter (path) { 
    //节点操作
  }
})
const transformCode = escodegen.generate(ast);
```

目前babel不管是从生态上还是文档上比esprima要好很多，因此推荐大家使用babel工具，本文示例也使用babel来做演示。

## 使用babel工具操作AST
如上一章节所示
- `@babel/parser`用于将代码转换为AST
- `@babel/traverse`用于对AST的遍历，包括节点增删改查、作用域等处理
- `@babel/generator` 用于将AST转换成代码
- `@babel/types` 用于AST节点操作的Lodash式工具库,各节点构造、验证等

更多api详见[babel手册](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/zh-Hans/plugin-handbook.md)<sup>[1]</sup>

下面通过简单案例来介绍如何操作AST，注意案例只是示例，由于篇幅对部分边界问题只会注释说明，实际开发过程中需要考虑周全。

### 案例1:去掉代码中的console.log()

实现代码
```js
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');
let sourceCode = `
function square(n) {
  console.log(n);
  console.warn(n);
  return n * n;
}
`
let ast = parser.parse(sourceCode);
traverse(ast, {
 CallExpression(path) {
  let { callee } = path.node;
  if (callee.type === ‘MemberExpression’ && callee.object.name === ‘console’ && callee.property.name === ‘log’ ) {
   path.remove(); // 注意考虑对象挂载的识别，如global.console.log()，此时remove后剩下global.,会导致语法错误，此时可以判断父节点类型来排除
  }
 }
})
console.log(generate(ast).code);
```

处理结果
```diff
function square(n) {
-  console.log(n);
  console.warn(n);
  return n * n;
}
```


此案例涉及知识点
1. 如何通过traverse遍历特定节点
2. 识别出console.log()在规范中属于函数调用表达式,节点类型为`CallExpression`。
3. console.log本身即`callee`是在对象console上的一个方法，因此`console.log`是一个成员表达式，类型为`MemberExpression`。
4. `MemberExpression`根据规范有一个`object`属性代表被访问的对象，有一个`property`代表访问的成员。
5. 通过`path.remove()`api可以对节点进行删除。
6. 可以通过https://astexplorer.net/ 来辅助对代码节点的识别。注意选择`babylon7`，即babe7,对应`@babel/parser`


### 案例2:变量混淆

实现代码
```js
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');
let sourceCode = `
function square(number) {
  console.warn(number);
  return number * number;
}
`
let ast = parser.parse(sourceCode);
traverse(ast, {
  FunctionDeclaration(path) {
    let unia = path.scope.generateUidIdentifier("a");
    path.scope.rename("number",unia.name);
 }
})

console.log(generate(ast).code);
```

处理结果
```diff
-function square(number) {
+  function square(_a) {
-  console.warn(number);
+  console.warn(_a);
-  return number * number;
+  return _a * _a;
}
```

此案例涉及知识点
1. `path.scope`保存了当前作用域的相关信息
2. 可以通过api对作用域内的变量名进行批量修改操作
3. 通过`path.scope`可以获得当前作用域唯一标识符，避免变量名冲突



### 案例3:转换箭头函数并去掉未使用参数

实现代码
```js
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');
let sourceCode = `
new Promise((resolve,reject)=>{
  setTimeout(()=>{
    resolve(1);
  },200)
});
`
let ast = parser.parse(sourceCode);
traverse(ast, {
  ArrowFunctionExpression (path) { 
    let { id, params, body } = path.node;
    for(let key in path.scope.bindings){   //注意考虑箭头函数的this特性，若发现函数体中有this调用，则需要在当前作用域绑定其父作用域的this
      if(!path.scope.bindings[key].referenced){
        params = params.filter(param=>{
          return param.name!==key;
        })
      }
    }
  path.replaceWith(t.functionExpression(id, params, body)); 
  }
})

console.log(generate(ast).code);
```

处理结果
```diff
-new Promise((resolve,reject)=>{
+new Promise(function(resolve){
-  setTimeout(()=>{
+  setTimeout(function(){
    resolve(1);
  },200)
});
```

此案例涉及知识点
1. 箭头函数节点：`ArrowFunctionExpression`
2. 通过path.scope可以识别变量引用情况，是否有被引用，被哪些路径引用
3. 通过@babel/types可以很方便的构建任意类型节点
4. 通过`path.replaceWith()`可以进行节点替换

### 案例4:京东购物小程序的Tree-shaking

删掉小程序中的冗余代码，`部分`实现代码示例如下
```js
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');
let sourceCode = `
export function square (x) {
    return x * x;
}
export function cube (x) {
    return x * x * x;
}
`
let ast = parser.parse(sourceCode);
traverse(ast, {
  ExportNamedDeclaration (path) {
    let unused = ['cube']   // 借助webpack，我们能获得导出的方法中，哪些是没有被使用过的
    let { declaration = {} } = path.node;
    if (declaration.type === 'FunctionDeclaration') {
      unused.forEach(exportItem => {
        // references=1表示仅有一次引用，即export的引用，没有在别处调用
        if (declaration.id.name === exportItem && path.scope.bindings[exportItem].references === 1) {
          path.remove();
        }
      });
    }
  }
})

console.log(generate(ast).code);
```

处理结果
```diff
export function square (x) {
    return x * x;
}
-export function cube (x) {
-    return x * x * x;
-}
```

此案例涉及知识点
1. export节点：`ExportNamedDeclaration`



### 案例5:将代码转换成svg流程图
此案例是git上一个比较有意思的开源项目，通过AST将代码转换为svg流程图，详见[js-code-to-svg-flowchart](https://github.com/Bogdan-Lyashenko/js-code-to-svg-flowchart)<sup>[2]</sup>

可以体验一下：[demo](https://bogdan-lyashenko.github.io/js-code-to-svg-flowchart/docs/live-editor/index.html)<sup>[3]</sup>

通过以上示例，可以看到通过AST我们可以对代码任意蹂躏，做出很多有意思的事情

## AST在其他语言的应用
除了Javascript，其他语言如HTML、CSS、SQL等也有广泛的AST应用。如下图，可以在这里找到对应语言的解析器，开启AST之门。

![其他AST](https://img11.360buyimg.com/jdphoto/s600x600_jfs/t1/43052/11/11500/153664/5d4c1b42E574a7b81/886ebd80827cc3fa.jpg)

## 结语
在上述[AST网站](https://astexplorer.net/)中，可以看到HTML的解析器有个vue选项，读过vue源码的同学应该知道vue模板在转换成HTML之前会先将模板转换成AST然后生成render function进而生成VirtualDOM。我们平时开发对AST使用比较少，但其实到处都能见到AST的影子：babel、webpack、eslint、taro等等。希望能抛砖引玉，使同学们在各自团队产出更多基于AST的优秀工具、项目。

**References**  
[1] babel手册：https://github.com/jamiebuilds/babel-handbook/blob/master/translations/zh-Hans/plugin-handbook.md  
[2] js-code-to-svg-flowchart：https://github.com/Bogdan-Lyashenko/js-code-to-svg-flowchart  
[3] demo：https://bogdan-lyashenko.github.io/js-code-to-svg-flowchart/docs/live-editor/index.html  