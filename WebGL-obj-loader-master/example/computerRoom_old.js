/**
 * Created by Xiaotao.Nie on 6/1/2017.
 * All right reserved
 * IF you have any question please email onlythen@yeah.net
 */
/**
 * Created by Xiaotao.Nie on 6/1/2017.
 * All right reserved
 * IF you have any question please email onlythen@yeah.net
 */
/***************dom元素****************/

var toleft = document.getElementById('toleft');
var toahead = document.getElementById('toahead');
var tobackward = document.getElementById('tobackward');
var toright = document.getElementById('toright');

/***************全局变量****************/

const MAX = 65532;
const MAX_OBJECT = 24;
//每一个的临时颜色算法    (Math.ceil(255/MAX_OBJECT))*index
//返回index  color/(Math.ceil(255/MAX_OBJECT));

const GLOBAL_SCALE = 0.01;

var animationID;
var modelObject = [];
var mtlArray = [];
var objArray = [];
var TextureArray = [];
var loadTextures = {unload:0};//加载纹理状态锁,0表示没有待加载的纹理，可以绘制了
var g_modelMatrix = new Matrix4();
var g_mvpMatrix = new Matrix4();
var g_normalMatrix = new Matrix4();
var modelDrawInfo = [];
var configs={
    lookConfig:[50.0, 50.0, -30.0, 50.0, 50.0, 70.0,  0.0, 1.0, 0],
    lightColor:new Float32Array(3),
    backgroundColor:new Uint8Array(4),
    tempColorList:new Float32Array(3*MAX_OBJECT),
    lightTheme:1,//现在根据场景不同可能有三种主题情况：1表示灯暗的情况,2表示灯比较亮的情况,3表示全部染成单一颜色的情况
    angle:[0,0,0],
    lightP:new Float32Array(3),
};
configs.lightP =[-150,0,-50];
configs.backgroundColor=[0.2, 0.2, 0.2, 1.0];
configs.lightColor = [0.4, 0.4, 0.4];
for(var ii=0; ii<MAX_OBJECT; ii++){
    configs.tempColorList[ii*3] = (Math.floor(255/MAX_OBJECT)/255).toFixed(2) * (ii+1);
    configs.tempColorList[ii*3+1] = (Math.floor(255/MAX_OBJECT)/255).toFixed(2) * (ii+1);
    configs.tempColorList[ii*3+2] = (Math.floor(255/MAX_OBJECT)/255).toFixed(2) * (ii+1);
}

/***************全局函数****************/

//someDrawInfo通过数组的方式表示，这样可以节省一些代码
function updateDrawInfo(index,someDrawInfo){
    if(!modelDrawInfo[index])
        modelDrawInfo[index]={};

    modelDrawInfo[index].rotateX=someDrawInfo[0];
    modelDrawInfo[index].rotateY=someDrawInfo[1];
    modelDrawInfo[index].rotateZ=someDrawInfo[2];

    modelDrawInfo[index].offsetX=someDrawInfo[3];
    modelDrawInfo[index].offsetY=someDrawInfo[4];
    modelDrawInfo[index].offsetZ=someDrawInfo[5];

    modelDrawInfo[index].scaleX=someDrawInfo[6];
    modelDrawInfo[index].scaleY=someDrawInfo[7];
    modelDrawInfo[index].scaleZ=someDrawInfo[8];

    modelDrawInfo[index].r=someDrawInfo[9];
    modelDrawInfo[index].g=someDrawInfo[10];
    modelDrawInfo[index].b=someDrawInfo[11];
    modelDrawInfo[index].a=someDrawInfo[12];
    modelDrawInfo[index].u_ifCertainColor=someDrawInfo[13];

    modelDrawInfo[index].ifShow=someDrawInfo[14];

}

var jjjj = 0;
//需要绑定this 这里面的this就是对于每一个模型来说总的内容的实例
//这个函数实际上并没有优化的很好,现在只是相当于列出,但是这种方式比较方便
function getDrawingInfo(ifTexture) {
    // Create an arrays for vertex coordinates, normals, colors, and indices
    var numIndices = 0;
    for(var i = 0; i < this.objects.length; i++){
        numIndices += this.objects[i].numIndices;
        //每一个objects[i].numIndices 是它的所有的face的顶点数加起来
    }
    var numVertices = numIndices;
    var vertices = new Float32Array(numVertices * 3);
    var normals = new Float32Array(numVertices * 3);
    var colors = new Float32Array(numVertices * 4);
    //这个地方的16是不能转化成32的
    var indices = new Uint16Array(numIndices);

    //尝试增加贴图
    var textureVt = new Float32Array(numVertices * 3);

    // Set vertex, normal, texture and color
    //一个face一个face的遍历
    var index_indices = 0;
    for(i = 0; i < this.objects.length; i++){
        var object = this.objects[i];
        if(jjjj<1)console.log("object.faces.length",object.faces.length,this.objects.length);
        for(var j = 0; j < object.faces.length; j++){
            var face = object.faces[j];
            var color = findColor(this,face.materialName);
            // console.log(face.materialName,color);
            var faceNormal = face.normal;
            for(var k = 0; k < face.vIndices.length; k++){
                // Set index
                indices[index_indices] = index_indices%MAX;
                // Copy vertex
                var vIdx = face.vIndices[k];
                var vertex = this.vertices[vIdx];
                vertices[index_indices * 3    ] = vertex.x;
                vertices[index_indices * 3 + 1] = vertex.y;
                vertices[index_indices * 3 + 2] = vertex.z;

                var tIdx = face.tIndices[k];
                var Tvertex = this.textureVt[tIdx];
                if(!!Tvertex) {
                    textureVt[index_indices * 3] = Tvertex.x;
                    textureVt[index_indices * 3 + 1] = Tvertex.y;
                    textureVt[index_indices * 3 + 2] = ifTexture;
                }
                else{
                    //有些是没有纹理坐标的,这个时候把纹理坐标置成系统默认值
                    textureVt[index_indices * 3] = 0;
                    textureVt[index_indices * 3 + 1] = 0;
                    textureVt[index_indices * 3 + 2] = ifTexture;
                }

                // Copy color
                colors[index_indices * 4    ] = color.r;
                colors[index_indices * 4 + 1] = color.g;
                colors[index_indices * 4 + 2] = color.b;
                colors[index_indices * 4 + 3] = color.a;
                // console.log(colors,color);
                // Copy normal
                var nIdx = face.nIndices[k];
                if(nIdx >= 0){
                    var normal = this.normals[nIdx];
                    normals[index_indices * 3    ] = normal.x;
                    normals[index_indices * 3 + 1] = normal.y;
                    normals[index_indices * 3 + 2] = normal.z;
                }else{
                    normals[index_indices * 3    ] = faceNormal.x;
                    normals[index_indices * 3 + 1] = faceNormal.y;
                    normals[index_indices * 3 + 2] = faceNormal.z;
                }
                index_indices ++;
            }
            jjjj++;
        }
    }
    return new DrawingInfo(vertices, normals, colors, indices, textureVt);
}

