---
title: Node.js项目TypeScript改造指南(二)
date: 2019-12-20 14:26:07
tags:
	- Web性能优化
cover: https://tva1.sinaimg.cn/large/006tNbRwgy1ga362vbkc8j30p00anq52.jpg
thumbnail: https://tva1.sinaimg.cn/large/006tNbRwgy1ga362vbkc8j30p00anq52.jpg
categories: Node.js
---

> 作者：刘辉

最近笔者把一个中等规模的 Koa2 项目迁移到 TypeScript，和大家分享一下 TypeScript 实践中的经验和技巧。

原项目基于 Koa2，MySQL，sequelize，request，接口加页面总计 100 左右。迁移后项目基于 Midway，MySQL，sequelize-typescript，axios。

本项目使用 TypeScript3.7，TypeScript 配置如下：

```js

"compilerOptions": {
    "declaration": false,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "incremental": true,
    "inlineSourceMap": true,
    "module": "commonjs",
    "newLine": "lf",
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "outDir": "dist",
    "pretty": true,
    "skipLibCheck": true,
    "strict": true,
    "strictPropertyInitialization": false,
    "stripInternal": true,
    "target": "ES2017"
}

```

本文分为两部分，第一部分是处理 any 的实践，第二部分是构建类型系统的实践。
<!--more-->

## 对 any 的处理

使用 TypeScript 就不得不面对 any 带来的问题，首先来看看为什么 any 值得我们认真对待。

### any 的危害

我们来看这段代码：

