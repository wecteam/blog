---
title: 换种方式读源码：如何实现一个简易版的Mocha
date: 2019-10-09 11:38:01
cover:  https://img12.360buyimg.com/jdphoto/s720x500_jfs/t1/55376/13/6006/26944/5d39aef7E0f8caba4/5943c06be69970c0.jpg
thumbnail: https://img12.360buyimg.com/jdphoto/s720x500_jfs/t1/55376/13/6006/26944/5d39aef7E0f8caba4/5943c06be69970c0.jpg
tags: 
  - Mocha
  - BDD/TDD
  - 测试框架
categories: Web前端
---

> 作者：黄浩群

## 前言

Mocha 是目前最流行的 JavaScript 测试框架，理解 Mocha 的内部实现原理有助于我们更深入地了解和学习自动化测试。然而阅读源码一直是个让人望而生畏的过程，大量的高级写法经常是晦涩难懂，大量的边缘情况的处理也十分影响对核心代码的理解，以至于写一篇源码解析过后往往是连自己都看不懂。所以，这次我们不生啃 Mocha 源码，换个方式，从零开始一步步实现一个简易版的 Mocha。

## 我们将实现什么？

- 实现 Mocha 框架的 BDD 风格测试，能通过 describe/it 函数定义一组或单个的测试用例；
- 实现 Mocha 框架的 Hook 机制，包括 before、after、beforeEach、afterEach；
- 实现简单格式的测试报告输出。
<!--more-->
## Mocha 的 BDD 测试

Mocha 支持 BDD/TDD 等多种测试风格，默认使用 BDD 接口。BDD（行为驱动开发）是一种以需求为导向的敏捷开发方法，相比主张”测试先行“的 TDD（测试驱动开发）而言，它强调”需求先行“，从一个更加宏观的角度去关注包括开发、QA、需求方在内的多方利益相关者的协作关系，力求让开发者“做正确的事“。在 Mocha 中，一个简单的 BDD 式测试用例如下：

```js
describe('Array', function() {
  describe('#indexOf()', function() {
    before(function() {
      // ...
    });
    it('should return -1 when not present', function() {
      // ...
    });
    it('should return the index when present', function() {
      // ...
    });
    after(function() {
      // ...
    });
  });
});
```

Mocha 的 BDD 测试主要包括以下几个 API：
- `describe/context`：行为描述，代表一个测试块，是一组测试单元的集合；
- `it/specify`：描述了一个测试单元，是最小的测试单位；
- `before`：Hook 函数，在执行该测试块之前执行；
- `after`：Hook 函数，在执行该测试块之后执行；
- `beforeEach`：Hook 函数，在执行该测试块中每个测试单元之前执行；
- `afterEach`：Hook 函数，在执行该测试块中每个测试单元之后执行。

## 开始

话不多说，我们直接开始。

#### 一、目录设计

新建一个项目，命名为 simple-mocha。目录结构如下：

```js
├─ mocha/
│   ├─ index.js
│   ├─ src/
│   ├─ interfaces/
│   └─ reporters/
├─ test/
└─ package.json
```

先对这个目录结构作简单解释：
- `mocha/`：存放我们即将实现的 simple-mocha 的源代码
- `mocha/index.js`：simple-mocha 入口
- `mocha/src/`：simple-mocha 核心代码
- `mocha/interfaces/`：存放各类风格的测试接口，如 BDD
- `mocha/reporters/`：存放用于输出测试报告的各种 reporter，如 SPEC
- `test/`：存放我们编写的测试用例
- `package.json`

其中 package.json 内容如下：

```json
{
  "name": "simple-mocha",
  "version": "1.0.0",
  "description": "a simple mocha for understanding the mechanism of mocha",
  "main": "",
  "scripts": {
    "test": "node mocha/index.js"
  },
  "author": "hankle",
  "license": "ISC"
}
```

执行 `npm test` 就可以启动执行测试用例。

#### 二、模块设计

