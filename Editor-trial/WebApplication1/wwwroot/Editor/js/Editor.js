//controllers & commands
function pickingObject(object, id) { //The object in picking scene used to pick the original object (GPU Picking)
    let material = new THREE.LineBasicMaterial({ color: new THREE.Color(id) });
    let mesh = new THREE.Line(object.visual.mesh.geometry, material);
    mesh.position.copy(object.visual.mesh.position);
    mesh.rotation.copy(object.visual.mesh.rotation);
    object.visual.mesh.userData.picking = mesh; // The object has a reference to its picking object
    return mesh;
}

class Editor {
    constructor() {
        this.scene = new THREE.Scene();
        this.pickingScene = new THREE.Scene();
        this.picker = new GPUPickHelper();
        this.pickingScene.background = new THREE.Color(0);
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 5000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('canvas') });
        this.id = 0;
        this.idToObject = [];
        this.canvas;
    }
    init() {
        //#region Creating camera
        this.camera.position.set(0, 35, 70);
        this.camera.lookAt(this.scene.position); //looks at origin(0,0,0)
        //#endregion

        //#region Renderer
        this.renderer.setClearColor(0xdddddd); //setting color of canvas
        this.canvas = this.renderer.domElement;
        this.renderer.setSize(window.innerWidth, window.innerHeight); //setting width and height of canvas(canvas.width, canvas.height)
        //document.body.appendChild(this.canvas); //append canvas tag to html
        //#endregion

        //#region Controls
        let orbitControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        orbitControls.mouseButtons = { // Set the functions of mouse buttons
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.PAN,
            RIGHT: THREE.MOUSE.DOLLY
        };
        //#endregion

        //#region Light
        let directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(0, 5, 3);
        this.scene.add(directionalLight);
        //#endregion

        //#region Creating Axess
        let axes = new THREE.AxesHelper(5);
        axes.position.set(-10, 0, 10);
        this.scene.add(axes);
        //#endregion

        //Collect similar objects in groups
        this.scene.userData.elements = new THREE.Group();
        this.scene.add(this.scene.userData.elements);
        // this.scene.userData.columns = new THREE.Group();
        // this.scene.add(this.scene.userData.columns);
        this.scene.userData.nodes = new THREE.Group();
        this.scene.add(this.scene.userData.nodes);
        this.scene.userData.grids = new THREE.Group();
        this.scene.add(this.scene.userData.grids);
        this.scene.userData.loads = new THREE.Group();
        this.scene.add(this.scene.userData.loads);
        this.loop();
    }
    loop() {
        let self = this;
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(() => this.loop());
    }
    addToGroup(object, type) {
        this.scene.userData[type].add(object);
    }
    removeFromGroup(object, type) {
        this.scene.userData[type].remove(object);
        object.geometry.dispose();
        object.material.dispose();
        if (object.userData.picking) {
            this.pickingScene.remove(object.userData.picking)
            object.userData.picking.material.dispose();
            object.userData.picking.geometry.dispose();
        }
    }
    addToScene(object) {
        this.scene.add(object);
    }
    removeFromScene(object) {
        this.scene.remove(object);
        object.geometry.dispose();
        object.material.dispose();
    }
    createPickingObject(object) {
        this.pickingScene.add(pickingObject(object, ++this.id));
        this.idToObject[this.id] = object.visual;
    }
    toggleBeams() {
        let elements = this.scene.userData.elements;
        let length = elements.children.length;
        let visual;
        for (let i = 0; i < length; i++) {
            visual = elements.children[i].userData.element.visual;
            visual.temp = elements.children[i];

            visual.unusedMesh.position.copy(elements.children[i].position)
            visual.unusedMesh.rotation.copy(elements.children[i].rotation)

            elements.children[i] = visual.unusedMesh;
            visual.mesh = elements.children[i];

            visual.unusedMesh = visual.temp;
        }
    }
    setPickPosition(event) { //get the mouse position relative to the canvas (not the screen)
        const rect = this.canvas.getBoundingClientRect();
        //GPUPicker reads the pixels from the top left corner of the canvas
        return {
            x: (event.clientX - rect.left) * this.canvas.width / rect.width,
            y: (event.clientY - rect.top) * this.canvas.height / rect.height
        };
    }
    pick(event) {
        this.picker.pick(this.setPickPosition(event), this.renderer, this.pickingScene, this.camera, this.idToObject);
    }
    select(event) {
        this.picker.select(this.setPickPosition(event), this.renderer, this.pickingScene, this.camera, this.idToObject);
    }
    selectByArea(initialPosition, finalPosition) {
        this.picker.getObjects(initialPosition, finalPosition, this.renderer, this.pickingScene, this.camera, this.idToObject)
    }
    clearGroup(group) {
        group = this.scene.userData[group];
        let length = group.children.length;
        for (let i = 0; i < length; i++) {
            if (!group.children[i].children) { //if the object has its own children
                group.children[i].geometry.dispose();
                group.children[i].material.dispose();
            }
            else {
                group.children[i].children.forEach(c => {
                    c.material.dispose();
                    c.geometry.dispose();
                })
            }
        }
        group.children = [];
    }
}