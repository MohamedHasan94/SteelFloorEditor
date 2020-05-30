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
        let currentLoad = this.data.loads.find(l => l.loadCase === load.loadCase);
        if (replace || !currentLoad)
            this.data.loads.push(load);
        else
            currentLoad.value += load.value;
    }
}


// function createNodes(scene, pickingScene, coordX, coordZ) {
//     let nodeGroup = new THREE.Group();
//     let nodes = [];
//     let points = getPoints(coordX, coordZ);
//     for (let i = 0; i < points.length; i++) {
//         nodes.push(new Node(points[i], ++id));
//         nodeGroup.add(nodes[i].mesh);
//         window.idToObject[id] = nodes[i].mesh;
//         pickingScene.add(new PickingNode(nodes[i], id).mesh)
//     }
//     nodes.nodeGroup = nodeGroup;
//     scene.add(nodeGroup);
//     return nodes;
// }