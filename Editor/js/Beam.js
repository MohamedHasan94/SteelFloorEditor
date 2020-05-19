function SectionDimensions(depth) {
    this.clearHeight = depth || 0.5;
    this.flangeWidth = 0.5 * depth || 0.25;
    this.webThickness = 0.03 * depth || 0.02;
    this.flangeThickness = 0.06 * depth || 0.05;
}

function createShape(dimensions) {
    let shape = new THREE.Shape();
    let shiftX = -dimensions.flangeWidth / 2;
    let shiftY = -(dimensions.clearHeight / 2 + dimensions.flangeThickness);
    shape.moveTo(shiftX, shiftY);
    shape.lineTo(dimensions.flangeWidth + shiftX, 0 + shiftY);
    shape.lineTo(dimensions.flangeWidth + shiftX, dimensions.flangeThickness + shiftY);
    shape.lineTo(dimensions.flangeWidth - (dimensions.flangeWidth - dimensions.webThickness) / 2 + shiftX, dimensions.flangeThickness + shiftY);
    shape.lineTo(dimensions.flangeWidth - (dimensions.flangeWidth - dimensions.webThickness) / 2 + shiftX, dimensions.flangeThickness + dimensions.clearHeight + shiftY);
    shape.lineTo(dimensions.flangeWidth + shiftX, dimensions.flangeThickness + dimensions.clearHeight + shiftY);
    shape.lineTo(dimensions.flangeWidth + shiftX, dimensions.flangeThickness + dimensions.clearHeight + dimensions.flangeThickness + shiftY);
    shape.lineTo(0 + shiftX, dimensions.flangeThickness + dimensions.clearHeight + dimensions.flangeThickness + shiftY);
    shape.lineTo(0 + shiftX, dimensions.flangeThickness + dimensions.clearHeight + shiftY);
    shape.lineTo((dimensions.flangeWidth - dimensions.webThickness) / 2 + shiftX, dimensions.flangeThickness + dimensions.clearHeight + shiftY);
    shape.lineTo((dimensions.flangeWidth - dimensions.webThickness) / 2 + shiftX, dimensions.flangeThickness + shiftY);
    shape.lineTo(0 + shiftX, dimensions.flangeThickness + shiftY);
    shape.lineTo(0 + shiftX, 0 + shiftY);
    return shape;
}

let extrudeSettings = {
    steps: 1,
    bevelEnabled: false
};

function createExtrudedMesh(shape, length , material) {
    extrudeSettings.depth = length;
    return new THREE.Mesh(new THREE.ExtrudeBufferGeometry(shape, extrudeSettings) ,material);
}

let lineStart = new THREE.Vector3(0, 0, 0);
function createWireframe(startPoint , length , material , rotation ) {
    let lineEnd = lineStart.clone().setZ(length);
    let geometry = new THREE.BufferGeometry().setFromPoints([lineStart , lineEnd]);
    let line = new THREE.Line(geometry, material);
    line.position.copy(startPoint);
    line.rotation.copy(rotation);
    return line;
}

class Beam {
    constructor(section, startPoint, endPoint, shape, lineMaterial , meshMaterial) {
        this.section = section;
        this.startPoint = startPoint;
        this.endPoint = endPoint;
        this.span = this.endPoint.distanceTo(this.startPoint);
        let direction = ((new THREE.Vector3()).subVectors(endPoint, startPoint)).normalize();
        this.rotation = new THREE.Euler(0, direction.angleTo(new THREE.Vector3(0, 0, 1)), 0);
        this.mesh = createWireframe(startPoint, this.span, lineMaterial, this.rotation); //Wireframe
        this.unusedMesh = createExtrudedMesh(shape, this.span, meshMaterial); //Extruded view geometry
        this.mesh.userData.beam = this;
        this.unusedMesh.userData = this.mesh.userData; //to save the same data at toggle view
        this.temp = null;
        this.loads = [];
    }
    move(displacement) {
        this.startPoint.add(displacement);
        this.endPoint.add(displacement);
    }
    addLoad(load, scene) {
        let myLoad = new LineLoad(load.value, load.direction);
        this.loads.push(myLoad);
        let edges = new THREE.EdgesGeometry(myLoad.mesh.geometry);
        let line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
        myLoad.mesh.add(line)

        

        let canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        let ctx = canvas.getContext("2d");
        ctx.font = "200px bold Arial";
        ctx.fillStyle = "black";
        //ctx.textAlign = "right";
        ctx.fillText(load.value, 0, 256);
        var tex = new THREE.Texture(canvas);
        tex.needsUpdate = true;
        var spriteMat = new THREE.SpriteMaterial({ map: tex });
        var sprite = new THREE.Sprite(spriteMat);
        myLoad.mesh.add(sprite)
        
        myLoad.mesh.position.copy(this.startPoint);
        //myLoad.mesh.position.add(this.direction.multiplyScalar(0.5 * this.span));
        //myLoad.mesh.position.y += 0.5 * myLoad.value;
        myLoad.mesh.rotation.copy(this.endPoint);
        scene.add(myLoad.mesh);
    }
}

