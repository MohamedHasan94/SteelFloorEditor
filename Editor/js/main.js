//https://threejsfundamentals.org/threejs/lessons/threejs-picking.html

(function () {
    //#region  Shared variables
    let camera, renderer, scene, pickingScene;
    let grids, axes;
    let orbitControls;
    let directionalLight;
    let lightposition = [0, 5, 3];
    let nodes, myGrid;
    let mainBeams, secondaryBeams;
    let canvas;
    const pickPosition = { x: 0, y: 0 };
    const pickHelper = new GPUPickHelper();
    window.id = 0, window.idToObject = [];
    window.draw = false, drawingPoints = [];
    //clearPickPosition();
    //#endregion

    function init() {
        //#region 1- Creating Scene
        scene = new THREE.Scene();

        pickingScene = new THREE.Scene();
        pickingScene.background = new THREE.Color(0);
        //#endregion

        //#region 2-Creating  perspective camera
        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 50000); //2-Creating camera
        camera.position.set(0,35,70);
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

        //#region Creating Grids
        // grid = new THREE.GridHelper(1000, 20, 0x0000ff, 0x00ffff);
        // scene.add(grid);
        axes = new THREE.AxesHelper(1);

        scene.add(axes);

        //Grid(scene, spaceX, spaceZ, numberInX, numberInZ)
        $('#exampleModal').modal('show');
        //#endregion

        //#region Orbit controls
        orbitControls = new THREE.OrbitControls(camera, renderer.domElement); //renderer.domElement is the canvas
        //#endregion
    }

    $('#createGrids').click(function () {
        $('#exampleModal').modal('hide');
        let noInX, spaceX, noInZ, spaceZ, coordX, coordZ;
        [noInX, spaceX] = $('#spaceX').val().split('*').map(s => parseFloat(s));
        [noInZ, spaceZ] = $('#spaceZ').val().split('*').map(s => parseFloat(s));
        [coordX, coordZ] = getPoints(noInX, spaceX, noInZ, spaceZ); //Get coordinates from spacings
        let editGrids = false;
        if (grids) { //Check if it is editing or creating
            scene.remove(nodes);
            scene.remove(grids.linesInX);
            scene.remove(grids.linesInZ);
            editGrids = true;
        }
        myGrid = new Grid(scene, coordX, coordZ, coordX.length, coordZ.length);
        //nodes = createNodes(scene, pickingScene, coordX, coordZ);
        if (!editGrids) {
            [mainBeams, secondaryBeams] = generateBeams(scene, pickingScene, coordX, coordZ, 'IPE 300', 'IPE 200');
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

    function update() {
    }


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

    function clearPickPosition() {
        // unlike the mouse which always has a position
        // if the user stops touching the screen we want
        // to stop picking. For now we just pick a value
        // unlikely to pick something
        pickPosition.x = -100000;
        pickPosition.y = -100000;
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

    //canvas.addEventListener('mouseout', clearPickPosition);
    //canvas.addEventListener('mouseleave', clearPickPosition);
    canvas.addEventListener('click', function (event) {
        setPickPosition(event);
        pickHelper.select(pickPosition, renderer, pickingScene, camera);
        if (draw) {
            if (pickHelper.selectedObject && pickHelper.selectedObject.geometry instanceof THREE.SphereGeometry) {
                drawingPoints.push(pickHelper.selectedObject.position)
                pickHelper.unselect();
                if (drawingPoints.length === 2) {
                    drawBeamByTwoPoints(drawingPoints[0], drawingPoints[1]);
                    drawingPoints = [];
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
                pickingScene.remove(pickHelper.selectedObject.userData.picking)
                nodes.nodeGroup.remove(pickHelper.selectedObject);
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
                if (pickHelper.selectedObject.geometry instanceof THREE.ExtrudeGeometry) {
                    object = new Beam(pickHelper.selectedObject.userData.beam.section,
                        pickHelper.selectedObject.userData.beam.startPoint.clone(), pickHelper.selectedObject.userData.beam.endPoint.clone(),
                        pickHelper.selectedObject.geometry.parameters.shapes.clone(), pickHelper.selectedObject.material.clone());
                    object.move(displacement)
                    scene.add(object.mesh)
                }
                else {
                    object = new Node(pickHelper.selectedObject.position, ++id);
                    nodes.nodeGroup.add(object.mesh);
                    nodes.push(object);
                }
                object.mesh.position.add(displacement);
                idToObject[++id] = object.mesh;
                pickingObject = new PickingObject(object, id);
                pickingScene.add(pickingObject.mesh);
                break;

            case 'd':
                draw = draw ? false : true;
                break;
        }
        //}
    });
})();