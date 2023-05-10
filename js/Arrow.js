import { Enemy } from "./Enemy.js";
import { getGroundHeightFromMesh } from "./Utils.js";

export class Arrow {
    constructor(scene, mesh, archer) {
        this.scene = scene;
        //this.arrow = mesh;
        this.archer = archer;
        this.mesh = BABYLON.MeshBuilder.CreateSphere(
            "arrow", { diameter: 0.9, segments: 32 },
            scene
        );

        this.isFired = false;

        this.pos = this.archer.bounder.position.clone();
        this.mesh.position = new BABYLON.Vector3(this.pos.x, this.pos.y + 2.4, this.pos.z);
        // move arrow position from above the center of the archer to above a bit further than the frontVector end (5 meter s further)
        //arrow.position.addInPlace(this.bounder.frontVector.multiplyByFloats(0, this.crosshair.position.y, 0));

        // add physics to the arrow, mass must be non null to see gravity apply
        this.mesh.physicsImpostor = new BABYLON.PhysicsImpostor(this.mesh,
            BABYLON.PhysicsImpostor.SphereImpostor, { mass: 1, restitution: 0.9 });

        this.mesh.actionManager = new BABYLON.ActionManager(this.scene);
    }

    fire() {
        this.isFired = true;
        // get the direction of the camera
        let direction = this.scene.activeCamera.getDirection(BABYLON.Axis.Z);

        // the arrow needs to be fired, so we need an impulse !
        // we apply it to the center of the sphere
        let powerOfFire = 80;
        let azimuth = 0.1;
        let aimForceVector = new BABYLON.Vector3(
            direction.x * powerOfFire,
            (direction.y + azimuth) * powerOfFire,
            direction.z * powerOfFire
        );

        this.mesh.physicsImpostor.applyImpulse(aimForceVector, this.mesh.getAbsolutePosition());

        if (!this.scene.enemy.length === 0) return;
        this.scene.enemy.forEach(enemy => {
            this.mesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction({
                        trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger,
                        parameter: enemy.bounder
                    },
                    (evt) => {
                        console.log("hit enemy");
                        enemy.bounder.dispose();
                        enemy.mesh.dispose();

                        // remove enemy from scene.enemy array
                        this.scene.enemy.splice(this.scene.enemy.indexOf(enemy), 1);
                        this.archer.kills++;
                        this.archer.game.checkWave();
                    }));
        });
    }

    update() {
        if (!this.isFired) return;
        if (getGroundHeightFromMesh(this.scene, this.mesh) >= this.mesh.position.y) {
            this.mesh.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
            this.mesh.physicsImpostor.setMass(0);

            this.isFired = false;
        }
    }
}