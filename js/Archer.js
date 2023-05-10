import { Arrow } from "./Arrow.js";
import { loadCrossHair, createArcCamera } from "./Utils.js";
export class Archer {
    constructor(archerMesh, id, speed, scaling, scene, skeletons, arrow, game) {
        this.archerMesh = archerMesh;
        this.skeletons = skeletons;
        this.id = id;
        this.game = game;
        this.orignalSpeed = new BABYLON.Vector3(speed / 2, speed, speed);
        this.speed = new BABYLON.Vector3(speed / 2, speed, speed);
        this.constSpeed = speed;
        this.rotationSpeed = 0.03;
        this.backwardSpeed = 0.1;
        this.scene = scene;
        this.scaling = scaling;

        // UI stats
        this.healthText = null;
        this.killsText = null;

        this.health = 100;
        this.kills = 0;

        this.tps_camera = null;
        this.shoulder_camera = null;

        this.archerMesh.scaling = new BABYLON.Vector3(scaling, scaling, scaling);
        this.RayToGround = true;

        this.canFire = true;
        this.bounder = this.createBox();
        this.bounder.frontVector = new BABYLON.Vector3(0, 0, 1);
        this.bounder.lastGoodPosition = this.bounder.position;
        this.targetForShoulderCamera = this.createShoulderTarget();
        this.isSoulderCameraSet = false;

        this.archerMesh.setParent(this.bounder);
        this.archerMesh.Archer = this;

        this.animating = false;
        this.animations = {};
        this.currentAnimation = scene.getAnimationGroupByName("IDLE");
        scene.animationGroups.forEach((anim) => {
            // console.log(anim.name);
            this.animations[anim.name] = anim;
            anim.syncAllAnimationsWith(this.currentAnimation);
        });

        this.currentAnimation = this.animations["IDLE"];

        this.lastAnimation = this.animations["IDLE"];
        this.doAnimation(true);

        this.arrows = [];

        this.createUI();

        //this.arrow = new Arrow(this.scene, arrow, this);

    }

    destruct() {
        this.bounder.dispose();
        this.archerMesh.dispose();
    }

    createCrossHair() {
        this.crosshair = loadCrossHair(this.scene);
    }

    createShoulderTarget() {
        let target = BABYLON.MeshBuilder.CreateBox("target", { width: 0.1, height: 0.1, depth: 0.1 }, this.scene);
        target.position = this.bounder.position.clone();
        target.position.y += 3;
        target.position.x += 1;
        target.visibility = 0;
        target.setParent(this.bounder);

        this.shoulder_camera = createArcCamera(this.scene, target, this.scene.getEngine().getRenderingCanvas(), "shoulder_cam");
        return target;
    }

    createBox() {

        this.archerMesh.position.y += 30;

        // create a box that will be used to bound the archer
        let box = BABYLON.MeshBuilder.CreateBox("box", { width: 0.8, height: 1, depth: 0.8 }, this.scene);
        let mat = new BABYLON.StandardMaterial("mat", this.scene);
        mat.alpha = 0.00;
        box.material = mat;

        let pos = this.archerMesh.position;
        box.position = new BABYLON.Vector3(pos.x, pos.y + this.scaling, pos.z);

        let scal = this.archerMesh.scaling;

        box.scaling = new BABYLON.Vector3(scal.x, scal.y * 2, scal.z);
        //box.showBoundingBox = true;
        box.checkCollisions = true;

        this.tps_camera = createArcCamera(this.scene, box, this.scene.getEngine().getRenderingCanvas(), "tps_cam");

        return box;
    }

    getGroundHeight() {
        this.bounder.lastGoodPosition = this.bounder.position.clone();

        // create a ray that starts above the box, and goes down vertically
        // to find the ground height
        let ray = new BABYLON.Ray(
            this.bounder.position.add(new BABYLON.Vector3(0, 1, 0)),
            new BABYLON.Vector3(0, -1, 0),
            1000
        );
        let groundHeight = 0;
        let pickInfo = this.scene.pickWithRay(ray, (mesh) => {
            return mesh.name.includes("ground") ||
                mesh.id.includes("Bridge") ||
                mesh.id.includes("Stepping stone") ||
                mesh.id.includes("StairsCollider") ||
                mesh.id.includes("FloorCollider") ||
                mesh.id.includes("Road");
        });
        if (pickInfo.hit) {
            groundHeight = pickInfo.pickedPoint.y;
        }
        return groundHeight;
    }

