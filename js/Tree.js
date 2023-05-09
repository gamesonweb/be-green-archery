export class Tree {
    constructor(scene, mesh) {
        this.scene = scene;
        this.mesh = mesh;
        this.bounder = this.createBox();
        this.mesh.setParent(this.bounder);
    }

    createBox() {
        // create a box that will be used to bound the mesh

        let box = BABYLON.MeshBuilder.CreateBox("box", this.scene);
        let mat = new BABYLON.StandardMaterial("mat", this.scene);
        mat.alpha = 0.00;
        box.material = mat;

        this.mesh.computeWorldMatrix(true);
        box.computeWorldMatrix(true);
        // Récupère les dimension   s réelles de la mesh

        let size = this.mesh.getBoundingInfo().boundingBox.minimumWorld;
        let sizes = this.mesh.getBoundingInfo().boundingBox.maximumWorld;

        size = sizes.subtract(size);

        let pos = this.mesh.getAbsolutePosition();

        // box.showBoundingBox = true;
        box.checkCollisions = true;

        // Définit la nouvelle échelle en fonction de la taille de la boîte englobante
        box.scaling = new BABYLON.Vector3(
            size.x / 2,
            size.y,
            size.z / 2
        );

        box.position = pos;

        return box;

    }
}