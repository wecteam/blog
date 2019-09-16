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
            date:item.date.unix()
        }
    });
    console.log(posts.length,posts.sort,posts);
    posts.sort((a,b)=>{
        return b.date - a.date
    });
    var content = `
# 目录

${posts.map(item=>{
    console.log(item.title);
    return `* [${item.title}](https://wecteam.io/${encodeURIComponent(item.path)})`
}).join('\n\n')}
    `;
    fs.writeFile(path.join(this.base_dir,'README.md'),content,data=>{
        console.log(data);
    })
});