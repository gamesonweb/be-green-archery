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

const waves = {
    1: 1,
    2: 5,
    3: 7,
    4: 7
}

var game = new Game();


function Game() {
    this.wave = 0;
    this.wave_cleared = false;
    this.map_name = null;
    this.map_id = null

    this.firstWave = function() {
        this.wave++;
        setTimeout(() => {
            loadEnemyWaves(scene, this.wave);
        }, 5000)

        this.wave_cleared = false;
    };

    this.checkWave = function() {
        if (scene.enemy.length === 0) {
            this.wave_cleared = true;
        }
    };

    this.update = function() {
        //if (!this.scene_launched) return;
        if (this.wave === 5) {
            console.log("first map finished");
            showText("Completed World " + game.map_name);
            this.wave_cleared = false;
            restartButton();
            return;
        }
        if (this.wave_cleared) {
            game.wave++;
            loadEnemyWaves(scene, game.wave);
            game.wave_cleared = false;
        }
        if (scene.getMeshByName("archer").Archer.health <= 0) {
            showGameOver();
            scene.getMeshByName("archer").Archer.destruct();
        }
    }
}


function startGame() {
    canvas = document.querySelector("#myCanvas");
    engine = new BABYLON.Engine(canvas, true);
    scene = createScene();
    loadMenu(scene);

    scene.toRender = () => {
        // update the scene
        let archer = scene.getMeshByName("archer");

        if (archer) {
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

            if (scene.enemy.length > 0) {
                if (game.map_id === 1) {
                    scene.enemy.forEach(enemy => {
                        enemy.followArcher(scene);
                    });
                } else if (game.map_id === 2) {
                    scene.enemy.forEach(enemy => {
                        enemy.fireArrow();
                    });
                }
            }
            game.update();
        }
        scene.render();
    };
}

function createScene() {
    let scene = new BABYLON.Scene(engine);
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
        loadRules();
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

        let archer = new Archer(task.loadedMeshes[0], 1, 0.15, 3, scene, task.loadedSkeletons, arrow, game);

        scene.Archer = archer;

        scene.animationPropertiesOverride = new BABYLON.AnimationPropertiesOverride();
        scene.animationPropertiesOverride.enableBlending = true;
        scene.animationPropertiesOverride.blendingSpeed = 0.05;


        scene.switchActiveCamera(archer.tps_camera);
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
    game.map_name = "Not a map designer"
    game.map_id = 1
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
    }
}


function loadSecondMap(scene) {
    game.map_name = "Defnitly Not a map designer !!"
    game.map_id = 2
    let groundTask = scene.assetsManager.addMeshTask(
        "groundTask",
        "",
        "assets/ground/",
        "Colloseum.glb",
    );

    let i = 0;
    groundTask.onSuccess = function(task) {
        let root = task.loadedMeshes[0];
        root.scaling = new BABYLON.Vector3(2.9, 2.9, 2.9);

        task.loadedMeshes.forEach(element => {
            if (element.id.includes("ColloseumGround")) {
                element.name = "ground";
                scene.groundMeshes.push(element);
            } else if (element.id.includes("Spawn")) {
                element.name = "Spawn_" + i++;
            } else if (element.id.includes("Tribune")) {
                element.name = "ground_tribune_" + Math.floor(Math.random() * 3)
            }

        })
    }
}


