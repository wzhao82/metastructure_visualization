/**
 * Created by Xiaotao.Nie on 6/1/2017. 123
 * All right reserved
 * IF you have any question please email onlythen@yeah.net
 */ 

/***************dom元素****************/
// Initialize with default value
window.textureValue = './textTures/metal1.jpg';
function updateTextureValue() {
    var choiceValue = document.getElementById('textureChoice').value;
    window.textureValue = `./textTures/${choiceValue}.jpg`;
    main()
}
document.getElementById('textureChoice').addEventListener('change', updateTextureValue);
updateTextureValue();

for (let i = 1; i <= 8; i++) {
    window[`item${i}`] = 'unit-diamond';
};
document.getElementById('submitBtn').addEventListener('click', function() {
    // Loop through each location
    for (let i = 1; i <= 8; i++) {
        const selectedOption = document.querySelector(`input[name="location${i}"]:checked`)?.value;
        if (selectedOption) {
            window[`item${i}`] = selectedOption;
        }
    }
    main();
});

window.shape = "cube";
function updateShape() {
    window.shape = document.getElementById('shape').value;
    main()
}
document.getElementById('shape').addEventListener('change', updateShape);
updateShape();


/***************全局变量****************/

const SOCKET_URL = "127.0.0.1:3000";

const MAX = 65532;
const MAX_OBJECT = 24;
//每一个的临时颜色算法:(Math.ceil(255/MAX_OBJECT))*index
//返回index:color/(Math.ceil(255/MAX_OBJECT));

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
    lookConfig:[0.0, 2.0, 3.0, 0.0, 2.0, 0.0,  0.0, 1.0, 0],
    lightColor:new Float32Array(3),
    backgroundColor:new Uint8Array(4),
    tempColorList:new Float32Array(3*MAX_OBJECT),
    lightTheme:1,//现在根据场景不同可能有三种主题情况：1表示灯暗的情况,2表示灯比较亮的情况,3表示全部染成单一颜色的情况
    angle:[0,0,0],
    lightP:new Float32Array(3),
};
configs.lightP =[-15,0,-5];
configs.backgroundColor=[0.9, 0.9, 0.9, 1.0];
configs.lightColor = [0.4, 0.4, 0.4];
for(var ii=0; ii<MAX_OBJECT; ii++){
    configs.tempColorList[ii*3] = (Math.floor(255/MAX_OBJECT)/255).toFixed(2) * (ii+1);
    configs.tempColorList[ii*3+1] = (Math.floor(255/MAX_OBJECT)/255).toFixed(2) * (ii+1);
    configs.tempColorList[ii*3+2] = (Math.floor(255/MAX_OBJECT)/255).toFixed(2) * (ii+1);
}
var fogColor = new Float32Array([0.2, 0.3, 0.4]);
var fogDist = new Float32Array([0.5, 19]);
var If_Fog=0.0;
var mtlOK=0;

/***************全局函数****************/

