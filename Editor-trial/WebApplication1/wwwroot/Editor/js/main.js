//https://threejsfundamentals.org/threejs/lessons/threejs-picking.html

(function () {
    //#region  Shared variables
    let editor;
    let nodes, grids;
    let columns, mainBeams, secondaryBeams, sections = [];
    let canvas;
    const pickPosition = { x: 0, y: 0 };
    let draw = false, drawingPoints = [];
    //#endregion

    function init() {
        editor = new Editor(); //Instantiate editor
        editor.init(); //Setup editor
        canvas = editor.renderer.domElement;
        document.body.appendChild(canvas); //Append the canvas to the Html body

        $('#exampleModal').modal('show'); //Temporary data input
    }

    $('#createGrids').click(function () {
        $('#exampleModal').modal('hide');
        let noInX, spaceX, noInZ, spaceZ, secSpacing, coordX, coordZ, height;
        [noInX, spaceX] = $('#spaceX').val().split('*').map(s => parseFloat(s)); //No. and spacing between grids in x-direction
        [noInZ, spaceZ] = $('#spaceZ').val().split('*').map(s => parseFloat(s)); //No. and spacing between grids in Z-direction
        height = parseFloat($('#height').val()); //Storey height
        [coordX, coordZ] = getPoints(noInX, spaceX, noInZ, spaceZ); //Get coordinates from spacings
        secSpacing = parseFloat($('#secSpace').val()); //Spacing between secondary beams
        let editGrids = false;
        // if (grids) { //Check if it is editing or creating
        //     scene.remove(nodes);
        //     scene.remove(grids.linesInX);
        //     scene.remove(grids.linesInZ);
        //     editGrids = true;
        // }
        grids = new Grid(coordX, coordZ, coordX.length, coordZ.length, 3); //Create grids
        editor.addToGroup(grids.linesInX, 'grids'); //Add x-grids to scene (as a group)
        editor.addToGroup(grids.linesInZ, 'grids'); //Add z-grids to scene (as a group)
        if (!editGrids) {
            let mainNodes, secNodes, lowerNodes;
            [mainBeams, secondaryBeams, mainNodes, secNodes] = generateBeams(editor, coordX, height, coordZ, "s2", "s1",
                'IPE 270', 'IPE 200', secSpacing); //Auto generate floor beams and nodes 
            [columns, lowerNodes] = generateColumns(editor, coordX, 0, coordZ, mainNodes, 'IPE 360', "s3"); //Auto generate columns
            nodes = mainNodes.concat(secNodes);
            nodes = lowerNodes.concat(nodes);
        }
        sections.push({ $id: "s1", name: 'IPE 200' }, { $id: "s2", name: 'IPE 270' }, { $id: "s3", name: 'IPE 360' });
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

    function setPickPosition(event) { //get the mouse position relative to the canvas (not the screen)
        const rect = canvas.getBoundingClientRect();
        //GPUPicker reads the pixels from the top left corner of the canvas
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
                drawingPoints.push(editor.picker.selectedObject.userData.node);
                drawingPoints[0].visual.mesh.material.color.setHex(0xcc0000); //Highlight the first node
                if (drawingPoints.length === 2) {
                    let element;
                    if (drawingPoints[0].data.position.x == drawingPoints[1].data.position.x &&
                        drawingPoints[0].data.position.z == drawingPoints[1].data.position.z) { //Check if the element is vertical(column)
                        element = drawColumnByTwoPoints('IPE 500', drawingPoints[0], drawingPoints[1]);
                        columns.push(element);
                    }
                    else {//Element is not vertical (Beam)
                        element = drawBeamByTwoPoints('IPE 500', drawingPoints[0], drawingPoints[1]);
                        secondaryBeams.push(element);
                    }
                    editor.addToGroup(element.visual.mesh, 'elements');
                    editor.createPickingObject(element);
                    drawingPoints[0].visual.mesh.material.color.setHex(0xffcc00); //Restore the first node color
                    editor.picker.unselect(); // Unselect the second node
                    drawingPoints = [];
                }
            }
        }
    });

    window.addEventListener('keyup', function (event) {
        switch (event.key) {
            case 'Delete':
                if (editor.picker.selectedObject) {
                    if (editor.picker.selectedObject.userData.element instanceof Beam) {
                        editor.removeFromGroup(editor.picker.selectedObject, 'elements');
                        let index = mainBeams.indexOf(editor.picker.selectedObject.userData.element);
                        if (index !== -1) mainBeams.splice(index, 1);
                        else {
                            index = secondaryBeams.indexOf(editor.picker.selectedObject.userData.element);
                            secondaryBeams.splice(index, 1);
                        }
                    }
                    else if (editor.picker.selectedObject.userData.element instanceof Column) {
                        editor.removeFromGroup(editor.picker.selectedObject, 'elements');
                        let index = columns.indexOf(editor.picker.selectedObject.userData.element);
                        columns.splice(index, 1);
                    }
                    else {
                        editor.removeFromGroup(editor.picker.selectedObject, 'nodes');
                        let index = nodes.indexOf(editor.picker.selectedObject.userData.node)
                        nodes.splice(index, 1);
                    }
                    editor.picker.selectedObject = null;
                }
                break;

            case 'm':
                if (editor.picker.selectedObject && editor.picker.selectedObject.userData.element) {
                    let displacement = new THREE.Vector3(parseFloat($('#x').val()) || 0, parseFloat($('#y').val()) || 0, parseFloat($('#z').val()) || 0)
                    editor.picker.selectedObject.userData.element.move(displacement);
                    let newStartPosition = editor.picker.selectedObject.position;
                    let newEndPosition = editor.picker.selectedObject.userData.element.data.endPoint;

                    //Check if nodes already exist at the new position or create new ones.
                    getElementNodes(newStartPosition, newEndPosition, editor.picker.selectedObject.userData.element);
                    editor.picker.selectedObject.userData.picking.position.copy(newStartPosition);
                }
                break;

            case 'c':
                if (editor.picker.selectedObject && editor.picker.selectedObject.userData.element) {
                    let displacement = new THREE.Vector3(parseFloat($('#x').val()) || 0, parseFloat($('#y').val()) || 0, parseFloat($('#z').val()) || 0)
                    let element = editor.picker.selectedObject.userData.element.clone();
                    element.move(displacement);

                    let newStartPosition = element.data.startPoint;
                    let newEndPosition = element.data.endPoint;

                    //Check if nodes already exist at the new position or create new ones.
                    getElementNodes(newStartPosition, newEndPosition, element);

                    if (element instanceof Beam)
                        secondaryBeams.push(element);
                    else
                        columns.push(element);

                    editor.addToGroup(element.visual.mesh, 'elements');
                    editor.createPickingObject(element);
                }
                break;

            case 'd':
                draw = draw ? false : true;
                break;
        }
    });

    function getElementNodes(newStartPosition, newEndPosition, element) {
        //Search for the new nodes in the existing nodes
        let newStartNode = nodes.find(n => n.data.position.equals(newStartPosition));
        let newEndNode = nodes.find(n => n.data.position.equals(newEndPosition));

        if (!newStartNode) { //If it doesn't exist create one
            newStartNode = new Node(newStartPosition.x, newStartPosition.y, newStartPosition.z);
            nodes.push(newStartNode);
            editor.addToGroup(newStartNode.visual.mesh, 'nodes');
            editor.createPickingObject(newStartNode)
        }
        if (!newEndNode) {//If it doesn't exist create one
            newEndNode = new Node(newEndPosition.x, newEndPosition.y, newEndPosition.z);
            nodes.push(newEndNode);
            editor.addToGroup(newEndNode.visual.mesh, 'nodes');
            editor.createPickingObject(newEndNode)
        }

        element.data.startNode = { "$ref": newStartNode.data.$id };
        element.data.endNode = { "$ref": newEndNode.data.$id };
    }

    window.toggle = function () {
        editor.toggleBeams();
    }

    window.dead = function () {
        let deadLoad = new LineLoad('dead', 1.5);
        editor.clearGroup('loads');
        debugger
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
        if (editor.picker.selectedObject.userData.element instanceof Beam) {
            debugger
            let beam = editor.picker.selectedObject.userData.element;
            beam.addLoad(load, replace);
            console.log(beam.data);
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
        if (editor.picker.selectedObject.userData.element) {
            let newSection = $('#section').val();
            let existingSection = sections.find(s => s.name == newSection);
            if (!existingSection) {
                existingSection = { $id: `s${sections.length}`, name: newSection };
                sections.push(existingSection);
            }
            editor.picker.selectedObject.userData.element.changeSection(newSection);
        }
        else
            this.alert('Please select an element first')
    }

    window.addNodeToBeam = function () {
        debugger
        if (editor.picker.selectedObject && editor.picker.selectedObject.userData.element instanceof Beam) {
            let element = editor.picker.selectedObject.userData.element;
            let distances = $('#nodeToBeam').val().split(',');
            for (var i = 0; i < distances.length; i++) {
                let displacement = element.visual.direction.clone().multiplyScalar(parseFloat(distances[i]));
                let nodePosition = element.data.startPoint.clone().add(displacement);
                let node = new Node(nodePosition.x, nodePosition.y, nodePosition.z);
                element.data.innerNodes.push({ "$ref": node.data.$id });
                nodes.push(node);
                editor.addToGroup(node.visual.mesh, 'nodes');
                editor.createPickingObject(node);
            }
        }
    }

    window.createNode = function () {
        let coordX = parseFloat($('#nodeXCoord').val());
        let coordY = parseFloat($('#nodeYCoord').val());
        let coordZ = parseFloat($('#nodeZCoord').val());
        let node = new Node(coordX, coordY, coordZ);
        let beam = getIntersectedBeam(node.data.position.clone()); //Beam mesh
        if (beam && beam.userData.element instanceof Beam) {
            beam = beam.userData.element; //Beam object
            let index = secondaryBeams.indexOf(beam);
            if (index > -1) { // the beam is secondary , switch it to main 
                secondaryBeams.splice(index, 1);
                mainBeams.push(beam);
            }

            beam.data.innerNodes.push({ "$ref": node.data.$id }); //Add the node to the beam inner nodes
        }
        nodes.push(node);
        editor.addToGroup(node.visual.mesh, 'nodes');
        editor.createPickingObject(node);
    }

    function getIntersectedBeam(position) {
        let widthHalf = window.innerWidth / 2, heightHalf = window.innerHeight / 2;

        position.project(editor.camera); //Project the 3D world position on the screen
        //The resulting position is between[-1,1] WebGl coordinates with the origin at the screen center
        //Switch position to screen position with the origin at the top left corner
        position.x = (position.x * widthHalf) + widthHalf;
        position.y = - (position.y * heightHalf) + heightHalf;
        //Read the position using the GPUPicker
        return editor.picker.getObject(position, editor.renderer, editor.pickingScene, editor.camera, editor.idToObject);
    }

    window.send = function () {
        let js = { nodes: [], sections : [], secondaryBeams: [], sections, mainBeams: [], columns : []};
        for (var i = 0; i < nodes.length; i++) {
            js.nodes.push(nodes[i].data);
        }

        js.sections = sections;

         for (var i = 0; i < secondaryBeams.length; i++) {
             js.secondaryBeams.push(secondaryBeams[i].data);
         }

        for (var i = 0; i < mainBeams.length; i++) {
            js.mainBeams.push(mainBeams[i].data);
        }

        for (var i = 0; i < columns.length; i++) {
            js.columns.push(columns[i].data);
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
                console.log(res)
            },
            error: function (x, y, res) {
                console.log(res)
            }

        });
    }

    window.save = function () {
        let js = { nodes: [], sections : [], secondaryBeams: [], mainBeams: [], columns : [] };
        for (var i = 0; i < nodes.length; i++) {
            js.nodes.push(nodes[i].data);
        }

        js.sections = sections;


        for (var i = 0; i < secondaryBeams.length; i++) {
            js.secondaryBeams.push(secondaryBeams[i].data);
        }

        for (var i = 0; i < mainBeams.length; i++) {
            js.mainBeams.push(mainBeams[i].data);
        }

        for (var i = 0; i < columns.length; i++) {
            js.columns.push(columns[i].data);
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