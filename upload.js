



    function upload(id,opt) {
        if (typeof FileReader == "undefined"||typeof FormData == "undefined") {
            document.write("您的浏览器不支持FileReader或者FormData");
        }

        var inputFile=opt.inputFile||"uploadBtn";
        var multiple=opt.multiple||false;
        var fileArr=[],base64dataArr=[];


        function init(id) {
            var str = '<div class="box"><div id='+inputFile+' class="uploadBtn">' +
                '<input type="file"  ' +(multiple?"":"multiple") +' accept="image/gif,image/jpeg,image/jpg,image/png,image/svg">' +
                '<span>添加图片</span></div>' +
                '</div>';

            var div = document.querySelector(id);
            div.innerHTML = str;
            return {
                div: div,
                file: div.querySelector("input"),
                box: document.querySelector(id+">div"),
                getFileArr:function(){
                    return fileArr;
                },
                getBase64data:function(){
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
                var l = document.getElementById("listLength");
                var imgDiv = [];
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
                        var div = imgbox(i);
                        box.appendChild(div);
                        fileArr.push(f);
                        imgDiv.push(div);
                    } else {
                        alert("已经超过" + maxLength + "张");
                        break;
                    }
                }
                checkListLength(box);
                readImg(files, imgDiv);
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
            var reader = new FileReader();
            reader.onload = function () {
                var result = this.result;
                var img = new Image();
                // 如果图片小于 200kb，不压缩
                if (result.length <= maxsize) {
                    toPreviewer(previewer,result,file);
                    return;
                }
                img.onload = function () {
                    var compressedDataUrl = compress(img, file.type, quality);
                    toPreviewer(previewer,compressedDataUrl);
                    img = null;
                };
                img.src = result;
            };
            reader.readAsDataURL(file);
        }


        function toPreviewer(previewer,dataUrl,file) {
            previewer.src = dataUrl;
            if(file){
                base64dataArr.push(file);//小于maxsize不压缩返回文件
            }else{
                base64dataArr.push(dataUrl);//压缩后返回base64data
            }
            filechooser.value = '';

        }


        function listLength() {
            return createElement("div", "<span>0/"+maxLength+"</span>", {id: "listLength"});
        }

        function imgbox(index) {
            return createElement("div", "<img><span index="+index+"></span>", {
                className: "item", onclick: function (e) {
                    //明天继续  删除fileArr  中的元素
                    var box = obj.box;
                    var e = e || window.event;
                    var target = e.srcElement || e.target;
                    if (target.tagName.toLowerCase() == "span") {
                        var index=target.getAttribute("index");
                        fileArr.splice(index,1);
                        var r = confirm("确认要删除这张图片?");
                        if (r) {
                            box.removeChild(this);
                            checkListLength(box);
                        }
                    }

                }
            });
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