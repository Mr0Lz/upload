function upload(id,opt) {
    if (typeof FileReader == "undefined"||typeof FormData == "undefined") {
        document.write("您的浏览器不支持FileReader或者FormData");
        return;
    }

    var inputFile=opt.inputFile||"uploadBtn",
        multiple=opt.multiple||false,
        fileArr=[],imgDiv=[],
        onInputChange=opt.onInputChange,
        onZipStart=opt.onZipStart,
        onZipEnd=opt.onZipEnd,
        zipFlage=0,
        onDelete=opt.onDelete,
        onClickImg=opt.onClickImg,
        isDOM = ( typeof HTMLElement === 'object' ) ?
        function(obj){
            return obj instanceof HTMLElement;
        } :
        function(obj){
            return obj && typeof obj === 'object' && obj.nodeType === 1 && typeof obj.nodeName === 'string';
        };

    function init(id) {
        var str = '<div class="box"><div  class="uploadBtn">' +
            '<input type="file"  ' +(multiple?'':'multiple') +' accept="image/gif,image/jpeg,image/jpg,image/png,image/svg">' +
            '<span>添加图片</span></div>' +
            '</div>',
            div = null;

        if (id == null){
            return null;
        }
        if(isDOM(id)){
            div = id;
        }else{
            div = document.querySelector(id);
        }
        div.innerHTML = str;
        return {
            div: div,
            imgDiv:imgDiv,
            file: div.querySelector("input"),
            box: div.querySelector('.box'),
            getFileArr:function(type){
                if (type == 1) {
                    var arr = [];
                    for (var i=0;i<fileArr.length;i++){
                        arr.push(fileArr[i].f);
                    }
                    return arr ;
                }else{
                    return   fileArr ;
                }
            },
            getBase64data:function(){
                var arr = [];
                for (var i=0;i<fileArr.length;i++){
                    arr.push(fileArr[i].base64data);
                }
                return arr ;
            }
        };
    }
    var obj = init(id),
        filechooser = obj.file,
    // 200 KB 对应的字节数
        maxsize = opt.maxsize ? opt.maxsize*1024 : 200 * 1024,
        quality=  opt.quality ? opt.quality : 0.75,
        maxLength =  opt.maxLength ? opt.maxLength : 3,
        listLength = listLengthFn(),
        maxWidth = 400, //canvas 裁剪像素最大尺寸限制
        maxHeight = 400;

    obj.box.appendChild(listLength);
    preview(filechooser, maxsize, obj.box,listLength);

    return obj;


    //生成预览图片
    function preview(filechooser, maxsize, box ) {

        filechooser.onchange = function () {
            var files = this.files;
            //选中文件时的长度 大于 最大长度 return
            if ((files.length + fileArr.length)  > maxLength) {
                if(opt.outOfRange){
                    opt.outOfRange(maxLength);
                }else{
                    alert("最多" + maxLength + "张");
                }
                //return false;
            }
            for (var i = 0; i < files.length  ; i++) {
                if( fileArr.length < maxLength) {
                    var f = files[i],
                        fId = randomId(8),
                        div = imgbox(fId);
                    div.setAttribute("fId", fId);
                    // box.appendChild(div);
                    box.insertBefore(div,listLength);//在listLength之前插入
                    fileArr.push({f:f,fId:fId});
                    imgDiv.push(div);
                    zipFlage++; //累计需要加压缩的数量
                }else{
                    break;
                }
            }
            filechooser.value = '';//需要清空file input 选中的文件不然 谷歌浏览器重复选择 相同文件不触发onchange事件
            checkListLength(box);
            readImg(fileArr, imgDiv);


        };

    }




    function readImg(files, imgDiv) {
        //开始压缩之前
        if(zipFlage>0){
            console.log(zipFlage,'start');
            onZipStart&&onZipStart();
        }
        for (var i = 0; i < files.length; i++) {//每个图片
            // 接受的图片类型
            var file = files[i].f;
            if(files[i].base64data){ //已经压缩生成过base64的文件不许再压缩
                continue;
            }
            if (!/\/(?:jpeg|jpg|png|jpeg|gif|svg)/i.test(file.type)) return;
            (function (file,imgDiv,i) {
                setTimeout(function () {
                    read(files[i], imgDiv[i]);
                },0)
            })(file,imgDiv,i)

        }

    }

    function read(file,viewer) {
        try {
            var previewer = viewer.getElementsByTagName("img")[0];
        } catch (e) {
            console.log("已经超过" + maxLength + "张");
            return
        }
        fileRead(file,previewer,function (read,previewer,fl) {
            console.log(read);
            // var result = read.result;
            //因为要解决移动端图片被旋转问题 需要在ArrayBuffer 中读取图片元数据 Orientation：拍摄方向
            //先读取ArrayBuffer中的图片元数据 Orientation：拍摄方向
            var orientation = imgOrientation(read.result);
            //然后才转换为base64使用
            var result = 'data:image/'+fl.f.type+';base64,'+transformArrayBufferToBase64 (read.result);
            var img = new Image();
            img.onload = function () {
                var compressedDataUrl = "";
                // 如果图片小于 200kb，不压缩
                if (result.length <= maxsize) {
                    compressedDataUrl = compress(img, fl.f.type, 0.92,orientation);
                }else {
                    compressedDataUrl = compress(img, fl.f.type, quality,orientation);
                }
                fl.base64data = compressedDataUrl;
                zipFlage--; //压缩完成--  直到全部压缩完成
                toPreviewer(previewer,compressedDataUrl);
                img = null;
            };
            img.src = result;
        });

    }

    function fileRead(file,previewer,fn) {
        var reader = new FileReader();
        reader.onload = function () {
            fn(this,previewer,file);
        };
        //reader.readAsDataURL(file.f); //直接转换为base64 ，安卓 ios 会根据拍照角度方式进行对图片选择，生成预览的时候发现图片被旋转了
        reader.readAsArrayBuffer(file.f);//解决方法1.Exif.js库 读取图像的元数据 
                                            //Orientation：拍摄方向 值[1, 6, 3, 8] 是相互一次顺时针 90 度方向的关系，
                                            //而 [2, 5, 4, 7] 则对应了 [1, 6 ,3, 8] 的水平镜像  在canvas中旋转纠正 宽高矫正 
                                        // 2. ArrayBuffer 中读取 Orientation：拍摄方向
    }



    function toPreviewer(previewer,dataUrl) {
        previewer.src = dataUrl;
        if(zipFlage == 0){
            console.log(zipFlage,'end');
            onZipEnd&&onZipEnd();
        }
        onInputChange&&onInputChange(obj,fileArr);
    }
     function randomId (n) {
        var str = "abcdefghijklmnopqrstuvwxyz0123456789";
        var result = "";
        for(var i = 0; i < n; i++) {
            result += str[parseInt(Math.random() * str.length)];
        }
        return result;
    }

    function listLengthFn() {
        var div = createElement("div", "<span>0/"+maxLength+"</span>");
        // div.setAttribute('img-length','listLength');
        div.setAttribute('class','listLength');
        return div;
    }

    function imgbox(name) {
        return createElement("div", "<img><span></span>", {
            className: "item",
            onclick: function (e) {
                //明天继续  删除fileArr  中的元素
                var box = obj.box;
                var e = e || window.event;
                var target = e.srcElement || e.target;
                if (target.tagName.toLowerCase() == "span") {
                    var r = confirm("确认要删除这张图片?");
                    if (r) {
                        removeArr(fileArr,null,"fId",name);
                        removeArr(imgDiv,"getAttribute","fId",name);
                        box.removeChild(this);
                        checkListLength(box);
                        onDelete&&onDelete(obj,obj.getBase64data(),fileArr);
                    }
                }
                //点击图片
                if (target.tagName.toLowerCase() == "img") {
                    onClickImg&&onClickImg(e,target);
                }

            }
        });
    }

    //删除数据
    function removeArr(arr,type,key,name) {
        for (var i=0;i<arr.length;i++) {
            if(type=="getAttribute"){
                if (arr[i].getAttribute(key)==name) arr.splice(i,1);
            }
            else{
                if (arr[i][key]==name) arr.splice(i,1);
            }
        }
    }

// 检查listLength 控件是否显示
    function checkListLength(box) {
        setTimeout(function(){
            if ( fileArr.length < maxLength ) {
                listLength.style.display='block';
                var span=listLength.getElementsByTagName("span")[0];
                span.innerHTML=fileArr.length+"/"+maxLength;
                //box.appendChild(listLength);
            }else{
                try{
                    //box.removeChild(listLength);
                    listLength.style.display='none';
                }catch(err){
                    console.log('请勿继续添加图片');
                }
            }
        },0);

    }

    function createElement(el, html, opt) {
        var div = document.createElement(el);
        if (opt) {
            for (var key in opt) {
                div[key] = opt[key];
            }
        }
        if (html) {
            if ((typeof html).toLowerCase() == "string") {
                div.innerHTML = html;
            } else {
                div.appendChild(html);
            }
        }

        return div;
    }

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