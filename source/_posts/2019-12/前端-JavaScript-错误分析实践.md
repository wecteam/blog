---
title: 前端 JavaScript 错误分析实践
date: 2019-12-13 16:43:33
tags:
	- Badjs
cover: https://img11.360buyimg.com/jdphoto/s900x383_jfs/t1/89527/23/6466/57930/5df34d33E173747f7/b2ff3068c0cb14cf.png
thumbnail: https://img11.360buyimg.com/jdphoto/s900x383_jfs/t1/89527/23/6466/57930/5df34d33E173747f7/b2ff3068c0cb14cf.png
categories: Web前端
---

> 作者：帅哥红

## 前言

在平日的工作中前端 badjs 是一个比较常见的问题， badjs 除了我们自身业务 js 脚本里比较明显的报错外还有依赖其他资源的一些报错，对于自身业务 js 里出现的错误很容易进行定位并修复，但对于依赖资源的错误即常见的 script error （外部 js、接口错误）定位就没那么容易了。

前端开发的工作除了完成日常的业务特性外还有一项重要的工作就是线上页面质量的运营（其中 badjs 监控及异常分析是工作内容的重要部分），本文主要讲述 script error 采集、定位、统计以及分析的的一些方法及思路，希望对大家在分析定位问题时有一定的帮助。

<!--more-->
## script error 由来

我们的页面往往将静态资源（ js、css、image ）存放到第三方 CDN，或者依赖于外部的静态资源。当从第三方加载的 javascript 执行出错时，由于同源策略，为了保证用户信息不被泄露，不会返回详细的错误信息，取之返回 script error。

webkit 源码：

```c++
bool ScriptExecutionContext::sanitizeScriptError(String& errorMessage, int& lineNumber, String& sourceURL) {
  KURL targetURL = completeURL(sourceURL);

  if (securityOrigin()->canRequest(targetURL)) return false;
  // 非同源，将相关的错误信息设置成默认，错误信息置为 Script error，行号置成0
  errorMessage = "Script error.";
  sourceURL = String();
  ineNumber = 0;
  return true;
}

bool ScriptExecutionContext::dispatchErrorEvent(const String& errorMessage, int lineNumber, const String& sourceURL) {
  EventTarget* target = errorEventTarget();
  if (!target) return false;
  String message = errorMessage;
  int line = lineNumber;
  String sourceName = sourceURL;
  sanitizeScriptError(message, line, sourceName);
  ASSERT(!m_inDispatchErrorEvent);
  m_inDispatchErrorEvent = true;
  RefPtr<ErrorEvent> errorEvent = ErrorEvent::create(message, sourceName, line);
  target->dispatchEvent(errorEvent);
  m_inDispatchErrorEvent = false;
  return errorEvent->defaultPrevented();
}
```

## 常见的解决方案

外部 script error 常见的上报详细错误日志如以下两种方法：

### 1. 开启 CORS 跨域资源共享

a) 添加 crossorigin="anonymous" 属性：

```html
<script src="http://domain/path/*.js" crossorigin="anonymous"></script>
```

当有 crossorigin="anonymous"，浏览器以匿名的方式获取目标脚本，请求脚本时不会向服务器发送用户信息（ cookie、http 证书等）。

b) 此时静态服务器需要添加跨域协议头：

```
Access-Control-Allow-Origin: *
```

完成这两步后 window.onerror 就能够捕获对应跨域脚本发生错误时的详细错误信息了。

### 2. try catch

crossorigin="anonymous" 确实可以完美解决 badjs 上报 script error 问题，但是需要服务端进行跨域头支持，而往往在大型企业，域名多的令人发指，导致跨域规则配置非常复杂，所以很难全部都配置上，而且依赖的一些外部资源也不能确保支持，所以我们在调用外部资源方法以及一些不确认是否配置跨域头的资源方法时采用 try catch 包装，并在 catch 到问题时上报对应的错误。

```js
function invoke(obj, method, args) {
  try {
    return obj[method].apply(this, args);
  } catch (e) {
    reportBadjs(e); // report the error
  }
}
```

## 实例分析

