//https://threejsfundamentals.org/threejs/lessons/threejs-picking.html

(function () {
    //#region  Shared variables
    let editor;
    let nodes, grids;
    let columns, mainBeams, secondaryBeams, sections = [];
    let canvas;
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
        let secSpacing, coordX, coordZ, height;
        coordX = getCoords($('#spaceX').val()); //Get X-coordinates from X-spacings
        coordZ = getCoords($('#spaceZ').val()); //Get Z-coordinates from Z-spacings
        height = parseFloat($('#height').val()); //Storey height
        secSpacing = $('#secSpace').val().split(' ').map(s => parseFloat(s)); //Spacing between secondary beams
        //secSpacing = parseFloat($('#secSpace').val()); //Spacing between secondary beams

        stories = parseFloat($('#stories').val()); //Stories no. 
        coordY = getElevation(stories, height); //cummulative elevation 

        grids = new Grid(coordX, coordZ, coordX.length, coordZ.length, 3);
        editor.addToGroup(grids.linesInX, 'grids'); //Add x-grids to scene (as a group)
        editor.addToGroup(grids.linesInZ, 'grids'); //Add z-grids to scene (as a group)

        //each element in the following arrays is the collection of the structural component with respect to 
        // which floor it is in.
        var mainBeamsTotal = new Array(coordY.length - 1);
        var secBeamsTotal = new Array(coordY.length - 1);
        var columnsTotal = new Array(coordY.length - 1);
        var mainNodesTotal = new Array(coordY.length - 1);
        var secNodesTotal = new Array(coordY.length - 1);
        var lowerNodesTotal = new Array(coordY.length - 1);


        if (!document.getElementById("autoMode").checked) {
            nodes = createNodes(editor, coordX, coordZ);
        }
        else {
            sections.push({ $id: `s${++sectionId}`, name: 'IPE 200' }, { $id: `s${++sectionId}`, name: 'IPE 270' }, { $id: `s${++sectionId}`, name: 'IPE 360' });
            if (document.getElementById("xOrient").checked) {
                //let secCoords = getSecCoords(coordX, secSpacing);
                for (let i = 1; i < coordY.length; i++) {

                    [mainBeams, secondaryBeams, mainNodes, secNodes] = generateMainBeamsX(editor, coordX, coordY[i], coordZ,
                    sections[1], sections[0], secSpacing); //Auto generate floor beams and nodes in X
                [columns, lowerNodes] = generateColumnsZ(editor, coordX, 0, coordZ, mainNodes, sections[2]); //Auto generate columns

                mainBeamsTotal[i - 1] = mainBeams;
                secBeamsTotal[i - 1] = secondaryBeams;
                columnsTotal[i - 1] = columns;
                mainNodesTotal[i - 1] = mainNodes;
                secNodesTotal[i - 1] = secNodes;
                lowerNodesTotal[i - 1] = lowerNodes;
            }
            }
            else {
                //let secCoords = getSecCoords(coordZ, secSpacing);
                for (let i = 1; i < coordY.length; i++) {
                [mainBeams, secondaryBeams, mainNodes, secNodes] = generateMainBeamsZ(editor, coordX, height, coordZ,
                    sections[1], sections[0], secSpacing); //Auto generate floor beams and nodes in Z

                [columns, lowerNodes] = generateColumnsX(editor, coordX, 0, coordZ, mainNodes, sections[2]); //Auto generate columns 

                mainBeamsTotal[i - 1] = mainBeams;
                secBeamsTotal[i - 1] = secondaryBeams;
                columnsTotal[i - 1] = columns;
                mainNodesTotal[i - 1] = mainNodes;
                secNodesTotal[i - 1] = secNodes;
                lowerNodesTotal[i - 1] = lowerNodes;
                }
            }
            //nodes = mainNodes.concat(secNodes);
            //nodes = lowerNodes.concat(nodes);
            // console.log(mainBeamsTotal ,secBeamsTotal,columnsTotal, mainNodesTotal,secNodesTotal, lowerNodesTotal);
            return [mainBeamsTotal, secBeamsTotal, columnsTotal, mainNodesTotal, secNodesTotal, lowerNodesTotal]
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

    //Turn spacings into elevation levels
    function getElevation(noInY, heightY) {
        let coordY = [], coord = 0;
        for (let i = 0; i < noInY + 1; i++) {
            coordY[i] = coord;
            coord += heightY;
        }
        return coordY;
    }
        
    init();

    canvas.addEventListener('mousemove', function (event) {
        editor.pick(event);
    });

    canvas.addEventListener('click', function (event) {
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
    });

    //Try Area selection
    /*let initialPosition;
    canvas.onmousedown = function (event) {
        initialPosition = editor.setPickPosition(event);
        console.log(initialPosition);
    }

    let finalPosition;
    canvas.onmouseup = function (event) {
        finalPosition = editor.setPickPosition(event);
        console.log(finalPosition);
        editor.selectByArea(initialPosition, finalPosition)
    }*/


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
        }
    });
    
    window.deleteElement = function () {

        if (editor.picker.selectedObject) {
            if (editor.picker.selectedObject.userData.element instanceof Beam) {
                editor.removeFromGroup(editor.picker.selectedObject, 'elements');
                let index = mainBeams.indexOf(editor.picker.selectedObject.userData.element);
                if (index !== -1) mainBeams.splice(index, 1);
                else {
                    index = secondaryBeams.indexOf(editor.picker.selectedObject.userData.element);
                    secondaryBeams.splice(index, 1); //Use 'delete' ??!!
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
    }

    window.move = function () {
        if (editor.picker.selectedObject && editor.picker.selectedObject.userData.element) {
            let displacement = new THREE.Vector3(parseFloat($('#xMove').val()) || 0, parseFloat($('#yMove').val()) || 0, parseFloat($('#zMove').val()) || 0)
            editor.picker.selectedObject.userData.element.move(displacement);
            let newStartPosition = editor.picker.selectedObject.position;
            let newEndPosition = editor.picker.selectedObject.userData.element.data.endPoint;

            //Check if nodes already exist at the new position or create new ones.
            getElementNodes(newStartPosition, newEndPosition, editor.picker.selectedObject.userData.element);
            editor.picker.selectedObject.userData.picking.position.copy(newStartPosition);
        }
    }

    window.copy = function () {
        if (editor.picker.selectedObject && editor.picker.selectedObject.userData.element) {
            let displacement = new THREE.Vector3(parseFloat($('#xCopy').val()) || 0, parseFloat($('#yCopy').val()) || 0, parseFloat($('#zCopy').val()) || 0)
            let replication = parseInt($('#Replication').val());
            let element = editor.picker.selectedObject.userData.element;
            for (var i = 0; i < replication; i++) {
                element = element.clone();
                element.move(displacement);

                //Check if nodes already exist at the new position or create new ones.
                getElementNodes(element.data.startPoint, element.data.endPoint, element);

                if (element instanceof Beam)
                    secondaryBeams.push(element);
                else
                    columns.push(element);

                editor.addToGroup(element.visual.mesh, 'elements');
                editor.createPickingObject(element);
            }
        }
    }


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
        if (editor.picker.selectedObject.userData.element instanceof Beam) {
            let replace = $('#replaceLineLoad').prop('checked'); //Wether to replace the existing load (if any) or add to it
            debugger
            let load = new LineLoad($('#lineLoadCase').val(), parseFloat($('#lineLoad').val()));
            let beam = editor.picker.selectedObject.userData.element;
            let loadIndex = beam.addLoad(load, replace);
            editor.clearGroup('loads');
            editor.addToGroup(beam.data.loads[loadIndex].render(beam), 'loads')
        }
        else {
            this.alert('Please Select an object');
        }
    }

    window.addPointLoad = function () { //Adds a PointLoad to the selected node
        if (editor.picker.selectedObject && editor.picker.selectedObject.userData.node) {
            let replace = $('#replacePointLoad').prop('checked'); //Wether to replace the existing load (if any) or add to it
            let pointLoad = new PointLoad($('#pointLoadCase').val(), parseFloat($('#pointLoad').val()));
            debugger
            let node = editor.picker.selectedObject.userData.node;
            editor.clearGroup('loads');
            let loadIndex = node.addLoad(pointLoad, replace);
            editor.addToGroup(node.data.loads[loadIndex].render(node.data.position.clone()), 'loads')
        }
        else {
            this.alert('Please Select an object');
        }
    }

    window.hideLoads = function () {
        editor.clearGroup('loads');
    }

    window.showLoads = function () { // Visualize all load in the selected case
        let loadCase = $('#showLoadCase').val();
        editor.clearGroup('loads');

        let index;
        secondaryBeams.forEach(b => {
            index = b.data.loads.findIndex(l => l.loadCase == loadCase);
            if (index > -1)
                editor.addToGroup((b.data.loads[index]).render(b), 'loads');
        })
        mainBeams.forEach(b => {
            index = b.data.loads.findIndex(l => l.loadCase == loadCase);
            if (index > -1)
                editor.addToGroup((b.data.loads[index]).render(b), 'loads');
        })
        nodes.forEach(n => {
            index = n.data.loads.findIndex(l => l.loadCase == loadCase);
            if (index > -1)
                editor.addToGroup((n.data.loads[index]).render(n.data.position.clone()), 'loads');
        })
    }

    window.changeSection = function () {
        if (editor.picker.selectedObject.userData.element) {
            let sectionName = $('#section').val();
            let existingSection = sections.find(s => s.name == sectionName);
            if (!existingSection) {
                existingSection = { $id: `s${sections.length}`, name: sectionName };
                sections.push(existingSection);
            }
            editor.picker.selectedObject.userData.element.changeSection(existingSection);
        }
        else
            this.alert('Please select an element first')
    }

    window.addNodeToBeam = function () {
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
        let node = new Node(parseFloat($('#nodeXCoord').val()),
            parseFloat($('#nodeYCoord').val()), parseFloat($('#nodeZCoord').val()));

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
        let model = { nodes: [], sections: [], secondaryBeams: [], sections, mainBeams: [], columns: [] };
        for (var i = 0; i < nodes.length; i++) {
            model.nodes.push(nodes[i].data);
        }

        model.sections = sections;

        for (var i = 0; i < secondaryBeams.length; i++) {
            model.secondaryBeams.push(secondaryBeams[i].data);
        }

        for (var i = 0; i < mainBeams.length; i++) {
            model.mainBeams.push(mainBeams[i].data);
        }

        for (var i = 0; i < columns.length; i++) {
            model.columns.push(columns[i].data);
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
    window.darkTheme = function () {
        editor.renderer.setClearColor(0x505050);
        light.style.display = 'block';
        dark.style.display = 'none';
        // beam.visual.mesh.material.color.setHex();
    }

    window.lightTheme = function () {
        editor.renderer.setClearColor(0xdddddd);
        dark.style.display = 'block';
        light.style.display = 'none';
    }

})();