var ready = true;

//最多绘制65535个点，这里面的其他内容，都是和indices有倍数关系的，要改变indices的同时也要改变其他的
function onReadComplete(gl, model, target,begin,numbers,ifTexture) {
    // Acquire the vertex coordinates and colors from OBJ file
    //console.log("target",target);
    var drawingInfo = getDrawingInfo.call(target,ifTexture);
    if(ready) {
        console.log(drawingInfo, "drawingInfo");
        ready = !ready;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices.slice(begin*3,(begin+numbers)*3), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals.slice(begin*3,(begin+numbers)*3), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.colors.slice(begin*4,(begin+numbers)*4), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.textBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.textureVt.slice(begin*3,(begin+numbers)*3), gl.STATIC_DRAW);

    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices.slice(begin,begin+numbers), gl.STATIC_DRAW);

    return drawingInfo;
}

function ShaderSourceFromScript(scriptID)
{
    var shaderScript = document.getElementById(scriptID);
    if (shaderScript == null) return "";

    var sourceCode = "";
    var child = shaderScript.firstChild;
    while (child)
    {
        if (child.nodeType == child.TEXT_NODE ) sourceCode += child.textContent;
        child = child.nextSibling;
    }

    return sourceCode;
}


var VSHADER_SOURCE = ShaderSourceFromScript("shader-vs");

// Fragment shader program
var FSHADER_SOURCE = ShaderSourceFromScript("shader-fs");