Mocha 的 BDD 测试应该是一个”先定义后执行“的过程，这样才能保证其 Hook 机制正确执行，而与代码编写顺序无关，因此我们把整个测试流程分为两个阶段：收集测试用例（定义）和执行测试用例（执行）。我们构造了一个 Mocha 类来完成这两个过程，同时这个类也负责统筹协调其他各模块的执行，因此它是整个测试流程的核心。

```js
// mocha/src/mocha.js
class Mocha {
  constructor() {}
  run() {}
}

module.exports = Mocha;
```

```js
// mocha/index.js
const Mocha = require('./src/mocha');

const mocha = new Mocha();
mocha.run();
```

另一方面我们知道，describe 函数描述了一个测试集合，这个测试集合除包括若干测试单元外，还拥有着一些自身的 Hook 函数，维护了一套严格的执行流。it 函数描述了一个测试单元，它需要执行测试用例，并且接收断言结果。这是两个逻辑复杂的单元，同时需要维护一定的内部状态，我们用两个类（Suite/Test）来分别构造它们。此外我们可以看出，BDD 风格的测试用例是一个典型的树形结构，describe 定义的测试块可以包含测试块，也可以包含 it 定义的测试单元。所以 Suite/Test 实例还将作为节点，构造出一棵 suite-test 树。比如下边这个测试用例：

```js
describe('Array', function () {
  describe('#indexOf()', function () {
    it('should return -1 when not present', function () {
      // ...
    })
    it('should return the index when present', function () {
      // ...
    })
  })

  describe('#every()', function () {
    it('should return true when all items are satisfied', function () {
      // ...
    })
  })
})
```

由它构造出来的 suite-test 树是这样的：

```js
                                             ┌────────────────────────────────────────────────────────┐
                                           ┌─┤        test:"should return -1 when not present"        │
                    ┌────────────────────┐ │ └────────────────────────────────────────────────────────┘
                  ┌─┤ suite:"#indexOf()" ├─┤
                  │ └────────────────────┘ │ ┌────────────────────────────────────────────────────────┐
┌───────────────┐ │                        └─┤       test:"should return the index when present"      │
│ suite:"Array" ├─┤                          └────────────────────────────────────────────────────────┘
└───────────────┘ │
                  │ ┌────────────────────┐   ┌────────────────────────────────────────────────────────┐
                  └─┤  suite:"#every()"  ├───┤ test:"should return true when all items are satisfied" │ 
                    └────────────────────┘   └────────────────────────────────────────────────────────┘
```

因此，Suite/Test 除了要能够表示 describe/it 之外，还应该能够诠释这种树状结构的父子级关系：

```js
// mocha/src/suite.js
class Suite {
  constructor(props) {
    this.title = props.title;    // Suite名称，即describe传入的第一个参数
    this.suites = [];            // 子级suite
    this.tests = [];             // 包含的test
    this.parent = props.parent;  // 父suite
    this._beforeAll = [];        // before hook
    this._afterAll = [];         // after hook
    this._beforeEach = [];       // beforeEach hook
    this._afterEach = [];        // afterEach hook

    if (props.parent instanceof Suite) {
      props.parent.suites.push(this);
    }
  }
}

module.exports = Suite;
```

```js
// mocha/src/test.js
class Test {
  constructor(props) {
    this.title = props.title;  // Test名称，即it传入的第一个参数
    this.fn = props.fn;        // Test的执行函数，即it传入的第二个参数
  }
}

module.exports = Test;
```

我们完善一下目录结构：

```js
├─ mocha/
│   ├─ index.js
│   ├─ src/
│   │   ├─ mocha.js
│   │   ├─ runner.js
│   │   ├─ suite.js
│   │   ├─ test.js
│   │   └─ utils.js
│   ├─ interfaces/
│   │   ├─ bdd.js
│   │   └─ index.js
│   └─ reporters/
│       ├─ spec.js
│       └─ index.js
├─ test/
└─ package.json
```

