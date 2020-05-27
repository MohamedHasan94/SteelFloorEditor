function SectionDimensions(depth) { //Calculate the dimensions relative to it depth
    this.clearHeight = depth || 0.5;
    this.flangeWidth = 0.5 * depth || 0.25;
    this.webThickness = 0.03 * depth || 0.02;
    this.flangeThickness = 0.06 * depth || 0.05;
}

function createShape(dimensions) { //draw section shape using its dimensions
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

function createExtrudedMesh(shape, length, material) {
    extrudeSettings.depth = length;
    return new THREE.Mesh(new THREE.ExtrudeBufferGeometry(shape, extrudeSettings), material);
}

let lineStart = new THREE.Vector3(0, 0, 0);
function createWireframe(startPoint, length, material, rotation) { //Draw line at (0,0,0) and the translate and rotate it(the same as mesh)
    let lineEnd = lineStart.clone().setZ(length);
    let geometry = new THREE.BufferGeometry().setFromPoints([lineStart, lineEnd]);
    let line = new THREE.Line(geometry, material);
    line.position.copy(startPoint);
    line.rotation.copy(rotation);
    return line;
}

class BeamData { //Data required for analysis and design
    constructor(section, startPoint, endPoint, startNode, endNode) {
        this.section = section;
        this.startPoint = startPoint;
        this.endPoint = endPoint;
        this.startNode = startNode;
        this.endNode = endNode;
        this.span = this.endPoint.distanceTo(this.startPoint);
        this.loads = { };
        this.innerNodes = [];
    }
}

let vector = new THREE.Vector3();
class BeamVisual { // Visual data for editor
    constructor(startPoint, endPoint, shape, length, lineMaterial, meshMaterial, beam) {
        this.direction = (vector.clone().subVectors(endPoint, startPoint)).normalize();
        this.rotation = new THREE.Euler(0, this.direction.angleTo(new THREE.Vector3(0, 0, 1)), 0);
        this.wireframe = createWireframe(startPoint, length, lineMaterial, this.rotation);
        this.extruded = createExtrudedMesh(shape, length, meshMaterial);
        this.mesh = this.wireframe;                    //Currently rendered mesh
        this.unusedMesh = this.extruded;               // not rendered currently
        this.mesh.userData.beam = beam;                //To access the beam object through its mesh
        this.unusedMesh.userData = this.mesh.userData; //to save the same data at toggle view
        this.temp = null;                              //Used to Swap Meshes at tougle view
    }
}

class Beam {
    constructor(section, startPoint, endPoint, shape, lineMaterial, meshMaterial, startNode, endNode) {
        this.data = new BeamData(section, startPoint, endPoint, startNode, endNode); //Data to be sent to backend
        //Graphical representation
        this.visual = new BeamVisual(startPoint, endPoint, shape, this.data.span, lineMaterial, meshMaterial, this)
    }
    move(displacement) {
        this.data.startPoint.add(displacement);
        this.data.endPoint.add(displacement);
    }
    clone() { //Create a copy of this instance
        return new Beam(this.section, this.startPoint, this.endPoint, this.startNode, this.endNode, this.unusedMesh.geometry.parameters.shapes.clone(),
            this.mesh.material.clone(), this.unusedMesh.material.clone());
    }
    addLoad(load, replace) {
        // let load = new LineLoad(loadCase, value);
        // console.log(load);
        if (replace || !this.data.loads[load.loadCase])
            this.data.loads[load.loadCase] = load;
        else
            this.data.loads[load.loadCase].value += load.value;
    }
    changeSection(section) {
        let dimensions = new SectionDimensions(parseInt(section.split(' ')[1]) / 1000);
        let shape = createShape(dimensions);
        this.visual.extruded.geometry.dispose();
        // this.visual.extruded.material.dispose();
        extrudeSettings.depth = this.data.span;
        this.visual.extruded.geometry = new THREE.ExtrudeBufferGeometry(shape, extrudeSettings);
        this.data.section = section;
        console.log(this.visual.extruded)
        console.log(this.visual.unusedMesh)
        console.log(this.visual.mesh)
        console.log(this.visual.wireframe)
    }
}

class PickingObject { //The object in picking scene used to pick the original object (GPU Picking)
    constructor(object, id) {
        let material = new THREE.LineBasicMaterial({ color: new THREE.Color(id) });
        this.mesh = new THREE.Line(object.visual.mesh.geometry, material);
        this.mesh.position.copy(object.visual.mesh.position);
        this.mesh.rotation.copy(object.visual.mesh.rotation);
        object.visual.mesh.userData.picking = this.mesh; // The object has a reference to its picking object
    }
}

//Automatically generate the floor system from user's input (Creates the nodes with the beams)
function generateBeams(scene, pickingScene, coordX, coordZ, mainSection, secSection, secSpacing) {
    let mainBeams = [], secBeams = [], secCoord = [0], secNodes = [0], distribution;
    if (coordX[1] > coordZ[1]) {
        [mainBeams, nodes] = createZBeamsWithNodes(scene, pickingScene, coordX, coordZ, mainSection); //Create main beams on z-axis (short direction)

        distribution = coordZ[coordZ.length - 1]; // The distance over which sec beams are distributed
        for (let i = 1; secCoord[i - 1] < distribution; i++) { //Calculate the coordinates of sec beams
            secCoord[i] = secCoord[i - 1] + secSpacing;
        }
        [secBeams, secNodes] = createXBeams(scene, pickingScene, coordX, secCoord, secSection, coordZ, nodes, mainBeams);  //Create secondary beams on x-axis (long direction)
    }
    else {
        [mainBeams, nodes] = createXBeamsWithNodes(scene, pickingScene, coordX, coordZ, mainSection); //Create main beams on x-axis (short direction)

        distribution = coordX[coordX.length - 1]; // The distance over which sec beams are distributed
        for (let i = 1; secCoord[i - 1] < distribution; i++) { //Calculate the coordinates of sec beams
            secCoord[i] = secCoord[i - 1] + secSpacing;
        }
        [secBeams, secNodes] = createZBeams(scene, pickingScene, secCoord, coordZ, secSection, coordX, nodes, mainBeams);  //Create secondary beams on z-axis (long direction)
    }
    return [mainBeams, secBeams, nodes, secNodes];
}

//Create one material and clone from it (better performance)
let lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
let meshMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });

//Secondary beams on X (Uses the existing nodes and creates the intermediate nodes)
function createXBeams(scene, pickingScene, coordX, coordZ, section, coordZToCheck, nodes, mainBeams) {
    let beams = [];
    let secBeamsNodes = [];
    let dimensions = new SectionDimensions(parseInt(section.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);

    let nodeGroup = new THREE.Group();
    let k = 0, m = 0, a=-1;
    let n = (coordZ.length - 1) / (coordZToCheck.length - 1);


    for (let i = 0; i < coordZ.length; i++) {

        if ((coordZToCheck[i / n]) / coordZ[i] != 1 && (coordZToCheck[i / n]) / (coordZ[i] + 1) != 0) {
            //Craete a start node for this line
            m++;
            secBeamsNodes.push(new Node(coordX[0], 0, coordZ[i]));
            nodeGroup.add(secBeamsNodes[k].visual.mesh);
            window.idToObject[++id] = secBeamsNodes[k].visual;
            pickingScene.add(new PickingObject(secBeamsNodes[k], id).mesh)
            mainBeams[(i - m)].data.innerNodes.push(secBeamsNodes[k])
            k++;
        }
        else { a++;}

        for (let j = 0; j < coordX.length - 1; j++) {
            let beam;
            if ((coordZToCheck[i / n]) / coordZ[i] == 1 || (coordZToCheck[i / n]) / (coordZ[i] + 1) == 0) {
                beam = new Beam(section, new THREE.Vector3(coordX[j], 0, coordZ[i]), new THREE.Vector3(coordX[j + 1], 0, coordZ[i]),
                    shape, lineMaterial.clone(), meshMaterial.clone(), nodes[coordZToCheck.length * j + a], nodes[coordZToCheck.length * (j + 1) + a]);              
                }
            else {
                secBeamsNodes.push(new Node(coordX[j + 1], 0, coordZ[i]));
                nodeGroup.add(secBeamsNodes[k].visual.mesh);
                window.idToObject[++id] = secBeamsNodes[k].visual;
                pickingScene.add(new PickingObject(secBeamsNodes[k], id).mesh)

                beam = new Beam(section, new THREE.Vector3(coordX[j], 0, coordZ[i]), new THREE.Vector3(coordX[j + 1], 0, coordZ[i]),
                    shape, lineMaterial.clone(), meshMaterial.clone(), secBeamsNodes[k - 1], secBeamsNodes[k]);
                mainBeams[((coordZToCheck.length - 1) * (j + 1)) + (i - m)].data.innerNodes.push(secBeamsNodes[k]);
                secBeamsNodes.nodeGroup = nodeGroup;
                scene.add(nodeGroup);
                k++;
            }
            beams.push(beam);
            scene.add(beam.visual.mesh);
            window.idToObject[++id] = beam.visual;
            pickingScene.add(new PickingObject(beam, id).mesh);
        }
    }
    // let fullNodes=nodes.concat(secBeamsNodes);
    console.log(beams,secBeamsNodes,nodes);
    delete shape;
    return [beams, secBeamsNodes];
}

//Secondary beams on Z(Uses the existing nodes and creates the intermediate nodes)
function createZBeams(scene, pickingScene, coordX, coordZ, section, coordXToCheck, nodes, mainBeams) {
    let beams = [];
    let secBeamsNodes = [];
    let dimensions = new SectionDimensions(parseInt(section.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);

    let nodeGroup = new THREE.Group();
    let k = 0, m = 0,a=-1;
    let n = (coordX.length - 1) / (coordXToCheck.length - 1);


    for (let i = 0; i < coordX.length; i++) {

        if ((coordXToCheck[i / n]) / coordX[i] != 1 && (coordXToCheck[i / n]) / (coordX[i] + 1) != 0) {
            m++;
            secBeamsNodes.push(new Node(coordX[i], 0, coordZ[0]));
            nodeGroup.add(secBeamsNodes[k].visual.mesh);
            window.idToObject[++id] = secBeamsNodes[k].visual;
            pickingScene.add(new PickingObject(secBeamsNodes[k], id).mesh)
            mainBeams[(i - m)].data.innerNodes.push(secBeamsNodes[k])
            k++;
        }
        else { a++;}

        for (let j = 0; j < coordZ.length - 1; j++) {
            let beam;
            if ((coordXToCheck[i / n]) / coordX[i] == 1 || (coordXToCheck[i / n]) / (coordX[i] + 1) == 0) {
                beam = new Beam(section, new THREE.Vector3(coordX[i], 0, coordZ[j]), new THREE.Vector3(coordX[i], 0, coordZ[j + 1]),
                    shape, lineMaterial.clone(), meshMaterial.clone(),nodes[coordXToCheck.length * j + a], nodes[coordXToCheck.length * (j + 1) + a]);
            }
            else {
                secBeamsNodes.push(new Node(coordX[i], 0, coordZ[j + 1]));
                nodeGroup.add(secBeamsNodes[k].visual.mesh);
                window.idToObject[++id] = secBeamsNodes[k].visual;
                pickingScene.add(new PickingObject(secBeamsNodes[k], id).mesh)
                beam = new Beam(section, new THREE.Vector3(coordX[i], 0, coordZ[j]), new THREE.Vector3(coordX[i], 0, coordZ[j + 1]),
                    shape, lineMaterial.clone(), meshMaterial.clone(), secBeamsNodes[k - 1], secBeamsNodes[k]);

                mainBeams[((coordXToCheck.length - 1) * (j + 1)) + (i - m)].data.innerNodes.push(secBeamsNodes[k]);
                k++;
            }
            beams.push(beam);
            scene.add(beam.visual.mesh);
            window.idToObject[++id] = beam.visual;
            pickingScene.add(new PickingObject(beam, id).mesh);
        }
    }
    secBeamsNodes.nodeGroup = nodeGroup;
    scene.add(nodeGroup);
    console.log(beams,secBeamsNodes,nodes);
    delete shape;
    return [beams, secBeamsNodes];
}

//Main beams on Z (Creates bpth beams and nodes)
function createZBeamsWithNodes(scene, pickingScene, coordX, coordZ, section) {
    let beams = [];
    let dimensions = new SectionDimensions(parseInt(section.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);

    let nodeGroup = new THREE.Group();
    let nodes = [];
    let k = 0;

    for (let i = 0; i < coordX.length; i++) {
        nodes.push(new Node(coordX[i], 0, coordZ[0]));
        nodeGroup.add(nodes[k].visual.mesh);
        window.idToObject[++id] = nodes[k].visual;
        pickingScene.add(new PickingObject(nodes[k], id).mesh)
        k++;

        for (let j = 0; j < coordZ.length - 1; j++) {
            nodes.push(new Node(coordX[i], 0, coordZ[j + 1]));
            nodeGroup.add(nodes[k].visual.mesh);
            window.idToObject[++id] = nodes[k].visual;
            pickingScene.add(new PickingObject(nodes[k], id).mesh)
            let beam = new Beam(section, new THREE.Vector3(coordX[i], 0, coordZ[j]), new THREE.Vector3(coordX[i], 0, coordZ[j + 1]),
                shape, lineMaterial.clone(), meshMaterial.clone(), nodes[k - 1], nodes[k]);
            beams.push(beam);
            scene.add(beam.visual.mesh);
            window.idToObject[++id] = beam.visual;
            pickingScene.add(new PickingObject(beam, id).mesh);
            k++;
        }
    }
    nodes.nodeGroup = nodeGroup;
    scene.add(nodeGroup);
    return [beams, nodes];
}

//Main beams on X (Creates bpth beams and nodes)
function createXBeamsWithNodes(scene, pickingScene, coordX, coordZ, section) {
    let beams = [];
    let dimensions = new SectionDimensions(parseInt(section.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);

    let nodeGroup = new THREE.Group();
    let nodes = [];
    let k = 0;

    for (let i = 0; i < coordZ.length; i++) {

        nodes.push(new Node(coordX[0], 0, coordZ[i]));
        nodeGroup.add(nodes[k].visual.mesh);
        window.idToObject[++id] = nodes[k].visual;
        pickingScene.add(new PickingObject(nodes[k], id).mesh)
        k++;

        for (let j = 0; j < coordX.length - 1; j++) {
            nodes.push(new Node(coordX[j + 1], 0, coordZ[i]));
            nodeGroup.add(nodes[k].visual.mesh);
            window.idToObject[++id] = nodes[k].visual;
            pickingScene.add(new PickingObject(nodes[k], id).mesh)

            let beam = new Beam(section, new THREE.Vector3(coordX[j], 0, coordZ[i]), new THREE.Vector3(coordX[j + 1], 0, coordZ[i]),
                shape, lineMaterial.clone(), meshMaterial.clone(), nodes[k - 1], nodes[k]);
            beams.push(beam);
            scene.add(beam.visual.mesh);
            window.idToObject[++id] = beam.visual;
            pickingScene.add(new PickingObject(beam, id).mesh);
            k++;
        }

    }
    nodes.nodeGroup = nodeGroup;
    scene.add(nodeGroup);
    return [beams, nodes];
}

function drawBeamByTwoPoints(scene, pickingScene, section, startNode, endNode) {
    let dimensions = new SectionDimensions(parseInt(section.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);

    let beam = new Beam(section, startNode.visual.mesh.position, endNode.visual.mesh.position, shape,
        lineMaterial.clone(), meshMaterial.clone(), startNode, endNode);

    scene.add(beam.visual.mesh);
    idToObject[++id] = beam.visual;
    pickingScene.add(new PickingObject(beam, id).mesh);
}