function main() {

    // Retrieve <canvas> element
    var canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    var gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    // Set the clear color and enable the depth test
    gl.clearColor(...(configs.backgroundColor));
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Get the storage locations of attribute and uniform variables
    var program = gl.program;
    program.a_Position = gl.getAttribLocation(program, 'a_Position');
    program.a_Normal = gl.getAttribLocation(program, 'a_Normal');
    program.a_Color = gl.getAttribLocation(program, 'a_Color');
    program.a_TextCord = gl.getAttribLocation(program, 'a_TextCord');
    program.u_MvpMatrix = gl.getUniformLocation(program, 'u_MvpMatrix');
    program.u_NormalMatrix = gl.getUniformLocation(program, 'u_NormalMatrix');
    program.u_ModelMatrix = gl.getUniformLocation(program, 'u_ModelMatrix');
    program.u_lightColor = gl.getUniformLocation(program, 'u_lightColor');
    program.u_Clicked = gl.getUniformLocation(program, 'u_Clicked');
    program.u_tempColor = gl.getUniformLocation(program, 'u_tempColor');
    program.eye_Position = gl.getUniformLocation(program, 'eye_Position');
    program.u_light_position = gl.getUniformLocation(program, 'u_light_position');
    program.u_ifCertainColor = gl.getUniformLocation(program, 'u_ifCertainColor');
    program.u_ifCertainColor = gl.getUniformLocation(program, 'u_ifCertainColor');
    program.u_certainColor = gl.getUniformLocation(program, 'u_certainColor');

    if (program.a_Position < 0 ||  program.a_Normal < 0 || program.a_Color < 0 || program.a_TextCord <0 ||
        !program.u_MvpMatrix || !program.u_NormalMatrix) {
        console.log('attribute, uniform失敗');
        return;
    }

    // Prepare empty buffer objects for vertex coordinates, colors, and normals
    var model = initVertexBuffers(gl, program);
    if (!model) {
        console.log('Failed to set the vertex information');
        return;
    }

    // 投影行列計算
    var viewProjMatrix = new Matrix4();
    viewProjMatrix.setPerspective(30.0, canvas.width/canvas.height, 1.0, 5000.0);
    viewProjMatrix.lookAt(...(configs.lookConfig));

    // Start reading the OBJ file
    //readOBJFile('../resources/ChairSwing.obj', modelObject,  mtlArray, objArray, 100, false, 0);
//        readOBJFile('./com_temp.obj', modelObject,  mtlArray, objArray, 0.1, false, 0);
//        TextureArray[0]={ifTexture:0.0,TextureUrl:'./textTures/texture1.jpg',n:0};
//        updateDrawInfo(0,[0.0,0.0,0.0, 0.0,0.0,-50.0, 1.0,1.0,1.0]);
//
//        readOBJFile('./002.obj', modelObject,  mtlArray, objArray, 1, false, 1);
//        TextureArray[1]={ifTexture:0.0,TextureUrl:'./textTures/texture1.jpg',n:1};
//        updateDrawInfo(1,[0.0,0.0,0.0, -20,0.0,-50.0, 1.0,1.0,1.0]);

    //每一个新的模型要改变：第一行最后参数编号，第二行索引，最后编号，第三行索引
    //房间
    readOBJFile('./models/cube.obj', modelObject,  mtlArray, objArray, 200, false, 0);
    TextureArray[0]={ifTexture:0.0,TextureUrl:'none',n:0};
    updateDrawInfo(0,[0.0,90.0,0.0, 0.0,60.0,0.0, 0.75,0.4,0.5,  0.5,0.5,0.5,1,0 ,1]);

    //饮水机
    readOBJFile('./models/033_2.obj', modelObject,  mtlArray, objArray, 0.8, false, 1);
    TextureArray[1]={ifTexture:1.0,TextureUrl:'./textTures/lastics1.jpg',n:0};
    updateDrawInfo(1,[0.0,0.0,0.0, 10,-20.0,-123.0, 1.0,1.0,1.0,  0.5,0.5,0.5,1,0 ,1]);

    //饮水机水桶，透明的部分
    readOBJFile('./models/033_1.obj', modelObject,  mtlArray, objArray, 0.8, false, 12);
    TextureArray[12]={ifTexture:0.0,TextureUrl:'none',n:0};
    updateDrawInfo(12,[0.0,0.0,0.0, 10,-20.0,-123.0, 1.0,1.0,1.0, 0.0,0.26,0.38,0.7,1 ,1]);
//
    //柜子高
    readOBJFile('./models/051.obj', modelObject,  mtlArray, objArray, 1, false, 2);
    TextureArray[2]={ifTexture:0.0,TextureUrl:'./textTures/2048_2.jpg',n:7};
    updateDrawInfo(2,[0.0,-90.0,0.0, 89,-20.0,-100.0, 1.0,1.0,1.0,  0.1,0.7235,0.4529,1,0 ,1]);

    //柜子矮
    readOBJFile('./models/052.obj', modelObject,  mtlArray, objArray, 1, false, 3);
    TextureArray[3]={ifTexture:0.0,TextureUrl:'none',n:2};
    updateDrawInfo(3,[0.0,-90.0,0.0, 89,-20.0,-64.0, 1,1.0,1,  0.1,0.7235,0.4529,0,0 ,1]);

    //矮桌子
    readOBJFile('./models/table5.obj', modelObject,  mtlArray, objArray, 0.4, false, 4);
    TextureArray[4]={ifTexture:1.0,TextureUrl:'none',n:3};
    updateDrawInfo(4,[0.0,-90.0,0.0, -45,-20,-20.0, 1.0,1.3,1.0,  0.02,0.88,0.99,1.0,1 ,1]);

    //大书桌
    readOBJFile('./models/table4.obj', modelObject,  mtlArray, objArray, 0.042, false, 5);
    TextureArray[5]={ifTexture:1.0,TextureUrl:'./textTures/wood11.jpg',n:4};
    updateDrawInfo(5,[0.0,90.0,0.0, -35,-20,45.0, 1.0,1.0,0.9,  0.5,0.5,0.5,1,0 ,1]);

    //桌边柜子
    readOBJFile('./models/054.obj', modelObject,  mtlArray, objArray, 1.1, false, 6);
    TextureArray[6]={ifTexture:1.0,TextureUrl:'./textTures/wood2.jpg',n:5};
    updateDrawInfo(6,[0.0,0.0,0.0, -89,-20.0,45.0, 1.0,1.0,1.0,  0.5,0.5,0.5,1,0 ,1]);

    //大椅子
    readOBJFile('./models/chair2.obj', modelObject,  mtlArray, objArray, 0.45, false, 7);
    TextureArray[7]={ifTexture:1.0,TextureUrl:'./textTures/wood2.jpg',n:6};
    updateDrawInfo(7,[0.0,90.0,0.0,  -85,-25.0,-20.0,  1.0,1.0,1.0,  0.5,0.5,0.5,1,0 ,1]);

    //书架子
    readOBJFile('./models/bookcase.obj', modelObject,  mtlArray, objArray, 0.05, false, 8);
    TextureArray[8]={ifTexture:1.0,TextureUrl:'repeat',n:4};
    updateDrawInfo(8,[0.0,180.0,0.0,  100,-25.0,35.0,  1.0,1.0,1.0,  0.5,0.5,0.5,1,0 ,1]);

    //红蓝椅
    readOBJFile('./models/chair3.obj', modelObject,  mtlArray, objArray, 0.05, false, 9);
    TextureArray[9]={ifTexture:0.0,TextureUrl:'none',n:8};
    updateDrawInfo(9,[0.0,-90.0,0.0, -35,-20,85.0,  1.0,1.0,1.0,  0.5,0.5,0.5,1,0 ,1]);

    readOBJFile('./models/com_1.obj', modelObject,  mtlArray, objArray, 0.06, false, 10);
    TextureArray[10]={ifTexture:0.0,TextureUrl:'none',n:5};
    updateDrawInfo(10,[0.0,0.0,0.0, -35,10,45.0, 1.0,1.0,1,  0.5,0.5,0.5,1,0 ,1]);

    readOBJFile('./models/044.obj', modelObject,  mtlArray, objArray, 0.80, false, 11);
    TextureArray[11]={ifTexture:0.0,TextureUrl:'none',n:5};
    updateDrawInfo(11,[-12.0,0.0,0.0, -35,32,45.0, 1.1,1,1,  0.5,0.5,0.5,1,0 ,1]);

    //电脑屏幕
    readOBJFile('./models/pad.obj', modelObject,  mtlArray, objArray, 0.80, false, 13);
    TextureArray[13]={ifTexture:0.0,TextureUrl:'./textTures/2048.jpg',n:1};
    updateDrawInfo(13,[-12.0,0.0,0.0, -35,32.35,45.0, 1.1,1,1,  0,0,0,1,1 ,1]);

    //密码箱子
    readOBJFile('./models/0273.obj', modelObject,  mtlArray, objArray, 0.20, false, 14);
    TextureArray[14]={ifTexture:0.0,TextureUrl:'none',n:7};
    updateDrawInfo(14,[0.0,0.0,0.0,-45,-23,-59.0, 1.1,1,1,  0.3,0.2,0.1,1,1 ,1]);

    //二维码1
    readOBJFile('./models/paper1.obj', modelObject,  mtlArray, objArray, 1, false, 15);
    TextureArray[15]={ifTexture:1.0,TextureUrl:'./textTures/6427.jpg',n:2};
    updateDrawInfo(15,[90.0,0.0,0.0,-84,0.2,-46, 1,1,0.1,  0.3,0.2,0.1,1,1 ,1]);

    //二维码2
    readOBJFile('./models/paper2.obj', modelObject,  mtlArray, objArray, 1, false, 16);
    TextureArray[16]={ifTexture:1.0,TextureUrl:'repeat',n:2};
    updateDrawInfo(16,[90.0,0.0,0.0, 10,28.0,-117.0, 1,1,0.1,  0.3,0.2,0.1,1,1 ,1]);

    //二维码3
    readOBJFile('./models/paper3.obj', modelObject,  mtlArray, objArray, 1, false, 17);
    TextureArray[17]={ifTexture:1.0,TextureUrl:'repeat',n:2};
    updateDrawInfo(17,[90.0,0.0,0.0, 87,-15,-66.0, 1,1,0.1,  0.3,0.2,0.1,1,1 ,1]);

    //二维码4
    readOBJFile('./models/paper4.obj', modelObject,  mtlArray, objArray, 15, false, 18);
    TextureArray[18]={ifTexture:0.0,TextureUrl:'repeat',n:2};
    updateDrawInfo(18,[0.0,0.0,0.0,  -79.5,-19.5,62.0, 1,1,0.5,  0,0,0,0,1 ,1]);

    readOBJFile('./models/cube.obj', modelObject,  mtlArray, objArray, 10, false, 19);
    TextureArray[19]={ifTexture:0.0,TextureUrl:'none',n:2};
    updateDrawInfo(19,[0.0,-90.0,0.0, 109.5,-20.0,-64.0, 1,5.0,1,  0.2,0.2,0.2,1,1 ,1]);

    readOBJFile('./models/lamp.obj', modelObject,  mtlArray, objArray, 0.03, false, 20);
    TextureArray[20]={ifTexture:1.0,TextureUrl:'repeat',n:0};
    updateDrawInfo(20,[0.0,-90.0,0.0, -80,-20.0,-143.0, 1,0.8,1,  0.2,0.2,0.2,1,1 ,1]);

    readOBJFile('./models/lamp.obj', modelObject,  mtlArray, objArray, 0.03, false, 21);
    TextureArray[21]={ifTexture:1.0,TextureUrl:'repeat',n:0};
    updateDrawInfo(21,[0.0,-90.0,0.0, -80,-20.0,143.0, 1,0.8,1,  0.2,0.2,0.2,1,1 ,1]);
    //1.0代表加载纹理，0.0代表不加载纹理

    initEventHandlers(canvas, configs.angle, gl, viewProjMatrix, model);

    var tick = function() {   // Start drawing
        // currentAngle = animate(currentAngle); // Update current rotation angle
        if(loadTextures.unload<=0){
            initDraw(gl);
            for(var ii=0;ii<modelObject.length;ii++){
                draw(gl, gl.program, configs.angle, viewProjMatrix, model,ii,TextureArray,false);
            }
        }
        animationID = requestAnimationFrame(tick, canvas);
    };


    for(var ii=0;ii<TextureArray.length;ii++){
        if(TextureArray[ii].TextureUrl!="none" && TextureArray[ii].TextureUrl!="repeat"){
            loadTextures.unload++;
            initTextures(gl, TextureArray[ii]);
        }
    }
    initDraw(gl);
    tick();

};