    doAnimation(looping) {
        this.currentAnimation.start(looping, 1.0, this.currentAnimation.from, this.currentAnimation.to, false);
    }

    setCurrentAnimation(animation) {
        this.lastAnimation = this.currentAnimation;
        this.currentAnimation = this.scene.getAnimationGroupByName(animation);
    }

    move() {
        let scene = this.scene;
        this.updateUI();
        if (scene.activeCamera.name === "shoulderCamera") {
            scene.activeCamera.position.add(1, 2, 0);
        }

        // handle keyboard input and move the archer
        // src https://playground.babylonjs.com/#AHQEIB#17

        var keydown = false;
        var spaceBar = false;
        if (scene.inputMap["z"] || scene.inputMap["arrowup"]) {
            if (scene.inputMap["s"] === undefined || !scene.inputMap["s"]) {
                this.bounder.moveWithCollisions(
                    this.bounder.frontVector.multiplyByFloats(-this.speed.x, -this.speed.y, -this.speed.z)
                );

                keydown = true;
            }
        }
        if (scene.inputMap["s"] || scene.inputMap["arrowdown"]) {
            if (scene.inputMap["z"] === undefined || !scene.inputMap["z"]) {
                this.bounder.moveWithCollisions(
                    this.bounder.frontVector.multiplyByFloats(this.backwardSpeed, this.backwardSpeed, this.backwardSpeed)
                );
                keydown = true;
            }

        }
        if (scene.inputMap["q"] || scene.inputMap["arrowleft"]) {
            // rotate the box on its y axis
            scene.inputMap["mousex"] = false;
            if (scene.inputMap["s"] || scene.inputMap["arrowdown"]) {
                this.bounder.rotation.y += 0.05;
            } else {
                this.bounder.rotation.y -= 0.05;
            }
            this.bounder.frontVector = new BABYLON.Vector3(
                Math.sin(this.bounder.rotation.y),
                0,
                Math.cos(this.bounder.rotation.y)
            );
            keydown = true;
        }
        if (scene.inputMap["d"] || scene.inputMap["arrowright"]) {
            //this.bounder.rotate(BABYLON.Vector3.Up(), this.rotationSpeed);
            scene.inputMap["mousex"] = false;
            if (scene.inputMap["s"] || scene.inputMap["arrowdown"]) {
                this.bounder.rotation.y -= 0.05;
            } else {
                this.bounder.rotation.y += 0.05;
            }
            this.bounder.frontVector = new BABYLON.Vector3(
                Math.sin(this.bounder.rotation.y),
                0,
                Math.cos(this.bounder.rotation.y)
            );
            keydown = true;
        }
        if (scene.inputMap[" "] && !scene.inputMap["shift"]) {
            spaceBar = true;
        }
        if (scene.inputMap["lmb"]) {
            this.fireArrow();
        }

        if (scene.inputMap["mousex"]) {
            //rotate player to follow camera
            let direction = scene.activeCamera.getDirection(new BABYLON.Vector3(0, 0, 1));
            var angle = Math.atan2(-direction.x, -direction.z);

            this.bounder.rotation.y = angle;
            this.bounder.frontVector = new BABYLON.Vector3(
                Math.sin(angle),
                0,
                Math.cos(angle)
            );
        }

        if (scene.inputMap["shift"]) {
            const name = this.currentAnimation.name;
            if (name === "StdWalkFwd") {
                this.setCurrentAnimation("StdRunFwd");
                this.speed = new BABYLON.Vector3(this.constSpeed * 2, this.constSpeed * 2, this.constSpeed * 2);
            } else if (name === "StdWalkBack") {
                this.speed = new BABYLON.Vector3(this.constSpeed * 1.3, this.constSpeed * 1.3, this.constSpeed * 1.3);
                this.setCurrentAnimation("StdRunBack");

            }
            this.doAnimation(true);
            keydown = true;
        }
        if (scene.inputMap["shift"] === undefined || !scene.inputMap["shift"]) {
            // if shift isn't pressed, set the speed back to normal
            // and set the animation to walking instead of running
            // this will allow the player to walk after running, and run again if forward is not released
            if (this.currentAnimation.name === "StdRunFwd") {
                this.setCurrentAnimation("StdWalkFwd");
            }
            if (this.currentAnimation.name === "StdRunBack") {
                this.setCurrentAnimation("StdWalkBack");
            }
            this.speed = new BABYLON.Vector3(this.constSpeed, this.constSpeed, this.constSpeed);
        }
        if (this.RayToGround) {
            if (this.bounder.position.y > this.getGroundHeight() + this.scaling + 1) {
                // console.log("falling");
                // home-made gravity
                this.bounder.position.y -= 0.3;
            } else {
                this.bounder.position.y = this.getGroundHeight() + this.scaling;
            }
        }
        this.handleKeys(keydown, spaceBar);
    }

