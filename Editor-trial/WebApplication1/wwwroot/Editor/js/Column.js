class Column extends FrameElement {
    constructor(section, startPoint, endPoint, shape, lineMaterial, meshMaterial, startNode, endNode) {
        let direction = (vector.clone().subVectors(endPoint, startPoint)).normalize();
        let rotation = new THREE.Euler(direction.angleTo(zVector), 0, 0);
        super(section, startPoint, endPoint, shape, lineMaterial, meshMaterial, startNode, endNode, direction, rotation);
        this.data.height = endPoint.distanceTo(startPoint);
        this.visual.mesh.userData.element = this;
    }
    clone() { //Create a copy of this instance
        return new Column(this.data.section, this.data.startPoint.clone(), this.data.endPoint.clone(), this.visual.extruded.geometry.parameters.shapes,
            lineMaterial.clone(), meshMaterial.clone(), this.startNode, this.endNode);
    }
    /*addLoad(load, replace) {
        if (replace || !this.data.loads[load.loadCase])
            this.data.loads[load.loadCase] = load;
        else
            this.data.loads[load.loadCase].value += load.value;
    }*/
}

function generateColumnsX(editor, coordX, coordY, coordZ, mainNodes, section, sectionId) {
    let lowerNodes = [], columns = [];
    let xNo = coordX.length, zNo = coordZ.length;
    let dimensions = new SectionDimensions(parseInt(section.name.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);
    for (let i = 0; i < xNo; i++) {

        for (let j = 0; j < zNo; j++) {
            let node = new Node(coordX[i], coordY, coordZ[j], 'Hinge');
            editor.addToGroup(node.visual.mesh, 'nodes');
            editor.createPickingObject(node);
            lowerNodes.push(node);
            let column = new Column(section.$id, mainNodes[i * zNo + j].data.position.clone(), lowerNodes[i * zNo + j].data.position.clone(),
                shape, lineMaterial.clone(), meshMaterial.clone(), mainNodes[i * zNo + j], lowerNodes[i * zNo + j]);
            columns.push(column);
            editor.addToGroup(column.visual.mesh, 'elements');
            editor.createPickingObject(column);
        }

    }
    return [columns, lowerNodes];
}

function generateColumnsZ(editor, coordX, coordY, coordZ, mainNodes, section, sectionId) {
    let lowerNodes = [], columns = [];
    let xNo = coordX.length, zNo = coordZ.length;
    let dimensions = new SectionDimensions(parseInt(section.name.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);
    for (let i = 0; i < zNo; i++) {

        for (let j = 0; j < xNo; j++) {
            let node = new Node(coordX[j], coordY, coordZ[i], 'Hinge');
            editor.addToGroup(node.visual.mesh, 'nodes');
            editor.createPickingObject(node);
            lowerNodes.push(node);
            let column = new Column(section.$id, mainNodes[i * xNo + j].data.position.clone(), lowerNodes[i * xNo + j].data.position.clone(),
                shape, lineMaterial.clone(), meshMaterial.clone(), mainNodes[i * xNo + j], lowerNodes[i * xNo + j]);
            columns.push(column);
            editor.addToGroup(column.visual.mesh, 'elements');
            editor.createPickingObject(column);
        }

    }
    return [columns, lowerNodes];
}

function drawColumnByTwoPoints(section, startNode, endNode) {
    let dimensions = new SectionDimensions(parseInt(section.name.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);
    return new Column(section.$id, startNode.visual.mesh.position.clone(), endNode.visual.mesh.position.clone(), shape,
        lineMaterial.clone(), meshMaterial.clone(), startNode, endNode);
}