var useFul=[13,14,15,16,17,18,3,19];

//中心控制器
function initEventHandlers(canvas, currentAngle, gl, viewProjMatrix, model) {
    var dragging = false;         // Dragging or not
    var lastX = -1, lastY = -1;   // Last position of the mouse
    var circleX = 314,currentX=0;

    var forwardInterval,backInterval,leftInterval,rightInterval;

    canvas.onmousedown = function(ev) {   // Mouse is pressed
        var x = ev.clientX, y = ev.clientY;

        // Start dragging if a moue is in <canvas>
        var rect = ev.target.getBoundingClientRect();
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
            lastX = x; lastY = y;
            dragging = true;
        }
        var x_in_canvas = x - rect.left, y_in_canvas = rect.bottom - y;

        var articleID = checkPixel(gl, viewProjMatrix, model, x_in_canvas,  y_in_canvas);

        console.log("articleID",articleID);

        if(useFul.indexOf(articleID)>-1){
            nextstep(articleID);
        }

    };

    canvas.onmouseup = function(ev) { dragging = false;  }; // Mouse is released

    canvas.onmousemove = function(ev) { // Mouse is moved
        var x = ev.clientX, y = ev.clientY;
        if (dragging) {
            var factor = 100/canvas.height; // The rotation ratio
            var dx = factor * (x - lastX);
            var dy = factor * (y - lastY);

            currentX+=dx*4;
//                while(currentX<-314)currentX+=618;

//                console.log("currentX",currentX,configs.lookConfig);

            configs.lookConfig[3]=Math.sin(currentX/circleX) * 100 + configs.lookConfig[0];
            configs.lookConfig[5]=Math.cos(currentX/circleX) * 100 + configs.lookConfig[2];

            configs.lookConfig[4]+=dy*4;
//                configs.lookConfig[5]+=dy;
//                console.log("lookConfig",configs.lookConfig);
            viewProjMatrix.setPerspective(30.0, canvas.width/canvas.height, 1.0, 5000.0);
            viewProjMatrix.lookAt(...(configs.lookConfig));

            // Limit x-axis rotation angle to -90 to 90 degrees
            currentAngle[0] = Math.max(Math.min(currentAngle[0] + dy, 90.0), -90.0);
            currentAngle[1] = currentAngle[1] + dx;
        }
        lastX = x;
        lastY = y;
    };

    window.onkeydown=function(e){
        var speed=5;
        switch (e.keyCode){
            case 87:
                clearInterval(forwardInterval);
                clearInterval(backInterval);
                toahead.style.opacity="1";
                forwardInterval=setInterval(function(){
//                        console.log("forward");
                    configs.lookConfig[0]+=Math.sin(currentX/circleX)*speed;
                    configs.lookConfig[2]+=Math.cos(currentX/circleX)*speed;
                    configs.lookConfig[3]+=Math.sin(currentX/circleX)*speed;
                    configs.lookConfig[5]+=Math.cos(currentX/circleX)*speed;
                    viewProjMatrix.setPerspective(30.0, canvas.width/canvas.height, 1.0, 5000.0);
                    viewProjMatrix.lookAt(...(configs.lookConfig));
                },30);
                //                    console.log("forward");
                break;
            case 83:
                clearInterval(forwardInterval);
                clearInterval(backInterval);
                tobackward.style.opacity="1";
                backInterval=setInterval(function(){
                    configs.lookConfig[0]-=Math.sin(currentX/circleX)*speed;
                    configs.lookConfig[2]-=Math.cos(currentX/circleX)*speed;
                    configs.lookConfig[3]-=Math.sin(currentX/circleX)*speed;
                    configs.lookConfig[5]-=Math.cos(currentX/circleX)*speed;
                    viewProjMatrix.setPerspective(30.0, canvas.width/canvas.height, 1.0, 5000.0);
                    viewProjMatrix.lookAt(...(configs.lookConfig));
                },30);
                break;
            case 65:
                clearInterval(rightInterval);
                clearInterval(leftInterval);
                toleft.style.opacity="1";
                leftInterval=setInterval(function(){
                    configs.lookConfig[0]+=Math.cos(currentX/circleX)*speed;
                    configs.lookConfig[2]-=Math.sin(currentX/circleX)*speed;
                    configs.lookConfig[3]+=Math.cos(currentX/circleX)*speed;
                    configs.lookConfig[5]-=Math.sin(currentX/circleX)*speed;
                    viewProjMatrix.setPerspective(30.0, canvas.width/canvas.height, 1.0, 5000.0);
                    viewProjMatrix.lookAt(...(configs.lookConfig));
                },30);
                break;
            case 68:
                clearInterval(rightInterval);
                clearInterval(leftInterval);
                toright.style.opacity="1";
                rightInterval=setInterval(function(){
                    configs.lookConfig[0]-=Math.cos(currentX/circleX)*speed;
                    configs.lookConfig[2]+=Math.sin(currentX/circleX)*speed;
                    configs.lookConfig[3]-=Math.cos(currentX/circleX)*speed;
                    configs.lookConfig[5]+=Math.sin(currentX/circleX)*speed;
                    viewProjMatrix.setPerspective(30.0, canvas.width/canvas.height, 1.0, 5000.0);
                    viewProjMatrix.lookAt(...(configs.lookConfig));
                },30);
                break;
        }
    };

    window.onkeyup=function(e){

        console.log("onkeyup",e.keyCode);
        switch (e.keyCode){

            case 87:
                clearInterval(forwardInterval);
                toahead.style.opacity="0.5";
                break;
            case 83:
                clearInterval(backInterval);
                tobackward.style.opacity="0.5";
                break;

            case 65:
                clearInterval(leftInterval);
                toleft.style.opacity="0.5";
                break;
            case 68:
                clearInterval(rightInterval);
                toright.style.opacity="0.5";
                break;
        }
    };

}