1、对于拥有静态服务器的配置权限的资源我们可以统一配置支持跨域头信息，并且请求时统一增加 crossorigin="anonymous"，这样可以完美将对应的错误堆栈信息进行上报。

2、jsonp 请求问题。

为了解决页面请求中的跨域问题，往往我们页面接口以 jsonp 的方式进行数据获取，对于 jsonp 请求的方式一般引起 badjs 的有两种情况：

- a) 接口请求异常，线上常见的就是在出现接口异常时 302 返回一个 error 页面，该种情况由于返回的内容不能够解析所以直接导致 script error；
对于这种情况虽然我们不能直接对 script error 进行详细上报，但是可以根据回调与加载接口的 onload 进行接口的错误上报，具体的方法如下面伪代码：

```js
// 资源加载完成触发 onload 事件
el.onload = el.onreadystatechange = function () {
 	if(!cgiloadOk) { // 没有正常的回调，则上报对应的错误信息
 		report(cgi, 'servererror');
 	}
}

window.newFunction = function(rsp) {
 	cgiloadOk = true;
 	window.originFunction(rsp);
}
```

如上伪代码，我们拦截用户的回调函数,在回调函数进行打标，当资源加载完后会触发 onload，然后在 onload 里判断接口是否正常回调了，如果没有正常回调那就上报对应的 cgi 跟定义的错误信息。这样就可以在监控系统里结合 servererror 来分析是否是由于接口导致的页面 badjs 上涨，同时将对应的问题反馈给对应的接口负责人，避免接口上线，或者线上运行出现问题时导致的页面异常。

- b) 接口返回数据异常（非标准 json ），这种情况也会直接导致 script error。

对于这种情况我们可以改造对应的接口将 json 数据以 json string 类型的形式进行返回，然后在回调中进行转换解析数据，在解析时采用 try catch 进行包装，当捕获到错误时进行错误上报。

```js
  let sc = document.createElement('script');
  let head = document.getElementsByTagName('head')[0];
  sc.setAttribute('charset', charset || 'utf-8');
  sc.src = url;
  head.appendChild(sc);

  window.newFunction = function(text) {
    // 采用try catch捕获异常
    try {
      let jsonStr = JSON.parse(text)
    } catch(e) {
      // 出现转换异常，则将对应的错误数据进行上报
      reportBadjs(text);
    }
  }
  ```

jsonp 请求数据方式的缺点就是只支持 get，并且出现异常时不能够获取对应的返回状态码。

3、ajax 请求方法。

ajax 方法就比较灵活了，能够获取接口返回的状态码、返回数据，进而区分两种错误并进行上报，伪代码如下：

```js
let xmlHttp = new XMLHttpRequest();

xmlHttp.onreadystatechange = function() {
 	if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
 		let str = xmlHttp.responseText;
 		try {
 			let json = JSON.parse(jsonstr);
 			//TODO,渲染对应的数据
 		} catch(e) {
 			report(jsonstr, 'data parse err'); // 数据解析错误，则将原数据进行上报，用于错误分析，修正接口返回
 		}
 	} else if (xmlHttp.readyState == 4) {
 		report(cgi, xmlHttp.status); // 接口返回重定向，则将对应的接口以及对应的status进行上报
 	}
}

xmlHttp.open('GET', cgi, true);            
xmlHttp.send();
```

该方法的优点是能够获取用户返回的错误数据，并将错误数据进行上报，同时也能够获取到接口请求的状态；缺点是接口必须支持跨域。

4、依赖的外部资源不支持配置跨域头。

这种情况我们只能对调用外部资源方法是进行 try catch 捕获并上报异常。

日常工作中最常用到的 jqeury、zepto 可采用如下方法进行包装：

```js
function myBind (obj) {
  let o = {
    'type': 'click', // 事件类型
    'src': '.', // jquery 选择器
    'fun': function () {}, // 方法
    'isStop': true // 阻止事件冒泡
  };
  let i;

  for (i in obj) {
    o[i] = obj[i];
  }

  if (typeof o.src === 'string') {
    o.$src = $(o.src);
  }

  $(o.src).off(o.type).on(o.type, function (e) {
    try {
      o.fun.apply(o, [e, $(this)]);
    } catch (ea) {
      reportBadjs(ea.stack);  //上报错误
    }
    if (o.isStop) {
      return false;
    }
  });
}
```

