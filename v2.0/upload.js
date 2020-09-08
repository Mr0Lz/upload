function upload(id,opt){
    // 检测浏览器环境
    if (typeof FileReader == "undefined"||typeof FormData == "undefined") {
        console.log("您的浏览器不支持FileReader或者FormData");
        /*
            使用FormData对象上传
            var files = fileArr.getFileArr();//文件数组
            var fd = new FormData();
            for (var i = 0; i < files.length; i++) {
                fd.append('appealPic', files[i]);
            }
         */
        return;
    }
    //无id 退出
    if(!id){
        return ;
    }
    //初始化参数
    var box = (id instanceof HTMLElement) ? id : document.querySelector(id)
        ,previewBox = opt.previewBox && ( (opt.previewBox instanceof HTMLElement ) ? opt.previewBox : document.querySelector(opt.previewBox) )  //图片预览区域
        ,previewType = opt.previewType && ( (opt.previewType instanceof HTMLElement ) ? opt.previewType : document.querySelector(opt.previewType) )  //img 插入指定元素之前
        ,fileInp = null
        ,isRun = false //是否在压缩中
        ,fileObjArr = []//已经存在文件的数组
        ,maxWidth = 400 //canvas 裁剪像素最大尺寸限制
        ,maxHeight = 400
        ,onChange = opt.onChange//每次选择文件会执行,返回整个所有
        ,onDelete = opt.onDelete//删除按钮事件
        ,onClickImg = opt.onClickImg//点击图片事件
        ,onEach = opt.onEach//按照顺序返回每个文件
        ,accept="image/gif,image/jpeg,image/jpg,image/png,image/svg"
        ,maxsize = opt.maxsize ? opt.maxsize*1024 : 200 * 1024// 200 KB 对应的字节数
        ,quality=  opt.quality ? opt.quality : 0.75//压缩比
        ,load = [] //压缩顺序队列
        ,maxLength = opt.maxLength || 5;//最大选择长度.默认5

        if(box.type != 'file'){
            if( ['absolute','fixed','relative'].indexOf(box.style.position) == -1){ box.style.position = 'relative'; }
            var inputStr = '<input type="file" style="position:absolute;z-index:1;top:0;left:0;opacity: 0;width: 100%;height: 100%;"  ' +( opt.multiple ? 'multiple' : '' ) +' accept="'+accept+'" >';
            box.innerHTML += inputStr;
            fileInp = box.querySelector('[ type = "file" ]');
        }else{
            opt.multiple&&box.setAttribute('multiple',true);
            box.setAttribute('accept',accept);
            fileInp = box;
        }

        //文件input onchange事件
        fileInp.onchange = function(){
            //edge浏览器 改变value 会处方onchange   安卓手机打开文件选择器,然后返回不选中文件会有个bug有个文件,解决这个问题 this.files[0].size=0
            if( this.value == '' || this.files[0].size == 0){
                return ;
            }
            // 每次选择的文件
            var files = this.files
                ,temL = Math.min( (maxLength - fileObjArr.length) , files.length );//上传文件不得大于maxLength

                console.log(temL,'需要操作的文件数量:(temL)');

                if(temL == 0 || files.length > maxLength ){
                    alert('最多上传'+maxLength+'个文件');
                    return ;
                }

            for (var i = 0; i < temL; i++) {

                var o = {
                    f: files[i],
                    base64: null,
                    d: null,//图片doc
                    i: fileObjArr.length
                };

                if (!/\/(?:jpeg|jpg|png|jpeg|gif|svg)/i.test(o.f.type)){ continue;}

                if(previewBox){
                    // 是否需要预览图
                   o.d = previewItem(o);
                   if( previewType){ //插入指定元素之前
                         previewBox.insertBefore(o.d.d,previewType) 
                    }else{
                        previewBox.appendChild(o.d.d) ;
                    };
                }

                load.push({f: o.f ,base64I: fileObjArr.length , fL:temL , zipI:i ,item:o.d })//参数1 文件 ;参数2 压缩文件的顺序;参数3 需要压缩文件的数量;参数4 需要压缩文件的次数

                fileObjArr.push(o);//保存文件数组

                console.log('已存在文件数量:(fileObjArr.length)' , fileObjArr.length);
            }

                // 压缩并生产预览图base64
                console.log('压缩并生产预览图base64',load)
                setTimeout(function(){
                    isRun = true;
                    runLoad();
                },0)

                return;
        }

        // 生成预览doc操作
        function previewItem(o){
            console.log('第几张图片::::'  , o )
            var d = document.createElement('div');
            d.innerHTML = '<img><i style="display:none;"></i>';
            d.onclick = function (e) {
                    if(isRun){ return false; }//在压缩中,不允许操作
                    var t = e.target;
                    if (t.tagName.toLowerCase() == "i") {
                        console.log('删除这张图片', o )
                        // var r = confirm("确认要删除这张图片?");
                        // if (r) {
                            _del(o);
                            onDelete&&onDelete(e,getFile(),getFile('base64'));
                        // }
                    }
                    //点击图片
                    if (t.tagName.toLowerCase() == "img") {
                        onClickImg&&onClickImg(e,o.f,o.base64);
                    }

                }
            return {d:d,img:d.firstChild,delete:d.lastChild};
        }

        //执行压缩转换base64循环
        function runLoad(){
                var l = load[0];
                run(l.f,l.base64I,l.fL,l.zipI,l.item,function(){
                    load.splice(0,1);//上次执行完,移出队列
                    if( load.length == 0 ) { return; }
                    runLoad();
                });
        }

        //压缩并生产预览图base64
        function run(file,base64I,fL,zipI,preview,next){

            console.log('压缩图片:'+fL+'张,第i次>>',base64I)

            var reader = new FileReader();
            
            reader.onload = function () {
                var r = this ,orientation,result,img;
                //因为要解决移动端图片被旋转问题 需要在ArrayBuffer 中读取图片元数据 Orientation：拍摄方向
                //先读取ArrayBuffer中的图片元数据 Orientation：拍摄方向
                orientation = imgOrientation(r.result);
                //然后才转换为base64使用
                result = 'data:'+file.type+';base64,'+transformArrayBufferToBase64 (r.result);

                img = new Image();
                img.onload = function () {
                    // 如果base64图片小于 200kb，不压缩
                    var q ;
                    if (result.length <= maxsize) { 
                        q = 0.92;
                    }else {
                        q = quality;
                    }

                    fileObjArr[base64I].base64 = compress(img ,file.type, q, orientation);

                    preview&&(preview.img.src = fileObjArr[base64I].base64 , preview.delete.style.display = 'block' );//展示预览图

                    onEach&&onEach(fileObjArr[base64I].f,fileObjArr[base64I].base64);

                    console.log('zipI == (fL-1)',zipI,(fL-1));
                    //完成一次选择
                    if(zipI == (fL-1)){

                        fileInp.value = '';//需要清空file input 选中的文件不然 谷歌浏览器重复选择 相同文件不触发onchange事件; edge浏览器 改变value 会处方onchange
                        isRun = false; //压缩完成
                        console.log('清空file'+fileInp.value,'清空load',load);

                        // onChange事件
                        if(onChange){
                            console.log('onChange执行');
                            onChange( getFile(), getFile('base64') );
                        }
                    }

                    img = null;

                    next&&next();
                };
                img.src = result;

            };
            //reader.readAsDataURL(file); //直接转换为base64 ，安卓 ios 会根据拍照角度方式进行对图片选择，生成预览的时候发现图片被旋转了
            reader.readAsArrayBuffer(file);//解决方法1.Exif.js库 读取图像的元数据 
                                                //Orientation：拍摄方向 值[1, 6, 3, 8] 是相互一次顺时针 90 度方向的关系，
                                                //而 [2, 5, 4, 7] 则对应了 [1, 6 ,3, 8] 的水平镜像  在canvas中旋转纠正 宽高矫正 
                                            // 2. ArrayBuffer 中读取 Orientation：拍摄方向
        }   

// 删除数据 
        function _del(o){
            if(previewBox){
                // 删除图片doc项
                previewBox.removeChild(o.d.d)
            }
            fileObjArr.splice(fileObjArr.indexOf(o),1);
        }

        function delFile(i,fn) {
                console.log(i);//i下标从0开始
                if( isRun || fileObjArr.length == 0 || i > fileObjArr.length ){ return false; }//在压缩中,不允许操作
                _del(fileObjArr[i]);
                fn&&fn(getFile(), getFile('base64'));
        }
//返回文件
       function getFile(t){ 
            var a = [],t = t || 'f';
            for (var i = 0; i < fileObjArr.length; i++) {
                a.push(fileObjArr[i][t]);
            }
            return a;
        }
        return {
            doc:box,
            getFile:getFile,
            delFile:delFile
        }
//-----------------------------------------------工具函数

    //ArrayBuffer转Base64
    function transformArrayBufferToBase64 (buffer) {
        var binary = '';
        var bytes = new Uint8Array(buffer);
        for (var len = bytes.byteLength, i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    //ArrayBuffer 中读取 Orientation：拍摄方向  
    function imgOrientation(buffer){
        // 建立一个 DataView
        var dv = new DataView(buffer);
        // 设置一个位置指针
        var idx = 0;
        // 设置一个默认结果
        var value = 1;
        // 检测是否是 JPEG
        if (buffer.length < 2 || dv.getUint16(idx) !== 0xFFD8 ) {
            return false
        }
        idx += 2;
        var maxBytes = dv.byteLength;
        // 遍历文件内容，找到 APP1, 即 EXIF 所在的标识
        while (idx < maxBytes - 2) {
            var uint16 = dv.getUint16(idx);
            idx += 2;
            switch (uint16) {
                case 0xFFE1:
                    // 找到 EXIF 后，在 EXIF 数据内遍历，寻找 Orientation 标识
                    var exifLength = dv.getUint16(idx);
                    maxBytes = exifLength - 2;
                    idx += 2;
                    break;
                case 0x0112:
                    // 找到 Orientation 标识后，读取 DDDDDDDD 部分的内容，并把 maxBytes 设为 0, 结束循环。
                    value = dv.getUint16(idx + 6, false);
                    maxBytes = 0;
                    break
            }
        }
        return value;
    }

    //压缩图片 返回base64data
    function compress(img, fileType, quality,orientation) {
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext('2d');

        //原尺寸
        var width = img.width,
        height = img.height,
        // 目标尺寸
        targetWidth = width,
        targetHeight = height,
        base64data = null;

        // 图片尺寸超过400x400的限制
        if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
                // 更宽，按照宽度限定尺寸
                targetWidth = maxWidth;
                targetHeight = Math.round(maxWidth * (height / width));
            } else {
                targetHeight = maxHeight;
                targetWidth = Math.round(maxHeight * (width / height));
            }
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        //根据Orientation：拍摄方向  矫正图片旋转角度
        if(orientation){

            // 5, 6, 7, 8 是 1, 2, 3, 4 的镜像
              if ([5,6,7,8].indexOf(orientation) > -1) {
                canvas.width = targetHeight;
                canvas.height = targetWidth;
              } 
              else {
                canvas.width = targetWidth;
                canvas.height = targetHeight;
              }

            switch (orientation) {
              case 2: ctx.transform(-1, 0, 0, 1, targetWidth, 0); break;
              case 3: ctx.transform(-1, 0, 0, -1, targetWidth, targetHeight ); break;
              case 4: ctx.transform(1, 0, 0, -1, 0, targetHeight ); break;
              case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
              case 6: ctx.transform(0, 1, -1, 0, targetHeight , 0); break;
              case 7: ctx.transform(0, -1, -1, 0, height , targetWidth); break;
              case 8: ctx.transform(0, -1, 1, 0, 0, targetWidth); break;
              default: ctx.transform(1, 0, 0, 1, 0, 0);
            }
        }

        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        base64data = canvas.toDataURL(fileType, quality);
        canvas = ctx = null;
        return base64data;
    }


}
