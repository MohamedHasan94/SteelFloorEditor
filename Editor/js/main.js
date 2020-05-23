//https://threejsfundamentals.org/threejs/lessons/threejs-picking.html

(function () {
    //#region  Shared variables
    let camera, renderer, scene, pickingScene;
    let grids, axes; //why do you need (axes) variable
    let orbitControls;
    let directionalLight;
    let lightposition = [0, 5, 3];
    let nodes = [], secNodes = [], myGrid = [];
    let mainBeams, secondaryBeams;
    let canvas;
    const pickPosition = { x: 0, y: 0 };
    const pickHelper = new GPUPickHelper();
    window.id = 0, window.idToObject = [];
    let draw = false, drawingPoints = [];
    let loadGroup;
    //#endregion

    function init() {
        //#region 1- Creating Scene
        scene = new THREE.Scene();

        pickingScene = new THREE.Scene();
        pickingScene.background = new THREE.Color(0);
        //#endregion

        loadGroup = new THREE.Group();
        scene.add(loadGroup);
        scene.userData.loads = loadGroup;
        //#region 2-Creating  perspective camera
        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 50000); //2-Creating camera
        camera.position.set(0, 35, 70);
        camera.lookAt(scene.position); //looks at origin(0,0,0)
        //#endregion


        //#region Creating renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setClearColor(0xdddddd); //setting color of canvas
        renderer.setSize(window.innerWidth, window.innerHeight); //setting width and height of canvas
        document.body.appendChild(renderer.domElement); //append canvas tag to html
        canvas = renderer.domElement;
        //#endregion

        //#region Light
        directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(lightposition[0], lightposition[1], lightposition[2]);
        scene.add(directionalLight);
        //#endregion

        //#region Creating Axess
        axes = new THREE.AxesHelper(1);
        axes.position.set(-10, 0, 10);
        axes.scale.set(5, 5, 5);
        scene.add(axes);
        //#endregion

        //#region Show form
        $('#exampleModal').modal('show');
        //#endregion

        //#region Orbit controls
        orbitControls = new THREE.OrbitControls(camera, renderer.domElement); //renderer.domElement is the canvas
        //#endregion
    }

    $('#createGrids').click(function () {
        $('#exampleModal').modal('hide');
        let noInX, spaceX, noInZ, spaceZ, secSpacing, coordX, coordZ;
        [noInX, spaceX] = $('#spaceX').val().split('*').map(s => parseFloat(s));
        [noInZ, spaceZ] = $('#spaceZ').val().split('*').map(s => parseFloat(s));
        [coordX, coordZ] = getPoints(noInX, spaceX, noInZ, spaceZ); //Get coordinates from spacings
        secSpacing = parseFloat($('#secSpace').val());
        let editGrids = false;
        if (grids) { //Check if it is editing or creating
            scene.remove(nodes);
            scene.remove(grids.linesInX);
            scene.remove(grids.linesInZ);
            editGrids = true;
        }
        myGrid = new Grid(scene, coordX, coordZ, coordX.length, coordZ.length);
        let deadLoad = (parseFloat($('#dead').val()));
        let liveLoad = (parseFloat($('#live').val()));
        //nodes = createNodes(scene, pickingScene, coordX, coordZ);
        if (!editGrids) {
            let mainNodes;
            [mainBeams, secondaryBeams, mainNodes, secNodes] = generateBeams(scene, pickingScene, coordX, coordZ, 'IPE 300', 'IPE 200',
                secSpacing, deadLoad, liveLoad);
            nodes = mainNodes.concat(secNodes);
        }
    })

    //Turn spacings into coordinates
    function getPoints(noInX, spaceX, noInZ, spaceZ) {
        let coordX = [], coordZ = [], coord = 0;
        for (let i = 0; i < noInX + 1; i++) {
            coordX[i] = coord;
            coord += spaceX;
        }
        coord = 0;
        for (let i = 0; i < noInZ + 1; i++) {
            coordZ[i] = coord;
            coord += spaceZ;
        }
        return [coordX, coordZ];
    }
    //Edit the grids and nodes after creation
    window.editGrids = function () {
        $('#spaceX').val(coordX.join());
        $('#spaceZ').val(coordZ.join());
        $('#exampleModal').modal('show');
    }

    // function update() {
    // }

    function getCanvasRelativePosition(event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * canvas.width / rect.width,
            y: (event.clientY - rect.top) * canvas.height / rect.height,
        };
    }

    function setPickPosition(event) {
        const pos = getCanvasRelativePosition(event);
        pickPosition.x = pos.x;
        pickPosition.y = pos.y;
    }

    function loop() {
        requestAnimationFrame(loop);
        //update();
        renderer.render(scene, camera);
    }

    init();
    loop();

    canvas.addEventListener('mousemove', function () {
        setPickPosition(event);
        pickHelper.pick(pickPosition, renderer, pickingScene, camera);
    });

    canvas.addEventListener('click', function (event) {
        setPickPosition(event);
        pickHelper.select(pickPosition, renderer, pickingScene, camera);
        debugger
        if (draw) {
            if (pickHelper.selectedObject && pickHelper.selectedObject.geometry instanceof THREE.SphereBufferGeometry) {
                drawingPoints.push(pickHelper.selectedObject.userData.node)
                //pickHelper.selectedObject = null;
                drawingPoints[0].visual.mesh.material.color.setHex(0xcc0000);
                if (drawingPoints.length === 2) {
                    let section = 'IPE 500';

                    drawBeamByTwoPoints(scene, pickingScene, section, drawingPoints[0], drawingPoints[1]);
                    drawingPoints[0].visual.mesh.material.color.setHex(0xffcc00);
                    pickHelper.unselect();
                    drawingPoints = [];
                    draw = false;
                }
            }
        }
    });

    window.addEventListener('keyup', function (event) {
        //if (pickHelper.selectedObject) {
        let displacement;
        switch (event.key) {
            case 'Delete':
                scene.remove(pickHelper.selectedObject);
                pickHelper.selectedObject.geometry.dispose();
                pickHelper.selectedObject.material.dispose();
                let index = mainBeams.indexOf(pickHelper.selectedObject.userData.beam);
                if (index !== -1) mainBeams.splice(index, 1);
                else { index = secondaryBeams.indexOf(pickHelper.selectedObject.userData.beam); secondaryBeams.splice(index, 1); }
                pickingScene.remove(pickHelper.selectedObject.userData.picking)
                pickHelper.selectedObject.userData.picking.geometry.dispose();
                pickHelper.selectedObject.userData.picking.material.dispose();
                pickHelper.selectedObject = null;
                // nodes.nodeGroup.remove(pickHelper.selectedObject);
                break;

            case 'm':
                displacement = new THREE.Vector3(parseFloat($('#x').val()) || 0, parseFloat($('#y').val()) || 0, parseFloat($('#z').val()) || 0)
                pickHelper.selectedObject.position.add(displacement);
                pickHelper.selectedObject.userData.beam.move(displacement);
                pickHelper.selectedObject.userData.picking.position.copy(pickHelper.selectedObject.position)
                break;

            case 'c':
                displacement = new THREE.Vector3(parseFloat($('#x').val()) || 0, parseFloat($('#y').val()) || 0, parseFloat($('#z').val()) || 0)
                let object, pickingObject;
                if (pickHelper.selectedObject.userData.beam) {
                    object = new Beam(pickHelper.selectedObject.userData.beam.section,
                        pickHelper.selectedObject.userData.beam.data.startPoint.clone(),
                        pickHelper.selectedObject.userData.beam.data.endPoint.clone(),
                        pickHelper.selectedObject.userData.beam.visual.unusedMesh.geometry.parameters.shapes.clone(),
                        pickHelper.selectedObject.material.clone(), pickHelper.selectedObject.userData.beam.visual.unusedMesh.material);
                    object.move(displacement)
                    scene.add(object.visual.mesh)
                }
                else {
                    object = new Node(pickHelper.selectedObject.position, ++id);
                    nodes.nodeGroup.add(object.mesh);
                    nodes.push(object);
                }
                object.visual.mesh.position.add(displacement);
                idToObject[++id] = object.visual;
                pickingObject = new PickingObject(object, id);
                pickingScene.add(pickingObject.mesh);
                break;

            case 'd':
                debugger
                draw = draw ? false : true;
                break;
        }
        //}
    });

    window.toggle = function () {
        for (let i = 0; i < scene.children.length; i++) {
            if (scene.children[i].userData.beam/*scene.children[i].material && scene.children[i].userData.beam*/) {
                scene.children[i].userData.beam.visual.temp = scene.children[i];

                scene.children[i].userData.beam.visual.unusedMesh.position.copy(scene.children[i].position)
                scene.children[i].userData.beam.visual.unusedMesh.rotation.copy(scene.children[i].rotation)

                scene.children[i] = scene.children[i].userData.beam.visual.unusedMesh;
                scene.children[i].userData.beam.visual.mesh = scene.children[i];

                scene.children[i].userData.beam.visual.unusedMesh = scene.children[i].userData.beam.visual.temp;
            }
        }
    }

    window.dead = function () {
        let deadLoad = new LineLoad('dead', 1.5);
        secondaryBeams.forEach(b => {
            b.addLoad(deadLoad, true);
            loadGroup.add(deadLoad.render(b))
        });
    }

    window.live = function () {
        let liveLoad = new LineLoad('live', 2);
        secondaryBeams.forEach(b => {
            b.addLoad(liveLoad, true);
            loadGroup.add(liveLoad.render(b))
        });
    }

    window.addLoad = function () {
        let replace = $('#replace').prop('checked');;
        let load = new LineLoad('live', parseFloat($('#load').val()));
        if (pickHelper.selectedObject) {
            debugger
            pickHelper.selectedObject.userData.beam.addLoad(load, replace);
            hideLoads();
            loadGroup.add(pickHelper.selectedObject.userData.beam.data.loads[load.loadCase].render(pickHelper.selectedObject.userData.beam))
        }
        else {
            this.alert('Please Select an object');
        }
    }

    window.hideLoads = function () {
        for (let i = 0; i < loadGroup.children.length; i++) {
            if (!loadGroup.children[i].children) {
                loadGroup.children[i].geometry.dispose();
                loadGroup.children[i].material.dispose();
            } else {
                loadGroup.children[i].children.forEach(c => {
                    c.geometry.dispose();
                    c.material.dispose();
                })
            }
        }
        loadGroup.children = [];
    }

    window.showLoads = function () {
        let loadCase = $('#loadCase').val();
        hideLoads();
        secondaryBeams.forEach(b => {
            if ((b.data.loads[loadCase]))
                loadGroup.add((b.data.loads[loadCase]).render(b))
        })
        mainBeams.forEach(b => {
            if ((b.data.loads[loadCase]))
                loadGroup.add((b.data.loads[loadCase]).render(b))
        })
        nodes.forEach(n => {
            if ((n.data.loads[loadCase]))
                loadGroup.add((n.data.loads[loadCase]).render(n.visual.mesh.position))
        })
    }

    window.addPointLoad = function () {
        let replace = $('#replace').prop('checked');
        let pointLoad = new PointLoad('live', parseFloat($('#pointLoad').val()));
        if (pickHelper.selectedObject) {
            hideLoads();
            pickHelper.selectedObject.userData.node.addLoad(pointLoad, replace);
            loadGroup.add(pickHelper.selectedObject.userData.node.data.loads[pointLoad.loadCase].render(pickHelper.selectedObject.position.clone()))
        }
        else {
            this.alert('Please Select an object');
        }
    }

    window.changeSection = function () {
        if (pickHelper.selectedObject.userData.beam)
            pickHelper.selectedObject.userData.beam.changeSection($('#section').val());
            else
            this.alert('Please select an element first')
    }
})();