---
title: 手把手教你写webpack loader
date: 2019-09-17 09:32:51
cover: https://img10.360buyimg.com/wq/jfs/t1/74297/12/5206/14769/5d359eedEb8b76619/be9c3c22fbe93ae2.jpg
thumbnail: https://img10.360buyimg.com/wq/jfs/t1/74297/12/5206/14769/5d359eedEb8b76619/be9c3c22fbe93ae2.jpg
tags: 
  - webpack loader
  - 工程化
categories: Web开发
---

> 作者：黄浩群 

## 一、什么是 loader
 
loader 和 plugins 是 webpack 系统的两大重要组成元素。依靠对 loader、plugins 的不同组合搭配，我们可以灵活定制出高度适配自身业务的打包构建流程。

loader 是 webpack 容纳各类资源的一个重要手段，它用于对模块的源代码进行转换，允许你在 import 或加载模块时预处理文件，利用 loader，我们可以将各种类型的资源转换成 webpack 本质接受的资源类型，如 javascript。
<!--more-->
## 二、如何编写一个 yaml-loader

### 1、YAML

yaml 语言多用于编写配置文件，结构与 JSON 类似，但语法格式比 JSON 更加方便简洁。yaml 支持注释，大小写敏感，使用缩进来表示层级关系：

```yaml
#对象 
version: 1.2.4
#数组
author:
  - Mike
  - Hankle
#常量
name: "my project" #定义一个字符串
limit: 30 #定义一个数值
es6: true #定义一个布尔值
openkey: Null #定义一个null
#锚点引用
server:
  base: &base
    port: 8005
  dev:
    ip: 120.168.117.21
    <<: *base
  gamma:
    ip: 120.168.117.22
    <<: *base
```

等同于：

```json
{
  "version": "1.2.4",
  "author": ["Mike", "Hankle"],
  "name": "my project",
  "limit": 30,
  "es6": true,
  "openkey": null,
  "server": {
    "base": {
      "port": 8005
    },
    "dev": {
      "ip": "120.168.117.21",
      "port": 8005
    },
    "gamma": {
      "ip": "120.168.117.22",
      "port": 8005
    }
  }
}
```

在基于 webpack 构建的应用中，如果希望能够引用 yaml 文件中的数据，就需要一个 yaml-loader 来支持编译。一般情况下，你都能在 npm 上找到可用的 loader，但如果万一没有对应的支持，或者你希望有一些自定义的转换，那么就需要自己编写一个 webpack loader 了。

### 2、loader 的原理

loader 是一个 node 模块，它导出为一个函数，用于在转换资源时调用。该函数接收一个 String/Buffer 类型的入参，并返回一个 String/Buffer 类型的返回值。一个最简单的 loader 是这样的：

```js
// loaders/yaml-loader.js
module.exports = function(source) {
  return source;
};
```

loader 支持管道式传递，对同一类型的文件，我们可以使用多个 loader 进行处理，这批 loader 将按照“从下到上、从右到左”的顺序执行，并以前一个 loader 的返回值作为后一个 loader 的入参。这个机制无非是希望我们在编写 loader 的时候能够尽量避免重复造轮子，只关注需要实现的核心功能。因此配置的时候，我们可以引入 json-loader：

```js
// webpack.config.js
const path = require("path");

module.exports = {
  // ...
  module: {
    rules: [
      {
        test: /\.yml$/,
        use: [
          {
            loader: "json-loader"
          },
          {
            loader: path.resolve(__dirname, "./loaders/yaml-loader.js")
          }
        ]
      }
    ]
  }
};
```

### 3、开始

这样一来，我们需要的 yaml-loader，就只做一件事情：将 yaml 的数据转化成为一个 JSON 字符串。因此，我们可以很简单地实现这样一个 yaml-loader：

```js
var yaml = require("js-yaml");

module.exports = function(source) {
  this.cacheable && this.cacheable();
  try {
    var res = yaml.safeLoad(source);
    return JSON.stringify(res, undefined, "\t");
  } catch (err) {
    this.emitError(err);
    return null;
  }
};
```

