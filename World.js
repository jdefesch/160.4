
const VSHADER_SOURCE = `precision mediump float;
attribute vec4 a_Position;
attribute vec2 a_UV;
varying vec2 v_UV;
uniform mat4 u_ModelMatrix;
uniform mat4 u_GlobalRotateMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position =   u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
  }`;

// Fragment shader program
const FSHADER_SOURCE = `precision mediump float;
  uniform vec4 u_FragColor;
  varying vec2 v_UV;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform int u_whichTexture;
  void main() {

    if(u_whichTexture == -2){
        gl_FragColor = u_FragColor;                
     } else if (u_whichTexture == -1){
        gl_FragColor = vec4(v_UV, 1.0, 1.0);        
     } else if(u_whichTexture == 0){
        gl_FragColor = texture2D(u_Sampler0, v_UV);  
     } else if(u_whichTexture == 1){
        gl_FragColor = texture2D(u_Sampler1, v_UV);  
     } else {
        gl_FragColor = vec4(1,.2,.2,1);             
     }

  }`;

let canvas, gl, a_Position, u_FragColor, u_ModelMatrix, u_GlobalRotateMatrix;
let color = [1, 0, 0, 1];
let g_globalAngleY = 0
let g_globalAngleX = 0
let g_globalScale = 0.6
let g_yellowAngleZ = 0
let g_blueAngleX = 0
let g_yellowAngleX = 0
let g_blueAngleY = 0

let g_legAngleX = 5
let g_legAngleZ = 0
let g_calfAngleX = 0
let g_calfAngleY = 0

let g_startTime = performance.now() / 1000
let g_seconds = 0
let g_timeSpeed = 3
let g_isAnimationRunning = 1
let isDragging = false;
let prevMouseX, prevMouseY;

let a_UV, u_Sampler0, u_Sampler1, u_whichTexture, u_ViewMatrix, u_ProjectionMatrix;
let g_eye = [0,0,-1]
let g_at = [0,0,0]
let g_up = [0,1,0]
let g_map = [
    [1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1]

]

let camera

const setupWebGL = () => {
    canvas = document.getElementById('webgl');
    gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    camera = new Camera()

};

const connectVariablesToGLSL = () => {
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    a_UV = gl.getAttribLocation(gl.program, 'a_UV');
    if (!a_UV) {
        console.log('Failed to get the storage location of a_UV');
        return;
    }

    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return;
    }

    u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
    if (!u_whichTexture) {
        console.log('Failed to get u_whichTexture');
        return;
    }

    u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    if (!u_ViewMatrix) {
        console.log('Failed to get u_ViewMatrix');
        return;
    }

    u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
    if (!u_ProjectionMatrix) {
        console.log('Failed to get u_ProjectionMatrix');
        return;
    }

    u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
    if (!u_Sampler0) {
        console.log('Failed to get the storage location of u_Sampler0');
        return false;
    }

    u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
    if (!u_Sampler1) {
        console.log('Failed to get the storage location of u_Sampler1');
        return false;
    }
    

    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return;
    }

    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if (!u_ModelMatrix) {
        console.log('Failed to get the storage location of u_ModelMatrix');
        return;
    }

    u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
    if (!u_GlobalRotateMatrix) {
        console.log('Failed to get the storage location of u_GlobalRotateMatrix');
        return;
    }




};

const renderScene = () => {
    let startTime = performance.now()
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var identityM = new Matrix4()
    gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements)

    var projMat = new Matrix4();
    projMat.setPerspective(90, canvas.width / canvas.height, 0.1, 100)
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);
 
    gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMat.elements);

    let globalRotMat = new Matrix4()
        .rotate(g_globalAngleY, 0, 1, 0)
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements)

    renderAllShapes()

    duration = performance.now() - startTime
    document.getElementById('performance').innerHTML = `${duration.toFixed(2)}ms ${Math.floor(1000 / duration)}fps`

};

const drawMap = () => {
    for (let x=0;x<32;x++){
        for (let y=0;y<32;y++){
            // if (!g_map[x][y])
            //     continue

            if (x<1 || x === 31 || y === 0 || y === 31){

                let cube = new Cube()
                cube.color = [0,0,1,1]
                cube.textureNum = 1
                cube.matrix.translate(x-16, -2, y-16)
                cube.render()
            }

        }
    }
}

