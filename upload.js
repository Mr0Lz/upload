function upload(id,opt) {
    if (typeof FileReader == "undefined"||typeof FormData == "undefined") {
        document.write("您的浏览器不支持FileReader或者FormData");
        return;
    }

    var inputFile=opt.inputFile||"uploadBtn";
    var multiple=opt.multiple||false;
    var fileArr=[],imgDiv=[];
    var onInputChange=opt.onInputChange;
    var onZipStart=opt.onZipStart;
    var onZipEnd=opt.onZipEnd;
    var zipFlage=0;
    var amount=0;//input 选择的图片长度 和 已经有的图片长度 之和
    var onDelete=opt.onDelete;
    var onClickImg=opt.onClickImg;
    var isDOM = ( typeof HTMLElement === 'object' ) ?
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
            '</div>';

        var div = null;
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
    var obj = init(id);
    var filechooser = obj.file;
    // 200 KB 对应的字节数
    var maxsize = opt.maxsize ? opt.maxsize*1024 : 200 * 1024;
    var quality=  opt.quality ? opt.quality : 0.75;
    var maxLength =  opt.maxLength ? opt.maxLength : 3;
    var listLength = listLengthFn();
    obj.box.appendChild(listLength);
    preview(filechooser, maxsize, obj.box,listLength);

    return obj;


    //生成预览图片
    function preview(filechooser, maxsize, box ) {

        filechooser.onchange = function () {
            zipFlage=0;//压缩完成标识重置
            amount = fileArr.length;
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
                    var f = files[i];
                    var fId = randomId(8);
                    var div = imgbox(fId);
                    div.setAttribute("fId", fId);
                    // box.appendChild(div);
                    box.insertBefore(div,listLength);//在listLength之前插入
                    fileArr.push({f:f,fId:fId});
                    imgDiv.push(div);
                }else{
                    break;
                }
            }
            amount+=files.length;
            checkListLength(box);
            readImg(fileArr, imgDiv);


        };

    }




    function readImg(files, imgDiv) {
        //开始压缩之前
        if(amount <= maxLength){
            console.log(zipFlage,amount,'start');
            onZipStart&&onZipStart();
        }
        for (var i = 0; i < files.length; i++) {//每个图片
            // 接受的图片类型
            var file = files[i].f;
            if(files[i].base64data){ //已经压缩生成过base64的文件不许再压缩
                console.log(i,'fff');
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
            var result = read.result;
            var img = new Image();
            img.onload = function () {
                var compressedDataUrl = "";
                // 如果图片小于 200kb，不压缩
                if (result.length <= maxsize) {
                    compressedDataUrl = compress(img, fl.f.type, 0);
                }else {
                    compressedDataUrl = compress(img, fl.f.type, quality);
                }
                fl.base64data = compressedDataUrl;
                zipFlage++;
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
        reader.readAsDataURL(file.f);
    }



    function toPreviewer(previewer,dataUrl) {
        previewer.src = dataUrl;
        filechooser.value = '';
        if(zipFlage == amount && zipFlage <= maxLength){
            console.log(zipFlage,amount);
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
        return div
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
                            zipFlage=fileArr.length;//重置
                            amount=fileArr.length;//重置
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


    //压缩图片 返回base64data
    function compress(img, fileType, quality) {
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext('2d');

        var width = img.width;
        var height = img.height;
        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, width, height);
        var base64data = canvas.toDataURL(fileType, quality);
        canvas = ctx = null;
        return base64data;
    }


}