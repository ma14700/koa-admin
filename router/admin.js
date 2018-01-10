var router = require('koa-router')()
var apiModel = require('../lib/sql.js')
var path = require('path')
var koaBody = require('koa-body')
var checkLogin = require('../middlewares/check.js').checkLogin
var fs = require('fs')

router.get('/',async(ctx,next)=>{
    ctx.body="Hello JSPang";
    console.log(ctx)
    var page;
    let dataLength = '';
    if(ctx.querystring == ''){
        page = 1;
    }else{
        page = ctx.querystring.split('=')[1];
    }
    await checkLogin(ctx);
    // 查询videos里面所有数据
    await apiModel.findData('videos').then(res=>{
        dataLength = res.length;
    });

    await apiModel.findPageData('videos',page,7).then(res=>{
        data = JSON.parse(JSON.stringify(res))
    })

    await ctx.render('list',{
        videos:data,
        session:ctx.session,
        dataLength:Math.ceil(dataLength/7),
        nowPage:parseInt(page)
    })
})

// 登录页面
router.get('/signin', async(ctx, next) => {
    if (ctx.session.user) {
        await ctx.redirect('/')
    } else {
        await ctx.render('signin')
    }
})
// 登录post
router.post('/signin',koaBody(),async(ctx,next)=>{
    var name = ctx.request.body.userName;
    var pass = ctx.request.body.password;
    // 查找用户
    await apiModel.findUser(name).then(res=>{
        var res = JSON.parse(JSON.stringify(res));
        if(res[0]['username'] === name){
            ctx.session.user = name;
            ctx.session.pass = pass;
            ctx.redirect('/')
        }
    }).catch(()=>{
        // 添加后台用户
        ctx.session.user = name;
        ctx.session.pass = pass;
        apiModel.addUser([name, pass])
    })
    await ctx.redirect('/')
})
// 登出
router.get('/signout',async(ctx,next)=>{
    ctx.session = null;
    await ctx.redirect('/')
})
// 上传数据
router.get('/upload',async(ctx,next)=>{
    await checkLogin(ctx);
    await ctx.render('upload',{
        session:ctx.session
    })
})
//上传video数据post
router.post('/upload',koaBody({
    multipart:true,
    "formLimit":"5mb",
    "jsonLimit":"5mb",
    "textLimit":"5mb",
    formidable:{
        uploadDir:'./public/images'
    }
}),async(ctx,next)=>{
    var i_body = JSON.parse(JSON.stringify(ctx.request.body));
    var fields = i_body['fields'];
    var name = fields['video-name']
    var country = fields['video-country']
    var classify = fields['video-classify']
    var time1 = fields['video-time']
    var img = i_body['files']['file']['path']
    var star = fields['video-star']
    var timelong = fields['video-time-long']
    var type = fields['video-type']
    var actors = fields['video-actors']
    var detail = fields['video-detail'];
    var data = [name, country, classify, time1, img.match(/\w+/g)[2], star, timelong, type, actors, detail];
    // 增加video数据
    await apiModel.insertData(data).then(res=>{
        console.log('添加成功');
        res.body = 'success';
        ctx.redirect('/')
    }).catch(res=>{
        console.log('添加失败')
        console.log('error',res)
    })
})
// 编辑页面
router.get('/edit/:id',async(ctx,next)=>{
    console.log('params.id', ctx.params.id);
    // 通过id查找
    await apiModel.findDataById(ctx.params.id).then(res=>{
        data = JSON.parse(JSON.stringify(res))
    })
    await ctx.render('edit',{
        video:data[0],
        session:ctx.session
    })
})
router.post('/edit/:id',koaBody({
    multipart: true,
    "formLimit":"5mb",
    "jsonLimit":"5mb",
    "textLimit":"5mb",
    formidable: {
        uploadDir: './public/images'
    }
}),async(ctx,next)=>{
    var i_body = JSON.parse(JSON.stringify(ctx.request.body))
    var fields = i_body['fields'] 
    var name = fields['video-name']
    var country = fields['video-country']
    var classify = fields['video-classify']
    var time1 = fields['video-time']
    var img = i_body['files']['file']['path']
    var star = fields['video-star']
    var timelong = fields['video-time-long']
    var type = fields['video-type']
    var actors = fields['video-actors']
    var detail = fields['video-detail']
    var data = [name, country, classify, time1, img.match(/\w+/g)[2], star, timelong, type, actors, detail, ctx.params.id];
    // 更改影片信息，喜欢和评论的列表也要相应更新，比如videName
    await apiModel.updateLikeName([name,ctx.params.id]);
    await apiModel.updateCommentName([name,ctx.params.id]);
    if(i_body['files']['file']['size'] == 0){
        dataNoneImg = [name, country, classify, time1, star, timelong, type, actors, detail, ctx.params.id];
        await apiModel.updateDataNoneImg(dataNoneImg).then(()=>{
            ctx.redirect('/');
        }).catch(res=>{
            console.log('error',res);
        })
    }else{
        await Promise.all([
            apiModel.updateDataHasImg(data),
            apiModel.updateLikesImg([img.match(/\w+/g)[2],ctx.params.id])
        ])
        .then(() => {
            console.log('更新成功')
            ctx.redirect('/')
        })
    }
})
router.post('/delete/:id',koaBody(),async(ctx,next)=>{
    await apiModel.deleteVideo(ctx.params.id).then(()=>{
        ctx.body = 'success'
    }).catch((err)=>{
        console.log('失败:'+err);
    })
})
// 后台管理员列表
router.get('/adminUser',async(ctx,next)=>{
    var page,dataLength = '';
    if(ctx.querystring == ''){
        page = 1
    }else{
        page = ctx.querystring.split('=')[1];
    }
    await apiModel.findData('users').then(res=>{
        dataLength = res.length;
    })
    await apiModel.findPageData('users', page, 15).then(res => {
        data = res
    })
    await ctx.render('adminUser',{
        users: data,
        session: ctx.session,
        dataLength: Math.ceil(dataLength / 15),
        nowPage:  parseInt(page)
    })
})
// 手机端用户列表
router.get('/mobileUser',async(ctx,next)=>{
    var page,dataLength = '';
    if(ctx.querystring == ''){
        page = 1
    }else{
        page = ctx.querystring.split('=')[1];
    }
    await apiModel.findData('mobileusers').then(res => {
        dataLength = res.length
    })
    await apiModel.findPageData('mobileusers',page,10).then(res=>{
        data = res
    })
    await ctx.render('mobileUser',{
        users:data,
        session:ctx.session,
        dataLength: Math.ceil(dataLength / 10),
        nowPage:  parseInt(page)
    })
})
// 手机端评论列表
router.get('/comment',async(ctx,next)=>{
    var page,
        dataLength = '';
    if (ctx.querystring == '') {
        page = 1
    }else{
        page = ctx.querystring.split('=')[1];
    }
    await apiModel.findData('comments').then(res => {
        dataLength = res.length
    })
    await apiModel.findPageData('comments', page, 15).then(res => {
        data = res
    })
    console.log(dataLength)
    await ctx.render('comments', {
        comments: data,
        session: ctx.session,
        dataLength: Math.ceil(dataLength / 15),
        nowPage:  parseInt(page)
    })
})
// 手机端like列表
router.get('/like',async(ctx,next)=>{
    var page,
        dataLength = '';
    if (ctx.querystring == '') {
        page = 1
    }else{
        page = ctx.querystring.split('=')[1];
    }
    await apiModel.findData('likes').then(res => {
        dataLength = res.length
    })
    await apiModel.findPageData('likes', page, 15).then(res => {
        data = res
    })
    await ctx.render('likes', {
        likes: data,
        session: ctx.session,
        dataLength: Math.ceil(dataLength / 15),
        nowPage: parseInt(page)
    })
})
module.exports = router