const renderAllShapes = () => {
    drawMap()

    let floor = new Cube();
    floor.color=[0,1,0,1]
    floor.matrix.translate(-16, -2, -16)
                .scale(32, 0, 32)
            
    floor.render()

    let sky = new Cube()
    sky.matrix.scale(50,50,50)
            .translate(-.5, -.5, -.5)
            sky.textureNum = 0

    sky.render()
    


    let body = new Cube();
    body.color = [1, 0, 0, 1]
    body.matrix.translate(-.35, -.5, -.25)
        .scale(.7, 1, .5)
    body.render()

    // //left arm
    // let leftArm = new Cube();
    // leftArm.color = [1, 1, 0, 1]
    // leftArm.matrix.translate(0.35, .5, .125)
    //     .rotate(g_yellowAngleZ, 0, 0, 1)
    //     .rotate(g_yellowAngleX, 1, 0, 0)
    //     .scale(.25, -.7, .25)
    // leftArm.render()

    // //right arm
    // let rightArm = new Cube();
    // rightArm.color = [1, 1, 0, 1]
    // rightArm.matrix.translate(-0.35, .5, .125)
    //     .rotate(-g_yellowAngleZ, 0, 0, 1)
    //     .rotate(g_yellowAngleX, 0, 1, 0)
    //     .scale(-.25, -.7, .25)
    // rightArm.render()

    // //left hand
    // let leftHand = new Cube();
    // leftHand.color = [0, 0, 1, 1]
    // leftHand.matrix = leftArm.matrix
    // leftHand.matrix.translate(0, 1, 0)
    //     .scale(1, 0.2, 1)
    //     .rotate(-g_blueAngleX, 1, 0, 0)
    //     .rotate(g_blueAngleY, 1, 1, 0)
    // leftHand.render()

    // //right hand
    // let rightHand = new Cube();
    // rightHand.color = [0, 0, 1, 1]
    // rightHand.matrix = rightArm.matrix
    // rightHand.matrix.translate(0, 1, 0)
    //     .scale(1, 0.2, 1)
    //     .rotate(-g_blueAngleX, 1, 0, 0)
    //     .rotate(g_blueAngleY, 0, 1, 0)
    // rightHand.render()

    // //head
    // let head = new Cube();
    // head.color = [0, 0, 1, 1]
    // head.matrix.translate(-.25, .5, 0.05)
    //     .scale(.5, .5, .4)

    // head.render()

    // // left leg

    // let leftLeg = new Cube()
    // leftLeg.color = [1, 0, 1, 1]
    // leftLeg.matrix.translate(.05, -.5, .125)
    //     .rotate(g_legAngleX, 1, 0, 0)
    //     .rotate(g_legAngleZ, 0, 0, 1)
    //     .scale(.25, -.5, .25)

    // leftLeg.render()

    // // right leg

    // let rightLeg = new Cube()
    // rightLeg.color = [1, 0, 1, 1]
    // rightLeg.matrix.translate(-.05, -.5, .125)
    //     .rotate(-g_legAngleX, 1, 0, 0)
    //     .rotate(-g_legAngleZ, 0, 0, 1)
    //     .scale(-.25, -.5, .25)

    // rightLeg.render()

    // // left calf

    // let leftCalf = new Cube()
    // leftCalf.color = [1, 1, 1, 1]
    // leftCalf.matrix = leftLeg.matrix
    // leftCalf.matrix
    //     .translate(0, 1, 1)
    //     .scale(1, 1, -1)
    //     .rotate(g_calfAngleX, 1, 0, 0)
    // leftCalf.render()

    // // // right calf

    // let rightCalf = new Cube()
    // rightCalf.color = [1, 1, 1, 1]
    // rightCalf.matrix = rightLeg.matrix
    // rightCalf.matrix
    //     .translate(0, 1, 1)
    //     .rotate(-g_calfAngleX, 1, 0, 0)
    //     .scale(1, 1, -1)

    // rightCalf.render()


    // //right foot
    // let rightFoot = new Cube()
    // rightFoot.color = [0.5, 0.75, 0, 1]
    // rightFoot.matrix = rightCalf.matrix
    // rightFoot.matrix.scale(1, .2, 2)
    //     .translate(0, 5, 0)


    // rightFoot.render()


    // //left foot
    // let leftFoot = new Cube()
    // leftFoot.color = [0.5, 0.75, 0, 1]
    // leftFoot.matrix = leftCalf.matrix
    // leftFoot.matrix.scale(1, .2, 2)
    //     .translate(0, 5, 0)


    // leftFoot.render()
}

const updateAnimationAngles = () => {
    if (!g_isAnimationRunning) return

    // walking
    if (g_isAnimationRunning === 1) {
        g_yellowAngleZ = Math.min(Math.max(0, g_yellowAngleZ + Math.sin(g_seconds * g_timeSpeed) / 5), 20)
        g_yellowAngleX = Math.cos(g_seconds * g_timeSpeed / 2) * 5
        g_legAngleX = Math.cos(g_seconds * g_timeSpeed / 2) * 20
        g_calfAngleX = (Math.cos(g_seconds * g_timeSpeed / 2) - Math.PI / 3) * 10
        g_legAngleZ = 0
    }

    // flalling
    if (g_isAnimationRunning === 2) {
        g_yellowAngleZ = 120 + Math.sin(g_seconds * g_timeSpeed * 5) * 10
        g_yellowAngleX = Math.sin(g_seconds * g_timeSpeed * 5) * 20

        g_legAngleX = Math.cos(g_seconds * g_timeSpeed * 5) * 20
        g_legAngleZ = Math.cos(g_seconds * g_timeSpeed * 2) * 5
        g_calfAngleX = (Math.cos(g_seconds * g_timeSpeed * 5) - Math.PI / 3) * 20



    }
}

