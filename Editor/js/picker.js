class GPUPickHelper {
    constructor() {
        // create a 9x9 pixel render target
        this.pickingTexture = new THREE.WebGLRenderTarget(9, 9);
        //Create Array to store the  color (RGBA) of each pixel (4 elements per each pixel)
        this.pixelBuffer = new Uint8Array(4 * 81);
        this.pickedObject = null;
        this.selectedObject = null;
        this.emissiveFlash = 0x11bbcc;
    }

    getObject(cssPosition, renderer, pickingScene, camera) {
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

    select(cssPosition, renderer, pickingScene, camera) { //On mouse click
        // restore the color if there is a picked object
        if (this.selectedObject) {
            this.selectedObject.material.color.setHex(this.selectedObject.material.color.getHex() - this.emissiveFlash);
        }

        this.selectedObject = this.getObject(cssPosition, renderer, pickingScene, camera);
        if (this.selectedObject) {
            this.selectedObject.material.color.setHex(this.selectedObject.material.color.getHex() + this.emissiveFlash);
        }
    }

    unselect() {
        this.selectedObject.material.color.setHex(this.selectedObject.material.color.getHex() - this.emissiveFlash);
        this.selectedObject = null;
    }

    pick(cssPosition, renderer, pickingScene, camera) { //On mouse hover
        // restore the color if there is a picked object
        if (this.pickedObject) {
            this.pickedObject.material.color.setHex(this.pickedObject.material.color.getHex() - this.emissiveFlash);
        }

        this.pickedObject = this.getObject(cssPosition, renderer, pickingScene, camera);
        if (this.pickedObject) {
            this.pickedObject.material.color.setHex(this.pickedObject.material.color.getHex() + this.emissiveFlash);
        }
    }
}