就是这么简单。但是可能有朋友会问，这里是因为有个现成的模块 js-yaml，可以直接将 yaml 转换成 JavaScript 对象，万一没有这个模块，该怎么做呢？是的，loader 的核心工作其实就是字符串的处理，这是个相当恶心的活儿，尤其是在这类语法转换的场景上，对源代码的字符串处理将变得极其复杂。这个情况下，我们可以考虑另外一种解法，借助 AST 语法树，来协助我们更加便捷地操作转换。

### 4、利用 AST 作源码转换

yaml-ast-parser 是一个将 yaml 转换成 AST 语法树的 node 模块，我们把字符串解析的工作交给了 AST parser，而操作 AST 语法树远比操作字符串要简单、方便得多：

```js
const yaml = require("yaml-ast-parser");

class YamlParser {
  constructor(source) {
    this.data = yaml.load(source);
    this.parse();
  }

  parse() {
    // parse ast into javascript object
  }
}

module.exports = function(source) {
  this.cacheable && this.cacheable();
  try {
    const parser = new YamlParser(source);
    return JSON.stringify(parser.data, undefined, "\t");
  } catch (err) {
    this.emitError(err);
    return null;
  }
};
```

这里我们可以利用 AST parser 提供的方法直接转化出 json，如果没有或者有所定制，也可以手动实现一下 parse 的过程，仅仅只是一个树结构的迭代遍历而已，关键步骤是对 AST 语法树的各类型节点分别进行处理：

```js
const yaml = require("yaml-ast-parser");
const types = yaml.Kind;

class YamlParser {
  // ...
  parse() {
    this.data = this.traverse(this.data);
  }

  traverse(node) {
    const type = types[node.kind];

    switch (type) {
      // 对象
      case "MAP": {
        const ret = {};
        node.mappings.forEach(mapping => {
          Object.assign(ret, this.traverse(mapping));
        });
        return ret;
      }
      // 键值对
      case "MAPPING": {
        let ret = {};
        // 验证
        const keyValid =
          yaml.determineScalarType(node.key) == yaml.ScalarType.string;
        if (!keyValid) {
          throw Error("键值非法");
        }

        if (node.key.value == "<<" && types[node.value.kind] === "ANCHOR_REF") {
          // 引用合并
          ret = this.traverse(node.value);
        } else {
          ret[node.key.value] = this.traverse(node.value);
        }
        return ret;
      }
      // 常量
      case "SCALAR": {
        return node.valueObject !== undefined ? node.valueObject : node.value;
      }
      // 数组
      case "SEQ": {
        const ret = [];
        node.items.forEach(item => {
          ret.push(this.traverse(item));
        });
        return ret;
      }
      // 锚点引用
      case "ANCHOR_REF": {
        return this.traverse(node.value);
      }
      default:
        throw Error("unvalid node");
    }
  }
}
// ...
```

当然这样的实现略为粗糙，正常来说，一些完备的 AST parser 一般都会自带遍历方法（traverse），这样的方法都是有做过优化的，我们可以直接调用，尽量避免自己手动实现。

按照相同的做法，你还可以实现一个 markdown-loader，甚至更为复杂的 vue-loader。

## 三、loader 的一些开发技巧

### 1、单一任务

只做一件事情，做好一件事情。loader 的管道（pipeline）设计正是希望能够将任务拆解并独立成一个个子任务，由多个 loader 分别处理，以此来保证每个 loader 的可复用性。因此我们在开发 loader 前一定要先给 loader 一个准确的功能定位，从通用的角度出发去设计，避免做多余的事。

### 2、无状态

loader 应该是不保存状态的。这样的好处一方面是使我们 loader 中的数据流简单清晰，另一方面是保证 loader 具有良好可测性。因此我们的 loader 每次运行都不应该依赖于自身之前的编译结果，也不应该通过除出入参外的其他方式与其他编译模块进行数据交流。当然，这并不代表 loader 必须是一个无任何副作用的纯函数，loader 支持异步，因此是可以在 loader 中有 I/O 操作的。

### 3、尽可能使用缓存

在开发时，loader 可能会被不断地执行，合理的缓存能够降低重复编译带来的成本。loader 执行时默认是开启缓存的，这样一来， webpack 在编译过程中执行到判断是否需要重编译 loader 实例的时候，会直接跳过 rebuild 环节，节省不必要重建带来的开销。

当且仅当有你的 loader 有其他不稳定的外部依赖（如 I/O 接口依赖）时，可以关闭缓存：

```js
this.cacheable && this.cacheable(false);
```