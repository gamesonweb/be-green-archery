import { Archer } from "./Archer.js";
import { Wall } from "./Wall.js";
import { Ground } from "./Ground.js";
import { Tree } from "./Tree.js";
import { Enemy } from "./Enemy.js";
import { modifySettings, createHemisphericLight, addKeyListener } from "./Utils.js";

let canvas;
let engine;
let scene;

window.onload = startGame;
window.addEventListener("resize", () => {
    engine.resize();
});

function startGame() {
    canvas = document.querySelector("#myCanvas");
    engine = new BABYLON.Engine(canvas, true);

    scene = createScene();

    let button = document.querySelector("#debug");
    button.addEventListener("click", () => {
        scene.groundMeshes.forEach(mesh => {
            mesh.visibility = 0;
        });
    });

    let button_2 = document.querySelector("#debug-2");
    button_2.addEventListener("click", () => {
        scene.groundMeshes.forEach(mesh => {
            mesh.visibility = 1.0;
        });
    });


    scene.toRender = () => {
        // update the scene
        let archer = scene.getMeshByName("archer");

        if (archer) {
            //archer.Archer.moveInSquarre();
            archer.Archer.move();
            if (scene.enemy.length > 0) {

                scene.enemy.forEach(enemy => {
                    enemy.update();
                });
            }

            if (archer.Archer.arrows.length > 0) {
                archer.Archer.arrows.forEach(arrow => {
                    arrow.update();
                });
            }
        }
        scene.render();
    };
    scene.assetsManager.load();

}

function createScene() {
    let scene = new BABYLON.Scene(engine);
    // enable physics
    scene.enablePhysics();

    // modify some default settings (i.e pointer events to prevent cursor to go
    // out of the game window)
    modifySettings(scene, document, window, canvas);
    addKeyListener(scene, canvas);

    scene.assetsManager = configureAssetManager(scene);
    scene.CollisionsEnabled = true;


    scene.groundMeshes = [];
    scene.enemy = [];
    // createTestGround(scene);
    loadFirsMap(scene);

    // create lights
    createHemisphericLight(scene);


    createArcher(scene);

    return scene;
}

function configureAssetManager(scene) {
    // useful for storing references to assets as properties. i.e scene.assets.cannonsound, etc.
    scene.assets = {};

    let assetsManager = new BABYLON.AssetsManager(scene);

    assetsManager.onProgress = function(
        remainingCount,
        totalCount,
        lastFinishedTask
    ) {
        engine.loadingUIText =
            "We are loading the scene. " +
            remainingCount +
            " out of " +
            totalCount +
            " items still need to be loaded.";
        console.log(
            "We are loading the scene. " +
            remainingCount +
            " out of " +
            totalCount +
            " items still need to be loaded."
        );
    };

    assetsManager.onFinish = function(tasks) {
        engine.runRenderLoop(function() {
            scene.toRender();

        });
    };

    return assetsManager;
}

function createArcher(scene) {
    // load the archer
    let archerTask = scene.assetsManager.addMeshTask(
        "archerTask",
        "",
        "assets/archer/",
        "ArcherFinal.glb",
    );

    archerTask.onSuccess = function(task) {
        task.loadedMeshes[0].name = "archer";
        task.loadedMeshes[0].position.y += 1;
        let arrow = null;


        task.loadedMeshes.forEach(element => {
            if (element.name === "Erika_Archer_Eyes_Mesh") {
                arrow = element;
            }
        });

        let archer = new Archer(task.loadedMeshes[0], 1, 0.15, 3, scene, task.loadedSkeletons, arrow);

        scene.Archer = archer;

        scene.animationPropertiesOverride = new BABYLON.AnimationPropertiesOverride();
        scene.animationPropertiesOverride.enableBlending = true;
        scene.animationPropertiesOverride.blendingSpeed = 0.05;
        //scene.animationPropertiesOverride.loopMode = 1;

        //camera = createShoulderCamera(scene, archer.bounder, canvas);
        scene.activeCAmera = archer.tps_camera;
        archer.createCrossHair();

    }
}

function createTestGround(scene) {
    let ground = BABYLON.MeshBuilder.CreateGround("dddd", {
        width: 10,
        height: 10,
    }, scene);
    ground.position.x = 0;
    ground.scaling.y = 10;
    ground.scaling.x = 1;
    ground.scaling.z = 10;
    //ground.position.y = 12;
    ground.physicsImpostor = new BABYLON.PhysicsImpostor(
        ground,
        BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9 }
    );
    ground.visibility = 1;
}

function loadFirsMap(scene) {
    let groundTask = scene.assetsManager.addMeshTask(
        "groundTask",
        "",
        "assets/ground/",
        "SmallHouse.glb",
        //"AntiquityMap.glb"
    );

    let i = 0;
    groundTask.onSuccess = function(task) {
        let root = task.loadedMeshes[0];
        //root.scaling = new BABYLON.Vector3(10, 10, 10);
        root.scaling = new BABYLON.Vector3(3.1, 3.1, 3.1);
        let count = 0;
        task.loadedMeshes.forEach(element => {
            if (element.id.includes("GroundColloder")) {
                element.name = "GroundColloder";
                scene.groundMeshes.push(element);
            }

            if (element.id === "GroundCollider") {
                element.name = "ground_" + count;
                //let ground = new Ground(scene, element);
                count++;
                scene.groundMeshes.push(element);
            }
            if (element.id.includes("StairsCollider") ||
                element.id === "FloorCollider") {
                element.name = "ground_" + count;
                count++;
                element.checkCollisions = true;
                scene.groundMeshes.push(element);
                // let ground = new Ground(scene, element);

            } else {
                if (element.id.includes("LanternsCollider") ||
                    element.id.includes("UnderFloorCollider") ||
                    element.id.includes("UnderStairCollider") ||
                    element.id.includes("Roof") ||
                    element.id.includes("TableCollider") ||
                    element.id.includes("BoxCollider")
                ) {
                    element.name = element.id;
                    let wall = new Wall(scene, element);
                } else if (element.id.includes("Tree")) {
                    element.name = element.id;
                    let tree = new Tree(scene, element);
                }
            }

        })
        scene.enemy.push(new Enemy(scene, null));
    }
}