//someDrawInfo通过数组的方式表示，这样可以节省一些代码
function updateDrawInfo(index,someDrawInfo){
    if(!modelDrawInfo[index])
        modelDrawInfo[index]={};

    //旋转参数
    modelDrawInfo[index].rotateX=someDrawInfo[0];
    modelDrawInfo[index].rotateY=someDrawInfo[1];
    modelDrawInfo[index].rotateZ=someDrawInfo[2];

    //位置参数
    modelDrawInfo[index].offsetX=someDrawInfo[3];
    modelDrawInfo[index].offsetY=someDrawInfo[4];
    modelDrawInfo[index].offsetZ=someDrawInfo[5];

    //缩放参数
    modelDrawInfo[index].scaleX=someDrawInfo[6];
    modelDrawInfo[index].scaleY=someDrawInfo[7];
    modelDrawInfo[index].scaleZ=someDrawInfo[8];

    //自定义颜色参数
    modelDrawInfo[index].r=someDrawInfo[9];
    modelDrawInfo[index].g=someDrawInfo[10];
    modelDrawInfo[index].b=someDrawInfo[11];
    modelDrawInfo[index].a=someDrawInfo[12];
    modelDrawInfo[index].u_ifCertainColor=someDrawInfo[13];

    //是否隐藏
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
    program.u_FogColor = gl.getUniformLocation(program, 'u_FogColor');
    program.u_FogDist = gl.getUniformLocation(program, 'u_FogDist');
    program.u_If_Fog = gl.getUniformLocation(program, 'u_If_Fog');

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
    viewProjMatrix.setPerspective(40.0, canvas.width/canvas.height, 1.0, 5000.0);
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
    // readOBJFile('./models/cube.obj', modelObject,  mtlArray, objArray, 20, false, 0);
    // TextureArray[0]={ifTexture:0.0,TextureUrl:'none',n:0};
    // updateDrawInfo(0,[0.0,90.0,0.0, 0.0,6.0,0.0, 0.75,0.4,0.5,  0.5,0.5,0.5,1,0 ,1]);

    var x0 = 0.0
    var y0 = 0.0
    var z0 = 0.0
    var increment = 0.5

    if (window.shape == "cube") {
        // initialize an array of size 8, filled with [0.0,0.0,0.0] for each slot
        var locations = [
            [0.5, 0.5, 0.5],
            [0.5, 0.0, 0.5],
            [0.5, 0.5, 0.0],
            [0.5, 0.0, 0.0],
            [0.0, 0.5, 0.5],
            [0.0, 0.0, 0.5],
            [0.0, 0.5, 0.0],
            [0.0, 0.0, 0.0],
                        ]
        for (var i = 0; i < 8; i++) {
            readOBJFile(`./models/${window[`item${i+1}`]}.obj`, modelObject,  mtlArray, objArray, 0.005, false, i);
            TextureArray[i]={ifTexture:1.0,TextureUrl:window.textureValue,n:i};
            updateDrawInfo(i,[0.0,0.0,0.0, locations[i][0],locations[i][1],locations[i][2], 10.0,10.0,10.0, 0.5,0.5,0.5,1,0 ,1]);
        }
        configs.lookConfig = [0.5, 0.25, 0.5, 0.5, 0.25, 0.25,  0.0, 1.0, 0];
    } else {
        for (var i = 0; i < 8; i++) {
            readOBJFile(`./models/${window[`item${i+1}`]}.obj`, modelObject,  mtlArray, objArray, 0.005, false, i);
            TextureArray[i]={ifTexture:1.0,TextureUrl:window.textureValue,n:i};
            updateDrawInfo(i,[0.0,0.0,0.0, x0,y0,z0+(i*increment), 10.0,10.0,10.0, 0.5,0.5,0.5,1,0 ,1]);
        }
        configs.lookConfig = [x0, y0, z0, x0, y0, z0+2,  0.0, 1.0, 0];
    }

    // var filename = './models/' + window.item1 + '.obj';
    // readOBJFile(filename, modelObject,  mtlArray, objArray, 0.005, false, 0);
    // TextureArray[0]={ifTexture:1.0,TextureUrl:window.textureValue,n:1};
    // updateDrawInfo(0,[0.0,0.0,0.0,  x0,0.0,z0,  10.0,10.0,10.0,  0.5,0.5,0.5,1,0 ,1]);

    // filename = './models/' + window.item2 + '.obj';
    // readOBJFile(filename, modelObject,  mtlArray, objArray, 0.005, false, 1);//plate
    // TextureArray[1]={ifTexture:1.0,TextureUrl:window.textureValue,n:1};
    // updateDrawInfo(1,[0.0,0.0,0.0,  x0,0.5,z0,  10.0,10.0,10.0,  0.5,0.5,0.5,1,0 ,1]);

    // filename = './models/' + window.item3 + '.obj';
    // readOBJFile(filename, modelObject,  mtlArray, objArray, 0.005, false, 2);
    // TextureArray[2]={ifTexture:1.0,TextureUrl:window.textureValue,n:1};
    // updateDrawInfo(2,[0.0,0.0,0.0,  x0,1.0,z0,  10.0,10.0,10.0,  0.5,0.5,0.5,1,0 ,1]);

    // filename = './models/' + window.item4 + '.obj';
    // readOBJFile(filename, modelObject,  mtlArray, objArray, 0.005, false, 3);//plate
    // TextureArray[3]={ifTexture:1.0,TextureUrl:window.textureValue,n:1};
    // updateDrawInfo(3,[0.0,0.0,0.0,  x0,1.5,z0,  10.0,10.0,10.0,  0.5,0.5,0.5,1,0 ,1]);

    // filename = './models/' + window.item5 + '.obj';
    // readOBJFile(filename, modelObject,  mtlArray, objArray, 0.005, false, 4);
    // TextureArray[4]={ifTexture:1.0,TextureUrl:window.textureValue,n:1};
    // updateDrawInfo(4,[0.0,0.0,0.0,  x0,2.0,z0,  10.0,10.0,10.0,  0.5,0.5,0.5,1,0 ,1]);

    // filename = './models/' + window.item6 + '.obj';
    // readOBJFile(filename, modelObject,  mtlArray, objArray, 0.005, false, 5);
    // TextureArray[5]={ifTexture:1.0,TextureUrl:window.textureValue,n:1};
    // updateDrawInfo(5,[0.0,0.0,0.0,  x0,2.5,z0,  10.0,10.0,10.0,  0.5,0.5,0.5,1,0 ,1]);

    // filename = './models/' + window.item7 + '.obj';
    // readOBJFile(filename, modelObject,  mtlArray, objArray, 0.005, false, 6);
    // TextureArray[6]={ifTexture:1.0,TextureUrl:window.textureValue,n:1};
    // updateDrawInfo(6,[0.0,0.0,0.0,  x0,3.0,z0,  10.0,10.0,10.0,  0.5,0.5,0.5,1,0 ,1]);

    // filename = './models/' + window.item8 + '.obj';
    // readOBJFile(filename, modelObject,  mtlArray, objArray, 0.005, false, 7);
    // TextureArray[7]={ifTexture:1.0,TextureUrl:window.textureValue,n:1};
    // updateDrawInfo(7,[0.0,0.0,0.0,  x0,3.5,z0,  10.0,10.0,10.0,  0.5,0.5,0.5,1,0 ,1]);

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

var useFul=[13,14,15,16,17,18,3,19,4];


function initEventHandlers(canvas, currentAngle, gl, viewProjMatrix, model) {
    var dragging = false;         // Dragging or not
    var lastX = -1, lastY = -1;   // Last position of the mouse
    var circleX = 314,currentX=0;

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
            // configs.lookConfig[0]=Math.sin(currentX/circleX) * 10 + configs.lookConfig[0];
            // configs.lookConfig[2]=Math.cos(currentX/circleX) * 10 + configs.lookConfig[2];

            configs.lookConfig[0]=Math.cos(currentX/circleX) * 10 ;
            configs.lookConfig[2]=Math.sin(currentX/circleX) * 10 ;

            configs.lookConfig[1]+=dy*0.4;
            // configs.lookConfig[0] += dx*0.4;
            //configs.lookConfig[1] -= dy;
            // var zFactor = 5 / canvas.height; // Control the sensitivity of z-axis movement, adjust as needed
            // configs.lookConfig[2] += dy * zFactor;             
            viewProjMatrix.setPerspective(30.0, canvas.width/canvas.height, 1.0, 5000.0);
            viewProjMatrix.lookAt(...(configs.lookConfig));
            // // Limit x-axis rotation angle to -90 to 90 degrees
            // currentAngle[0] = Math.max(Math.min(currentAngle[0] + dy, 90.0), -90.0);
            // currentAngle[1] = currentAngle[1] + dx;
        }
        lastX = x;
        lastY = y;
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

//n have note been used
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
        mtlOK++;
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
    gl.uniform3fv(gl.program.u_FogColor, fogColor);
    gl.uniform2fv(gl.program.u_FogDist, fogDist);
    gl.uniform1f(gl.program.u_If_Fog,If_Fog);
}

