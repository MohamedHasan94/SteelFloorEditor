//https://threejsfundamentals.org/threejs/lessons/threejs-picking.html

(function () {
    //#region  Shared variables
    let editor;
    let nodes = new Array(), grids;
    let columns = new Array(), mainBeams = new Array(), secondaryBeams = new Array(), sections = new Array();
    let canvas;
    let levels;
    let draw = false, drawingPoints = [];
    let sectionId = 0;
    //#endregion

    function init() {
        editor = new Editor(); //Instantiate editor
        editor.init(); //Setup editor
        canvas = editor.renderer.domElement;
        //document.body.appendChild(canvas); //Append the canvas to the Html body

        $('#exampleModal').modal('show'); //Temporary data input
    }

    $(document).ready();

    $("#manMode").click(function () { //Hide Auto mode data if Manual mode selected
        $("#autoModeData").fadeOut();
    });

    $("#autoMode").click(function () { //Show Auto mode data if Manual mode selected
        $("#autoModeData").fadeIn();
    });

    $('#createGrids').click(function () {
        $('#exampleModal').modal('hide');
        let secSpacing, coordX, coordZ;
        coordX = getCoords($('#spaceX').val()); //Get X-coordinates from X-spacings
        coordZ = getCoords($('#spaceZ').val()); //Get Z-coordinates from Z-spacings
        levels = coordY = getCoords($('#spaceY').val()); //Get Y-coordinates from Y-spacings
        //height = parseFloat($('#height').val()); //Storey height
        secSpacing = $('#secSpace').val().split(' ').map(s => parseFloat(s)); //Spacing between secondary beams
        //secSpacing = parseFloat($('#secSpace').val()); //Spacing between secondary beams

        //stories = parseFloat($('#stories').val()); //Stories no. 
        //coordY = getElevation(stories, height); //cummulative elevation 

        grids = new Grid(coordX, coordZ, coordX.length, coordZ.length, 3);
        editor.addToGroup(grids.linesInX, 'grids'); //Add x-grids to scene (as a group)
        editor.addToGroup(grids.linesInZ, 'grids'); //Add z-grids to scene (as a group)



        if (!document.getElementById("autoMode").checked) {
            mainNodes = createNodesZ(editor, coordX, coordZ);
            return mainNodes;
        }
        else {
            sections.push({ $id: `s${++sectionId}`, name: 'IPE 200' }, { $id: `s${++sectionId}`, name: 'IPE 270' }, { $id: `s${++sectionId}`, name: 'IPE 360' });
            let mainNodes = new Array(), mainBeamsLoop, secondaryBeamsLoop, mainNodesLoop, secNodesLoop;
            debugger
            if (document.getElementById("xOrient").checked) {


                //creating and adding the Hinged-Nodes to MainNodes Array
                lowerNodesIntial = createNodesZ(editor, coordX, coordZ);
                mainNodes.push(lowerNodesIntial);
                nodes = nodes.concat(lowerNodesIntial);

                for (let i = 1; i < coordY.length; i++) {

                    [mainBeamsLoop, secondaryBeamsLoop, mainNodesLoop, secNodesLoop] = generateMainBeamsX(editor, coordX, coordY[i], coordZ,
                        sections[1], sections[0], secSpacing); //Auto generate floor beams and nodes in X


                    nodesLoop = mainNodesLoop.concat(secNodesLoop);
                    nodes = nodes.concat(nodesLoop);
                    mainNodes.push(mainNodesLoop);

                    [columnsLoop] = generateColumnsZ(editor, coordX, coordZ, mainNodes[i - 1], mainNodes[i], sections[2]); //Auto generate columns


                    mainBeams.push(mainBeamsLoop);
                    secondaryBeams.push(secondaryBeamsLoop);
                    columns.push(columnsLoop);
                }
            }
            else {

                //creating and adding the Hinged-Nodes to MainNodes Array
                lowerNodesIntial = createNodesX(editor, coordX, coordZ);
                mainNodes.push(lowerNodesIntial);
                nodes = nodes.concat(lowerNodesIntial);

                for (let i = 1; i < coordY.length; i++) {
                    [mainBeamsLoop, secondaryBeamsLoop, mainNodesLoop, secNodesLoop] = generateMainBeamsZ(editor, coordX, coordY[i], coordZ,
                        sections[1], sections[0], secSpacing); //Auto generate floor beams and nodes in Z

                    nodesLoop = mainNodesLoop.concat(secNodesLoop);
                    nodes = nodes.concat(nodesLoop);
                    mainNodes.push(mainNodesLoop);

                    [columnsLoop] = generateColumnsX(editor, coordX, coordZ, mainNodes[i - 1], mainNodes[i], sections[2]); //Auto generate columns 


                    mainBeams.push(mainBeamsLoop);
                    secondaryBeams.push(secondaryBeamsLoop);
                    columns.push(columnsLoop);
                }
            }

            console.log(mainBeams, secondaryBeams, columns, nodes);
        }
    })

    //Turn spacings into coordinates
    function getCoords(input) {
        let coord = [], space, number, sum = 0;
        if (input.includes('*')) { //Equal spacing
            [number, space] = input.split('*').map(s => parseFloat(s));
        }
        else { //Variable spacing
            space = input.split(' ').map(s => parseFloat(s));
            number = space.length;
        }
        number++;
        for (var i = 0; i < number; i++) {
            coord[i] = sum;
            sum += space[i] ?? space;
        }
        return coord;
    }

    init();

    canvas.addEventListener('mousemove', function (event) {
        editor.pick(event);
    });

    /*canvas.addEventListener('click', function (event) {
        editor.select(event);
        if (draw) {
            if (editor.picker.selectedObject && editor.picker.selectedObject.geometry instanceof THREE.SphereBufferGeometry) {
                drawingPoints.push(editor.picker.selectedObject.userData.node);
                drawingPoints[0].visual.mesh.material.color.setHex(0xcc0000); //Highlight the first node
                if (drawingPoints.length === 2) {
                    let element;
                    let section = $('#drawSection').val();
                    let sectionObject = sections.find(s => s.name === section); //Check if section already exists
                    if (!sectionObject) { //If not existing , create one
                        sectionObject = { $id: `s${++sectionId}`, name: section };
                        sections.push(sectionObject);
                    }
                    if (drawingPoints[0].data.position.x == drawingPoints[1].data.position.x &&
                        drawingPoints[0].data.position.z == drawingPoints[1].data.position.z) { //Check if the element is vertical(column)
                        element = drawColumnByTwoPoints(sectionObject, drawingPoints[0], drawingPoints[1]);
                        columns.push(element);
                    }
                    else {//Element is not vertical (Beam)
                        element = drawBeamByTwoPoints(sectionObject, drawingPoints[0], drawingPoints[1]);
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
    });*/
    ////////////////////////////////////////////////////////
    //Try Area selection
    let initialPosition;
    let multiple = false;
    canvas.onmousedown = function (event) {
        initialPosition = editor.setPickPosition(event);
    }

    let finalPosition;
    canvas.onmouseup = function (event) {
        finalPosition = editor.setPickPosition(event);
        if (initialPosition.x === finalPosition.x && initialPosition.y === finalPosition.y)
            editor.select(event, multiple);
        else {
            let rectWidth = Math.abs(finalPosition.x - initialPosition.x),
                rectHeight = Math.abs(finalPosition.y - initialPosition.y);

            //The start position of the rectangle sholud be the top left corner
            if (finalPosition.x < initialPosition.x)
                initialPosition.x = finalPosition.x;
            if (finalPosition.y < initialPosition.y)
                initialPosition.y = finalPosition.y;
            editor.selectByArea(initialPosition, rectWidth, rectHeight, multiple);
        }
    }

    window.addEventListener('keyup', function (event) {
        switch (event.key) {
            case 'Delete':
                deleteElement();
                break;

            case 'm':
                move();
                break;

            case 'c':
                copy();
                break;

            case 'd':
                draw = draw ? false : true;
                break;

            case 'Control':
                multiple = false;
                break;
        }
    });


    window.onkeydown = (event) => {
        if (event.key === 'Control')
            multiple = true;
    }

    window.deleteElement = function () {
        for (let item of editor.picker.selectedObject) {
            if (item.userData.element instanceof Beam) {
                editor.removeFromGroup(item, 'elements');
                let found = false;
                for (var i = 0; i < mainBeams.length; i++) {
                    let index = mainBeams[i].indexOf(item.userData.element);
                    if (index > -1) {
                        mainBeams[i].splice(index, 1);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    for (var i = 0; i < secondaryBeams.length; i++) {
                        index = secondaryBeams[i].indexOf(item.userData.element);
                        if (index > -1) {
                            secondaryBeams[i].splice(index, 1);
                            break;
                        }
                    }
                }
            }
            else if (item.userData.element instanceof Column) {
                editor.removeFromGroup(item, 'elements');
                for (var i = 0; i < columns.length; i++) {
                    let index = columns[i].indexOf(item.userData.element);
                    if (index > -1) {
                        columns[i].splice(index, 1);
                        break;
                    }
                }
            }
            else {
                editor.removeFromGroup(item, 'nodes');
                let index = nodes.indexOf(item.userData.node)
                nodes.splice(index, 1);
            }
        }
        editor.picker.selectedObject.clear();
    }

    window.move = function () {
        let displacement = new THREE.Vector3(parseFloat($('#xMove').val()) || 0, parseFloat($('#yMove').val()) || 0, parseFloat($('#zMove').val()) || 0)
        for (let item of editor.picker.selectedObject) {
            if (item.userData.element) {//Beams or Cloumns only
                item.userData.element.move(displacement);
                let newStartPosition = item.position;
                let newEndPosition = item.userData.element.visual.endPoint;

                //Check if nodes already exist at the new position or create new ones.
                console.log(item.userData.element);
                getElementNodes(newStartPosition, newEndPosition, item.userData.element);
                item.userData.picking.position.copy(newStartPosition);
            }
        }
    }

    window.copy = function () {
        let displacement = new THREE.Vector3(parseFloat($('#xCopy').val()) || 0, parseFloat($('#yCopy').val()) || 0, parseFloat($('#zCopy').val()) || 0)
        let replication = parseInt($('#Replication').val()); debugger
        for (let item of editor.picker.selectedObject) {
            if (item.userData.element) { //Beams or Cloumns only
                let element = item.userData.element;
                for (var i = 0; i < replication; i++) {
                    element = element.clone();
                    element.move(displacement);

                    //Check if nodes already exist at the new position or create new ones.
                    getElementNodes(element.visual.mesh.position, element.visual.endPoint, element);

                    let levelIndex = levels.indexOf(element.visual.endPoint.y) - 1;

                    if (element instanceof Beam)
                        secondaryBeams[levelIndex].push(element);
                    else
                        columns[levelIndex].push(element);

                    editor.addToGroup(element.visual.mesh, 'elements');
                    editor.createPickingObject(element);
                }
            }
        }
    }


    function getElementNodes(newStartPosition, newEndPosition, element) {
        //Search for the new nodes in the existing nodes

        let newStartNode = nodes.find(n => n.data.position.equals(newStartPosition));
        let newEndNode = nodes.find(n => n.data.position.equals(newEndPosition));

        if (!newStartNode) { //If it doesn't exist create one
            newStartNode = Node.create(newStartPosition.x, newStartPosition.y, newStartPosition.z,
                null, editor, nodes);
        }
        if (!newEndNode) {//If it doesn't exist create one
            newEndNode = Node.create(newEndPosition.x, newEndPosition.y, newEndPosition.z, null, editor, nodes);
        }

        element.data.startNode = { "$ref": newStartNode.data.$id };
        element.data.endNode = { "$ref": newEndNode.data.$id };
    }

    window.toggle = function () {
        editor.toggleBeams();
    }

    window.addFloorLoad = function () {
        let load = new LineLoad($('#floorLoadCase').val(), this.parseFloat($('#floorLoad').val()));
        editor.clearGroup('loads');
        debugger
        for (let i = 0; i < secondaryBeams.length; i++) { //(for) is faster than (forEach)
            let index = secondaryBeams[i].addLoad(load, true);
            editor.addToGroup(secondaryBeams[i].data.loads[index].render(secondaryBeams[i]), 'loads');
        }
    }

    window.addLineLoad = function () { //Adds a LineLoad to the selected beam
        editor.clearGroup('loads');
        debugger
        let replace = $('#replaceLineLoad').prop('checked'); //Wether to replace the existing load (if any) or add to it
        let load = new LineLoad(parseFloat($('#lineLoad').val()), $('#lineLoadCase').val());
        for (let element of editor.picker.selectedObject) {
            if (element.userData.element instanceof Beam) {
                let beam = element.userData.element;
                let loadIndex = beam.addLoad(load, replace);
                editor.addToGroup(beam.data.lineLoads[loadIndex].render(beam), 'loads')
            }
        }
    }


    window.addPointLoad = function () { //Adds a PointLoad to the selected node
        editor.clearGroup('loads');
        let replace = $('#replacePointLoad').prop('checked'); //Wether to replace the existing load (if any) or add to it
        debugger
        let pointLoad = new PointLoad(parseFloat($('#pointLoad').val()), $('#pointLoadCase').val());
        for (let element of editor.picker.selectedObject) {
            if (element.userData.node) {
                let node = element.userData.node;
                let loadIndex = node.addLoad(pointLoad, replace);
                editor.addToGroup(node.data.pointLoads[loadIndex].render(node.data.position.clone()), 'loads')
            }
        }
    }

    window.hideLoads = function () {
        editor.clearGroup('loads');
    }

    window.showLoads = function () { // Visualize all load in the selected case
        let pattern = $('#showLoadCase').val();
        editor.clearGroup('loads');

        let index;
        for (let i = 0; i < secondaryBeams.length; i++) {
            for (let j = 0; j < secondaryBeams[i].length; j++) {
                index = secondaryBeams[i][j].data.lineLoads.findIndex(l => l.pattern == pattern);
                if (index > -1)
                    editor.addToGroup((secondaryBeams[i][j].data.lineLoads[index]).render(secondaryBeams[i][j]), 'loads');
            }
        }

        for (let i = 0; i < mainBeams.length; i++) {
            for (let j = 0; j < mainBeams[i].length; j++) {
                index = mainBeams[i][j].data.lineLoads.findIndex(l => l.pattern == pattern);
                if (index > -1)
                    editor.addToGroup((mainBeams[i][j].data.lineLoads[index]).render(secondaryBeams[i][j]), 'loads');
            }
        }


        for (let i = 0; i < nodes.length; i++) {
            index = nodes[i].data.pointLoads.findIndex(l => l.pattern == pattern);
            if (index > -1)
                editor.addToGroup((nodes[i].data.pointLoads[index]).render(nodes[i].data.position.clone()), 'loads');
        }
    }

    window.changeSection = function () {
        let sectionName = $('#section').val();
        let existingSection = sections.find(s => s.name == sectionName);//Check if the section already exists
        if (!existingSection) {//if not create a new one
            existingSection = { $id: `s${sections.length}`, name: sectionName };
            sections.push(existingSection);
        }
        for (let item of editor.picker.selectedObject) {
            if (item.userData.element) { // Beams and columns only
                item.userData.element.changeSection(existingSection);
            }
        }
    }

    window.addNodeToBeam = function () {
        let distances = $('#nodeToBeam').val().split(',').map(d => this.parseFloat(d));
        let element;
        for (let item of editor.picker.selectedObject) {
            if (item.userData.element instanceof Beam) {
                element = item.userData.element;
                for (var i = 0; i < distances.length; i++) {
                    let displacement = element.visual.direction.clone().multiplyScalar(distances[i]);
                    let nodePosition = item.position.clone().add(displacement);

                    Node.create(nodePosition.x, nodePosition.y, nodePosition.z,
                        null, editor, nodes);
                }
            }
        }
    }

    window.createNode = function () {
        let node = Node.create(parseFloat($('#nodeXCoord').val()),
            parseFloat($('#nodeYCoord').val()), parseFloat($('#nodeZCoord').val()), null, editor, nodes);

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
    }

    function getIntersectedBeam(position) { //Checks if a beam exists at the node position 
        let widthHalf = window.innerWidth / 2, heightHalf = window.innerHeight / 2;
        position.project(editor.camera); //Project the 3D world position on the screen
        //The resulting position is between[-1,1] WebGl coordinates with the origin at the screen center
        //Switch position to screen position with the origin at the top left corner
        position.x = (position.x * widthHalf) + widthHalf;
        position.y = - (position.y * heightHalf) + heightHalf;
        //Read the position using the GPUPicker
        return editor.picker.getObject(position, editor.renderer, editor.pickingScene, editor.camera, editor.idToObject);
    }

    window.startDrawMode = () => draw = true;
    window.endDrawMode = () => {
        draw = false;
        drawingPoints = [];
    }

    function createModel() { //Serialize model components to JSON
        let model = {
            nodes: [], material: { '$id': 'm', name: 'ST_37' }, sections: [],
            secondaryBeams: [], mainBeams: [], columns: []
        };

        model.projectProperties = {
            "Number": "1",
            "Name": "AUTRA2",
            "Designer": "AUTRA2",
            "Location": "Smart Village",
            "City": "Giza",
            "Country": "Egypt"
        }
        for (var i = 0; i < nodes.length; i++) {
            model.nodes.push(nodes[i].data);
        }

        model.sections = sections;


        for (var i = 0; i < secondaryBeams[0].length; i++) {
            model.secondaryBeams.push(secondaryBeams[0][i].data);
        }

        for (var i = 0; i < mainBeams[0].length; i++) {
            model.mainBeams.push(mainBeams[0][i].data);
        }

        for (var i = 0; i < columns[0].length; i++) {
            model.columns.push(columns[0][i].data);
        }
        model = JSON.stringify(model);
        console.log(model)
        return model;
    }

    window.send = function () { //Send data to server        
        debugger
        $.ajax({
            url: `/Home/Solve`,
            type: "POST",
            contentType: 'application/json',
            data: createModel(),
            success: function (res) {
                console.log(res)
            },
            error: function (x, y, res) {
                console.log(res)
            }
        });
    }

    window.save = function () { // Save data on the server
        debugger
        $.ajax({
            url: `/Home/Read`,
            type: "POST",
            contentType: 'text/plain',
            data: createModel(),
            success: function (res) {
                console.log(res)
            },
            error: function (x, y, res) {
                console.log(res)
            }
        });
    }

    window.saveLocally = function () {
        this.localStorage.setItem('Model', createModel()); //Save data to localStorage ??!! Option #1

        //Save data on client machine if no internet connection Option #2
        let text = new Blob([createModel()], { type: 'text/json' }); //Blob : An object that represents a file

        textFile = window.URL.createObjectURL(text); // The URL to that object

        let link = document.createElement('a'); //Create HTML link to download the file on client machine
        link.setAttribute('download', 'info.json');
        link.href = textFile;
        document.body.appendChild(link);

        this.setTimeout(function () { // domElement takes some time to be added to the document
            link.click(); //Fire the click event of the link
            document.body.removeChild(link); //The link is no longer needed
            URL.revokeObjectURL(textFile); // Dispose the URL Object
        }, 1000);
    }


    $('#upload').change(function (event) { //Read data from uploaded file
        debugger
        let file = event.target.files[0];
        var reader = new FileReader();
        reader.onload = function (evt) {
            let obj = JSON.parse(evt.target.result);
            console.log(obj);
        };
        reader.readAsText(file);
    })

    //used to toggle between dark and light themes
    window.darkTheme = () => editor.darkTheme();

    window.lightTheme = () => editor.lightTheme();

})();