## 另类分析思路

对于外部依赖的资源未设置跨域头信息，并且本身执行产生的 badjs 以及用户刷页面引起的一些错误，目前没有很好定定位方法，但是我们可以根据一些辅助方法来分析问题大体产生的原因，以及出现问题时页面运行的状况。其实当线上页面突然出现大量的 script error 时，我们最主要的就是要确保页面是否健康正常的运行。接下来提供几种分析的方法用于帮助确认当前页面是否健康运行。

### 1. 客户端分析

a）渠道占比：

客户端分析主要是根据根据上报 script error 的 ua 进行统计分析。渠道占比即页面 script error 各个渠道的占比情况，如微信端、sq 端、H5 端（其他浏览器），可以根据页面流量的占比进而判断某个渠道的 script error 是否正常，如：当突然某个时间点badjs上涨，并且无发布时，当流量微信占绝大部分，且 sq 渠道或者其他渠道量明显上涨时可推断有可能是刷子流量导致的 badjs，事实证明也经常如此。
如下图为平时正常请求下的badjs各个渠道的占比情况
![](https://img11.360buyimg.com/jdphoto/s720x500_jfs/t1/91860/9/6050/61204/5df0da7eEc02c2b37/af8387c31614257f.png)

下图为出现异常时badjs各个渠道的占比情况
![](https://img11.360buyimg.com/jdphoto/s498x538_jfs/t1/104971/33/6119/67742/5df0daf5E241faf3f/3c140159f9415120.png)

通过该图可以很明显发现在jdpingou渠道占比不正常，经查看错误日志以及与客户端同事分析，发现是在该app内页面点击物理返回时做了一次上报，上报时未获取到对应的方法而产生。

b）ua 占比：

ua 占比就是分析各个 ua 占比的情况了，由于 ua 分布比较散，客户端版本众多，所以一般情况下从中不容易发觉，但当发布某个版本时如果某个 ua 占比明显，那可以推断有个能是写js时里面存在不兼容某个客户端的情况（往往是用来新的语法，各客户端对语法的支持不一样）。

![](https://img11.360buyimg.com/jdphoto/s750x410_jfs/t1/49424/18/14933/73223/5db83d1bE8638a602/3f80fe2b2ea565b3.png)

### 2. 结合用户行为分析

a) 记录用户操作（点击），以移动端为例：

```js
  let eventElemArr = [];
  document.body.addEventListener('touchend', function (e) {
    // 记录点击的dom相关信息
    eventElemArr.push([e.target.tagName, className].join('_'));
  }, false);

  window.onerror = function(msg, url='', line='', col='', error='') {
    // 将用户点击dom相关信息拼接到错误信息中并进行上报
    let errStr = [JSON.stringify(msg), url, line , col, error, eventElemArr.join('|')].join('$');
    report(errStr);
    return false;
  };
```

在分析系统中我们再结合用户在页面中的行为进行判定用户当前访问的页面是否正常。

b）script error 往往不好重现，客户端分析只能推断错误是否由于异常操作所引起（刷子），但是真正要确认 badjs 对页面是否有影响，是否影响用户正常操作，可以结合服务端进行判断。具体的思路是进入页面时前端生成一个 traceid（traceid 生成可以是时间戳+业务+随机码，基本唯一），页面请求所有的接口时带上该 traceid 并且后台记录对应的日志（也可以前端进行上报），当出现badjs上报时也将 traceid 进行上报，这样就可以记录当用户出现 badjs 时整体访问记录了（通过 traceid 进行串联）。

```js
  // 页面配置场景值，用于生成traceid
  window.initTraceid = {
    bizId // 页面bizId
    operateId // 页面traceid
  }

  // 公共代码（公共头）生成traceid
  (function(){
    window.initTraceid {
      window.traceid = genTraceid(window.initTraceid);
    }
  })()

  // 上报badjs时带上对应的traceid
  window.onerror = function(msg, url='', line='', col='', error='') {
    let errStr = [JSON.stringify(msg), url, line , col, error, window.traceid || ''].join('$');
    report(errStr);
    return false;
  };

  // 请求接口带上对应的traceid，用于与badjs进行关联，这样就可以记录用户进入页面页面接口的请求状况
  function myRequst(url) {
    url = url.addParam({traceid: window.traceid || ''});
    requst(url);
  }

```

该种方式可以根据 badjs 中的 traceid 进行关联用户进入页面时的接口请求状况，用于辅助定位用户访问页面是否有问题。如：工作中经常碰到 script error 毛刺，就可以查询该时间段的错误日志，然后通过 traceid 查询访问记录，往往导致 script error 的是由于某个热销商品被刷的特别厉害，一些刷子的非正常操作导致的页面 badjs。

![](https://img11.360buyimg.com/jdphoto/s2500x98_jfs/t1/54894/20/14510/21384/5db83efdE28a4f6c8/6753c0ab11a15b1b.png)

![](https://img11.360buyimg.com/jdphoto/s616x442_jfs/t1/68019/18/14008/51480/5db83f06Ee1e651a3/700eb3e7d1c6d887.png)

### 3. 现场还原

3.1 录制视频

当出现 script error 时将用户进入页面的屏幕快照录制成一个视频随 script error 一起上报。实现该功能目前主要有两种方法，一种是利用 canvas 画图截取屏幕图片；第二种就是记录页面dom变化，并将对应的记录上报，然后在分析系统根据快照和操作链进行播放。

a) canvas 截取图片，该方法的实现思路是利用 canvas 将网页生成图片，然后缓存起来，为了使得生成的视频流畅，我们一秒中需要生成大约 25 帧，也就是需要 25 张截图，然后在出现 script error 时将缓存起来的页面图片进行上报，再在分析系统通过技术将页面浏览进行还原。

该方式的缺点很明显，用户访问一个页面如果停留时间长必然会生成大量的图片，会带来很大的网络开销以及存储开销。

![](https://img11.360buyimg.com/jdphoto/s722x478_jfs/t1/98081/27/6038/154013/5df0dcd1E60e279da/8779fa5910a7a7ae.png)

b) 用户操作重现

该方法主要是记录用户页面 dom 的变化，然后在出现 script error 时将对应的记录进行上报，然后在分析系统里通过技术将页面还原。

大体的思路就是：

1) 进入页面，生成页面的虚拟dom全量快照；

2) 运用 API：MutationObserver，记录用户变化的 dom，同时记录用户的一些行操作（click，select，input，scroll 等事件）；

3）当出现 script error 时将对应快照信息上报；

4）在分析系统中将快照与用用户的操作还原。

3.2 页面数据上报

该方法在使用数据驱动框架（vue,react）的页面中非常的方便，当出现错误时可以将页面当前端数据信息与错误一起上报，然后在分析系统通过一定的技术将页面还原，复现出现问题时的页面。


## 日志上报、统计、分析以及监控

前面讲到了 badjs 中 script error 的由来、常见的解决方案、实例分析以及另类思路，最后再讲一下日志的上报、统计、分析以及监控。

### 1. 日志上报

```javascript
  // 全局的 onerror 用于捕获页面异常
  window.onerror = function(msg, url, line, col, error) {
    let excludeList = ['WeixinJSBrige']; // 剔除一些确认的本身客户端引起的问题，避免对上报后的数据分析引起干扰
    // 拼接错误信息
    let errStr = obj2str(msg) + (url ? ';URL:' + url : '') + (line ? ';Line:' + line : '') + (col ? ';Column:' + col : ''
    // 剔除白名单内错误上报，避免对上报结果干扰
    for (let item in excludeList) {
      if (errStr.indexof(item) > -1) {
        return;
      }
    }
    // 构造图片请求，用于上报
    let g = new Image()
    // 存在 traceid 则拼接 traceid 用于日志串联
    g.src = reportUrl + errStr + '&t=' + Math.random()+(window.traceid ? '&traceid=' + window.traceid : '')
  }
    return false;
};

```

「对于使用了promise以及框架（vue,react）本身内部会拦截错误，需要添加对应的方法进行手动上报」


```javascript
// promise 错误上报
window.addEventListener('rejectionhandled', event => {
  // 错误的详细信息在 reason 字段
  window.onerror('', '', '', '', event.reason)
});

// vue 错误上报
Vue.config.errorHandler = function (err, vm, info) {
  window.onerror(info, '', '', '', err)
}
// ...其他的就不一一列举了
```


在服务端收集日志是除上报过来的日志还需要根据请求采集 IP、userinfo、traceid、netType、ua、time 等等

### 2. 日志统计与分析

a) 数量视图。最直白的统计莫属实时的错误数量视图了，通过该视图可以查看当前页面实时的错误数量，同时页可以配置规则，当 badjs 异常上涨时设置对应的告警，避免发版本时出现错误而未发现，进而影响用户正常的页面访问。

