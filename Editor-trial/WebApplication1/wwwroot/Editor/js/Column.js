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

function generateColumns(editor, coordX, coordY, coordZ, mainNodes, section, sectionId) {
    let lowerNodes = [], columns = [];
    let xNo = coordX.length, zNo = coordZ.length;
    let dimensions = new SectionDimensions(parseInt(section.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);
    debugger
    for (let i = 0; i < xNo; i++) {

        for (let j = 0; j < zNo; j++) {
            let node = new Node(coordX[i], coordY, coordZ[j], 'Hinge');
            //node.visual.mesh = createHinge(node.data.position);
            editor.addToGroup(node.visual.mesh, 'nodes');
            editor.createPickingObject(node);
            lowerNodes.push(node);
            let column = new Column(sectionId, mainNodes[i * zNo + j].data.position.clone(), lowerNodes[i * zNo + j].data.position.clone(),
                shape, lineMaterial.clone(), meshMaterial.clone(), mainNodes[i * zNo + j], lowerNodes[i * zNo + j]);
            columns.push(column);
            editor.addToGroup(column.visual.mesh, 'elements');
            editor.createPickingObject(column);
        }

    }

    // for (let i = 0; i < zNo; i++) {

    //     for (let j = 0; j < xNo; j++) {
    //         let node = new Node(coordX[j] , coordY , coordZ[i] , 'Hinge');
    //         editor.addToGroup(node.visual.mesh , 'nodes');
    //         editor.createPickingObject(node);
    //         lowerNodes.push(node);
    //         let column = new Column(section, lowerNodes[i*xNo+j].data.position.clone(), mainNodes[i*xNo + j].data.position.clone(),
    //             shape, lineMaterial.clone(), meshMaterial.clone(), lowerNodes[i*xNo+j] , mainNodes[i*xNo + j]);
    //         columns.push(column);            
    //         editor.addToGroup(column.visual.mesh, 'elements');
    //         editor.createPickingObject(column);
    //     }

    // }
    return [columns, lowerNodes];
}

// let hingeMaterial = new THREE.LineBasicMaterial({ color: 0x6633ff});
//let hingeMaterial = new THREE.MeshPhongMaterial({ color: 0x6633ff});
//let hingeGeometry = new THREE.ConeBufferGeometry(0.3, 0.3, 4);
//function createHinge(position) {
//    let hinge = new THREE.Mesh(hingeGeometry, hingeMaterial.clone());
//    hinge.position.set(position.x, -0.15 , position.z);
//    return hinge
//}

function drawColumnByTwoPoints(section, startNode, endNode) {
    let dimensions = new SectionDimensions(parseInt(section.split(' ')[1]) / 1000);
    let shape = createShape(dimensions);
    return new Column(section, startNode.visual.mesh.position.clone(), endNode.visual.mesh.position.clone(), shape,
        lineMaterial.clone(), meshMaterial.clone(), startNode, endNode);
}