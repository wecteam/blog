---
title: 记一次Node.js直出服务的性能优化
date: 2019-09-27 03:06:01
cover:  http://img14.360buyimg.com/jdphoto/jfs/t1/50740/31/9213/54632/5d6a57bcE69b28e44/8fa1c3c5396e49af.jpg
thumbnail: http://img14.360buyimg.com/jdphoto/jfs/t1/50740/31/9213/54632/5d6a57bcE69b28e44/8fa1c3c5396e49af.jpg
tags: 
  - Vue.compile
  - CPU性能优化
  - 火焰图
categories: Node.js
---

> 作者：肖睦群、李刚松

## 一.问题背景

MPM（Market Page Maker）是京东社交电商部的组件化的页面可视化搭建平台，于2016年9月份上线，平均每周150+个页面，目前已经成为社交电商部的一个核心系统。系统使用Vue.js作为组件化的基础框架,并于2017年5月份上线了Node.js直出服务。MPM的页面会被运营同学拿到各种渠道投放，整体流量很不稳定，对于流量的暴涨情况要能够及时处理，这对于开发同学来说是一个比较烦的工作。

前几天突然收到告警信息，由于运营同学将某个MPM活动页面投放了外部广告，直出服务流量大涨，服务器CPU使用率达到了80%以上，于是立马申请扩容，问题虽解决，但是留给了我们一个问题：直出服务能否优化，这次量级的流量进来之后，是否可以稳定支撑而不需要扩容？
<!--more-->
## 二.分析方法及问题点
由于本次告警问题主要是流量暴涨导致的CPU使用率过大，我们本次重点优化服务的CPU消耗性能。分析CPU消耗的方法有[多种](https://juejin.im/post/5d43a41cf265da03d60ee128),我们选择其中操作比较简单的[v8-profiler](https://www.npmjs.com/package/v8-profiler)方案：安装NPM包v8-profiler，在直出服务中添加监控代码，打包发布到预发布环境进行压测，收集监控数据再进行分析。监控代码如下：

```javascript
const profiler = require('v8-profiler');
const fs = require('fs');
(function cpuProf() {
    setTimeout(function () { 
        console.log('开始收集CPU数据');
        profiler.startProfiling('CPU profile');
        setTimeout(function () { 
            const profile = profiler.stopProfiling();
            profile.export(function (err, result) {
                fs.writeFileSync('profile.json', result);
                profile.delete();
                console.log('CPU数据收集完成');
            });
        }, 1000 * 60 * 5);//监控数据采集5分钟
    }, 1000);
})();
```

上述代码会采集服务端5分钟的CPU消耗数据，并生成一个JSON文件，将此文件下载到本地后，导入到在线分析网址https://www.speedscope.app/ （或者用Chrome DevTool也可以），可以看到火焰图如下：


![](http://img30.360buyimg.com/jdphoto/jfs/t1/47038/8/11206/219858/5d822841Ef77c142f/5cb0763cbc61ecce.png)


从火焰图可以看到函数的调用栈，从上而下就是调用栈，其中横条长度越长代表这占用cpu的时间越长。如果某个横条很长，但是下面又没有很细小的子调用，一般就表示该调用消耗时间比较长，可以考虑做优化。从图中我们可以看到，消耗性能的主要有几个地方：
1）replace函数
2）compile函数
3）parse函数
4）vue渲染

为了方便后文的分析，我们先了解一下直出服务的处理过程：

<table>
    <thead>
        <tr>
            <th style="width: 80px">步骤</th>
            <th>处理流程</th>
            <th style="width: 150px">资源消耗类型</th>
            <th>备注</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>1</td>
            <td>服务收到请求，解析页面参数</td>
            <td>CPU计算</td>
            <td></td>
        </tr>
        <tr>
            <td>2</td>
            <td>从Redis中读取页面数据(PageData)</td>
            <td>网络IO</td>
            <td>PageData包括页面的各种配置信息，如页面头尾模板、页面楼层信息、身份判断要求、组件元数据等</td>
        </tr>
        <tr>
            <td>3</td>
            <td>解析PageData</td>
            <td>CPU计算</td>
            <td></td>
        </tr>
        <tr>
            <td>4</td>
            <td>组装后端请求参数</td>
            <td>CPU计算</td>
            <td></td>
        </tr>
        <tr>
            <td>5</td>
            <td>发起后端请求并等待返回</td>
            <td>网络IO</td>
            <td></td>
        </tr>
         <tr>
            <td>6</td>
            <td>解析后端接口返回的JSON数据</td>
            <td>CPU计算</td>
            <td></td>
        </tr>
         <tr>
            <td>7</td>
            <td>页面模板构造</td>
            <td>CPU计算</td>
            <td>由于存在用户身份判断（如某些组件仅对新人可见）、楼层BI等原因，组件的容器是动态构造的</td>
        </tr>
         <tr>
            <td>8</td>
            <td>组件渲染</td>
            <td>CPU计算</td>
            <td>此处的组件渲染是Vue组件的服务端渲染</td>
        </tr>
         <tr>
            <td>9</td>
            <td>吐出页面HTML</td>
            <td>网络IO</td>
            <td></td>
        </tr>
    </tbody>
</table>


## 三.replace函数调用优化

分析具体的replace函数调用之前，我们先详细分析一下上面表格的第7步:页面模板构造。

### 1.页面模板构造
由于存在用户身份判断（如某些组件仅对新人或者VIP用户可见）、楼层BI（每个用户展示的楼层顺序都不一样）等原因，相同页面对于不同的用户展示的组件数量、顺序都是不一样（即千人千面），因此页面的模板是基于各个组件的模板动态构造的。为方便对组件进行操作，每个组件都有一个div容器，容器构造很简单，示例代码如下：

```html
<div id='com_1001'>__vue_com_1001_replace__</div>
<div id='com_1002'>__vue_com_1002_replace__</div>
<div id='com_1003'>__vue_com_1003_replace__</div>
<div id='com_1004'>__vue_com_1004_replace__</div>
```
其中__vue_com_1001_replace__这种是占位符，需要用相应位置的组件的实际模板来替换。但是这里有个问题，
Vue渲染的时候，使用[Render Function](https://cn.vuejs.org/v2/guide/render-function.html)进行渲染的，并不是普通的字符串模板或者Vue模板。下面是一段模板编译后的Render Function：

```JavaScript
_c('commontag',{ref:"__uid__replace__str__",attrs:{"uid":"__uid__replace__str__","params":params___uid__replace__str__},inlineTemplate:{render:function(){with(this){return _c('div',[(true)?[(params.transparent != 1)?_c('div',{staticClass:"vueSeparator",style:({'background-color':params.color,  height: params.height + 'px'})}):_c('div',{staticClass:"vueSeparator",style:({height: params.height + 'px'})})]:_e()],2)}},staticRenderFns:[]}})
```

若使用的是Vue模板，则会在运行时做一次编译，编译为Render Function，比较耗性能，因此官方推荐的做法是在[构建时预编译](https://cn.vuejs.org/v2/guide/deployment.html#%E6%A8%A1%E6%9D%BF%E9%A2%84%E7%BC%96%E8%AF%91)，并且运行时使用不包含编译函数的[精简版](https://cn.vuejs.org/v2/guide/deployment.html#%E4%B8%8D%E4%BD%BF%E7%94%A8%E6%9E%84%E5%BB%BA%E5%B7%A5%E5%85%B7)。目前MPM每个组件存储到Redis中的也是Render Function，而不是原始的Vue模板。所以现在的问题是，已知子组件编译后的Render Function，并且知道各个组件的DOM结构形式的容器，能否构造出父组件的Render Function？

答案当然是可以：<em>可以通过字符串操作，构造出父组件的Render Function！</em>

我们以下面这段代码为例，看看构造过程（为了简单处理，我们用了内联模板）：
```HTML
<ParentComponent>
    <SubComponent1 inline-template :param="data.sub1">
        <p>this is SubComponent1{{param.name}}</>
    </SubComponent1>
    <SubComponent2 inline-template :param="data.sub2">
        <p>this is SubComponent2{{param.name}}</>
    </SubComponent2>
    <SubComponent3 inline-template :param="data.sub3">
        <p>this is SubComponent3{{param.name}}</>
    </SubComponent3>
</ParentComponent>
```
上述代码经过Vue.compile函数编译处理后，会得到一个包含render和staticRenderFns两个属性的对象，我们主要看render属性，它是一个匿名函数，代码如下：
```JavaScript
function anonymous(
) {
with(this){return _c('ParentComponent',[_c('SubComponent1',{attrs:{"param":data.sub1},inlineTemplate:{render:function(){with(this){return _c('p',[_v("this is SubComponent1"+_s(param.name)+"\n\t")])}},staticRenderFns:[]}}),_v(" "),_c('SubComponent2',{attrs:{"param":data.sub2},inlineTemplate:{render:function(){with(this){return _c('p',[_v("this is SubComponent2"+_s(param.name)+"\n\t")])}},staticRenderFns:[]}}),_v(" "),_c('SubComponent3',{attrs:{"param":data.sub3},inlineTemplate:{render:function(){with(this){return _c('p',[_v("this is SubComponent3"+_s(param.name)+"\n\t")])}},staticRenderFns:[]}})],1)}
}
```
将上面的代码再格式化一下：
```JavaScript
function anonymous() {
with(this){return 
_c('ParentComponent',
[
_c('SubComponent1',{attrs:{"param":data.sub1},inlineTemplate:{render:function(){with(this){return _c('p',[_v("this is SubComponent1"+_s(param.name)+"\n\t")])}},staticRenderFns:[]}}),_v(" "),
_c('SubComponent2',{attrs:{"param":data.sub2},inlineTemplate:{render:function(){with(this){return _c('p',[_v("this is SubComponent2"+_s(param.name)+"\n\t")])}},staticRenderFns:[]}}),_v(" "),
_c('SubComponent3',{attrs:{"param":data.sub3},inlineTemplate:{render:function(){with(this){return _c('p',[_v("this is SubComponent3"+_s(param.name)+"\n\t")])}},staticRenderFns:[]}})
],1)}
}
```
可以看到上面第4、5、6行代码，就是子组件的Render Function，他们包裹在一个数组里。因此，如果知道子组件的Render Function，配合形如下面的模板，就可以反过来构造出父组件的Render Function（当然有一个从字符串到函数的反序列化过程，但是在我们的场景这个不可避免，因为模板是从Redis中读取出来的）。
```
function anonymous() {
with(this){return 
_c('ParentComponent',
[
__SubComponent1_replace__,
__SubComponent2_replace__,
__SubComponent3_replace__
],1)}
}
```
再回到我们的问题，我们已知子组件的Render Function，并且已知父组件的容器，需要构造出父组件的Render Function。现在思路就很清晰了，我们只需要把开头那段包含占位符的div容器代码，
```html
<div id='com_1001'>__vue_com_1001_replace__</div>
<div id='com_1002'>__vue_com_1002_replace__</div>
<div id='com_1003'>__vue_com_1003_replace__</div>
<div id='com_1004'>__vue_com_1004_replace__</div>
```
使用Vue.compile函数将其编译成Render Function，处理成字符串后，再通过正则替换其中的子组件的占位符，变成子组件模板，最后反序列化为父组件的Render Function即可。整体处理逻辑如下：
![](http://img14.360buyimg.com/jdphoto/jfs/t1/68669/10/8822/43844/5d6a26f2Ee7fef972/26e976b89d95b4b6.png)

### 2.问题代码分析
了解了上述处理过程，我们再根据火焰图中的调用栈，找到replace函数调用的问题代码：
```JavaScript

Object.keys(MPM_COM_STYLE_MAP).forEach(function(comId){
    var styleKey = MPM_COM_STYLE_MAP[comId];
    var code = '';
    if(hideComIds.indexOf(comId)!=-1){
        code = HIDE_TPL;
    }else if(loadingComs.indexOf(comId)!=-1){
        code = LOADING_TPL;
    }else if(MPM_STYLE_TPL_MAP[styleKey]) {
    	// 第一次replace替换
        code = MPM_STYLE_TPL_MAP[styleKey].replace(/__uid__replace__str__/g, comId); 
    } else{
        console.error('最终替换，发现无模板组件',comId);
    }
    if(code) {
    	//第二次replace替换
    	compileTpl = compileTpl.replace(`_v("__vue__${comId}__replace__")`,code);
	}  
});

```
可以看到有两次replace函数调用，第一次是组件ID替换（即uid替换），第二次是组件模板替换。

先分析第一次replace函数调用。
前面提到，每个组件的模板已经编译为Render Function并存在Redis中。但是同一个组件在页面中可能有多个实例，每个实例需要有一个ID来区分，我们称为uid（unique ID的意思），uid只有在运行的时候才生成，在编译的时候是不知道的，因此用了一个占位符（即下图中的<pre>__uid__replace__str__</pre>），在直出服务中需要做替换，即上面代码中的uid替换。下面是一段编译后的代码：

![](http://img14.360buyimg.com/jdphoto/jfs/t1/50259/1/9401/126883/5d6a2717E0073a113/e036f07b0e515c3b.png)

每个页面会有很多个组件（数十个甚至上百个），每次替换都是在之前替换的结果之上进行的，形成了循环替换，前面导致告警的那个页面用到的编译之后的模版最大的有20+KB，而每次正则替换之后的模版会越来越长，所以这里耗时较多也就不奇怪了。

从逻辑上讲，这段代码是必不可少的，但是又有性能瓶颈，如何优化？

### 3.uid替换优化

我们研究发现：对于比较长的字符串，先用字符串的split方法分割成数组，再用数组的join方法将切割的数组合并为一个字符串，比正则替换的效率要高。此法我们称为数组粘合法。以下为测试代码：

```JavaScript

const exeCount = 10000000;   //执行次数,此处分别换成1W、10W、100W、1000W

//测试字符串，需要比较长的字符串才能看到效果，下面是从我们的组件模板中摘取的一段
const str = `_c('ds',{ref:"__uid__replace__str__",attrs:{"uid":"__uid__replace__str__","params":params___uid__replace__str__,"tab-index":"3"},inlineTemplate:{render:function(){with(this){return _c('div',{attrs:{"stylkey":data.styleKey,"pc":data.pc,"actid":data.actid,"areaid":data.areaid}},[_c('ul',{directives:[{name:"getskuad",rawName:"v-getskuad",value:({bindObj:data, appendName:'skuAd', show: params.extend.showAds}),expression:"{bindObj:data, appendName:'skuAd', show: params.extend.showAds}"}],staticClass:"pinlei_g3col"},[(true)?_l((params.fnObj.translate(data.itemList)),function(item,index){return (!params.shownum || index < params.shownum || data.showMore)?_c('li',{class:['pinlei_g3col_col', (params.extend.imgSize == '1' ? 'size_230x230' : 'size_230x320')],attrs:{"index":index}},[_c('div',{staticClass:"pinlei_g3col_img"},[_c('a',{attrs:{"href":params.extend.buttonType == '5' ? addRd(goPingouUrl(item.sUrl),params.ptag) : addRd(item.sUrl,params.ptag)}},[_c('img',{attrs:{"init_src":getImgUrl('//img12.360buyimg.com/mcoss/'+ item.sPicturesUrl),"data-size":"230x230"}})]),((params.extend.sellOut != '0') && (item.dwStock - 0 > 0))?_c('div',{staticClass:"pinlei_g3col_msk"},[_m(0,true)]):_e()]),_c('div',{staticClass:"pinlei_g3col_info"},[_c('div',{class:['pinlei_g3col_t1', 'red', (params.extend.titleHeight == '1' ? 'oneline' : '')]},[_v("\n                                "+_s(item.sProductName)+"\n                            ")]),(!params.fnObj.isBeforeActive(params.extend.beginTime))?_c('div',{staticClass:"pinlei_g3col_price red",style:({color: params.extend.isShowTokenPrice == '1' && item.dwTokenPrice && (Number(item.dwTokenPrice) != 0)?'#888':''})},[_v("\n                                ￥"),_c('b',[_v(_s(item.dwRealTimePrice.split('.')[0]))]),_v("."+_s(item.dwRealTimePrice.split('.')[1])+"\n                            ")]):_e(),(params.fnObj.isBeforeActive(params.extend.beginTime))?_c('div',{staticClass:"pinlei_g3col_price red",style:({color: params.extend.isShowTokenPrice == '1' && item.dwTokenPrice && (Number(item.dwTokenPrice) != 0)?'#888':''})},[_v("\n                                ￥"),_c('b',[_v(_s(params.fnObj.getYushouInt(item, params.extend.priceType)))]),_v(_s(params.fnObj.getYushouDecimal(item, params.extend.priceType))+"\n                            ")]):_e(),(params.extend.isShowTokenPrice == '1')?[_c('div',{staticClass:"pinlei_g3col_token"},[(item.dwTokenPrice && (Number(item.dwTokenPrice) != 0))?_c('div',{staticClass:"pinlei_g3col_token_price"},[_v("专属价:￥"),_c('b',[_v(_s(parseFloat(item.dwTokenPrice)))])]):_e()])]:_e(),(params.fnObj.isBeforeActive(params.extend.beginTime))?[_c('div',{staticClass:"pinlei_g3col_desc red"},[(item.sBackUpWords[0] && (params.fnObj.getYushouJiaDiff(item,params.extend.priceType) > 0))?[_v("比现在买省"+_s(params.fnObj.getYushouJiaDiff(item,params.extend.priceType))+"元")]:(item.sTag)?[_v(_s(item.sTag.split('|')[0]))]:(params.extend.showAds == '1' && item.skuAd)?[_v(_s(item.skuAd))]:_e()],2)]:_e(),(!params.fnObj.isBeforeActive(params.extend.beginTime))?[_c('div',{staticClass:"pinlei_g3col_desc red"},[(item.sTag)?[_v(_s(item.sTag.split('|')[0]))]:(params.extend.showAds == '1' && item.skuAd)?[_v(_s(item.skuAd))]:_e()],2)]:_e(),(params.fnObj.isBeforeActive(params.extend.beginTime))?[(params.extend.buttonType == '0')?[(params.extend.priceType == '1')?_c('div',{directives:[{name:"addcart",rawName:"v-addcart",value:({skuId: item.ddwSkuId}),expression:"{skuId: item.ddwSkuId}"}],class:{'pinlei_g3col_btn':true, 'blue':params.extend.beginTime, 'red':(!params.extend.beginTime), 'right': item.sBackUpWords[2]},style:(params.extend.priceType == 0?'border-radius: 24px;':'')},[_v("\n                                        "+_s(params.extend.buttonWording)+"\n                                    ")]):_e(),(params.extend.priceType == '0')?_c('div',{directives:[{name:"addcart",rawName:"v-addcart",value:({skuId: item.ddwSkuId}),expression:"{skuId: item.ddwSkuId}"}],class:{'pinlei_g3col_btn':true, 'blue':params.extend.beginTime, 'red':(!params.extend.beginTime), 'right': item.sBackUpWords[2]},style:(params.extend.priceType == 0?'border-radius: 24px;':'')},[_v("\n                                        "+_s(params.extend.buttonWording)+"\n                                    ")]):_e()]:_e(),(params.extend.buttonType == '1')?[_c('a',{attrs:{"href":addRd(item.sUrl,params.ptag)}},[_c('div',{class:{'pinlei_g3col_btn':true, 'blue':params.extend.beginTime, 'red':(!params.extend.beginTime)},style:(params.extend.priceType == 0?'border-radius: 24px;':'')},[_v("\n                                            "+_s(params.extend.buttonWording)+"\n                                        ")])])]:_e(),(params.extend.buttonType == '5')?[_c('a',{attrs:{"href":addRd(goPingouUrl(item.sUrl),params.ptag)}},[_c('div',{class:{'pinlei_g3col_btn':true, 'blue':params.extend.beginTime, 'red':(!params.extend.beginTime)},style:(params.extend.priceType == 0?'border-radius: 24px;':'')},[_v("\n                                            "+_s(params.extend.buttonWording)+"\n                                        ")])])]:_e(),(params.extend.buttonType == '2')?[_c('a',{attrs:{"href":addRd(item.sUrl,params.ptag)}},[_c('div',{class:{'pinlei_g3col_btn':true, 'blue':params.extend.beginTime, 'red':(!params.extend.beginTime)},style:(params.extend.priceType == 0?'border-radius: 24px;':'')},[_v("\n                                            定金"+_s(item.sBackUpWords[1].split('+')[0])+"抵"+_s(parseFloat((item.sBackUpWords[1].split('+')[1] * item.sBackUpWords[1].split('+')[0]).toFixed(2)))+"\n                                        ")])])]:_e(),(params.extend.buttonType == '3')?[_c('div',{directives:[{name:"yuyue",rawName:"v-yuyue",value:({bindObj:data,stop:true, activeId:params.extend.yuyueID,appendTo:item,appendName:'state',msg:[]}),expression:"{bindObj:data,stop:true, activeId:params.extend.yuyueID,appendTo:item,appendName:'state',msg:[]}"}],class:['pinlei_g3col_btn','blue', item.state == 1 ? 'disabled' : ''],style:(params.extend.priceType == 0?'border-radius: 24px;':''),attrs:{"yuyueid":params.extend.yuyueID}},[_v("\n                                        "+_s(params.extend.buttonWording)+"\n                                    ")])]:_e(),(params.extend.buttonType == '4' )?[((params.fnObj.getYushouJiaDiff(item,params.extend.priceType)> 0))?_c('div',{directives:[{name:"skuyuyue",rawName:"v-skuyuyue",value:({bindObj:data,stop:true, skuId:item.ddwSkuId,appendTo:item,ignoreHistory:true,msg:{success: '预约成功，请留意京东JD.COM服务号的活动提醒',exist: '已设置预约，无需再进行设置',systemError: '该商品不是预约活动商品'},actPrice:params.fnObj.getYushouInt(item, params.extend.priceType)+params.fnObj.getYushouDecimal(item, params.extend.priceType),classId:item.classId1+'_'+item.classId2+'_'+item.classId3}),expression:"{bindObj:data,stop:true, skuId:item.ddwSkuId,appendTo:item,ignoreHistory:true,msg:{success: '预约成功，请留意京东JD.COM服务号的活动提醒',exist: '已设置预约，无需再进行设置',systemError: '该商品不是预约活动商品'},actPrice:params.fnObj.getYushouInt(item, params.extend.priceType)+params.fnObj.getYushouDecimal(item, params.extend.priceType),classId:item.classId1+'_'+item.classId2+'_'+item.classId3}"}],class:['pinlei_g3col_btn','blue', item.state == 1 ? 'disabled' : ''],style:(params.extend.priceType == 0?'border-radius: 24px;':'')},[_v("\n                                        "+_s(params.extend.buttonWording)+"\n                                    ")]):_c('div',{directives:[{name:"skuyuyue",rawName:"v-skuyuyue",value:({bindObj:data,stop:true, skuId:item.ddwSkuId,ignoreHistory:true,appendTo:item,msg:{success: '预约成功，请留意京东JD.COM服务号的活动提醒',exist: '已设置预约，无需再进行设置',systemError: '该商品不是预约活动商品'}}),expression:"{bindObj:data,stop:true, skuId:item.ddwSkuId,ignoreHistory:true,appendTo:item,msg:{success: '预约成功，请留意京东JD.COM服务号的活动提醒',exist: '已设置预约，无需再进行设置',systemError: '该商品不是预约活动商品'}}"}],class:['pinlei_g3col_btn','blue', item.state == 1 ? 'disabled' : ''],style:(params.extend.priceType == 0?'border-radius: 24px;':'')},[_v("\n                                        "+_s(params.extend.buttonWording)+"\n                                    ")])]:_e(),(params.extend.buttonType == '6' )?[_c('div',{directives:[{name:"yuyue",rawName:"v-yuyue",value:({bindObj:data,stop:true,noTip:true,activeId:params.extend.yuyueID,appendTo:item,appendName:'state',msg:[]}),expression:"{bindObj:data,stop:true,noTip:true,activeId:params.extend.yuyueID,appendTo:item,appendName:'state',msg:[]}"},{name:"addcart",rawName:"v-addcart",value:({skuId: {skuId: item.ddwSkuId,successTxt:'预约加车成功'}}),expression:"{skuId: {skuId: item.ddwSkuId,successTxt:'预约加车成功'}}"}],class:{'pinlei_g3col_btn':true, 'blue':params.extend.beginTime, 'red':(!params.extend.beginTime), 'left': params.fnObj.getCouponInfo(item.sBackUpWords[2])},style:(params.extend.priceType == 0?'border-radius: 24px;':''),attrs:{"yuyueid":params.extend.yuyueID}},[_v("\n                                        "+_s(params.extend.buttonWording)+"\n                                    ")])]:_e()]:_e(),(!params.fnObj.isBeforeActive(params.extend.beginTime))?[(params.extend.buttonActiveType == '0')?[_c('div',{directives:[{name:"addcart",rawName:"v-addcart",value:({skuId: item.ddwSkuId}),expression:"{skuId: item.ddwSkuId}"}],staticClass:"pinlei_g3col_btn",style:(params.extend.priceType == 0?'border-radius: 24px;background-color: #ea1e54;':'')},[_v("\n                                        "+_s(params.extend.buttonActiveWording)+"\n                                    ")])]:_e(),(params.extend.buttonActiveType == '1')?[_c('a',{attrs:{"href":addRd(item.sUrl,params.ptag)}},[_c('div',{staticClass:"pinlei_g3col_btn red",style:(params.extend.priceType == 0?'border-radius: 24px;background-color: #ea1e54;':'')},[_v("\n                                            "+_s(params.extend.buttonActiveWording)+"\n                                        ")])])]:_e(),(params.extend.buttonActiveType == '2')?[_c('a',{attrs:{"href":addRd(goPingouUrl(item.sUrl),params.ptag)}},[_c('div',{staticClass:"pinlei_g3col_btn red",style:(params.extend.priceType == 0?'border-radius: 24px;background-color: #ea1e54;':'')},[_v("\n                                            "+_s(params.extend.buttonActiveWording)+"\n                                        ")])])]:_e(),(params.extend.buttonActiveType == '4')?[_c('div',{directives:[{name:"addcart",rawName:"v-addcart",value:({skuId: item.ddwSkuId, bindObject: item, bindPropertyName: 'addCartMsg', isPullQuan: true}),expression:"{skuId: item.ddwSkuId, bindObject: item, bindPropertyName: 'addCartMsg', isPullQuan: true}"},{name:"quan",rawName:"v-quan",value:({bindObj:data,key:params.extend.key, level:params.extend.level, num:1, msg:{}, appendTo:item, appendName:'status', ignoreHistory:false, style:2, successUrl:item.successUrl, type:1, coupondes:{value: params.extend.price, gate: params.extend.gate, name: params.extend.name}}),expression:"{bindObj:data,key:params.extend.key, level:params.extend.level, num:1, msg:{}, appendTo:item, appendName:'status', ignoreHistory:false, style:2, successUrl:item.successUrl, type:1, coupondes:{value: params.extend.price, gate: params.extend.gate, name: params.extend.name}}"}],staticClass:"pinlei_g3col_btn",style:(params.extend.priceType == 0?'border-radius: 24px;background-color: #ea1e54;':'')},[_v("\n                                        "+_s(params.extend.buttonActiveWording)+"\n                                    ")])]:_e()]:_e()],2),(params.extend.corner != '0')?[(isRange(params.extend.cornerBegin, params.extend.cornerEnd) && params.extend.cornerDes)?_c('div',{staticClass:"pinlei_g3col_stamp red"},[_v(_s(params.extend.cornerDes))]):(item.sCopyWriting)?_c('div',{staticClass:"pinlei_g3col_stamp red"},[_v(_s(item.sCopyWriting))]):_e()]:_e()],2):_e()}):_e()],2),(params.shownum && data.itemList.length > params.shownum)?[_c('div',{class:'pinlei_more '+ (data.showMore?'pinlei_more_unfold':''),on:{"click":function($event){toggleMore($event)}}},[_v(_s(data.showMore?'收起更多':'展开更多'))])]:_e()],2)}},staticRenderFns:[function(){with(this){return _c('div',{staticClass:"pinlei_g3col_msk_ico"},[_c('div',{staticClass:"pinlei_g3col_msk_text"},[_v("\n                                        已抢光\n                                        "),_c('br'),_v("over\n                                    ")])])}}]}})`
//正则替换法start
const timeStart = new Date().getTime();
for(var i = 0; i < exeCount; i++) {
    str.replace(/__uid__replace__str__/g, 'com_1001');
}
const timeEnd = new Date().getTime();
console.log('正则替换耗时：', timeEnd - timeStart);
//正则替换法end
//数组粘合法start
const timeStart2 = new Date().getTime();
const segs = str.split('__uid__replace__str__');
for(var i = 0; i < exeCount; i++) {
    segs.join('com_1001');
}
const timeEnd2 = new Date().getTime();
console.log('数组粘贴耗时：', timeEnd2 - timeStart2);
//数组粘合法end
```
结果如下：
<table>
    <thead>
        <tr>
            <th>执行次数</th>
            <th>正则替换法耗时(ms)</th>
            <th>数组粘合法耗时(ms)</th>
            <th>正则替换法耗时/数组粘合法耗时</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>1W</td>
            <td>42</td>
            <td>25</td>
            <td>1.68</td>
        </tr>
        <tr>
            <td>10W</td>
            <td>362</td>
            <td>179</td>
            <td>2.01</td>
        </tr>
        <tr>
            <td>100W</td>
            <td>3555</td>
            <td>1623</td>
            <td>2.2</td>
        </tr>
        <tr>
            <td>1000W</td>
            <td>36449</td>
            <td>18634</td>
            <td>1.95</td>
        </tr>
    </tbody>
</table>

可以看到数组粘合法的耗时是正则替换法的一半左右。

考虑到我们的场景就是字符串比较大，存在循环替换，且是海量服务的场景，因此上面第一次替换，直接改成数组粘合法即可。

### 4.组件模板替换优化
问题代码中的第二次替换，是将容器里的组件占位符替换为子组件的Render Function。即下图所示：
![](http://img30.360buyimg.com/jdphoto/jfs/t1/74148/30/8785/25337/5d6a2749Ec383dbe6/e17d1fd59ffb9ffb.png)
子模板替换优化的替换次数其实是跟组件的数量相关的，即使有150个组件，用数组粘合法也不会有明显的性能提升，因此需要考虑别的办法。

我们查了一下vue-template-compiler的源码(Vue的compile能力也是用此模块)，发现Vue.compile的函数有2个参数，第一个参数是待编译的Vue模板，第二个参数是一个option对象，包含一个名为tansformCode钩子函数(参见资料https://github.com/vuejs/vue/blob/dev/flow/compiler.js#L38-L45 ，此参数并未在官网的文档中暴露，关于此函数的用处后面可以再写一篇文章) ，这个钩子函数接受两个参数，第一个是ast节点，第二个是编译该节点之后的render code，而该函数的返回值会就是最终的render code。于是在之前的生成dom函数那里把com占位符替换为一个空的div元素，div元素的id为之前的占位符，然后在编译的时候在transformCode钩子函数这里做一个替换，当发现ast节点为div并且id符合组件占位符的规则，那么就返回该组件对应的编译之后样式模版。具体代码如下：

```javascript
var compileTpl = compiler.compile(`<div>${html}</div>`, {
            modules: {
                transformCode: function (el, code) {
                    if (el.attrsMap && el.attrsMap['id'] && el.attrsMap['id'].match(/__vue__com_\d{4,5}__replace__/)) {
                        var comId = el.attrsMap['id'].match(/com_\d{4,5}/)[0];
                        // console.log('--------------------------------', comId);
                        var styleTemplate  = compiledComTplMap[comId];
                        // console.log(styleTemplate);
                        return styleTemplate;
                    }
                    return code;
                }
            }
        }).staticRenderFns.toString();
```


这样一来就完全省去了第二次字符串替换的操作，于是组件编译这里的流程了下面这样：

![](http://img14.360buyimg.com/jdphoto/jfs/t1/38640/40/15928/32002/5d6a292eEaad87937/abc0a5fc367aa1aa.png)

这两次优化之后然后重新压测并收集性能数据，得到的火焰图如下：

![](http://img10.360buyimg.com/jdphoto/jfs/t1/66970/39/8617/181855/5d6a2946E9c484381/74f6f67e08202a17.png)

可以看到createApp函数里面原来的那个replace函数的横条已经消失不见了，说明前面的优化是有效果的，最耗时的操作已经不是replace而是vue的compile方法即模版的编译。从此次优化前后的服务端压测的CPU数据也能说明问题：

![](http://img11.360buyimg.com/jdphoto/jfs/t1/49916/11/11130/3999/5d822beeE7e542e78/799ef88b1705dca9.png)

## 四.compile函数调用优化

compile函数调用，就是前面"组件模板构造"那一节提到的，将组件的容器模板用Vue.compile函数编译成Render Function，虽然这段容器模板很简单，但是他是一个很耗性能的操作。而且这是Vue自身提供的能力，似乎已经没有多大的优化余地了。有没有其他优化方法呢？

仔细观察一下组件容器dom以及编译之后的代码，似乎是有规律的。如果组件树的结构是下面这样的：

```javascript
[
    {id: "com_1001"},
    {
        id: "com_1002",
        child: [
            {id: "com_1003"},
            {id: "com_1004"}
        ]
    }
];
```

拼接之后的html内容大概是下面这样的：


```html
<div>
    <div id="com_1001_con"></div>
    <div id="com_1002_con"></div>
    <div mpm_edit_child_box tabpid="com_1002" class="childBox">
        <div id="com_1003_con"></div>
        <div id="com_1004_con"></div>
    </div>
</div>
```

这里一般都只是一些简单的模版，编译出来大概是这样的：
```javascript

with(this) {
    return _c('div', [
        _c('div', {attrs: {"id": "com_1001_con"}}),
        _v(" "),
        _c('div', {attrs: {"id": "com_1002_con"}}),
        _v(" "),
        _c('div', {staticClass: "childBox", attrs: {"mpm_edit_child_box": "", "tabpid": "com_1002"}}, [
            _c('div', {attrs: {"id": "com_1003_con"}}),
            _v(" "),
            _c('div', {attrs: {"id": "com_1004_con"}})
        ])
    ])
}
```

通过观察可以发现，这里都是生成的div元素，div上的属性都是静态属性，由此我们可以自己实现一个简单的“编译”函数，不用走vue的编译：


```javascript
 function simpleCompile(comList) {
            function genTree(tree) {
                var html = '';
                for (var i = 0, len = tree.length; i < len; i++) {
                    var node = tree[i];
                    var comId = node.id;
                    html += `_c('div',{attrs:{"id":"${comId}_con"}},[`;
                    html = html + compiledComTplMap[comId] + '])';  //  compiledComTplMap[comId] 该组件对应的编译后的样式模版
                    if (node.child && node.child.length) {
                        html += `,_c('div',{staticClass:"childBox",attrs:{"mpm_edit_child_box":"","tabpid":"${comId}"}},[` + genTree(node.child) + `])`;
                    }
                    html += (i === len - 1)  ? '' : ',';
                }
                return html;
            }
            return genTree(comList);
        }
```

经测试，这样简单“编译”之后生成的代码跟之前编译的代码是一样的，在预发布环境测试了多个页面之后，页面渲染也没有问题。去掉Vue模版编译之后整个组件渲染的逻辑就变成了下面这样：

![](http://img20.360buyimg.com/jdphoto/jfs/t1/82696/9/8802/16350/5d6a29c5E152a9038/4cda63f70692af88.png)

Vue编译优化之后收集cpu数据得到的火焰图如下：

![](http://img10.360buyimg.com/jdphoto/jfs/t1/51201/27/9284/168200/5d6a29e0E93bfded2/e1781cb019fc35ae.png)

从火焰图可以看出，原来的那个compile函数调用的横条也消失了，说明优化有效果。再看看压测的CPU消耗情况：

![](http://img11.360buyimg.com/jdphoto/jfs/t1/48621/32/11050/5538/5d822c1eE5ce6a12b/6a950938fe73d8b9.png)

需要提到的是，由于是自己实现了一个简单版的compile函数，前文中关于compile函数调用优化的代码，也直接去掉了，当然也到达了优化的效果。

## 五.其他优化研究
经过上面两次优化之后，剩下最耗性能的地方是JSON解析和Vue渲染了。我们也做了一下研究，但是很可惜，暂时没什么成果，不过我们的探索也可以提一下：
1）JSON解析。我们的服务从Redis中读出来的PageData比较大，一般有100多KB，很需要有一个高性能的JSON反序列化的库(即代替JSON.parse)。目前有一个高性能的库[fast-json-stringify](https://www.npmjs.com/package/fast-json-stringify)，但是可惜他是做序列化的（即做的是JSON.stringify做的事情）。我们测试了多个方案，目前原生的JSON.parse函数性能是最好的。
2）Vue渲染。有位腾讯的同学提到，[用string-based的模板代替VirtualDom的渲染方案提升性能](https://mp.weixin.qq.com/s?__biz=MzUxMzcxMzE5Ng==&mid=2247485601&amp;idx=1&amp;sn=97a45254a771d13789faed81316b465a),不过他忽略了一点，Vue是完全的组件化的、是有生命周期钩子、方法、计算属性等，不是一个简简单单的模板引擎，按照他的思路是需要把生命周期的钩子、方法、计算属性等全部算好后拿到的数据对象，再跟string-based模板结合才能渲染，这个显然是和组件化的思路背道而驰的。

上面2点，各位看官如果有好的思路，欢迎不吝赐教！


## 六.总结
这次优化总的来说，CPU性能消耗得到了有效优化，整体提升了大概20%，一方面为公司节省了资源，另外一方面也减少了因流量暴涨导致我们要扩容的几率，一举两得。