const tick = () => {
    g_seconds = performance.now() / 1000 - g_startTime
    updateAnimationAngles()
    renderScene()

    requestAnimationFrame(tick)

}






const handleKeyDownInput = (e) => {
    let inputKey = e.key
    console.log(inputKey)

    if (inputKey === 'w' || inputKey === 'ArrowUp' ){
        camera.forward()
    }
    if (inputKey === 'a' || inputKey === 'ArrowLeft' ){
        camera.left()
    }
    if (inputKey === 's' || inputKey === 'ArrowDown' ){
        camera.back()
    }
    if (inputKey === 'd' || inputKey === 'ArrowRight' ){
        camera.right()
    }
    if (inputKey === 'q' ){
        camera.panLeft()
    }
    if (inputKey === 'e' ){
        camera.panRight()
    }
}



const makeEventListeners = () => {

  

    const handleCameraYAngleChange = (e) => {
        if (g_globalAngleY === parseInt(e.target.value))
            return
        g_globalAngleY = parseInt(e.target.value)
        renderScene();
    }

    const handleYellowAngleChange = (e) => {
        if (g_yellowAngleZ === parseInt(e.target.value))
            return
        g_yellowAngleZ = parseInt(e.target.value)
        renderScene()
    }

    const handleBlueChange = (e) => {
        if (g_blueAngleX === parseInt(e.target.value))
            return
        g_blueAngleX = parseInt(e.target.value)
        renderScene()
    }

    const handleAnimationChange = (e) => {
        g_isAnimationRunning = g_isAnimationRunning === 1 ? 2 : 1
    }

    const enableAnimation = () => g_isAnimationRunning = 1
    const disableAnimation = () => g_isAnimationRunning = 0


    canvas.onclick = handleAnimationChange;
    document.onkeydown = handleKeyDownInput


    document.getElementById('enable-animation').onclick = enableAnimation
    document.getElementById('disable-animation').onclick = disableAnimation

    document.getElementById('camera-angle').onmousemove = handleCameraYAngleChange;
    document.getElementById('yellow-angle').onmousemove = handleYellowAngleChange;
    document.getElementById('blue-angle').onmousemove = handleBlueChange;
};

function initTextures() {

    // Create the image object
    var image = new Image();
    // Register the event handler to be called when image loading is completed
    image.onload = function () { sendTextureToTEXTURE0(image); };
    // Tell the browser to load an Image
    image.src = 'sky.jpg';

    var image1 = new Image();
    // Register the event handler to be called when image loading is completed
    image1.onload = function () { sendTextureToTEXTURE1(image1); };
    // Tell the browser to load an Image
    image1.src = 'dirt.jpg';


    return true;
}

function sendTextureToTEXTURE0(image) {
    var texture = gl.createTexture();
    if (!texture) {
        console.log('Failed to create the texture object');
        return false;
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  // Flip the image Y coordinate
    // Activate texture unit0
    gl.activeTexture(gl.TEXTURE0);
    // Bind the texture object to the target
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set the texture parameter
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    // Set the image to texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

    // Set the texture unit 0 to the sampler
    gl.uniform1i(u_Sampler0, 0);

    // gl.clear(gl.COLOR_BUFFER_BIT);  // Clear <canvas>

    // gl.drawArrays(gl.TRIANGLE_STRIP, 0, 0);  // Draw the rectangle
    console.log('Finished loading texture0')
}


function sendTextureToTEXTURE1(image) {
    var texture = gl.createTexture();
    if (!texture) {
        console.log('Failed to create the texture object');
        return false;
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  // Flip the image Y coordinate
    // Activate texture unit0
    gl.activeTexture(gl.TEXTURE1);
    // Bind the texture object to the target
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set the texture parameter
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    // Set the image to texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

    // Set the texture unit 0 to the sampler
    gl.uniform1i(u_Sampler1, 1);

    // gl.clear(gl.COLOR_BUFFER_BIT);  // Clear <canvas>

    // gl.drawArrays(gl.TRIANGLE_STRIP, 0, 0);  // Draw the rectangle
    console.log('Finished loading texture1')
}


function main() {
    setupWebGL();
    connectVariablesToGLSL();
    makeEventListeners();

    initTextures();

    tick()
}
