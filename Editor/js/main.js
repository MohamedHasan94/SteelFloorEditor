//https://threejsfundamentals.org/threejs/lessons/threejs-picking.html

(function () {
    //#region  Shared variables
    let editor;
    //let grids, axes; //why do you need (axes) variable
    let nodes = [], secNodes = [], grids;
    let mainBeams, secondaryBeams;
    let canvas;
    const pickPosition = { x: 0, y: 0 };
    //const pickHelper = new GPUPickHelper();
    let draw = false, drawingPoints = [];
    let loadGroup;
    //#endregion

    function init() {

        editor = new Editor();
        editor.init();
        canvas = editor.renderer.domElement;
        document.body.appendChild(canvas);
        // //#region Show form
        $('#exampleModal').modal('show');
        // //#endregion

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
        grids = new Grid(coordX, coordZ, coordX.length, coordZ.length, 3);
        editor.addToGroup(grids.linesInX, 'grids');
        editor.addToGroup(grids.linesInZ, 'grids');
        if (!editGrids) {
            let mainNodes;
            [mainBeams, secondaryBeams, mainNodes, secNodes] = generateBeams(editor, coordX, coordZ, 'IPE 300', 'IPE 200',
                secSpacing);
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

    function setPickPosition(event) {
        const rect = canvas.getBoundingClientRect();
        pickPosition.x = (event.clientX - rect.left) * canvas.width / rect.width;
        pickPosition.y = (event.clientY - rect.top) * canvas.height / rect.height;
    }

    init();

    canvas.addEventListener('mousemove', function () {
        setPickPosition(event);
        editor.pick(pickPosition);
    });

    canvas.addEventListener('click', function (event) {
        setPickPosition(event);
        editor.select(pickPosition);
        if (draw) {
            if (editor.picker.selectedObject && editor.picker.selectedObject.geometry instanceof THREE.SphereBufferGeometry) {
                drawingPoints.push(editor.picker.selectedObject.userData.node)
                drawingPoints[0].visual.mesh.material.color.setHex(0xcc0000);
                if (drawingPoints.length === 2) {
                    let beam = drawBeamByTwoPoints('IPE 500', drawingPoints[0], drawingPoints[1]);
                    editor.addToGroup(beam.visual.mesh, 'beams');
                    editor.createPickingObject(beam);
                    secondaryBeams.push(beam);
                    drawingPoints[0].visual.mesh.material.color.setHex(0xffcc00);
                    editor.picker.unselect();
                    drawingPoints = [];
                    draw = false;
                }
            }
        }
    });

    window.addEventListener('keyup', function (event) {
        switch (event.key) {
            case 'Delete':
                if (editor.picker.selectedObject) {
                    if (editor.picker.selectedObject.userData.beam) {
                        editor.removeFromGroup(editor.picker.selectedObject, 'beams');
                        let index = mainBeams.indexOf(editor.picker.selectedObject.userData.beam);
                        if (index !== -1) mainBeams.splice(index, 1);
                        else { index = secondaryBeams.indexOf(editor.picker.selectedObject.userData.beam); secondaryBeams.splice(index, 1); }
                    }
                    else {
                        editor.removeFromGroup(editor.picker.selectedObject, 'nodes');
                        let index = nodes.indexOf(editor.picker.selectedObject.userData.node)
                        nodes.splice(index,1);
                    }
                    editor.picker.selectedObject = null;
                }
                break;

            case 'm':
                if (editor.picker.selectedObject) {
                    let displacement = new THREE.Vector3(parseFloat($('#x').val()) || 0, parseFloat($('#y').val()) || 0, parseFloat($('#z').val()) || 0)
                    editor.picker.selectedObject.userData.beam.move(displacement);
                    let newStartPosition = editor.picker.selectedObject.position;
                    let newEndPosition = editor.picker.selectedObject.userData.beam.data.endPoint;
                    //Assigns the new nodes of the beam(Check if they already exist or create them)
                    getBeamNodes(newStartPosition, newEndPosition, editor.picker.selectedObject.userData.beam);
                    editor.picker.selectedObject.userData.picking.position.copy(newStartPosition);
                }
                break;

            case 'c':
                if (editor.picker.selectedObject && editor.picker.selectedObject.userData.beam) {
                    let displacement = new THREE.Vector3(parseFloat($('#x').val()) || 0, parseFloat($('#y').val()) || 0, parseFloat($('#z').val()) || 0)
                    let beam = editor.picker.selectedObject.userData.beam.clone();
                    beam.move(displacement);
                    editor.addToGroup(beam.visual.mesh, 'beams');
                    secondaryBeams.push(beam);

                    let newStartPosition = editor.picker.selectedObject.position;
                    let newEndPosition = editor.picker.selectedObject.userData.beam.data.endNode.data.position.clone().add(displacement);
                    //Assigns the new nodes of the beam(Check if they already exist or create them)
                    getBeamNodes(newStartPosition, newEndPosition, beam);

                    editor.createPickingObject(beam);
                }
                break;

            case 'd':
                draw = draw ? false : true;
                break;
        }
        //}
    });

    function getBeamNodes(newStartPosition, newEndPosition, beam) {
        //Search for the newStartNode in the existing nodes
        let newStartNode = nodes.find(n => n.data.position.x == newStartPosition.x && n.data.position.y == newStartPosition.y && n.data.position.z == newStartPosition.z)
        //Search for the newEndNode in the existing nodes
        let newEndNode = nodes.find(n => n.data.position.x == newEndPosition.x && n.data.position.y == newEndPosition.y && n.data.position.z == newEndPosition.z)

        if (!newStartNode) { //If it doesn't exist create one
            newStartNode = new Node(newPosition.x, newPosition.y, newPosition.z);
            nodes.push(newStartNode);
            editor.addToGroup(newStartNode.visual.mesh, 'nodes');
        }
        if (!newEndNode) {//If it doesn't exist create one
            newEndNode = new Node(newEndPosition.x, newEndPosition.y, newEndPosition.z);
            nodes.push(newEndNode);
            editor.addToGroup(newEndNode.visual.mesh, 'nodes');
        }

        beam.data.startNode = { "$ref": newStartNode.data.$id };
        beam.data.endNode = { "$ref": newEndNode.data.$id };
    }

    window.toggle = function () {
        editor.toggleBeams();
    }

    window.dead = function () {
        let deadLoad = new LineLoad('dead', 1.5);
        editor.clearGroup('loads');
        secondaryBeams.forEach(b => {
            b.addLoad(deadLoad, true);
            editor.addToGroup(deadLoad.render(b), 'loads');
        });
    }

    window.live = function () {
        let liveLoad = new LineLoad('live', 2);
        editor.clearGroup('loads');
        secondaryBeams.forEach(b => {
            b.addLoad(liveLoad, true);
            editor.addToGroup(liveLoad.render(b), 'loads');
        });
    }

    window.addLoad = function () {
        let replace = $('#replace').prop('checked');;
        let load = new LineLoad('live', parseFloat($('#load').val()));
        if (editor.picker.selectedObject.userData.beam) {
            let beam = editor.picker.selectedObject.userData.beam;
            beam.addLoad(load, replace);
            editor.clearGroup('loads');
            editor.addToGroup(beam.data.loads[load.loadCase].render(beam), 'loads')
        }
        else {
            this.alert('Please Select an object');
        }
    }

    window.hideLoads = function () {
        editor.clearGroup('loads');
    }

    window.showLoads = function () {
        let loadCase = $('#loadCase').val();
        editor.clearGroup('loads');
        secondaryBeams.forEach(b => {
            if ((b.data.loads[loadCase]))
                editor.addToGroup((b.data.loads[loadCase]).render(b), 'loads')
        })
        mainBeams.forEach(b => {
            if ((b.data.loads[loadCase]))
                editor.addToGroup((b.data.loads[loadCase]).render(b), 'loads')
        })
        nodes.forEach(n => {
            if ((n.data.loads[loadCase]))
                editor.addToGroup((n.data.loads[loadCase]).render(n.visual.mesh.position.clone()), 'loads')
        })
    }

    window.addPointLoad = function () {
        let replace = $('#replace').prop('checked');
        let pointLoad = new PointLoad('live', parseFloat($('#pointLoad').val()));
        if (editor.picker.selectedObject.userData.node) {
            let node = editor.picker.selectedObject.userData.node;
            editor.clearGroup('loads');
            node.addLoad(pointLoad, replace);
            editor.addToGroup(node.data.loads[pointLoad.loadCase].render(editor.picker.selectedObject.position.clone()), 'loads')
        }
        else {
            this.alert('Please Select an object');
        }
    }

    window.changeSection = function () {
        if (editor.picker.selectedObject.userData.beam)
            editor.picker.selectedObject.userData.beam.changeSection($('#section').val());
        else
            this.alert('Please select an element first')
    }

    window.createNode = function () {
        let coordX = parseFloat($('#nodeXCoord').val());
        let coordY = parseFloat($('#nodeYCoord').val());
        let coordZ = parseFloat($('#nodeZCoord').val());
        let node = new Node(coordX, coordY, coordZ);
        debugger
        let beam = getIntersectedBeam(node.data.position.clone());
        if (beam) {
            beam = beam.userData.beam;
            let index = secondaryBeams.indexOf(beam);
            if (index > -1) { // the beam is secondary , switch it to main 
                secondaryBeams.splice(index, 1);
                mainBeams.push(beam);
            }

            beam.data.innerNodes.push({ "$ref": node.data.$id }); //Add the node to the beam
        }
        nodes.push(node);
        editor.addToGroup(node.visual.mesh, 'nodes');
        editor.createPickingObject(node);

    }

    function getIntersectedBeam(position) {
        let widthHalf = window.innerWidth / 2, heightHalf = window.innerHeight / 2;

        position.project(editor.camera);
        position.x = (position.x * widthHalf) + widthHalf;
        position.y = - (position.y * heightHalf) + heightHalf;
        return editor.picker.getObject(position, editor.renderer, editor.pickingScene, editor.camera, editor.idToObject);
    }

    window.send = function(){
        let js = { nodes: [], secondaryBeams: [] , mainBeams :[]};
        for (var i = 0; i < nodes.length; i++) {
            js.nodes.push(nodes[i].data);
        }

        for (var i = 0; i < secondaryBeams.length; i++) {
            js.secondaryBeams.push(secondaryBeams[i].data);
        }

        for (var i = 0; i < mainBeams.length; i++) {
            js.mainBeams.push(mainBeams[i].data);
        }

        js = this.JSON.stringify(js);
        this.console.log(js);

        debugger
        $.ajax({
            url: `/Home/Solve`,
            type: "POST",
            contentType: 'application/json',
            data: js,
            success: function (res) {
                debugger
                console.log(res)
            },
            error: function (x, y, res) {
                console.log(res)
                debugger;
            }

        });
    }

    window.save = function () {
        let js = { nodes: [], secondaryBeams: [], mainBeams: [] };
        for (var i = 0; i < nodes.length; i++) {
            js.nodes.push(nodes[i].data);
        }

        for (var i = 0; i < secondaryBeams.length; i++) {
            js.secondaryBeams.push(secondaryBeams[i].data);
        }

        for (var i = 0; i < mainBeams.length; i++) {
            js.mainBeams.push(mainBeams[i].data);
        }

        js = this.JSON.stringify(js);
        this.console.log(js);

        debugger
        $.ajax({
            url: `/Home/Read`,
            type: "POST",
            contentType: 'text/plain',
            data: js,
            success: function (res) {
                debugger
                console.log(res)
            },
            error: function (x, y, res) {
                console.log(res)
                debugger;
            }

        });
    }
})();