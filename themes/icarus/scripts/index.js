require('../includes/tasks/welcome');
require('../includes/tasks/check_deps');
require('../includes/tasks/check_config');
require('../includes/generators/categories')(hexo);
require('../includes/generators/category')(hexo);
require('../includes/generators/tags')(hexo);
require('../includes/generators/insight')(hexo);
require('../includes/filters/highlight')(hexo);
require('../includes/helpers/cdn')(hexo);
require('../includes/helpers/config')(hexo);
require('../includes/helpers/layout')(hexo);
require('../includes/helpers/override')(hexo);
require('../includes/helpers/page')(hexo);
require('../includes/helpers/site')(hexo);
var fs = require("fs");
var path = require("path");
// Fix large blog rendering OOM
const postHtmlFilter = hexo.extend.filter.list()['after_render:html'];
for (let filter of postHtmlFilter) {
    if (filter.name === 'hexoMetaGeneratorInject') {
        hexo.extend.filter.unregister('after_render:html', filter);
    }
}

// Debug helper
hexo.extend.helper.register('console', function () {
    console.log(arguments)
});

hexo.extend.helper.register('post_key', function(path, customKey){
    customKey = customKey || new Buffer(path).toString('base64');
    return customKey;
});

hexo.extend.generator.register('archive', function(locals){
    var posts = locals.posts.map(item=>{
        return {
            title:item.title,
            date:item.date.unix(),
            path:item.path
        }
    }).sort((a,b)=>{
        return b.date - a.date
    });
    // console.log(posts.length,posts.sort,posts);
    posts
    var content = `
# 这是什么？

这是京东社交电商部维C团(WecTeam)的在线博客，官网地址是：https://wecteam.io/。

维C团(WecTeam)，京东社交电商部前端技术团队，我们是一群热爱技术、乐于分享的前端工程师。主要对外输出技术实践总结、新技术探秘、Bug深度分析、优质英文资料翻译等，参与和推动前端技术的发展，为公司及行业带来价值！

# 文章列表

${posts.map(item=>{
    // console.log(item.title);
    return `* [${item.title}](https://wecteam.io/${encodeURIComponent(item.path)})`
}).join('\n\n')}
    
# 文章排版指南

[如何参与本博客](https://github.com/wecteam/blog/blob/master/docs/post-guide.md)

[文章排版指南](https://github.com/wecteam/blog/blob/master/docs/document-guide.md)

# 联系我们

请关注我们的微信公众号

![WecTeam](https://wq.360buyimg.com/data/ppms/picture/wecteam_qrcode.jpeg)

`;
    fs.writeFile(path.join(this.base_dir,'README.md'),content,data=>{
        // console.log(data);
    })
});