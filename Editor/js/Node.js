let nodeGeometry = new THREE.SphereBufferGeometry(0.1, 32, 32);
let nodeMaterial = new THREE.MeshBasicMaterial({color: 0xffcc00});
class Node {
    constructor(coordX, coordY, coordZ, support) {
        this.visual = {};
        this.visual.mesh = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
        this.visual.mesh.userData.node = this;
        this.visual.mesh.position.set(coordX, coordY, coordZ);
        this.data = {};
        this.data.support = support;
        this.data.position = new THREE.Vector3(coordX, coordY, coordZ);
        this.data.loads = {};
    }
    addLoad(load, replace) {
        if (replace || !this.data.loads[load.loadCase])
            this.data.loads[load.loadCase] = load;
        else
            this.data.loads[load.loadCase].value += load.value;
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