function draw(gl, program, angle, viewProjMatrix, model, index, TextureArray, if_click_test) {

    if(!modelDrawInfo[index].ifShow) return;  //Show or noshow

    if(!mtlArray[index] || !objArray[index]){
        console.log("no object!!!");
        return;
    }

    var positionToObject = [modelDrawInfo[index].offsetX-configs.lookConfig[0],modelDrawInfo[index].offsetY-configs.lookConfig[1],modelDrawInfo[index].offsetZ-configs.lookConfig[2]];
    var positionToPoint = [configs.lookConfig[3]-configs.lookConfig[0],configs.lookConfig[4]-configs.lookConfig[1],configs.lookConfig[5]-configs.lookConfig[2]];

    var multiresult=0;

    for(var jj=0;jj<3;jj++){
        multiresult+=positionToObject[jj]*positionToPoint[jj];
    }

    if(multiresult<50 && index!=0)return;

    if(TextureArray[index].ifTexture==1.0){
        var u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
        gl.uniform1i(u_Sampler, TextureArray[index].n);
    }

    var numIndices = 0;
    for(var i = 0; i < modelObject[index].objects.length; i++){
        numIndices += modelObject[index].objects[i].numIndices;
    }

    gl.uniform4f(gl.program.u_tempColor,configs.tempColorList[index*3],configs.tempColorList[index*3+1],configs.tempColorList[index*3+2],1);

    gl.uniform4f(gl.program.u_certainColor,modelDrawInfo[index].r,modelDrawInfo[index].g,modelDrawInfo[index].b,modelDrawInfo[index].a);
    gl.uniform1f(gl.program.u_ifCertainColor,modelDrawInfo[index].u_ifCertainColor);

    for(var ii=0;ii<Math.ceil(numIndices/MAX);ii++){
        if(tttt<1)console.log("when tttt < 1",numIndices,(numIndices-ii*MAX)<MAX?(numIndices-ii*MAX):MAX);
        g_drawingInfo = onReadComplete(gl, model, modelObject[index],ii*MAX,(numIndices-ii*MAX)<MAX?(numIndices-ii*MAX):MAX,TextureArray[index].ifTexture);
        g_objDoc = null;

        g_modelMatrix.setTranslate(modelDrawInfo[index].offsetX,modelDrawInfo[index].offsetY,modelDrawInfo[index].offsetZ);
        g_modelMatrix.rotate(modelDrawInfo[index].rotateX, 1.0, 0.0, 0.0);
        g_modelMatrix.rotate(modelDrawInfo[index].rotateY, 0.0, 1.0, 0.0);
        g_modelMatrix.rotate(modelDrawInfo[index].rotateZ, 0.0, 0.0, 1.0);
        g_modelMatrix.scale(modelDrawInfo[index].scaleX,modelDrawInfo[index].scaleY,modelDrawInfo[index].scaleZ);

        if(tttt<1)console.log(g_modelMatrix,modelDrawInfo[index],"g_modelMatrix");
        g_mvpMatrix.set(viewProjMatrix);

        // Calculate the normal transformation matrix and pass it to u_NormalMatrix
        g_normalMatrix.setInverseOf(g_modelMatrix);
        g_normalMatrix.transpose();
        gl.uniformMatrix4fv(program.u_NormalMatrix, false, g_normalMatrix.elements);
        gl.uniformMatrix4fv(program.u_ModelMatrix, false, g_modelMatrix.elements);

        g_mvpMatrix.multiply(g_modelMatrix);
        gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);

        // Draw
        gl.drawElements(gl.TRIANGLES,(numIndices-ii*MAX)<MAX?(numIndices-ii*MAX):MAX, gl.UNSIGNED_SHORT, 0);
    }

    tttt++;

}

//return the chosen object
function checkPixel(gl, viewProjMatrix, model, x, y){
    //window.cancelAnimationFrame(animationID);
    //debug

    var picked = false;

    gl.uniform1f(gl.program.u_Clicked,1.0);
    var pixels = new Uint8Array(4);

    for(var ii=0;ii<modelObject.length;ii++){
        draw(gl, gl.program, configs.angle, viewProjMatrix, model,ii,TextureArray,true);
    }

    gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    console.log("click information:",parseInt((pixels[0]/(255/MAX_OBJECT)).toFixed(0)),x,y,pixels);

    //if there is background, which object 

    gl.uniform1f(gl.program.u_Clicked,0.0);

    return (parseInt((pixels[0]/(255/MAX_OBJECT)).toFixed(0)));

}

function getById(value){
    return document.getElementById(value);
}