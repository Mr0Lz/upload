



function upload(id,opt) {
    if (typeof FileReader == "undefined"||typeof FormData == "undefined") {
        document.write("您的浏览器不支持FileReader或者FormData");
        return;
    }

    var inputFile=opt.inputFile||"uploadBtn";
    var multiple=opt.multiple||false;
    var fileArr=[],base64dataArr=[],imgDiv=[];
    var onInputChange=opt.onInputChange;
    var onDelete=opt.onDelete;


    function init(id) {
        var str = '<div class="box"><div id='+inputFile+' class="uploadBtn">' +
            '<input type="file"  ' +(multiple?"":"multiple") +' accept="image/gif,image/jpeg,image/jpg,image/png,image/svg">' +
            '<span>添加图片</span></div>' +
            '</div>';

        var div = document.querySelector(id);
        div.innerHTML = str;
        return {
            div: div,
            imgDiv:imgDiv,
            file: div.querySelector("input"),
            box: document.querySelector(id+">div"),
            getFileArr:function(){
                return fileArr;
            },
            getBase64data:function(){
                sortBase64Arr();
                return base64dataArr;
            }
        };
    }

    var obj = init(id);
    var filechooser = obj.file;
    // 200 KB 对应的字节数
    var maxsize = opt.maxsize ? opt.maxsize*1024 : 200 * 1024;
    var quality=  opt.quality ? opt.quality : 0.75;
    var maxLength =  opt.maxLength ? opt.maxLength : 3;
    var listLength = listLength();
    var childLength = maxLength + 1;
    obj.box.appendChild(listLength);
    preview(filechooser, maxsize, obj.box);

    return obj;


    //生成预览图片
    function preview(filechooser, maxsize, box) {

        filechooser.onchange = function () {
            base64dataArr.length=0;//清空base64dataArr
            var l = document.getElementById("listLength");
            if (!!l) {
                box.removeChild(l);
            }
            var files = this.files;
            if (files.length > maxLength) {
                alert("最多" + maxLength + "张");
            }
            for (var i = 0; i < files.length; i++) {
                if (i < maxLength && box.children.length < childLength) {
                    var f=files[i];
                    var div = imgbox(f.name);
                    div.setAttribute("fname",f.name);
                    box.appendChild(div);
                    fileArr.push(f);
                    imgDiv.push(div);
                } else {
                    alert("已经超过" + maxLength + "张");
                    break;
                }
            }
            checkListLength(box);
            readImg(fileArr, imgDiv);
        };

    }
    


    function readImg(files, imgDiv) {
        for (var i = 0; i < files.length; i++) {
            // 接受的图片类型
            var file = files[i];
            if (!/\/(?:jpeg|jpg|png|jpeg|gif|svg)/i.test(file.type)) return;
            read(file, imgDiv[i]);
        }
    }

    function read(file,viewer) {
        try {
            var previewer = viewer.getElementsByTagName("img")[0];
        } catch (e) {
            console.log("已经超过" + maxLength + "张");
            return
        }
        fileRead(file,previewer,function (read,previewer) {
            var result = read.result;
            var img = new Image();
            img.onload = function () {
                var compressedDataUrl = "";
                // 如果图片小于 200kb，不压缩
                if (result.length <= maxsize) {
                    compressedDataUrl = compress(img, file.type, 0);
                }else {
                    compressedDataUrl = compress(img, file.type, quality);
                }
                base64dataArr.push({fname:file.name,base64dataUrl:compressedDataUrl});
                toPreviewer(previewer,compressedDataUrl);
                img = null;
            };
            img.src = result;
        });

    }

    function fileRead(file,previewer,fn) {
        var reader = new FileReader();
        reader.onload = function () {
            fn(this,previewer);
        };
        reader.readAsDataURL(file);
    }


    
    function toPreviewer(previewer,dataUrl) {
        previewer.src = dataUrl;
        filechooser.value = '';
        onInputChange&&onInputChange(obj,obj.getBase64data(),fileArr);
    }


    function listLength() {
        return createElement("div", "<span>0/"+maxLength+"</span>", {id: "listLength"});
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
                    removeArr(fileArr,null,"name",name);
                    removeArr(base64dataArr,null,"fname",name);
                    removeArr(imgDiv,"getAttribute","fname",name);
                    var r = confirm("确认要删除这张图片?");
                    if (r) {
                        box.removeChild(this);
                        checkListLength(box);
                        onDelete&&onDelete(obj,obj.getBase64data(),fileArr);
                    }
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
    //按用户上传顺序排序Base64Arr
    function sortBase64Arr() {
        var arr=[];
        for(var i=0;i<fileArr.length;i++){
                var n=fileArr[i].name;
            for(var j=0;j<base64dataArr.length;j++){
                if(n==base64dataArr[j].fname){
                    arr.push(base64dataArr[j]);
                    break;
                }
            }
        }
        base64dataArr = arr;
    }
    
    //  重置base64Arr
    function base64Arr(fileArr){
        for(var i=0;i<fileArr.length;i++){
            var file=fileArr[i];
            fileRead(file,null,function (read) {
                var result = read.result;
                var img = new Image();
                img.onload = function () {
                    base64dataArr.push(compress(img, file.type, quality));
                    img = null;
                };
                img.src = result;
            });
        }
    }

// 检查listLength 控件是否显示
    function checkListLength(box) {
        if (box.children.length < childLength) {
            var l= box.querySelectorAll(".item").length;
            var span=listLength.getElementsByTagName("span")[0];
            span.innerHTML=l+"/"+maxLength;
            box.appendChild(listLength);

        }
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