// Create an buffer object and perform an initial configuration
function initVertexBuffers(gl, program) {
    var o = new Object(); // Utilize Object object to return multiple buffer objects
    o.vertexBuffer = createEmptyArrayBuffer(gl, program.a_Position, 3, gl.FLOAT);
    o.normalBuffer = createEmptyArrayBuffer(gl, program.a_Normal, 3, gl.FLOAT);
    o.colorBuffer = createEmptyArrayBuffer(gl, program.a_Color, 4, gl.FLOAT);
    o.textBuffer = createEmptyArrayBuffer(gl, program.a_TextCord, 3, gl.FLOAT);
    o.indexBuffer = gl.createBuffer();
    if (!o.vertexBuffer || !o.normalBuffer || !o.textBuffer || !o.colorBuffer || !o.indexBuffer) { return null; }

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return o;
}

// Create a buffer object, assign it to attribute variables, and enable the assignment
function createEmptyArrayBuffer(gl, a_attribute, num, type) {
    var buffer =  gl.createBuffer();  // Create a buffer object
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return null;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, num, type, true, 0, 0);  // Assign the buffer object to the attribute variable
    gl.enableVertexAttribArray(a_attribute);  // Enable the assignment

    return buffer;
}

//这里面的n应该是标号，只不过暂时没有用到
function initTextures(gl,thisTexture) {
    console.log(gl,"image to onload ..",gl);
    var texture = gl.createTexture();   // Create a texture object
    if (!texture) {
        console.log('Failed to create the texture object');
        return false;
    }

    // Get the storage location of u_Sampler
    var u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
    //console.log("u_Sampler",u_Sampler);
    if (!u_Sampler) {
        console.log('Failed to get the storage location of u_Sampler');
        return false;
    }
    var image = new Image();  // Create the image object
    if (!image) {
        console.log('Failed to create the image object');
        return false;
    }
    // Register the event handler to be called on loading an image
    image.onload = function(){
        console.log("image onload");
        loadTexture(gl, thisTexture.n, texture, u_Sampler, image);
    };
    // Tell the browser to load an image
    image.src = thisTexture.TextureUrl;

    return true;
}