考虑到执行测试用例的过程较为复杂，我们把这块逻辑单独抽离到 `runner.js`，它将在执行阶段负责调度 suite 和 test 节点并运行测试用例，后续会详细说到。

#### 三、收集测试用例

收集测试用例环节首先需要创建一个 suite 根节点，并把 API 挂载到全局，然后再执行测试用例文件 `*.spec.js` 进行用例收集，最终将生成一棵与之结构对应的 suite-test 树。

![](https://img14.360buyimg.com/jdphoto/jfs/t1/53678/4/6276/45324/5d3d8050Ec3ec53ee/f8ce3fdc0c125be1.png)

###### 1、suite 根节点

我们先创建一个 suite 实例，作为整棵 suite-test 树的根节点，同时它也是我们收集和执行测试用例的起点。

```js
// mocha/src/mocha.js
const Suite = require('./suite');

class Mocha {
  constructor() {
    // 创建一个suite根节点
    this.rootSuite = new Suite({
      title: '',
      parent: null
    });
  }
  // ...
}
```

###### 2、BDD API 的全局挂载

在我们使用 Mocha 编写测试用例时，我们不需要手动引入 Mocha 提供的任何模块，就能够直接使用 describe、it 等一系列 API。那怎么样才能实现这一点呢？很简单，把 API 挂载到 global 对象上就行。因此，我们需要在执行测试用例文件之前，先将 BDD 风格的 API 全部作全局挂载。

```js
// mocha/src/mocha.js
// ...
const interfaces = require('../interfaces');

class Mocha {
  constructor() {
    // 创建一个根suite
    // ...
    // 使用bdd测试风格，将API挂载到global对象上
    const ui = 'bdd';
    interfaces[ui](global, this.rootSuite);
  }
  // ...
}
```

```js
// mocha/interfaces/index.js
module.exports.bdd = require('./bdd');
```

```js
// mocha/interfaces/bdd.js
module.exports = function (context, root) {
  context.describe = context.context = function (title, fn) {}
  context.it = context.specify = function (title, fn) {}
  context.before = function (fn) {}
  context.after = function (fn) {}
  context.beforeEach = function (fn) {}
  context.afterEach = function (fn) {}
}
```

###### 3、BDD API 的具体实现

我们先看看 describe 函数怎么实现。

describe 传入的 fn 参数是一个函数，它描述了一个测试块，测试块包含了若干子测试块和测试单元。因此我们需要执行 describe 传入的 fn 函数，才能够获知到它的子层结构，从而构造出一棵完整的 suite-test 树。而逐层执行 describe 的 fn 函数，本质上就是一个深度优先遍历的过程，因此我们需要利用一个栈（stack）来记录 suite 根节点到当前节点的路径。

```js
// mocha/interfaces/bdd.js
const Suite = require('../src/suite');
const Test = require('../src/test');

module.exports = function (context, root) {
  // 记录 suite 根节点到当前节点的路径
  const suites = [root];

  context.describe = context.context = function (title, fn) {
    const parent = suites[0];
    const suite = new Suite({
      title,
      parent
    });

    suites.unshift(suite);
    fn.call(suite);
    suites.shift(suite);
  }
}
```

每次处理一个 describe 时，我们都会构建一个 Suite 实例来表示它，并且在执行 fn 前入栈，执行 fn 后出栈，保证 `suites[0]` 始终是当前正在处理的 suite 节点。利用这个栈列表，我们可以在遍历过程中构建出 suite 的树级关系。

同样的，其他 API 也都需要依赖这个栈列表来实现：

```js
// mocha/interfaces/bdd.js
module.exports = function (context, root) {
  // 记录 suite 根节点到当前节点的路径
  const suites = [root];

  // context.describe = ...

  context.it = context.specify = function (title, fn) {
    const parent = suites[0];
    const test = new Test({
      title,
      fn
    });
    parent.tests.push(test);
  }

  context.before = function (fn) {
    const cur = suites[0];
    cur._beforeAll.push(fn);
  }

  context.after = function (fn) {
    const cur = suites[0];
    cur._afterAll.push(fn);
  }

  context.beforeEach = function (fn) {
    const cur = suites[0];
    cur._beforeEach.push(fn);
  }

  context.afterEach = function (fn) {
    const cur = suites[0];
    cur._afterEach.push(fn);
  }
}
```

###### 4、执行测试用例文件

一切准备就绪，我们开始 `require` 测试用例文件。要完成这个步骤，我们需要一个函数来协助完成，它负责解析 test 路径下的资源，返回一个文件列表，并且能够支持 test 路径为文件和为目录的两种情况。

```js
// mocha/src/utils.js
const path = require('path');
const fs = require('fs');

module.exports.lookupFiles = function lookupFiles(filepath) {
  let stat;

  // 假设路径是文件
  try {
    stat = fs.statSync(`${filepath}.js`);
    if (stat.isFile()) {
      // 确实是文件，直接以数组形式返回
      return [filepath];
    }
  } catch(e) {}
	
  // 假设路径是目录
  let files = []; // 存放目录下的所有文件
  fs.readdirSync(filepath).forEach(function(dirent) {
    let pathname = path.join(filepath, dirent);

    try {
      stat = fs.statSync(pathname);
      if (stat.isDirectory()) {
        // 是目录，进一步递归
        files = files.concat(lookupFiles(pathname));
      } else if (stat.isFile()) {
        // 是文件，补充到待返回的文件列表中
        files.push(pathname);
      }
    } catch(e) {}
  });
	
  return files;
}
```

```js
// mocha/src/mocha.js
// ...
const path = require('path');
const utils = require('./utils');

class Mocha {
  constructor() {
    // 创建一个根suite
    // ...
    // 使用bdd测试风格，将API挂载到global对象上
    // ...
    // 执行测试用例文件，构建suite-test树
    const spec = path.resolve(__dirname, '../../test');
    const files = utils.lookupFiles(spec);
    files.forEach(file => {
      require(file);
    });
  }
  // ...
}
```

#### 四、执行测试用例

在这个环节中，我们需要通过遍历 suite-test 树来递归执行 suite 节点和 test 节点，并同步地输出测试报告。

![](https://img12.360buyimg.com/jdphoto/jfs/t1/84286/39/5724/43564/5d3d7f79E2576b082/4e91c6c081678702.png)

###### 1、异步执行

Mocha 的测试用例和 Hook 函数是支持异步执行的。异步执行的写法有两种，一种是函数返回值为一个 promise 对象，另一种是函数接收一个入参 `done`，并由开发者在异步代码中手动调用 `done(error)` 来向 Mocha 传递断言结果。所以，在执行测试用例之前，我们需要一个包装函数，将开发者传入的函数 promise 化：

```js
// mocha/src/utils.js
// ...
module.exports.adaptPromise = function(fn) {
  return () => new Promise(resolve => {
    if (fn.length == 0) { // 不使用参数 done
      try {
        const ret = fn();
        // 判断是否返回promise
        if (ret instanceof Promise) {
          return ret.then(resolve, resolve);
        } else {
          resolve();
        }
      } catch (error) {
        resolve(error);
      }
    } else { // 使用参数 done
      function done(error) {
        resolve(error);
      }
      fn(done);
    }
  })
}
```

这个工具函数传入一个函数 fn 并返回另外一个函数，执行返回的函数能够以 promise 的形式去运行 fn。这样一来，我们需要稍微修改一下之前的代码：

```js
// mocha/interfaces/bdd.js
// ...
const { adaptPromise } = require('../src/utils');

module.exports = function (context, root) {
  // ...
  context.it = context.specify = function (title, fn) {
    // ...
    const test = new Test({
      title,
      fn: adaptPromise(fn)
    });
    // ...
  }

  context.before = function (fn) {
    // ...
    cur._beforeAll.push(adaptPromise(fn));
  }

  context.after = function (fn) {
    // ...
    cur._afterAll.push(adaptPromise(fn));
  }

  context.beforeEach = function (fn) {
    // ...
    cur._beforeEach.push(adaptPromise(fn));
  }

  context.afterEach = function (fn) {
    // ...
    cur._afterEach.push(adaptPromise(fn));
  }
}
```

###### 2、测试用例执行器

执行测试用例需要调度 suite 和 test 节点，因此我们需要一个执行器（runner）来统一负责执行过程。这是执行阶段的核心，我们先直接贴代码：

```js
// mocha/src/runner.js
const EventEmitter = require('events').EventEmitter;

// 监听事件的标识
const constants = {
  EVENT_RUN_BEGIN: 'EVENT_RUN_BEGIN',      // 执行流程开始
  EVENT_RUN_END: 'EVENT_RUN_END',          // 执行流程结束
  EVENT_SUITE_BEGIN: 'EVENT_SUITE_BEGIN',  // 执行suite开始
  EVENT_SUITE_END: 'EVENT_SUITE_END',      // 执行suite开始
  EVENT_FAIL: 'EVENT_FAIL',                // 执行用例失败
  EVENT_PASS: 'EVENT_PASS'                 // 执行用例成功
}

class Runner extends EventEmitter {
  constructor() {
    super();
    // 记录 suite 根节点到当前节点的路径
    this.suites = [];
  }

  /*
   * 主入口
   */
  async run(root) {
    this.emit(constants.EVENT_RUN_BEGIN);
    await this.runSuite(root);
    this.emit(constants.EVENT_RUN_END);
  }

  /*
   * 执行suite
   */
  async runSuite(suite) {
    // suite执行开始
    this.emit(constants.EVENT_SUITE_BEGIN, suite);

    // 1）执行before钩子函数
    if (suite._beforeAll.length) {
      for (const fn of suite._beforeAll) {
        const result = await fn();
        if (result instanceof Error) {
          this.emit(constants.EVENT_FAIL, `"before all" hook in ${suite.title}: ${result.message}`);
          // suite执行结束
          this.emit(constants.EVENT_SUITE_END);
          return;
        }
      }
    }
  
    // 路径栈推入当前节点
    this.suites.unshift(suite);
  
    // 2）执行test
    if (suite.tests.length) {
      for (const test of suite.tests) {
        await this.runTest(test);
      }
    }
  
    // 3）执行子级suite
    if (suite.suites.length) {
      for (const child of suite.suites) {
        await this.runSuite(child);
      }
    }
  
    // 路径栈推出当前节点
    this.suites.shift(suite);
  
    // 4）执行after钩子函数
    if (suite._afterAll.length) {
      for (const fn of suite._afterAll) {
        const result = await fn();
        if (result instanceof Error) {
          this.emit(constants.EVENT_FAIL, `"after all" hook in ${suite.title}: ${result.message}`);
          // suite执行结束
          this.emit(constants.EVENT_SUITE_END);
          return;
        }
      }
    }

    // suite结束
    this.emit(constants.EVENT_SUITE_END);
  }
  
  /*
   * 执行suite
   */
  async runTest(test) {
    // 1）由suite根节点向当前suite节点，依次执行beforeEach钩子函数
    const _beforeEach = [].concat(this.suites).reverse().reduce((list, suite) => list.concat(suite._beforeEach), []);
    if (_beforeEach.length) {
      for (const fn of _beforeEach) {
        const result = await fn();
        if (result instanceof Error) {
          return this.emit(constants.EVENT_FAIL, `"before each" hook for ${test.title}: ${result.message}`)
        }
      }
    }
  
    // 2）执行测试用例
    const result = await test.fn();
    if (result instanceof Error) {
      return this.emit(constants.EVENT_FAIL, `${test.title}`);
    } else {
      this.emit(constants.EVENT_PASS, `${test.title}`);
    }
  
    // 3）由当前suite节点向suite根节点，依次执行afterEach钩子函数
    const _afterEach = [].concat(this.suites).reduce((list, suite) => list.concat(suite._afterEach), []);
    if (_afterEach.length) {
      for (const fn of _afterEach) {
        const result = await fn();
        if (result instanceof Error) {
          return this.emit(constants.EVENT_FAIL, `"after each" hook for ${test.title}: ${result.message}`)
        }
      }
    }
  }
}

Runner.constants = constants;
module.exports = Runner
```

代码很长，我们稍微捋一下。

首先，我们构造一个 Runner 类，利用两个 async 方法来完成对 suite-test 树的遍历：

- `runSuite` ：负责执行 suite 节点。它不仅需要调用 runTest 执行该 suite 节点上的若干 test 节点，还需要调用 runSuite 执行下一级的若干 suite 节点来实现遍历，同时，before/after 也将在这里得到调用。执行顺序依次是：`before -> runTest -> runSuite -> after`。
- `runTest` ：负责执行 test 节点，主要是执行该 test 对象上定义的测试用例。另外，beforeEach/afterEach 的执行有一个类似浏览器事件捕获和冒泡的过程，我们需要沿节点路径向当前 suite 节点方向和向 suite 根节点方向分别执行各 suite 的 beforeEach/afterEach 钩子函数。执行顺序依次是：`beforeEach -> run test case -> afterEach`。

在遍历过程中，我们依然是利用一个栈列表来维护 suite 根节点到当前节点的路径。同时，这两个流程都用 async/await 写法来组织，保证所有任务在异步场景下依然是按序执行的。

其次，测试结论是“边执行边输出”的。为了在执行过程中能向 reporter 实时通知执行结果和执行状态，我们让 Runner 类继承自 EventEmitter 类，使其具备订阅/发布事件的能力，这个后续会细讲。

最后，我们在 Mocha 实例的 run 方法中去实例化 Runner 并调用它：

```js
// mocha/src/mocha.js
// ...
const Runner = require('./runner');

class Mocha {
  // ...
  run() {
    const runner = new Runner();
    runner.run(this.rootSuite);
  }
}
```

###### 3、输出测试报告

reporter 负责测试报告输出，这个过程是在执行测试用例的过程中同步进行的，因此我们利用 EventEmitter 让 reporter 和 runner 保持通信。在 runner 中我们已经在各个关键节点都作了 event emit，所以我们只需要在 reporter 中加上相应的事件监听即可：

```js
// mocha/reporters/index.js
module.exports.spec = require('./spec');
```

```js
// mocha/reporters/spec.js
const constants = require('../src/runner').constants;

module.exports = function (runner) {

  // 执行开始
  runner.on(constants.EVENT_RUN_BEGIN, function() {});

  // suite执行开始
  runner.on(constants.EVENT_SUITE_BEGIN, function(suite) {});

  // suite执行结束
  runner.on(constants.EVENT_SUITE_END, function() {});

  // 用例通过
  runner.on(constants.EVENT_PASS, function(title) {});

  // 用例失败
  runner.on(constants.EVENT_FAIL, function(title) {});

  // 执行结束
  runner.once(constants.EVENT_RUN_END, function() {});
}
```

Mocha 类中引入 reporter，执行事件订阅，就能让 runner 将测试的状态结果实时推送给 reporter 了：

```js
// mocha/src/mocha.js
const reporters = require('../reporters');
// ...
class Mocha {
  // ...
  run() {
    const runner = new Runner();
    reporters['spec'](runner);
    runner.run(this.rootSuite);
  }
}
```

reporter 中可以任意构造你想要的报告样式输出，例如这样：

```js
// mocha/reporters/spec.js
const constants = require('../src/runner').constants;

const colors = {
  pass: 90,
  fail: 31,
  green: 32,
}

function color(type, str) {
  return '\u001b[' + colors[type] + 'm' + str + '\u001b[0m';
}

module.exports = function (runner) {

  let indents = 0;
  let passes = 0;
  let failures = 0;

  function indent(i = 0) {
    return Array(indents + i).join('  ');
  }

  // 执行开始
  runner.on(constants.EVENT_RUN_BEGIN, function() {
    console.log();
  });

  // suite执行开始
  runner.on(constants.EVENT_SUITE_BEGIN, function(suite) {
    console.log();

    ++indents;
    console.log(indent(), suite.title);
  });

  // suite执行结束
  runner.on(constants.EVENT_SUITE_END, function() {
    --indents;
    if (indents == 1) console.log();
  });

  // 用例通过
  runner.on(constants.EVENT_PASS, function(title) {
    passes++;

    const fmt = indent(1) + color('green', '  ✓') + color('pass', ' %s');
    console.log(fmt, title);
  });

  // 用例失败
  runner.on(constants.EVENT_FAIL, function(title) {
    failures++;

    const fmt = indent(1) + color('fail', '  × %s');
    console.log(fmt, title);
  });

  // 执行结束
  runner.once(constants.EVENT_RUN_END, function() {
    console.log(color('green', '  %d passing'), passes);
    console.log(color('fail', '  %d failing'), failures);
  });
}
```

#### 五、验证

到这里，我们的 simple-mocha 就基本完成了，我们可以编写一个测试用例来简单验证一下：

```js
// test/test.spec.js
const assert = require('assert');

describe('Array', function () {
  describe('#indexOf()', function () {
    it('should return -1 when not present', function () {
      assert.equal(-1, [1, 2, 3].indexOf(4))
    })

    it('should return the index when present', function () {
      assert.equal(-1, [1, 2, 3].indexOf(3))
    })
  })

  describe('#every()', function () {
    it('should return true when all items are satisfied', function () {
      assert.equal(true, [1, 2, 3].every(item => !isNaN(item)))
    })
  })
})

describe('Srting', function () {
  describe('#replace', function () {
    it('should return a string that has been replaced', function () {
      assert.equal('hey Hankle', 'hey Densy'.replace('Densy', 'Hankle'))
    })
  })
})
```

这里我们用 node 内置的 assert 模块来执行断言测试。下边是执行结果：

```
npm test

> simple-mocha@1.0.0 test /Documents/simple-mocha
> node mocha

   Array
     #indexOf()
        ✓ should return -1 when not present
        × should return the index when present
     #every()
        ✓ should return true when all items are satisfied

   String
     #replace
        ✓ should return a string that has been replaced

  3 passing
  1 failing
```

测试用例执行成功。附上完整的流程图：

![](https://img13.360buyimg.com/jdphoto/jfs/t1/48002/14/6249/38293/5d3d7dd6E1b985819/7ba08cfe21c04c73.png)

## 结尾

如果你看到了这里，看完并看懂了上边实现 simple-mocha 的整个流程，那么很高兴地告诉你，你已经掌握了 Mocha 最核心的运行机理。simple-mocha 的整个实现过程其实就是 Mocha 实现的一个简化。而为了让大家在看完这篇文章后再去阅读 Mocha 源码时能够更快速地理解，我在简化和浅化 Mocha 实现流程的同时，也尽可能地保留了其中的一些命名和实现细节。有差别的地方，如执行测试用例环节，Mocha 源码利用了一个复杂的 Hook 机制来实现异步测试的依序执行，而我为了方便理解，用 async/await 来替代实现。当然这不是说 Mocha 实现得繁琐，在更加复杂的测试场景下，这套 Hook 机制是十分必要的。所以，这篇文章仅仅希望能够帮助我们攻克 Mocha 源码阅读的第一道陡坡，而要理解 Mocha 的精髓，光看这篇文章是远远不够的，还得深入阅读 Mocha 源码。

## 参考文章
> [Mocha官方文档](https://mochajs.org/)
> [BDD和Mocha框架](http://www.moye.me/2014/11/22/bdd_mocha/)