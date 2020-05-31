let nodeGeometry = new THREE.SphereBufferGeometry(0.1, 32, 32);
let nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
let hingeMaterial = new THREE.MeshPhongMaterial({ color: 0x6633ff });
let hingeGeometry = new THREE.ConeBufferGeometry(0.3, 0.3, 4);
let id = 0;
class Node {
    constructor(coordX, coordY, coordZ, support) {
        this.data = {};
        this.data.$id = `${++id}`; //Metadata for JSON Referencing(to reference nodes in beams)
        this.data.support = support;
        this.data.position = new THREE.Vector3(coordX, coordY, coordZ);  //TODO : Switch Y & Z?!
        this.data.loads = [];

        this.visual = {};
        if (this.data.support) {
            this.visual.mesh = new THREE.Line(hingeGeometry, hingeMaterial.clone());
            this.visual.mesh.position.set(coordX, (coordY - 0.15), coordZ);
        }
        else {
            this.visual.mesh = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
            this.visual.mesh.position.set(coordX, coordY , coordZ);
        }
        this.visual.mesh.userData.node = this;
    }
    addLoad(load, replace) {
        let index = this.data.loads.findIndex(l => l.loadCase === load.loadCase);
        if (index < 0) { //has no load of the same case(pattern)
            this.data.loads.push(load);
            index = this.data.loads.length - 1;
        }
        else if (replace) //has a load of the same case(pattern) , Replace it
            this.data.loads[index] = load;
        else              //has a load of the same case(pattern) , Add to it
            this.data.loads[index].value += load.value;
        return index;
    }
}


function createNodes(editor, coordX, coordZ) {
    let nodes = [];
    let k = 0;
    for (let i = 0; i < coordX.length; i++) {
        for (let j = 0; j < coordZ.length; j++) {

            nodes.push(new Node(coordX[i], 0, coordZ[j]));
            editor.addToGroup(nodes[k].visual.mesh, 'nodes');
            editor.createPickingObject(nodes[k]);
            k++;
        }
    }
    return nodes;
}