function loadTexture(gl, n, texture, u_Sampler, image) {
    var TextureList = [gl.TEXTURE0,gl.TEXTURE1,gl.TEXTURE2,gl.TEXTURE3,gl.TEXTURE4,gl.TEXTURE5,gl.TEXTURE6,gl.TEXTURE7];

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y axis
    // Enable texture unit0
    gl.activeTexture(TextureList[n]);
    // Bind the texture object to the target
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set the texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    // Set the texture image
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

    loadTextures.unload-=1;
    // Set the texture unit 0 to the sampler
    // gl.uniform1i(u_Sampler, n);
}


var tttt = 0;

function initDraw(gl){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);  // Clear color and depth buffers
    gl.uniform3f(gl.program.u_light_position,configs.lightP[0],configs.lightP[1],configs.lightP[2]);
    gl.uniform3f(gl.program.u_lightColor,configs.lightColor[0],configs.lightColor[1],configs.lightColor[2]);
    gl.uniform3f(gl.program.eye_Position,configs.lookConfig[0],configs.lookConfig[1],configs.lookConfig[2]);
    gl.uniform1f(gl.program.u_Clicked,0.0);
}

// 描画関数
function draw(gl, program, angle, viewProjMatrix, model, index, TextureArray, if_click_test) {

    if(!modelDrawInfo[index].ifShow) return;  //如果这个模型被设置成不显示，那么就不显示

    //没加载好
    if(!mtlArray[index] || !objArray[index]){
        console.log("no object!!!");
        return;
    }

    //设置纹理
    if(TextureArray[index].ifTexture==1.0){
        var u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
        gl.uniform1i(u_Sampler, TextureArray[index].n);
    }

    //计算顶点数目
    var numIndices = 0;
    for(var i = 0; i < modelObject[index].objects.length; i++){
        numIndices += modelObject[index].objects[i].numIndices;
        //每一个objects[i].numIndices 是它的所有的face的顶点数加起来
    }

    gl.uniform4f(gl.program.u_tempColor,configs.tempColorList[index*3],configs.tempColorList[index*3+1],configs.tempColorList[index*3+2],1);
//        if(if_click_test){
//            console.log(configs.tempColorList[index*3],configs.tempColorList[index*3+1],configs.tempColorList[index*3+2],1,index);
//        }
    //console.log(modelObject,"modelObject");

    //这个时候先判断颜色是不是要用指定的颜色

    gl.uniform4f(gl.program.u_certainColor,modelDrawInfo[index].r,modelDrawInfo[index].g,modelDrawInfo[index].b,modelDrawInfo[index].a);
    gl.uniform1f(gl.program.u_ifCertainColor,modelDrawInfo[index].u_ifCertainColor);

    for(var ii=0;ii<Math.ceil(numIndices/MAX);ii++){
        if(tttt<1)console.log("when tttt < 1",numIndices,(numIndices-ii*MAX)<MAX?(numIndices-ii*MAX):MAX);
        g_drawingInfo = onReadComplete(gl, model, modelObject[index],ii*MAX,(numIndices-ii*MAX)<MAX?(numIndices-ii*MAX):MAX,TextureArray[index].ifTexture);
        g_objDoc = null;

        g_modelMatrix.setTranslate(modelDrawInfo[index].offsetX,modelDrawInfo[index].offsetY,modelDrawInfo[index].offsetZ);
        g_modelMatrix.rotate(modelDrawInfo[index].rotateX, 1.0, 0.0, 0.0); // 设置模型旋转矩阵
//            g_modelMatrix.rotate(angle[0], 1.0, 0.0, 0.0); // 设置模型旋转矩阵
        g_modelMatrix.rotate(modelDrawInfo[index].rotateY, 0.0, 1.0, 0.0);
//            g_modelMatrix.rotate(angle[1], 0.0, 1.0, 0.0);
        g_modelMatrix.rotate(modelDrawInfo[index].rotateZ, 0.0, 0.0, 1.0);
        g_modelMatrix.scale(modelDrawInfo[index].scaleX,modelDrawInfo[index].scaleY,modelDrawInfo[index].scaleZ);

        if(tttt<1)console.log(g_modelMatrix,modelDrawInfo[index],"g_modelMatrix");
        g_mvpMatrix.set(viewProjMatrix);

        // Calculate the normal transformation matrix and pass it to u_NormalMatrix
        g_normalMatrix.setInverseOf(g_modelMatrix);
        g_normalMatrix.transpose();
        gl.uniformMatrix4fv(program.u_NormalMatrix, false, g_normalMatrix.elements);
        gl.uniformMatrix4fv(program.u_ModelMatrix, false, g_modelMatrix.elements);

        // Calculate the model view project matrix and pass it to u_MvpMatrix
        // g_mvpMatrix.multiply(g_modelMatrix);
        //g_mvpMatrix.setOrtho(-100,100,-100,100,-50,50);
        g_mvpMatrix.multiply(g_modelMatrix);
        //g_mvpMatrix.rotate(angle[0], 1.0, 0.0, 0.0);
        //g_mvpMatrix.rotate(angle[1], 0.0, 1.0, 0.0);
        //g_mvpMatrix.translate(-200.0,0.0,0.0);
        gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);

        // Draw
        gl.drawElements(gl.TRIANGLES,(numIndices-ii*MAX)<MAX?(numIndices-ii*MAX):MAX, gl.UNSIGNED_SHORT, 0);
    }

    tttt++;

}