class PickingObject {
    constructor(object, id) {
        let material = new THREE.LineBasicMaterial({ color: new THREE.Color(id) /*, side: THREE.DoubleSide , alphaTest: 0.5 , blending: THREE.NoBlending*/ });
        this.mesh = new THREE.Line(object.mesh.geometry, material);
        this.mesh.position.copy(object.mesh.position);
        this.mesh.rotation.copy(object.mesh.rotation);
        object.mesh.userData.picking = this.mesh;
    }
}

function drawBeamByTwoPoints(scene, pickingScene, start, end, section, color) {
    let dimensions = new SectionDimensions(parseInt(section.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);
    let beam = new Beam(section, start, end, shape,
        new THREE.MeshPhongMaterial({ color: color, side: THREE.DoubleSide, alphaTest: 0.5 }));

    scene.add(beam.mesh);
    idToObject[++id] = beam.mesh;
    let pickingBeam = new PickingObject(beam, id);
    pickingScene.add(pickingBeam.mesh);
}

function generateBeams(scene, pickingScene, coordX, coordZ, mainSection, secSection, secSpacing, dl, ll) {
    let mainBeams = [], secBeams = [], secCoord = [0], distribution;
    if (coordX[1] > coordZ[1]) {
        mainBeams = createZBeams(scene, pickingScene, coordX, coordZ, secSection, 0x0000ff); //Create main beams on z-axis (short direction)
        distribution = coordZ[coordZ.length - 1];
        for (let i = 1; secCoord[i - 1] < distribution; i++) {
            secCoord[i] = secCoord[i - 1] + secSpacing;
        }
        secBeams = createXBeams(scene, pickingScene, coordX, secCoord, mainSection, 0x00ff00, dl);  //Create secondary beams on x-axis (long direction)
    }
    else {
        mainBeams = createXBeams(scene, pickingScene, coordX, coordZ, mainSection, 0x0000ff); //Create main beams on x-axis (short direction)
        distribution = coordX[coordX.length - 1];
        for (let i = 1; secCoord[i - 1] < distribution; i++) {
            secCoord[i] = secCoord[i - 1] + secSpacing;
        }
        secBeams = createZBeams(scene, pickingScene, secCoord, coordZ, secSection, 0x00ff00);  //Create secondary beams on z-axis (long direction) 
    }
    return [mainBeams, secBeams];
}

let xLineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
let xMeshMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });

function createXBeams(scene, pickingScene, coordX, coordZ, section, color, load) {
    let beams = [];
    let dimensions = new SectionDimensions(parseInt(section.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);
    for (let i = 0; i < coordZ.length; i++) {
        for (let j = 0; j < coordX.length - 1; j++) {
            let beam = new Beam(section, new THREE.Vector3(coordX[j], 0, coordZ[i]), new THREE.Vector3(coordX[j + 1], 0, coordZ[i]), shape, xLineMaterial.clone() , xMeshMaterial.clone());
            beams.push(beam);
            //beam.addLoad(load, scene);
            scene.add(beam.mesh);
            window.idToObject[++id] = beam;
            pickingScene.add(new PickingObject(beam, id).mesh);
        }
    }
    delete shape;
    return beams;
}

let zLineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
let zMeshMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });

function createZBeams(scene, pickingScene, coordX, coordZ, section, color) {
    let beams = [];
    let dimensions = new SectionDimensions(parseInt(section.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);
    for (let i = 0; i < coordX.length; i++) {
        for (let j = 0; j < coordZ.length - 1; j++) {
            let beam = new Beam(section, new THREE.Vector3(coordX[i], 0, coordZ[j]), new THREE.Vector3(coordX[i], 0, coordZ[j + 1]), shape, zLineMaterial.clone(),zMeshMaterial.clone());
            beams.push(beam);
            scene.add(beam.mesh);
            window.idToObject[++id] = beam;
            pickingScene.add(new PickingObject(beam, id).mesh);
        }
    }
    return beams;
}