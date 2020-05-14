class GPUPickHelper {
    constructor() {
        // create a 1x1 pixel render target
        this.pickingTexture = new THREE.WebGLRenderTarget(1, 1);
        this.pixelBuffer = new Uint8Array(4);
        this.pickedObject = null;
        this.selectedObject = null;
        this.pickedObjectSavedColor = 0;
        this.emissiveFlash = 0x11bbcc;
        this.selectedObjectSavedColor = 0x000000;
    }

    getObject(cssPosition, renderer, pickingScene, camera) {
        const { pickingTexture, pixelBuffer } = this;
        // set the view offset to represent just a single pixel under the mouse
        const pixelRatio = renderer.getPixelRatio();
        camera.setViewOffset(
            renderer.getContext().drawingBufferWidth,   // full width
            renderer.getContext().drawingBufferHeight,  // full top
            cssPosition.x * pixelRatio | 0,             // rect x
            cssPosition.y * pixelRatio | 0,             // rect y
            1,                                          // rect width
            1,                                          // rect height
        );

        // render the scene
        renderer.setRenderTarget(pickingTexture);
        renderer.render(pickingScene, camera);
        renderer.setRenderTarget(null);
        // clear the view offset so rendering returns to normal
        camera.clearViewOffset();
        //read the pixel
        renderer.readRenderTargetPixels(
            pickingTexture,
            0,   // x
            0,   // y
            1,   // width
            1,   // height
            pixelBuffer);

        const id =
            (pixelBuffer[0] << 16) |
            (pixelBuffer[1] << 8) |
            (pixelBuffer[2]);
        return id;
    }

    select(cssPosition, renderer, pickingScene, camera) {
        // restore the color if there is a picked object
        if (this.selectedObject) {
            this.selectedObject.material.emissive.setHex(this.selectedObjectSavedColor);
            this.selectedObject = null;
        }

        let id = this.getObject(cssPosition, renderer, pickingScene, camera);
        const intersectedObject = idToObject[id];
        if (intersectedObject) {
            // pick the first object. It's the closest one
            this.selectedObject = intersectedObject;
            // save its color
            // this.selectedObjectSavedColor = this.selectedObject.material.emissive.getHex();
            // set its emissive color to flashing red/yellow
            this.selectedObject.material.emissive.setHex(0xcc00cc);
        }
    }

    unselect() {
        this.selectedObject.material.emissive.setHex(this.selectedObjectSavedColor + this.emissiveFlash);
        this.selectedObject = null;
    }

    pick(cssPosition, renderer, pickingScene, camera) {
        // restore the color if there is a picked object
        if (this.pickedObject) {
            this.pickedObject.material.emissive.setHex(this.pickedObject.material.emissive.getHex() - this.emissiveFlash);
            this.pickedObject = null;
        }
        let id = this.getObject(cssPosition, renderer, pickingScene, camera);
        let intersectedObject = idToObject[id];
        if (intersectedObject) {
            // pick the first object. It's the closest one
            this.pickedObject = intersectedObject;
            // save its color
            this.pickedObjectSavedColor = this.pickedObject.material.emissive.getHex();
            // set its emissive color
            this.pickedObject.material.emissive.setHex(this.pickedObjectSavedColor + this.emissiveFlash);
        }
    }
}