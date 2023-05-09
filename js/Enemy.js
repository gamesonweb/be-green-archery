import { getGroundHeightFromMesh } from './Utils.js';

export class Enemy {
    constructor(scene, mesh) {
        this.scene = scene;
        this.mesh = BABYLON.MeshBuilder.CreateBox("enemy", { height: 2, width: 1, depth: 1 }, this.scene);
        this.bounder = this.createBounder();
        this.mesh.setParent(this.bounder);
    }

    createBounder() {
        let bounder = BABYLON.MeshBuilder.CreateBox("bounder", { height: 2, width: 1, depth: 1 }, this.scene);
        bounder.name = "enemyBounder";
        let ground = this.scene.getMeshByName("GroundColloder");

        bounder.position = new BABYLON.Vector3(Math.random() * 100 - 50, ground.position.y, Math.random() * 60 - 30);
        bounder.position.y = getGroundHeightFromMesh(this.scene, bounder) + 3;
        bounder.position.y += 3;

        bounder.scaling = new BABYLON.Vector3(3, 3, 3);
        bounder.showBoundingBox = true;
        bounder.checkCollisions = true;
        return bounder;
    }

    update() {
        this.bounder.position.y = getGroundHeightFromMesh(this.scene, this.bounder) + 3;
        //this.bounder.moveWithCollisions(new BABYLON.Vector3(0, 0, 0.1));
    }
}