    tpsCamera() {
        this.scene.activeCamera = this.tps_camera;
        this.isSoulderCameraSet = false;
    }

    shoulderCamera() {
        if (this.isSoulderCameraSet) return;
        this.isSoulderCameraSet = true;
        this.scene.activeCamera = this.shoulder_camera;
        //this.shoulder_camera.lowerRadiusLimit = 1;
        let newPos = this.targetForShoulderCamera.position.clone();
        this.shoulder_camera.setPosition(newPos.add(new BABYLON.Vector3(0, 8, .5)));
    }

    handleKeys(keydown, spaceBar) {
        if (spaceBar) {
            this.setCurrentAnimation("Jump");
            this.currentAnimation.weight = 0.0;
            this.currentAnimation.speedRatio = 1.5;
            this.speed = new BABYLON.Vector3(this.constSpeed / 2, this.constSpeed / 2, this.constSpeed / 2);
            this.doAnimation(false);
            this.setCurrentAnimation(this.lastAnimation.name);
            spaceBar = false;
        } else {
            if (this.lastAnimation.name === "Jump") {
                this.speed = new BABYLON.Vector3(this.constSpeed, this.constSpeed, this.constSpeed);
            }

        }


        if (keydown) {
            // console.log("animating -> " + this.animating);
            // console.log(scene.inputMap)
            if (!this.animating) {
                this.animating = true;
                if (this.scene.inputMap["s"]) {
                    this.setCurrentAnimation("StdWalkBack");
                    this.doAnimation(true);
                } else {
                    this.setCurrentAnimation("StdWalkFwd");
                    this.doAnimation(true);
                }
            }

            if (!this.scene.inputMap["shift"]) {
                this.scene.getAnimationGroupByName("StdRunFwd").stop();
                this.scene.getAnimationGroupByName("StdRunBack").stop();
            }

        } else {
            if (this.animating) {
                this.animating = false;
                this.RayToGround = true;

                this.scene.animationGroups.forEach((anim) => {
                    anim.stop();
                });

                this.setCurrentAnimation("IDLE");
                this.doAnimation(true);
            }
        }
    }

    fireArrow() {
        if (!this.canFire) return;
        this.canFire = false;

        setTimeout(() => {
            this.canFire = true;
        }, 1000);

        this.arrows.push(new Arrow(this.scene, null, this));
        this.arrows[this.arrows.length - 1].fire();
    }

    updateUI() {
        if (this.healthText === null || this.killsText === null) return;
        this.healthText.text = "Hp : " + this.health;
        this.killsText.text = "Kills : " + this.kills;
    }

    createUI() {
        var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

        // Créer un texte pour les points de vie
        this.healthText = new BABYLON.GUI.TextBlock();
        this.healthText.text = "HP : 100";
        this.healthText.color = "white";
        this.healthText.fontSize = 20;
        this.healthText.top = "-45%";
        this.healthText.left = "-45%";
        this.healthText.zIndex = 5;
        advancedTexture.addControl(this.healthText);

        // Créer un texte pour le nombre d'ennemis abattus
        this.killsText = new BABYLON.GUI.TextBlock();
        this.killsText.text = "KILLS : " + this.kills;
        this.killsText.color = "white";
        this.killsText.fontSize = 20;
        this.killsText.top = "-40%";
        this.killsText.left = "-45%";
        this.killsText.zIndex = 5;
        advancedTexture.addControl(this.killsText);

        let rect1 = new BABYLON.GUI.Rectangle();
        rect1.width = 0.1;
        rect1.height = 0.15;
        rect1.cornerRadius = 20;
        rect1.color = "Orange";
        rect1.background = "rgba(0,0,0,0.5)";
        rect1.zIndex = -5;
        rect1.top = "-42%";
        rect1.left = "-45%";
        advancedTexture.addControl(rect1);
    }
}