//返回的是被点击的物体的编号,0代表没有物体被点击
function checkPixel(gl, viewProjMatrix, model, x, y){
    //window.cancelAnimationFrame(animationID);
    //调试用

    var picked = false;

    gl.uniform1f(gl.program.u_Clicked,1.0);
    var pixels = new Uint8Array(4);

    for(var ii=0;ii<modelObject.length;ii++){
        draw(gl, gl.program, configs.angle, viewProjMatrix, model,ii,TextureArray,true);
    }

    gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    console.log("点击信息:",parseInt((pixels[0]/(255/MAX_OBJECT)).toFixed(0)),x,y,pixels);

    //先判断是否是背景色,然后如果选上判断是哪一个物体

    gl.uniform1f(gl.program.u_Clicked,0.0);

    return (parseInt((pixels[0]/(255/MAX_OBJECT)).toFixed(0))-1);

}

//以下是测试代码，正式使用的时候应该删除

var changePosition = document.getElementsByClassName("changePosition");
//    console.log("changePosition",changePosition);
Array.prototype.forEach.call(changePosition,function(node){
    node.addEventListener("click",function(e){
        console.log("begin to change the observe position",e.target.attributes["to"].value.charAt(8));
        switch (e.target.attributes["to"].value){
            case "lightP1":
            case "lightP2":
            case "lightP3":
                if(e.target.childNodes.item(0).nodeValue=="+"){
                    configs.lightP[parseInt(e.target.attributes["to"].value.charAt(6))-1]=parseFloat((parseFloat(document.getElementById(e.target.attributes["to"].value).innerHTML)+50.0).toFixed(2));
                    document.getElementById(e.target.attributes["to"].value).innerHTML=configs.lightP[parseInt(e.target.attributes["to"].value.charAt(6))-1].toString();
                }
                else{
                    configs.lightP[parseInt(e.target.attributes["to"].value.charAt(6))-1]=parseFloat((parseFloat(document.getElementById(e.target.attributes["to"].value).innerHTML)-50.0).toFixed(2));
                    document.getElementById(e.target.attributes["to"].value).innerHTML=configs.lightP[parseInt(e.target.attributes["to"].value.charAt(6))-1].toString();
                }
                break;

        }
        console.log(configs.lightDir,"configs");
    });
});

//以下是游戏业务代码

var step={
    box:false,
    paper1:false,
    paper2:false,
    paper3:false,
    paper4:false,
    mouse:false,
    electricity:true,
    screenLight:false,
    mail:false,
    chest:false,
    ok:false,
    out:false,
};

var messageNumber=0;

function addSystemMessage(str){
    console.log(getById("anounContent").childNodes);
    if(messageNumber>=5){
        getById("anounContent").removeChild(getById("anounContent").childNodes.item(3))
    }
    var tempP = document.createElement("P");
    tempP.innerHTML=str;
    getById("anounContent").append(tempP);
    messageNumber++;
}

var clockNumber = 0;

function nextstep(id){

    switch(id){
        case 13:
            console.log(13);
            if(!step.electricity)addSystemMessage("现在电脑并没有接通电源");
            else if(!step.mouse)addSystemMessage("你好像需要一个鼠标来控制它");
            else if(!step.screenLight){
                TextureArray[13].ifTexture=1.0;
                step.screenLight=true;
                addSystemMessage("你用鼠标点亮了屏幕");
            }
            else if(!step.mail && step.screenLight) {
                TextureArray[13].n = 7;
                addSystemMessage("你用鼠标操作它发送了一封邮件");
                step.mail=true;
            }
            break;
        case 14:
            step.box=true;
            modelDrawInfo[14].ifShow=0;
            addSystemMessage("你发现了一个盒子");
            getById("codebox").style.display="block";
            break;

        case 15:
            step.paper1=true;
            modelDrawInfo[15].ifShow=0;
            addSystemMessage("你在椅子上发现了一张残缺的图片");
            getById("code1").style.display="block";
            break;
        case 16:
            step.paper2=true;
            modelDrawInfo[16].ifShow=0;
            addSystemMessage("你在饮水机上发现了一张残缺的图片");
            getById("code2").style.display="block";
            break;
        case 17:
            step.paper3=true;
            modelDrawInfo[17].ifShow=0;
            addSystemMessage("你在柜子里发现了一张残缺的图片");
            getById("code3").style.display="block";
            break;
        case 18:
            step.paper4=true;
            modelDrawInfo[18].ifShow=0;
            addSystemMessage("你从抽屉里面发现了一张残缺的图片");
            getById("code4").style.display="block";
            break;
        case 3:
            if(step.mail) {
                clockNumber++;
                console.log("clockNumber", clockNumber);
                if (clockNumber > 9) {
                    console.log("step.ok,clockNumber", clockNumber);
                    step.ok = true;
                    add3OffsetZ();
                }
                setTimeout(function () {
                    clockNumber = 0;
                }, 3000);
            }
            break;
        case 19:
            if(step.out){
                addSystemMessage("你走出了房间");
                $("#outSuccess").modal({});
            }
            break;
        default:
            break;
    }

}

