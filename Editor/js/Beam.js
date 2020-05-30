let vector = new THREE.Vector3();
let zVector = new THREE.Vector3(0,0,1);
class Beam extends FrameElement{
    constructor(sectionId, startPoint, endPoint, shape, lineMaterial, meshMaterial, startNode, endNode) {
        let direction = (vector.clone().subVectors(endPoint, startPoint)).normalize();
        let rotation = new THREE.Euler(0, direction.angleTo(zVector), 0);
        super(sectionId, startPoint, endPoint, shape, lineMaterial, meshMaterial, startNode, endNode, direction, rotation);
        this.data.span = endPoint.distanceTo(startPoint);
        this.data.innerNodes = [];
        this.visual.mesh.userData.element = this;
    }
    clone() { //Create a copy of this instance
        return new Beam(this.data.section, this.data.startPoint.clone(), this.data.endPoint.clone(), this.visual.extruded.geometry.parameters.shapes,
            lineMaterial.clone(), meshMaterial.clone(), this.startNode, this.endNode);
    }
    addLoad(load, replace) {
        if (replace || !this.data.loads[load.loadCase])
            this.data.loads[load.loadCase] = load;
        else
            this.data.loads[load.loadCase].value += load.value;
    }
}

//Automatically generate the floor system from user's input (Creates the nodes with the beams)
function generateBeams(editor, coordX, coordY, coordZ, mainSectionId , secSectionId, mainSection, secSection, secSpacing) {
    let mainBeams = [], secBeams = [], secCoord = [0], secNodes = [0], distribution;
    if (coordX[1] > coordZ[1]) {
        [mainBeams, nodes] = createZBeamsWithNodes(editor, coordX, coordY, coordZ, mainSection, mainSectionId); //Create main beams on z-axis (short direction)

        distribution = coordZ[coordZ.length - 1]; // The distance over which sec beams are distributed
        for (let i = 1; secCoord[i - 1] < distribution; i++) { //Calculate the coordinates of sec beams
            secCoord[i] = secCoord[i - 1] + secSpacing;
        }
        [secBeams, secNodes] = createXBeams(editor, coordX, coordY, secCoord, secSection, coordZ, nodes, mainBeams, secSectionId);  //Create secondary beams on x-axis (long direction)
    }
    else {
        [mainBeams, nodes] = createXBeamsWithNodes(editor, coordX, coordY, coordZ, mainSection); //Create main beams on x-axis (short direction)

        distribution = coordX[coordX.length - 1]; // The distance over which sec beams are distributed
        for (let i = 1; secCoord[i - 1] < distribution; i++) { //Calculate the coordinates of sec beams
            secCoord[i] = secCoord[i - 1] + secSpacing;
        }
        [secBeams, secNodes] = createZBeams(editor, secCoord, coordY, coordZ, secSection, coordX, nodes, mainBeams);  //Create secondary beams on z-axis (long direction)
    }
    console.log(mainBeams)
    console.log(secBeams)
    return [mainBeams, secBeams, nodes, secNodes];
}

//Create one material and clone from it (better performance)
let lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
let meshMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });

