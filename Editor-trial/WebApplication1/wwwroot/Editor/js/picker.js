class GPUPickHelper {
    constructor() {
        // create a 9x9 pixel render target
        this.pickingTexture = new THREE.WebGLRenderTarget(9, 9);
        //Create Array to store the  color (RGBA) of each pixel (4 elements per each pixel)
        this.pixelBuffer = new Uint8Array(4 * 81);
        this.pickedObject = null;
        this.selectedObject = null;
        this.emissiveFlash = 0xcc5511;
    }

    getObject(cssPosition, renderer, pickingScene, camera, idToObject) {
        const { pickingTexture, pixelBuffer } = this;
        // set the view offset to represent just the (9*9 pixels) area around the mouse
        const pixelRatio = renderer.getPixelRatio();
        //move camera to the required area
        camera.setViewOffset(
            renderer.getContext().drawingBufferWidth,   // full width
            renderer.getContext().drawingBufferHeight,  // full top
            (cssPosition.x - 4) * pixelRatio | 0,       // rect x
            (cssPosition.y - 4) * pixelRatio | 0,       // rect y
            9,                                          // rect width
            9,                                          // rect height
        );

        // render the scene
        renderer.setRenderTarget(pickingTexture);
        renderer.render(pickingScene, camera);
        //Reset the settings of renderer and camera
        renderer.setRenderTarget(null);
        camera.clearViewOffset();

        //read the pixels colors
        renderer.readRenderTargetPixels(
            pickingTexture,
            0,   // x-offset
            0,   // y-offset
            9,   // width
            9,   // height
            pixelBuffer);

        for (let i = 2; i < pixelBuffer.length; i += 4) {
            if (pixelBuffer[i]) { // Check if the Blue component has a value
                let id = pixelBuffer[i] | pixelBuffer[i - 1] << 8; //Combine Blue and Green Components
                return idToObject[id].mesh; //Only the first colored pixel is needed
            }
        }

        return null;
    }
    //Trial
    getObjects(initialPosition, finalPosition, renderer, pickingScene, camera, idToObject) {
        let rectWidth = finalPosition.x - initialPosition.x,
            rectHeight = finalPosition.y - initialPosition.y;
        debugger
        let pickingTexture = new THREE.WebGLRenderTarget(rectWidth, rectHeight);
        let pixelsBuffer = new Uint8Array(4 * rectWidth * rectHeight);
        // set the view offset to represent just the (9*9 pixels) area around the mouse
        const pixelRatio = renderer.getPixelRatio();
        //move camera to the required area
        camera.setViewOffset(
            renderer.getContext().drawingBufferWidth,   // full width
            renderer.getContext().drawingBufferHeight,  // full top
            initialPosition.x * pixelRatio | 0,       // rect x
            initialPosition.y * pixelRatio | 0,       // rect y
            rectWidth,                                          // rect width
            rectHeight,                                          // rect height
        );

        // render the scene
        renderer.setRenderTarget(pickingTexture);
        renderer.render(pickingScene, camera);
        //Reset the settings of renderer and camera
        renderer.setRenderTarget(null);
        camera.clearViewOffset();

        //read the pixels colors
        renderer.readRenderTargetPixels(
            pickingTexture,
            0,   // x-offset
            0,   // y-offset
            rectWidth,       // width                                   
            rectHeight,      // height
            /*9,   //width
            9,   // height*/
            pixelsBuffer);
        let ids = new Set();
        for (let i = 2; i < pixelsBuffer.length; i += 4) {
            id =(pixelsBuffer[i] | pixelsBuffer[i - 1] << 8); //Combine Blue and Green Components
            let object = idToObject[id] 
            if (object && object.userData['node'])
                objects.push(object)

            if (pixelsBuffer[i]) { // Check if the Blue component has a value
                ids.add(pixelsBuffer[i] | pixelsBuffer[i - 1] << 8); //Combine Blue and Green Components
                //return idToObject[id].mesh; //Only the first colored pixel is needed
            }
        }
        debugger
        console.log(ids);
        return null;
    }

    select(cssPosition, renderer, pickingScene, camera, idToObject) { //On mouse click
        // restore the color if there is a picked object
        if (this.selectedObject) {
            this.selectedObject.material.color.setHex(this.selectedObject.material.color.getHex() - this.emissiveFlash);
        }

        this.selectedObject = this.getObject(cssPosition, renderer, pickingScene, camera, idToObject);
        if (this.selectedObject) {
            this.selectedObject.material.color.setHex(this.selectedObject.material.color.getHex() + this.emissiveFlash);
            if (this.selectedObject.userData.element) {
                $('#beamSection').val(this.selectedObject.userData.element.data.section);
                $('#beamStart').val(`${this.selectedObject.userData.element.data.startPoint.x},${this.selectedObject.userData.element.data.startPoint.y},${this.selectedObject.userData.element.data.startPoint.z}`);
                $('#beamEnd').val(`${this.selectedObject.userData.element.data.endPoint.x},${this.selectedObject.userData.element.data.endPoint.y},${this.selectedObject.userData.element.data.endPoint.z}`);
                $('#beamDead').val(this.selectedObject.userData.element.data.loads.dead ? this.selectedObject.userData.element.data.loads.dead.value : 0);
                $('#beamLive').val(this.selectedObject.userData.element.data.loads.live ? this.selectedObject.userData.element.data.loads.live.value : 0);
            }
        }
    }

    unselect() {
        this.selectedObject.material.color.setHex(this.selectedObject.material.color.getHex() - this.emissiveFlash);
        this.selectedObject = null;
    }

    pick(cssPosition, renderer, pickingScene, camera, idToObject) { //On mouse hover
        // restore the color if there is a picked object
        if (this.pickedObject) {
            this.pickedObject.material.color.setHex(this.pickedObject.material.color.getHex() - this.emissiveFlash);
        }

        this.pickedObject = this.getObject(cssPosition, renderer, pickingScene, camera, idToObject);
        if (this.pickedObject) {
            this.pickedObject.material.color.setHex(this.pickedObject.material.color.getHex() + this.emissiveFlash);
        }
    }
}