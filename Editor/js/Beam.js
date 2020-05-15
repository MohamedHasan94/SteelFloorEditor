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
    steps: 2,
    bevelEnabled: false
    //depth: length,
    //extrudePath: path
};

function createMesh(shape, position, length, material, rotation) {
    extrudeSettings.depth = length;
    let geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    let mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.rotation.set(rotation.x, rotation.y, rotation.z);
    return mesh;
}

function createLine(startPoint , endPoint , material, rotation) {
    // extrudeSettings.depth = length;
    let geometry = new THREE.BufferGeometry().setFromPoints([startPoint , endPoint]);
    let line = new THREE.Line(geometry, material);
    console.log(line)
    //line.position.copy(position);
    //line.rotation.set(rotation.x, rotation.y, rotation.z);
    return line;
}

class Beam {
    constructor(section, startPoint, endPoint, shape, material) {
        this.section = section;
        this.startPoint = startPoint;
        this.endPoint = endPoint;
        this.span = this.endPoint.distanceTo(this.startPoint);
        let direction = ((new THREE.Vector3()).subVectors(endPoint, startPoint)).normalize();
        this.rotation = new THREE.Euler(0, direction.angleTo(new THREE.Vector3(0, 0, 1)), 0);
        // this.line = createLine(startPoint , endPoint , material , this.rotation); //Wireframe
        // this.line.userData.beam = this;
        this.extrusion = createMesh(shape, this.startPoint, this.span, material, this.rotation); //Extruded view
        this.extrusion.userData.beam = this;
        this.mesh = this.extrusion;
        // this.mesh.userData.beam = this;
    }
    move(displacement){
        this.startPoint.add(displacement);
        this.endPoint.add(displacement);
    }
}

class PickingObject {
    constructor(object, id) {
        let material = new THREE.MeshPhongMaterial({emissive: new THREE.Color(id) , color: new THREE.Color(0, 0, 0),
            specular: new THREE.Color(0, 0, 0) , side: THREE.DoubleSide , alphaTest: 0.5 , blending: THREE.NoBlending});
        this.mesh = new THREE.Mesh(object.mesh.geometry, material);
        this.mesh.position.copy(object.mesh.position);
        this.mesh.rotation.copy(object.mesh.rotation);
        object.mesh.userData.picking = this.mesh;
    }
}

function drawBeamByTwoPoints(scene , pickingScene , start, end, section , color) {
    let dimensions = new SectionDimensions(parseInt(section.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);
    let beam = new Beam(section, start, end, shape,
        new THREE.MeshPhongMaterial({color: color , side: THREE.DoubleSide , alphaTest: 0.5}));

    scene.add(beam.mesh);
    idToObject[++id] = beam.mesh;
    let pickingBeam = new PickingObject(beam, id);
    pickingScene.add(pickingBeam.mesh);
}

function generateBeams(scene, pickingScene, coordX, coordZ, mainSection, secSection , secSpacing) {
    let mainBeams = [], secBeams = [] , secCoord = [0] , distribution;
    if (coordX[1] > coordZ[1]) {
        mainBeams = createZBeams(scene, pickingScene, coordX, coordZ, secSection, 0x0000ff); //Create main beams on z-axis (short direction)
        distribution = coordZ[coordZ.length-1];
        for (let i = 1; secCoord[i-1] < distribution; i++) {
            secCoord[i] = secCoord[i-1] + secSpacing;            
        }
        secBeams = createXBeams(scene, pickingScene, coordX, secCoord, mainSection, 0x00ff00);  //Create secondary beams on x-axis (long direction)
    }
    else {
        mainBeams = createXBeams(scene, pickingScene, coordX, coordZ, mainSection, 0x0000ff); //Create main beams on x-axis (short direction)
        distribution = coordX[coordX.length-1];
        for (let i = 1; secCoord[i-1] < distribution; i++) {
            secCoord[i] = secCoord[i-1] + secSpacing;            
        }
        secBeams = createZBeams(scene, pickingScene, secCoord, coordZ, secSection, 0x00ff00);  //Create secondary beams on z-axis (long direction) 
    }
    return [mainBeams, secBeams];
}

function createXBeams(scene, pickingScene, coordX, coordZ, section, color) {
    let beams = [];
    let dimensions = new SectionDimensions(parseInt(section.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);
    for (let i = 0; i < coordZ.length; i++) {
        for (let j = 0; j < coordX.length - 1; j++) {
        let material = new THREE.MeshPhongMaterial({color: color , side: THREE.DoubleSide , alphaTest: 0.5 /*, wireframe:true*/});
            let beam = new Beam(section, new THREE.Vector3(coordX[j], 0, coordZ[i]), new THREE.Vector3(coordX[j + 1], 0, coordZ[i]), shape, material);
            beams.push(beam);
            scene.add(beam.mesh);
            window.idToObject[++id] = beam.mesh;
            pickingScene.add(new PickingObject(beam, id).mesh);
        }
    }
    delete shape
    return beams;
}

function createZBeams(scene, pickingScene, coordX, coordZ, section, color) {
    let beams = [];
    let dimensions = new SectionDimensions(parseInt(section.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);
    for (let i = 0; i < coordX.length; i++) {
        for (let j = 0; j < coordZ.length - 1; j++) {
            let material = new THREE.MeshPhongMaterial({color: color , side: THREE.DoubleSide , alphaTest: 0.5});
            let beam = new Beam(section, new THREE.Vector3(coordX[i], 0, coordZ[j]), new THREE.Vector3(coordX[i], 0, coordZ[j + 1]), shape, material);
            beams.push(beam);
            scene.add(beam.mesh);
            window.idToObject[++id] = beam.mesh;
            pickingScene.add(new PickingObject(beam, id).mesh);
        }
    }
    return beams;
}