function add3OffsetZ (){
    if(step.ok && !step.out) {
        modelDrawInfo[3].offsetZ += 5;
        if (modelDrawInfo[3].offsetZ < -29)
            setTimeout(function () {
                add3OffsetZ()
            }, 200);
        else step.out=true;
    }
}

function openbox(){
    getById("password1").value="";
    getById("password2").value="";
    getById("password3").value="";
    getById("password4").value="";
    getById("wrongPass").style.display="none";
    getById("rightPass").style.display="none";
    console.log("try to open box...");
    $("#openbox").modal({});
}

function tonext(value){
    document.getElementById(value).focus();
}

function getById(value){
    return document.getElementById(value);
}

function vertify(){
    if(getById("password1").value+getById("password2").value+getById("password3").value+getById("password4").value!="6427"){
        getById("wrongPass").style.display="block";
    }
    else{
        getById("rightPass").style.display="block";
        getById("mouse").style.display="block";
        getById("codebox").style.display="none";
        step.mouse=true;
    }
}

function useMouse(){
    $("#useMouse").modal({});
}

function showPaperUse(){
    $("#paperUse").modal({});
    if(!step.paper1)getById('modal-code1').style.display="none";
    if(!step.paper2)getById('modal-code2').style.display="none";
    if(!step.paper3)getById('modal-code3').style.display="none";
    if(!step.paper4)getById('modal-code4').style.display="none";

}

getById("modal-code1").style.left=0+"px";
getById("modal-code1").style.top=90+"px";
var code_dragging_1 = false;         // Dragging or not
var code_lastX_1 = -1, code_lastY_1 = -1;   // Last position of the mouse
getById("modal-code1").onclick=function(e){
    if(code_dragging_1)
        code_dragging_1=false;
    else {
        code_dragging_1=true;
        code_lastX_1=e.clientX;
        code_lastY_1=e.clientY;
    }
};
getById("modal-code1").onmousemove=function(e){
    if(code_dragging_1) {
        console.log(parseInt(getById("modal-code1").style.left) + e.clientX - code_lastX_1);
        getById("modal-code1").style.left = (parseInt(getById("modal-code1").style.left) + e.clientX - code_lastX_1) + "px";
        getById("modal-code1").style.top = (parseInt(getById("modal-code1").style.top) + e.clientY - code_lastY_1) + "px";
        code_lastX_1 = e.clientX;
        code_lastY_1 = e.clientY;
    }
};

getById("modal-code2").style.left=0+"px";
getById("modal-code2").style.top=0+"px";
var code_dragging_2 = false;         // Dragging or not
var code_lastX_2 = -2, code_lastY_2 = -2;   // Last position of the mouse
getById("modal-code2").onclick=function(e){
    if(code_dragging_2)
        code_dragging_2=false;
    else {
        code_dragging_2=true;
        code_lastX_2=e.clientX;
        code_lastY_2=e.clientY;
    }
};
getById("modal-code2").onmousemove=function(e){
    if(code_dragging_2) {
        console.log(parseInt(getById("modal-code2").style.left) + e.clientX - code_lastX_2);
        getById("modal-code2").style.left = (parseInt(getById("modal-code2").style.left) + e.clientX - code_lastX_2) + "px";
        getById("modal-code2").style.top = (parseInt(getById("modal-code2").style.top) + e.clientY - code_lastY_2) + "px";
        code_lastX_2 = e.clientX;
        code_lastY_2 = e.clientY;
    }
};

getById("modal-code3").style.left=90+"px";
getById("modal-code3").style.top=0+"px";
var code_dragging_3 = false;         // Dragging or not
var code_lastX_3 = -3, code_lastY_3 = -3;   // Last position of the mouse
getById("modal-code3").onclick=function(e){
    if(code_dragging_3)
        code_dragging_3=false;
    else {
        code_dragging_3=true;
        code_lastX_3=e.clientX;
        code_lastY_3=e.clientY;
    }
};
getById("modal-code3").onmousemove=function(e){
    if(code_dragging_3) {
        console.log(parseInt(getById("modal-code3").style.left) + e.clientX - code_lastX_3);
        getById("modal-code3").style.left = (parseInt(getById("modal-code3").style.left) + e.clientX - code_lastX_3) + "px";
        getById("modal-code3").style.top = (parseInt(getById("modal-code3").style.top) + e.clientY - code_lastY_3) + "px";
        code_lastX_3 = e.clientX;
        code_lastY_3 = e.clientY;
    }
};

getById("modal-code4").style.left=90+"px";
getById("modal-code4").style.top=90+"px";
var code_dragging_4 = false;         // Dragging or not
var code_lastX_4 = -4, code_lastY_4 = -4;   // Last position of the mouse
getById("modal-code4").onclick=function(e){
    if(code_dragging_4)
        code_dragging_4=false;
    else {
        code_dragging_4=true;
        code_lastX_4=e.clientX;
        code_lastY_4=e.clientY;
    }
};
getById("modal-code4").onmousemove=function(e){
    if(code_dragging_4) {
        console.log(parseInt(getById("modal-code4").style.left) + e.clientX - code_lastX_4);
        getById("modal-code4").style.left = (parseInt(getById("modal-code4").style.left) + e.clientX - code_lastX_4) + "px";
        getById("modal-code4").style.top = (parseInt(getById("modal-code4").style.top) + e.clientY - code_lastY_4) + "px";
        code_lastX_4 = e.clientX;
        code_lastY_4 = e.clientY;
    }
};

//    setTimeout(function(){
//        $("#first").modal({});
//    },4000);