//Secondary beams on X (Uses the existing nodes and creates the intermediate nodes)
function createXBeams(editor, coordX, coordY, coordZ, section, coordZToCheck, nodes, mainBeams, secSectionId) {
    let beams = [];
    let secBeamsNodes = [];
    let dimensions = new SectionDimensions(parseInt(section.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);

    let k = 0, m = 0 , a = -1;
    let n = (coordZ.length - 1) / (coordZToCheck.length - 1); // Counters to relate beams and nodes

    for (let i = 0; i < coordZ.length; i++) {

        if ((coordZToCheck[i / n]) / coordZ[i] != 1 && (coordZToCheck[i / n]) / (coordZ[i] + 1) != 0) {
            //Craete a start node for this line
            m++;
            secBeamsNodes.push(new Node(coordX[0], coordY, coordZ[i]));
            editor.addToGroup(secBeamsNodes[k].visual.mesh, 'nodes');
            editor.createPickingObject(secBeamsNodes[k]);
            mainBeams[(i - m)].data.innerNodes.push({ "$ref": secBeamsNodes[k].data.$id });
            k++;
        }
        else { a++;}

        for (let j = 0; j < coordX.length - 1; j++) {
            let beam;
            if ((coordZToCheck[i / n]) / coordZ[i] == 1 || (coordZToCheck[i / n]) / (coordZ[i] + 1) == 0) {
                beam = new Beam(secSectionId, new THREE.Vector3(coordX[j], coordY, coordZ[i]), new THREE.Vector3(coordX[j + 1], coordY, coordZ[i]),
                    shape, lineMaterial.clone(), meshMaterial.clone(), nodes[coordZToCheck.length * j + a], nodes[coordZToCheck.length * (j + 1) + a]);
            }
            else {
                secBeamsNodes.push(new Node(coordX[j + 1], coordY, coordZ[i]));
                editor.addToGroup(secBeamsNodes[k].visual.mesh, 'nodes');
                editor.createPickingObject(secBeamsNodes[k]);

                beam = new Beam(section, new THREE.Vector3(coordX[j], coordY, coordZ[i]), new THREE.Vector3(coordX[j + 1], coordY, coordZ[i]),
                    shape, lineMaterial.clone(), meshMaterial.clone(), secBeamsNodes[k - 1], secBeamsNodes[k]);
                mainBeams[((coordZToCheck.length - 1) * (j + 1)) + (i - m)].data.innerNodes.push({ "$ref": secBeamsNodes[k].data.$id });
                k++;
            }
            beams.push(beam);
            editor.addToGroup(beam.visual.mesh, 'elements');
            editor.createPickingObject(beam);
        }
    }
    return [beams, secBeamsNodes];
}

//Secondary beams on Z(Uses the existing nodes and creates the intermediate nodes)
function createZBeams(editor, coordX, coordY, coordZ, section, coordXToCheck, nodes, mainBeams) {
    let beams = [];
    let secBeamsNodes = [];
    let dimensions = new SectionDimensions(parseInt(section.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);

    let k = 0, m = 0 , a = -1;
    let n = (coordX.length - 1) / (coordXToCheck.length - 1);


    for (let i = 0; i < coordX.length; i++) {

        if ((coordXToCheck[i / n]) / coordX[i] != 1 && (coordXToCheck[i / n]) / (coordX[i] + 1) != 0) {
            m++;
            secBeamsNodes.push(new Node(coordX[i], coordY, coordZ[0]));
            editor.addToGroup(secBeamsNodes[k].visual.mesh, 'nodes');
            editor.createPickingObject(secBeamsNodes[k]);
            mainBeams[(i - m)].data.innerNodes.push({ "$ref": secBeamsNodes[k].data.$id });
            k++;
        }
        else { a++; }

        for (let j = 0; j < coordZ.length - 1; j++) {
            let beam;
            if ((coordXToCheck[i / n]) / coordX[i] == 1 || (coordXToCheck[i / n]) / (coordX[i] + 1) == 0) {
                beam = new Beam(section, new THREE.Vector3(coordX[i], coordY, coordZ[j]), new THREE.Vector3(coordX[i], coordY, coordZ[j + 1]),
                    shape, lineMaterial.clone(), meshMaterial.clone(), nodes[coordXToCheck.length * j + a], nodes[coordXToCheck.length * (j + 1) + a]);
            }
            else {
                secBeamsNodes.push(new Node(coordX[i], coordY, coordZ[j + 1]));
                editor.addToGroup(secBeamsNodes[k].visual.mesh, 'nodes');
                editor.createPickingObject(secBeamsNodes[k]);
                beam = new Beam(section, new THREE.Vector3(coordX[i], coordY, coordZ[j]), new THREE.Vector3(coordX[i], coordY, coordZ[j + 1]),
                    shape, lineMaterial.clone(), meshMaterial.clone(), secBeamsNodes[k - 1], secBeamsNodes[k]);

                mainBeams[((coordXToCheck.length - 1) * (j + 1)) + (i - m)].data.innerNodes.push({ "$ref": secBeamsNodes[k].data.$id });
                k++;
            }
            beams.push(beam);
            editor.addToGroup(beam.visual.mesh, 'elements');
            editor.createPickingObject(beam);
        }
    }
    return [beams, secBeamsNodes];
}

//Main beams on Z (Creates both beams and nodes)
function createZBeamsWithNodes(editor, coordX, coordY, coordZ, section , mainSectionId) {
    let beams = [];
    let dimensions = new SectionDimensions(parseInt(section.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);

    let nodes = [];
    let k = 0;

    for (let i = 0; i < coordX.length; i++) {
        nodes.push(new Node(coordX[i], coordY, coordZ[0]));
        editor.addToGroup(nodes[k].visual.mesh, 'nodes');
        editor.createPickingObject(nodes[k]);
        k++;

        for (let j = 0; j < coordZ.length - 1; j++) {
            nodes.push(new Node(coordX[i], coordY, coordZ[j + 1]));
            editor.addToGroup(nodes[k].visual.mesh, 'nodes');
            editor.createPickingObject(nodes[k]);
            let beam = new Beam(mainSectionId, new THREE.Vector3(coordX[i], coordY, coordZ[j]), new THREE.Vector3(coordX[i], coordY, coordZ[j + 1]),
                shape, lineMaterial.clone(), meshMaterial.clone(), nodes[k - 1], nodes[k]);
            beams.push(beam);
            editor.addToGroup(beam.visual.mesh, 'elements');
            editor.createPickingObject(beam);
            k++;
        }
    }
    return [beams, nodes];
}

//Main beams on X (Creates both beams and nodes)
function createXBeamsWithNodes(editor, coordX, coordY, coordZ, section) {
    let beams = [];
    let dimensions = new SectionDimensions(parseInt(section.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);

    let nodes = [];
    let k = 0;

    for (let i = 0; i < coordZ.length; i++) {

        nodes.push(new Node(coordX[0], coordY, coordZ[i]));
        editor.addToGroup(nodes[k].visual.mesh, 'nodes');
        editor.createPickingObject(nodes[k]);
        k++;

        for (let j = 0; j < coordX.length - 1; j++) {
            nodes.push(new Node(coordX[j + 1], coordY, coordZ[i]));
            editor.addToGroup(nodes[k].visual.mesh , 'nodes');
            editor.createPickingObject(nodes[k]);

            let beam = new Beam(section, new THREE.Vector3(coordX[j], coordY, coordZ[i]), new THREE.Vector3(coordX[j + 1], coordY, coordZ[i]),
                shape, lineMaterial.clone(), meshMaterial.clone(), nodes[k - 1], nodes[k]);
            beams.push(beam);
            editor.addToGroup(beam.visual.mesh , 'elements');
            editor.createPickingObject(beam);
            k++;
        }

    }
    return [beams, nodes];
}

function drawBeamByTwoPoints(section, startNode, endNode) {
    let dimensions = new SectionDimensions(parseInt(section.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);
    return new Beam(section, startNode.visual.mesh.position.clone(), endNode.visual.mesh.position.clone(), shape,
        lineMaterial.clone(), meshMaterial.clone(), startNode, endNode);
}