```js
function add(a: number, b: number):number {
     return a + b;
}
var a:any = '1';
var b = 2;
console.log(add(a,b))  // '12' 

```
> 代码可以直接粘贴到 [Playground](https://www.typescriptlang.org/play/index.html) 执行 

add 的本意是两个数字相加，但是因为 a 其实是字符串，通过使用 any 类型跳过了类型检查，所以变成了字符串连接，输出了字符串 “12”，而且这个 “12” 依然被当成 number 类型向下传递。

当然，我们一般不会犯这么明显的错误，那么再来看这个例子：

```js
var resData = `{"a":"1","b":2}`
function add(a: number, b: number):number {
     return a + b;
}
var obj = JSON.parse(resData);
console.log(add(obj.a,obj.b))  // '12' 

```
我们假设 resData 为接口返回的 json 字符串，我们用JSON.parse解析出数据然后相加，为什么类型检查没有提醒我 obj.a 不是 number 类型？

因为 JSON.parse 的签名是这样的：

```js
// lib.es5.d.ts
parse(text: string, reviver?: (this: any, key: string, value: any) => any): any;
```
JSON.parse 返回的是 any 类型，不受类型检查约束，数据从进入 add 方法以后，才受类型检查约束，但是这时数据类型已经对不上了。

在这种数据类型已经对不上真实类型的情况下，我们怎么进行纠正？来看以下的代码：

```js 
var resData = `{"a":"1","b":2}`
function add(a: number, b: number):number {
    var c = parseInt(a) // Error: Argument of type 'number' is not assignable to parameter of type 'string'.
    var d:string = a as string //Error: Conversion of type 'number' to type 'string' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
    var e = Number(a)
    return a + b;
}
var obj = JSON.parse(resData);
console.log(add(obj.a,obj.b))

```
parseInt 只接受 string 类型参数，a 已经被推断为 number，因此报错。
使用 as 更改类型同样报错，编译器建议如果一定要更改类型，需要使用 unknown 类型中转一下。
Number() 可以进行正确的转换，因为 Number 上有这样一个签名：参数为 any，可以接受任何类型的参数。

```js
// lib.es5.d.ts
interface NumberConstructor {
    // ...
    (value?: any): number;
    // ...
}
declare var Number: NumberConstructor;
```
然而这样做，我们的类型检查还有意义吗？为什么不直接写js？

### any 的来源

TypeScript 在 3.0 版本之前，只有 any 这样一个顶级类型。如果有一个值来自动态的内容，我们在定义的时候并不确定它的类型时，any 可能是唯一的选择，[官方文档](https://www.typescriptlang.org/docs/handbook/basic-types.html?#any)也是如此解释的。因此我们可以看到 any 在基础库、第三方库中普遍存在。

但是 any 跳过了类型检查，确实给我们带来了隐患，为了保证多人协作时不因此引发问题，我们需要想办法让这种危险可控。

首先，我们需要明确系统中哪里有 any。

* 开启严格选项

在 tsconfig.json 的 compilerOptions 属性中开启严格选项 `"strict": true`。此选项可以保证，我们自己写的代码不会制造出隐式的 any。

* 了解基础库、第三方库中的类型

写代码时，应注意基础库、第三方库中函数输入输出是否使用了 any，类型、接口是否直接、间接使用了 any。

最典型的，例如 require：

```js
interface NodeRequireFunction {
    /* tslint:disable-next-line:callable-types */
    (id: string): any;
}

```

```js

var path = require("path") // require 引入的内容都是 any 

```

还有 JSON：

```js

// 一个对象使用了 JSON.parse(JSON.stringify(obj)) 就会变成 any 类型，不再受类型检查约束
interface JSON {
    parse(text: string, reviver?: (this: any, key: string, value: any) => any): any;
    stringify(value: any, replacer?: (this: any, key: string, value: any) => any, space?: string | number): string;
    stringify(value: any, replacer?: (number | string)[] | null, space?: string | number): string;
}

```

对于本项目来说，Koa 的 ctx 上的 query：

```js
// @types/koa/index.d.ts
declare interface ContextDelegatedRequest {
    // ...
    header: any;
    headers: any;
    query: any;
    // ...
}

```

Axios 请求方法的泛型参数上的默认类型 T，如果 get 上没有注明返回的数据类型来覆盖 T，res.data 的类型就是 any：

```js
// axios/index.d.ts
interface AxiosInstance {
    get<T = any, R = AxiosResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R>;
}
interface AxiosResponse<T = any>  {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: AxiosRequestConfig;
  request?: any;
}

```

* 不显式使用 any

也就是自己不写 any。

使用 any 可能出于以下几个理由：

1. 需要顶级类型
2. 暂时不知道类型怎么写
3. 项目迁移方便
4. 写第三方库，使用者用起来方便

顶级类型可以考虑使用 unknown 代替；暂时不知道怎么写或者项目迁移，还是应该尽早消灭 any；对于写第三方库，本文无此方面实践，欢迎大家思考提建议。

### 让 any 可控

本项目处理 any 的思路很简单，不显式使用 any，使用 unknown 作为顶级类型。接收到一个 any 类型的数据时使用类型守护「[Type Guards](https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-guards-and-differentiating-types)」或者断言函数「[Assertion Functions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions)」来明确数据类型，然后把类型守护函数和断言函数统一管理。

#### 用 unknown 作为顶级类型

TypeScript 3.0 增加了新的顶级类型 [unknown](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html#new-unknown-top-type)。

> TypeScript 3.0 introduces a new top type unknown. unknown is the type-safe counterpart of any. Anything is assignable to unknown, but unknown isn’t assignable to anything but itself and any without a type assertion or a control flow based narrowing. Likewise, no operations are permitted on an unknown without first asserting or narrowing to a more specific type.   -- typescript handbook

unknown 可以看做是类型安全的 any。任何类型的数据都可以赋值给一个 unknown 变量，但是 unknown 类型的数据只能分配给 unknown 和 any 类型。我们必须通过断言或者收窄把 unknown 变成一个具体的类型，否则无法进行其他操作。

我们把之前使用 any 的代码改成 unknown 看一下：

```js
function add(a: number, b: number):number {
     return a + b;
}
var a:unknown = '1';
var b = 2;
console.log(add(a,b))  // Error: Argument of type 'unknown' is not assignable to parameter of type 'number'.

```
unknown 类型不能赋值给 number 类型。

我们使用类型守护把 unknown 收窄，因为 a 的真实类型不是 number 因此会走到 else 分支：

```js
function add(a: number, b: number):number {
     return a + b;
}
var a:unknown = '1';
var b = 2;
if (typeof a == "number") {
  console.log(add(a,b))
} else {
  console.log('params error')
}  
// params error
```

#### 类型守护 & 断言函数

类型守护可以使用 in 操作符、typeof、instanceof 来收窄类型。除此之外，还可以自定义类型守护函数。断言函数的功能类似，例如下面一段代码，用类型守护和断言函数处理 any 类型的 ctx.body。

```js
// 定义一个类型
interface ApiCreateParams {
    name:string
    info:string
}
// 确认data上是否有names中的字段
function hasFieldOnBody<T extends string>(obj:unknown,names:Array<T>) :obj is { [P in T]:unknown } {
    return typeof obj === "object" && obj !== null && names.every(name=>{
        return name in obj
    })
}

function assertApiCreateParams(data:unknown):asserts data is ApiCreateParams {
    if( hasFieldOnBody(data,['name', 'info']) && typeof data.name === "string" && typeof data.info === "string" ){
            console.log(data.name,data.info,data) 
            // data.name 的类型为 string，data.info的类型为string，但是data的类型是{name:unknown,info:unknown}
    }else{
        throw "api create params error"
    }
}

@get('/create')  // midway controller 上定义的方法，处理 /create 路由
async create(): Promise<void> {
    let data = this.ctx.request.body; // data的类型为any
    assertApiCreateParams(data);
    console.log(data)  // data的类型已经被推断为ApiCreateParams
    // ...
}

```
对 unknown 进行类型收窄在处理复杂 JSON 时会比较繁琐，我们可以结合 JSON Schema 来进行验证。
自定义断言函数本质上是把类型验证的工作交给了开发者，一个错误的断言函数，或者直接写一个空的断言函数，同样会导致类型系统推导错误。
但是我们可以把断言函数管理起来，比如制定断言函数的命名规范，把断言函数集中在一个文件管理。
这样可以使不安全因素更可控，比到处都是 any 安全的多。


#### 不要使用类型断言「[type-assertions](https://www.typescriptlang.org/docs/handbook/basic-types.html#type-assertions)」处理 any

主流静态类型语言基本都提供了类型转换，类型转换会尝试把数据转换成需要的类型，转换失败时会报错。TypeScript 的类型断言「type-assertions」语法上像极了类型转换，但是它并不是类型安全的。

> Type assertions are a way to tell the compiler “trust me, I know what I’m doing.” A type assertion is like a type cast in other languages, but performs no special checking or restructuring of data. It has no runtime impact, and is used purely by the compiler. TypeScript assumes that you, the programmer, have performed any special checks that you need.    -- typescript handbook

尤其是对一个 any 类型使用 as 时，肯定不会失败，例如：

```js
function add (a:number,b:number){
     var c = a + b;
     console.log(c);
}
var a: any = '1';
var b = 2
var c = a as number;
add(c, b);  // '12' 

```
我们想把 a 转换成数字来相加，数字和字符串原本不能直接做类型转换，但是 any 不受类型检查约束。 最后还是返回了字符串 “12”，而不是我们想要的 3。

#### 覆盖第三方库中的 any

我们可以通过继承的方式，把第三方库原有 any 类型覆盖掉，换成 unknown 或者更具体的类型。
例如处理 Koa Context 上的 query 和 request.body。

```js
interface ParsedUrlQuery { [key: string]: string | string[]; } // copy from querystring.d.ts 

interface IBody { [key: string]: unknown; }

interface RequestPlus extends Request{ body:IBody }

interface ContextPlus extends Context{
    query:ParsedUrlQuery
    request:RequestPlus
}
```
在 Midway 中使用：

```js

@provide()
@controller('/api')
export class ApiController extends AbstractController {
    @inject()
    ctx: ContextPlus;
}

```

## 构建强大的类型系统

使用 TypeScript 经常会遇到的一个问题就是，需要写很多类型，但是有很多类型都很相似，每个类型都重新定义感觉很啰嗦，很容易违反 DRY 原则。

本项目是一个管理系统，核心模型就是数据库表，对应到代码里首先就是 Model 层，围绕这个核心会有很多 Model 类型的变体和衍生类型。例如，SQL 的查询条件，增删改查接口的各种参数；Model 里可能是数字类型，但是 url query 上都当字符串类型传过来；创建参数不包含 id 字段，更新参数包含 id 字段，但是其他字段可选；两个 Model 的一部分合并一个新的对象，等等。。

接下来我们将通过 TypeScript 提供的功能，构建合理且精简的类型系统。

### 接口继承

接口继承大家应该都不陌生，以带分页功能的查询参数为例：

```js

interface Paging {
    pageIndex:number
    pageSize:number
}
// 继承 Paging 的新类型
interface APIQueryParams extends Paging {
    keyword:string
    title:string
} 
// 继承 Paging 的新类型
interface PackageQueryParams extends Paging {
    name:string
    desc:string
} 

```

### 类型推导

TypeScript 2.8 增加了条件类型「[Conditional Types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#conditional-types)」。

结合 keyof、never、in 等特性，使 TypeScript 具有了一定程度上的类型运算能力，可以让我们获得一个类型的变体和衍生类型。


#### 可供使用的工具

#####  交叉类型「[Intersection Types](https://www.typescriptlang.org/docs/handbook/advanced-types.html#intersection-types)」 和 联合类型「[Union Types](https://www.typescriptlang.org/docs/handbook/advanced-types.html#union-types)」

假设我们有 Serializable 和 Loggable 两个类型。

```js
type Serializable = {toString:(data:unknown) => string}

type Loggable = {log:(data:unknown) => void}

type A = Serializable & Loggable

type B = Serializable | Loggable

```
类型 A 表示一个交叉类型，它需要同时满足 Serializable 和 Loggable。

类型 B 表示一个联合类型，它只要满足 Serializable 和 Loggable 其中之一即可。

`如果我们把一个类型看做一组规则的 Map，交叉类型就是取并集，联合类型就是取其中之一。`


##### 索引类型「[Index types](https://www.typescriptlang.org/docs/handbook/advanced-types.html#index-types)」和映射类型「[Mapped types](https://www.typescriptlang.org/docs/handbook/advanced-types.html#mapped-types)」

```js
type Person = {
    name: string;
    age: number;
}

type PersonKeys = keyof Person; // 'name' | 'age'

type PersonMap = { 

    [K in PersonKeys]: boolean 

};  // { name:boolean,age:boolean }

type PersonMapEx1 = { 

    [K in PersonKeys]: Person[K] | boolean 

};  // { name: string | boolean,age:string | number }

type PersonMapEx2 = { 

    [K in PersonKeys]: Person[K] 

}["name"];  // string

type PersonMapEx3 = { 

    [K in PersonKeys]: Person[K] 

}["name"|"age"];   // string|number

type PersonMapEx4 = { 

    [K in PersonKeys]: Person[K] 

}[keyof Person];   // string|number

type PersonMapEx5 = Person['name'|'age']; // string|number
```
PersonKeys 是一个索引类型，同时也是联合类型，通过 Keyof 实现。
PersonMap 是一个映射类型，使用 in 实现遍历，注意映射类型的格式。
观察 PersonMapEx1-5，可以发现，在类型定义中，`{}` 用来构造一个键值对，`[]` 用来放置key或key组成的联合，`{}[]` 可以用来取对应 key 的类型。


`如果我们把一个类型看做一组规则组成的 Map，key 是属性名，value 是类型，keyof 使我们有了取得所有 key 的能力。`

`in 使我们有了对一个索引类型/联合类型遍历、重新设置每个属性的类型的能力。`


##### 条件类型「[Conditional Types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#conditional-types)」

```js
type Circle = {
    rad:number,
    x:number,
    y:number
}
type TypeName<T> = T extends {rad:number} ? Circle : unknown
type T1 = TypeName<{rad:number}>  // Circle
type T2= TypeName<{rad:string}>  // unknown


```
以上是一个最基本的条件类型，条件类型基于泛型，通过对泛型参数操作获取新类型。
extend 在这里表示可兼容的「assignable」，和鸭子类型的机制一样，`如果把类型看做集合，也可以理解为集合上的包含关系`。
`?:` 和 js 的三目运算符功能一致，`使我们具备了条件分支的能力`。
在上例中，TypeName 是一个条件类型，T1、T2 是把泛型参数明确以后通过条件分支得到的类型。

另外，我们还可以用在映射类型中提到的 `{}[]` 的形式表达复杂的判断逻辑，例如以下这段来自 Vue 的代码，虽然看着复杂，但是只要明确了` extends ?: {} [] `这些符号的作用，就很容易理清代码表达的意思：

```js
// https://github.com/vuejs/vue-next/blob/master/packages/reactivity/src/ref.ts
export type UnwrapRef<T> = {
  cRef: T extends ComputedRef<infer V> ? UnwrapRef<V> : T
  ref: T extends Ref<infer V> ? UnwrapRef<V> : T
  array: T extends Array<infer V> ? Array<UnwrapRef<V>> & UnwrapArray<T> : T
  object: { [K in keyof T]: UnwrapRef<T[K]> }
}[T extends ComputedRef<any>
  ? 'cRef'
  : T extends Ref
    ? 'ref'
    : T extends Array<any>
      ? 'array'
      : T extends Function | CollectionTypes
        ? 'ref' // bail out on types that shouldn't be unwrapped
        : T extends object ? 'object' : 'ref']
```

如果 T 可以解释为联合类型，在条件判断中可以进行展开，除了联合类型，any、boolean、使用 keyof 得到的索引类型，都可以展开。例如：

```js

type F<T> = T extends U ? X : Y
type union_type = A | B | C
type FU = F<union_type>  //  a的结果为 A extends U ? X :Y | B extends U ? X :Y | C extends U ? X : Y

type Params = {
    name: string;
    title:string;
    id: number;
}
type UX<T> = { [K in keyof T]: T[K] extends string ? T[K] : string}
type StringFields<T> = { [K in keyof T]: T[K] extends string ? K : never }[keyof T]
type U1 = UX<Params> // {name:string,title:string,id:string}
type U2 = StringFields<Params> // "name"|"title"

```
注意类型 StringFields<T> 中的 [never](https://www.typescriptlang.org/docs/handbook/basic-types.html#never)，never 是TypeScript 的基础类型之一，表示不可到达。

```js
// 返回never的函数必须存在无法达到的终点
function error(message: string): never {
    throw new Error(message);
}
```
`在条件类型中，起到了过滤的效果。也就是说 never 让我们有了从一个类型中删减规则的能力。`

`除此之外，还有一个关键词 infer 即 inference 的缩写，使我们具备了代换、提取类型的能力。`

官方的例子：

```js
type Unpacked<T> =
    T extends (infer U)[] ? U :
    T extends (...args: any[]) => infer U ? U :
    T extends Promise<infer U> ? U :
    T;

type T0 = Unpacked<string>;  // string
type T1 = Unpacked<string[]>;  // string
type T2 = Unpacked<() => string>;  // string
type T3 = Unpacked<Promise<string>>;  // string
type T4 = Unpacked<Promise<string>[]>;  // Promise<string>
type T5 = Unpacked<Unpacked<Promise<string>[]>>;  // string

```
在 `T extends` 后面的类型表达式上，我们可以对一个可以表达为类型的符号使用 infer，然后在输出类型中使用 infer 引用的类型，至于这个类型具体是什么，会在 T 被确定时自动推导出来。
示例代码的功能就是从数组、函数、Promise 中解出其中的类型。


##### 可选 & 只读属性 

```js
type MutableRequired<T> = { -readonly [P in keyof T]-?: T[P] };  // Remove readonly and ?
type ReadonlyPartial<T> = { +readonly [P in keyof T]+?: T[P] };  // Add readonly and ?

```
我们可以给类型属性增加只读或者可选标记，使用 - 号，可以把原本带有的只读和可选标记去掉，+ 代表增加，可以省略。


##### 基础库中提供的抽象类型

以上述能力为基础，基础库中提供了许多常用的抽象类型，为得到衍生类型和变体提供了很大帮助。以 TypeScript 3.7 为例：

```js
type Circle = {
    rad:number,
    x:number,
    y:number,
    name:string
}
type Params = {
    name: string;
    title:string;
    id: number;
}
class Shape {
    constructor (x:number,y:number){
        this.x = x;
        this.y = y;
    }
    x:number;y:number;
}
type a1 = Partial<Params> // 使Params上的字段变为可选
type a2 = Required<Params> // 使Params上的字段变为必选
type a3 = Readonly<Params> // 使Params上的字段变为只读
type a4 = Pick<Params,'name'|'id'> // 提前Params上的name和id  {name:string,id:number}
type a5 = Record<'a'|'b',Params> // 用a,b做key，Params为value建立类型  {a:Params,b:Params}
type a6 = Exclude<keyof Circle,keyof Params> // 排除Circle上Params也有的字段  "rad"|"x"|"y"
type a7 = Extract<keyof Circle,keyof Params> // 提取Circle和Params的公共字段  "name"
type a8 = Omit<Circle,'name'> // 从Circle上去掉name字段 {x:number,y:number:rad:number}
type a9 = NonNullable<Params> // 去掉为空的字段
type a10 = Parameters<(name:string,id:number)=>void> // 提取函数参数类型 [string,number]
type a11 = ConstructorParameters<typeof Shape> // 提取Shape的构造器参数 [number,number]
type a12 = ReturnType<()=>Params> // 提取函数返回类型 Params
type a13 = InstanceType<typeof Shape> // 提取实例类型 Shape
```

##### 实际应用

以一个简化的模块为例，首先使用 sequelize-typescript 提供的基类 Model 和装饰器创建一个业务类。

```js
import { DataType, Model,Column,Comment,AutoIncrement,PrimaryKey } from 'sequelize-typescript';
const { STRING,TEXT,INTEGER,ENUM } = DataType;

export class ApiModel extends Model<ApiModel> {
    @AutoIncrement
    @PrimaryKey
    @Comment("id")
    @Column({ type: INTEGER({length:11}), allowNull: false })
    id!: number;

    @Comment("parent")
    @Column({ type: INTEGER({length:11}), allowNull: false })
    parent!: number;

    @Comment("name")
    @Column({ type: STRING(255), allowNull: false })
    name!: string;

    @Comment("url")
    @Column({ type: STRING(255), allowNull: false })
    url!: string;
}
```
此业务类继承了 Model，Model 上有大量的属性和方法，如 version、createdAt、init() 等。我们需要获取一个只包含业务属性的类型，因为创建和更新只会传这几个字段，并且创建时没有 id。查询的时候，字段为可选的。下面我们根据需求来定义类型：

```js

// 使用 Omit 排除掉基类上定义的属性和方法，因为基类上也定义了 id，因此要把 id 留下
type ApiObject = Omit<ApiModel,Exclude<keyof Model,"id">>  // {id:number,parent:number,name:string,url:string}

// 合并两个类型,T优先
type Merge<T,S> = { [ K in keyof(T & S) ] : (K extends keyof T ? T[K] : K extends keyof S ? S[K] :never ) }

// 创建Api使用的参数，id为自增，所以要去掉id
type ApiCreateParams = Omit<ApiObject,"id">  // {parent:number,name:string,url:string}

// 查询参数，创建参数上的字段可选，使用Partial将字段全部变为可选 带分页功能，因此要和分页类型合并
// 用上面定义的 Merge 方法合并类型
type ApiQueryParams = Merge<Partial<ApiCreateParams>,Paging> // {id?:number,parent?:number,name?:string,pageIndex:number,pageSize:number}

// 分页类型的定义
type Paging = {
    pageIndex:number
    pageSize:number
}

```

### 收窄类型

TypeScript 没有提供类型转换的能力，我们如何从 any、unknown、复杂的联合类型中获取具体类型就成为一个问题。

as 可以用来收窄类型，但是风险很大，例如：

```js
type c1 = { name:string,id:number }

var v1 = { name:'cccc' } as c1

```
这段代码不会报错，但是 v1 上其实没有 id 属性，造成了隐患。

对于可能为 null 的类型或可选属性，我们可以用 [Optional Chaining](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#optional-chaining) 来调用。例如：

```ts

interface erpValidateResult {
    retcode:number
    msg?:string
    data?:{ [username: string]:string}
}
declare function erpValidate(opt:{id:number}):Promise<erpValidateResult>
erpValidate({id:1}).then(res=>{
    var name = res.data?.username || ""
})

```

对于 any、unknown，可使用前面提到的类型守护和断言函数收窄。

使用可辨识联合「[Discriminated Unions](https://www.typescriptlang.org/docs/handbook/advanced-types.html#discriminated-unions)」可以让我们区分相似的类型。例如：

```js
interface Square {
    kind: "square";
    size: number;
}
interface Rectangle {
    kind: "rectangle";
    width: number;
    height: number;
}
interface Circle {
    kind: "circle";
    radius: number;
}
type Shape = Square | Rectangle | Circle;
function area(s: Shape) {
    switch (s.kind) {
        case "square": return s.size * s.size;  // Square
        case "rectangle": return s.height * s.width;  // Rectangle
        case "circle": return Math.PI * s.radius ** 2; // Circle
    }
}
```
kind 属性是一个字符串字面量类型，而且在联合类型 Shape 的每一个子类型上都不一样，这个 kind 属性就被称为可辨识的特征或 tag。我们就可以用 kind 来收窄类型。 

条件类型允许我们为类型建立包含关系，也是收窄的一种方式。



## 总结

TypeScript 是个强大并且灵活的工具，而且它的特性还在逐步完善。

我们可以把它当成类型标注来用，让我们开发时能够从 IDE 得到大量提示，避免语法、拼写错误，这时候我们可以不那么严谨，继续用动态语言的思路写代码。

我们也可以把它当成类型约束来用，这可能会增加我们的工作量。我们除了维护代码本身，还要维护类型系统，而且创建一个精简、合理的类型系统可能并不是一件简单的事。