function showText(message) {
    var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    let text = new BABYLON.GUI.TextBlock();
    text.text = message;
    text.color = "white";
    text.fontSize = 50;
    text.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    text.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    advancedTexture.addControl(text);

    var fadeOut = new BABYLON.Animation("fadeOut", "alpha", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    var keysOut = [];
    keysOut.push({ frame: 0, value: 1 });
    keysOut.push({ frame: 200, value: 0 });
    fadeOut.setKeys(keysOut);

    text.alpha = 1;
    scene.beginDirectAnimation(text, [fadeOut], 0, 200, false, 1, () => {
        setTimeout(() => {
            text.dispose();
        }, 3000);
    });

}

function loadEnemyWaves(scene, wave) {
    game.wave = wave;

    var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    // Créer un texte pour la vague d'ennemis
    var waveText = new BABYLON.GUI.TextBlock();
    waveText.text = "Wave " + game.wave;
    waveText.color = "white";
    waveText.fontSize = 50;
    waveText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    waveText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    advancedTexture.addControl(waveText);

    // Animation de fondu enchaîné pour le texte

    var fadeIn = new BABYLON.Animation("fadeIn", "alpha", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    var fadeOut = new BABYLON.Animation("fadeOut", "alpha", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);

    var keysIn = [];
    keysIn.push({ frame: 0, value: 0 });
    keysIn.push({ frame: 100, value: 1 });
    fadeIn.setKeys(keysIn);

    var keysOut = [];
    keysOut.push({ frame: 0, value: 1 });
    keysOut.push({ frame: 100, value: 0 });
    fadeOut.setKeys(keysOut);

    // Mettre à jour le texte et jouer l'animation
    waveText.alpha = 1;
    waveText.text = "Wave " + game.wave;
    scene.beginDirectAnimation(waveText, [fadeIn], 0, 100, false, 1, () => {
        setTimeout(() => {
            scene.beginDirectAnimation(waveText, [fadeOut], 0, 100, false, 1, () => {
                waveText.dispose();
                for (let i = 0; i < waves[game.wave]; i++) {
                    if (game.wave === 4) {
                        scene.enemy.push(new Enemy(scene, null, game, .3));
                    } else {
                        scene.enemy.push(new Enemy(scene, null, game));
                    }
                }
            });
        }, 2000);
    });
}

function showGameOver() {
    let advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    let gameOverText = new BABYLON.GUI.TextBlock();
    gameOverText.text = "Game Over";
    gameOverText.color = "red";
    gameOverText.fontSize = 50;
    gameOverText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    gameOverText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;


    restartButton();

    advancedTexture.addControl(gameOverText);

}

function restartButton() {
    let advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    let restartButton = BABYLON.GUI.Button.CreateSimpleButton("restart", "Restart");
    restartButton.width = "150px";
    restartButton.height = "40px";
    restartButton.color = "white";
    restartButton.background = "green";
    restartButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    restartButton.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    restartButton.onPointerUpObservable.add(() => {
        location.reload();
    });
    advancedTexture.addControl(restartButton);
}

function loadMenu(scene) {
    // simple menu for selecting the map and launching the game
    let advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    let title = new BABYLON.GUI.TextBlock();
    title.text = "Archery Tournament";
    title.color = "white";
    title.background = "black";
    title.top = "-40px";
    title.fontSize = 50;
    title.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    title.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;

    let rect_title = new BABYLON.GUI.Rectangle();
    rect_title.width = "500px";
    rect_title.height = "100px";
    rect_title.cornerRadius = 20;
    rect_title.background = "rgba(0, 255, 0, 0.3)";
    rect_title.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    rect_title.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    rect_title.top = "-40px";
    rect_title.zIndex = -5;

    let startButton = BABYLON.GUI.Button.CreateSimpleButton("start_1", "Map 1");
    startButton.width = "150px";
    startButton.height = "40px";
    startButton.top = "-40px";
    startButton.color = "white";
    startButton.background = "green";
    startButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    startButton.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    startButton.onPointerUpObservable.add(() => {
        console.log("start map 1");
        game.map_name = "Map 1";
        // loading the scene for the first map

        modifySettings(scene, document, window, canvas);
        addKeyListener(scene, canvas);

        // enable physics for cannon.js
        scene.enablePhysics();


        // remove the menu
        startButton.dispose();
        startButton2.dispose();
        title.dispose();
        rect_title.dispose();

        // load the scene
        scene.assetsManager = configureAssetManager(scene, "Map 1");
        scene.groundMeshes = [];
        scene.enemy = [];
        loadFirsMap(scene);
        createArcher(scene);
        scene.assetsManager.load();
    });

    let startButton2 = BABYLON.GUI.Button.CreateSimpleButton("start_2", "Map 2");
    startButton2.width = "150px";
    startButton2.height = "40px";
    startButton2.color = "white";
    startButton2.background = "green";
    startButton2.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    startButton2.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    startButton2.onPointerUpObservable.add(() => {
        // loading the scene for the second map
        console.log("start map 2");
        game.map_name = "Map 2";
        modifySettings(scene, document, window, canvas);
        addKeyListener(scene, canvas);

        // enable physics for cannon.js
        scene.enablePhysics();

        // remove the menu
        startButton.dispose();
        startButton2.dispose();
        title.dispose();
        rect_title.dispose();


        scene.assetsManager = configureAssetManager(scene, "Map 2");
        scene.groundMeshes = [];
        scene.enemy = [];
        loadSecondMap(scene);
        createArcher(scene);
        scene.assetsManager.load();
    });

    advancedTexture.addControl(title);
    advancedTexture.addControl(rect_title);
    advancedTexture.addControl(startButton);
    advancedTexture.addControl(startButton2);


    // add basic camera and lights for the menu
    let camera = new BABYLON.FreeCamera(
        "camera1",
        new BABYLON.Vector3(0, 5, -10),
        scene
    );

    let light = new BABYLON.HemisphericLight(
        "light1",
        new BABYLON.Vector3(0, 1, 0),
        scene
    );


    // Créer une texture skybox
    var skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, scene);
    var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("assets/skybox/TropicalSunnyDay", scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyboxMaterial.disableLighting = true;
    skybox.material = skyboxMaterial;

    // Désactiver les ombres pour le skybox
    skybox.receiveShadows = false;

    // Désactiver le background de base de la scène
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

    scene.activeCamera = camera;
    engine.runRenderLoop(function() {
        scene.render();
    });
}

function loadRules() {

    if (game.map_id === 1) {
        setTimeout(() => {
            showText("Don't let the enemies touch you, \nkill them all!");
        }, 2000);
        setTimeout(() => {
            showText("Use ZQSD to move, \nand the mouse to aim and shoot!");
        }, 4000)
    } else if (game.map_id === 2) {
        setTimeout(() => {
            showText("Avoid projectiles, \n and kill them!");
        }, 2000);
        setTimeout(() => {
            showText("Use ZQSD to move, \nand the mouse to aim and shoot!");
        }, 4000)
    }
    setTimeout(() => {
        if (scene.enemy.length === 0) {
            game.firstWave();
        }
    }, 5000)
};