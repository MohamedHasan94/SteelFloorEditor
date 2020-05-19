class LineLoad{
    constructor(value , direction){
        this.value = value;
        this.direction = direction;
        this.mesh = new THREE.Mesh(new THREE.PlaneGeometry( 6, value, 6 , 1)
        , new THREE.MeshBasicMaterial({color: 0xcc0000, transparent:true , opacity : 0.2, side: THREE.DoubleSide}));       
    }
}