b）日志聚合展示（errmsg）；以错误信息进行日志聚合，可以直观查看哪些错误比较多。
![](https://img11.360buyimg.com/jdphoto/s2150x288_jfs/t1/101688/13/6134/55436/5df1c36eE3e919838/e06e3d21fba14924.png)

c）明细日志展示；统计错误日志的详细信息，通过详细信息可以查看错误发生时用户渠道、网络类型、用户信息、ua 信息等，最主要的是可以通过 traceid 查看用户访问页面的详细信息，用于判断页面访问是否正常。
![](https://img11.360buyimg.com/jdphoto/s1546x552_jfs/t1/95068/11/6096/106650/5df1c374Ebf46f8da/b2ee65ff6ab6bf6d.png)

d）多维度统计分析（运营商、用户、机型、网络、系统、渠道等）；通过多维度的统计聚合，可以很直白的查看错误在不同的维度展示（如另类分析思路中的渠道占比，ua 占比），帮助分析定位问题。

### 3. 错误监控

在笔者的工作中将 badjs 根据是否由接口导致的区分为普通 badjs 与 servererror badjs 与 servererror 的波动情况。普通的 badjs 可以根据对应的日志以及分析视图来帮助辅助定位并修复，对于 servererror 则通知对应的接口负责人进行问题定位修复。
在创建页面时为每个页面自动生成两个key（badjs 与 serveerror）。badjs 和 serveerror），badjs 上报之后，refer就是页面的URL，分析服务依照页面url进行聚合计算，从而进行实时监控。

a) 规则配置。我们将告警规则设置为黄灯告警与红灯告警，黄灯起提示作用，红灯则属于严重告警，当触发规则时则自动推送消息给对应的负责人并告警，这样就可以快速响应处理问题。

下图为 badjs 告警规则配置：

![](https://img11.360buyimg.com/jdphoto/s2012x824_jfs/t1/93493/38/6296/164801/5df1ed12E936a0159/5ad4f2fa3df61c46.png)

下图为 servererror 告警规则配置：

![](https://img11.360buyimg.com/jdphoto/s2012x848_jfs/t1/90621/39/6332/177723/5df1ed17E8eab6465/aed46faaf93c564f.png)

b) 视图监控。如下图就是在公共页面某个版本后导致的 badjs 毛刺（普通 badjs，未影响到页面的正常访问）。在收到告警后即刻进行版本回滚，定位问题修复后再二次上线。

![](https://img11.360buyimg.com/jdphoto/s740x714_jfs/t1/103646/31/6311/40212/5df1e8edE5c1916ee/5e94d75ca26a798b.png)

在收到 servererror 告警时，我们还需要定位到对应的接口，在前面的上报中我们已经上报了对应的接口信息，所以可以通过监控系统查询对应的接口。

![](https://img11.360buyimg.com/jdphoto/s938x232_jfs/t1/105850/8/6264/36610/5df1ec20Ecab1d4c1/177500156c8431b8.png)


## 结尾

本文主要总结了自己工作中前端 badjs 常用的一些上报、定位、分析方式与思路以及日志的上报、统计、分析与监控，对 badjs 定位分析以及 script error 提供一种推断思路，希望对大家有所帮助。

## 参考文献

- [Capture and report JavaScript errors with window.onerror](https://blog.sentry.io/2016/01/04/client-javascript-reporting-window-onerror)

- [web页面录屏实现](https://juejin.im/post/5c601e2f51882562d029d583)

- [webkit源码](http://trac.webkit.org/browser/branches/chromium/648/Source/WebCore/dom/ScriptExecutionContext.cpp)
