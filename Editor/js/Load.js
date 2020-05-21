let loader = new THREE.FontLoader();
let myFont;
let fontMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
loader.load('../js/dependencies/helvetiker_regular.typeface.json', function (font) {
    myFont = font;
    delete loader;
});
class Load {
    constructor(type, loadCase, value) {
        this.type = type;
        this.value = value,
        this.loadCase = loadCase;
    }
    render(beam) {

        let mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(beam.data.span, this.value, 1, 1)
            , new THREE.MeshBasicMaterial({ color: 0xcc0000, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));

        let textGeometry = new THREE.TextBufferGeometry(`${this.value}`, {
            font: myFont,
            size: 0.5,
            height: 0,
            curveSegments: 3,
            bevelEnabled: false
        });
        let text = new THREE.Mesh(textGeometry, fontMaterial);
        mesh.add(text);

        mesh.position.copy(beam.visual.mesh.position);
        mesh.position.add(beam.visual.direction.clone().multiplyScalar(0.5 * beam.data.span));
        mesh.position.y += 0.5 * this.value;
        mesh.rotateY(Math.PI / 2 - beam.visual.mesh.rotation.y);
        return mesh;
    }
}