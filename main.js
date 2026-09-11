import * as THREE from 'three';
import { Engine } from './engine';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

"use strict";

let viewport = [window.innerWidth, window.innerHeight];

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);

const geometry = new THREE.IcosahedronGeometry( 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
const ico = new THREE.Mesh( geometry, material );
scene.add( ico );

const geometry2 = new THREE.BoxGeometry( 10, 3, 2 );
const material2 = new THREE.MeshBasicMaterial( { color: 0x00000 } );
const white = new THREE.MeshBasicMaterial( { color: 0xffffff } );
const ico2 = new THREE.Mesh( geometry2, material2 );
ico2.name = "reflect";
ico2.position.set(0, 0.50001, 4);
scene.add( ico2 );

const tg = new THREE.TorusKnotGeometry( 1, 0.25, 16, 4 ); 
const tm = new THREE.MeshBasicMaterial( { color: 0xffff00 } ); 
const torusKnot = new THREE.Mesh( tg, tm );
torusKnot.position.set(2.5, 0.5, -2.5);
scene.add( torusKnot );

const planeG = new THREE.PlaneGeometry( 10, 10 );
const gray = new THREE.MeshBasicMaterial({color: 0xAAAAAA, side: THREE.DoubleSide});
const plane = new THREE.Mesh(planeG, gray);
plane.rotateX(-Math.PI/2);
plane.position.setY(-1);
scene.add(plane);

camera.position.x = 5;

const raycaster = new THREE.Raycaster();

let prevColors = {
    r: 0,
    g: 0,
    b: 0
};

const updateParam = () =>
{
    if (document.getElementById("PixelRes").value*0 == 0 && prevPs != document.getElementById("PixelRes").value)
    {
        ps = Math.round(window.innerWidth/document.getElementById("PixelRes").value/2)*2;
        prevPs = document.getElementById("PixelRes").value;
    }

    if (document.getElementById("aBI").value*0 == 0 && prevABI != document.getElementById("aBI").value)
    {
        aBI = prevABI = document.getElementById("aBI").value;
    }

    if (document.getElementById("pI").value*0 == 0 && prevPI != document.getElementById("pI").value)
    {
        pI = prevPI = document.getElementById("pI").value;
    }
    
    if (((document.getElementById("R").value+document.getElementById("G").value+document.getElementById("B").value)*0 == 0) && prevColors != {r: document.getElementById("R").value, g: document.getElementById("G").value, b: document.getElementById("B").value})
    {
        skyColor = {r: document.getElementById("R").value/255, g: document.getElementById("G").value/255, b: document.getElementById("B").value/255};
        prevColors = {r: document.getElementById("R").value, g: document.getElementById("G").value, b: document.getElementById("B").value};
    }
}

const update = () =>
{
    updateParam();

    controls.update();
};

const canvas = document.getElementById("Viewport");
const ctx = canvas.getContext("2d");

// Pixel Size
let ps = Math.round(window.innerWidth/125/2)*2;
let prevPs = 0;

const buffer = document.createElement("canvas").getContext("2d");

let dir = new THREE.Vector3();

// Light
const lightV = new THREE.Vector3(10, 10, 10);
let aBI = 32;
let prevABI;

let pI = 1;
let prevPI;

const lg = new THREE.IcosahedronGeometry(0.5,1);
const Light = new THREE.Mesh(lg, white);
Light.name = "light";
Light.position.set(lightV.x, lightV.y, lightV.z);

let skyColor = {
    r: 195/255,
    g: 223/255,
    b: 255/255
}

renderer.render(scene, camera);

const calculateReflections = (i1, r) => {
    dir.addVectors( r.ray.direction, i1[0].face.normal.multiplyScalar(2) ).normalize();
    // dir.multiplyVectors(dir, new THREE.Vector3(1,1,-1))

    const rc = new THREE.Raycaster(i1[0].point, dir);
    const i2 = rc.intersectObjects(scene.children);
    if (i2.length>0)
    {
        let c;
        let theta;
        let index = 0;
        if ( ico2 != i2[0].object )
        {
            c = i2[0].object.material.color;
            dir.subVectors( lightV, i2[0].point ).normalize();
            theta = i2[0].face.normal.angleTo(dir);
        }
        else if (i2.length > 1)
        {
            c = i2[1].object.material.color;
            dir.subVectors( lightV, i2[1].point ).normalize();
            index = 1;
            theta = i2[1].face.normal.angleTo(dir);
        }
        else
        {
            c = i2[0].object.material.color;
            dir.subVectors( lightV, i2[0].point ).normalize();
            theta = i2[0].face.normal.angleTo(dir);
        }
                            
        let i = Math.cos(theta);

        const raycaster2 = new THREE.Raycaster(i2[index].point, dir);
        const intersects2 = raycaster2.intersectObjects(scene.children);
        if (intersects2.length > 1 || (intersects2.length == 1 && intersects2[0].distance > 0.00001))
        {
                        
            return {r:c.r*(aBI/255), g:c.g*(aBI/255), b:c.b*(aBI/255), a:1};
        }
        else
        {
            if (i < 0) i = 0;
            i += aBI/255;
        }

        return {r: c.r*i*pI, g: c.g*i*pI, b: c.b*i*pI, a:1};
    }

    return {r:skyColor.r, g:skyColor.g, b:skyColor.b, a:0};
};

const updateRender = () =>
{

    for (let x = 0; x < viewport[0]; x+=ps)
    {
        for (let y = 0; y < viewport[1]; y+=ps)
        {
            const pixel = new THREE.Vector2(( x / window.innerWidth ) * 2 - 1, -( y / window.innerHeight ) * 2 + 1);
            raycaster.setFromCamera(pixel, camera);
            const intersects = raycaster.intersectObjects(scene.children);
    
            let color = {};
            let intensity = 1;

            if (intersects.length > 0)
            {
                if (intersects[0].object.name == "reflect")
                {
                    color = calculateReflections(intersects, raycaster);
                    const a = color.a == 1 ? aBI/255 : 0;
                    buffer.fillStyle = `rgb(${color.r*255+a},${color.g*255+a},${color.b*255+a})`;
                }
                else if (intersects[0].object.name == "light")
                {
                    color = {r: 1, g: 1, b: 1}
                }
                else
                {
                    dir.subVectors( lightV, intersects[0].point ).normalize();

                    const raycaster2 = new THREE.Raycaster(intersects[0].point, dir);
                    const intersects2 = raycaster2.intersectObjects(scene.children);
                    // let lit = false;

                    // if (intersects2.length > 0 && (intersects2[0].object.name == "light" || (intersects2[1].object.name == "light"&& intersects2.length < 3 && intersects2.length > 1 && intersects2[0].distance < 0.000000001)))
                    //     lit = true;

                    if ((intersects2.length > 1 || (intersects2.length == 1 && intersects2[0].distance > 0.00001)))
                    {
                        let c = intersects[0].object.material.color;
                        
                        color = {r:c.r*(aBI/255), g:c.g*(aBI/255), b:c.b*(aBI/255)};
                        buffer.fillStyle = `rgb(${color.r*255+aBI/255},${color.g*255+aBI/255},${color.b*255+aBI/255})`;
                    }
                    else
                    {
                        if (intersects[0].object.isMesh)
                        {
                            color = intersects[0].object.material.color;
                            const theta = intersects[0].face.normal.angleTo(dir);
                            
                            intensity = Math.cos(theta);
                            if (intensity < 0) intensity = 0;
                            intensity += aBI/255;
                        }
                        else
                        {
                            intensity = 1;
                        }
                        buffer.fillStyle = `rgb(${color.r*255*intensity*pI+aBI/255},${color.g*255*intensity*pI+aBI/255},${color.b*255*intensity*pI+aBI/255})`;
                    }
                }
            }
            else
            {
                buffer.fillStyle = `rgb(${skyColor.r*255},${skyColor.g*255},${skyColor.b*255})`;
            }
            
    
            buffer.fillRect(x, y, ps, ps);
        }
    }

    ctx.drawImage(
        buffer.canvas,
        0, 0,
        buffer.canvas.width, buffer.canvas.height,
        0, 0,
        canvas.width, canvas.height
    );
}

const render = () => {
    
    updateRender();
    
};

const engine = new Engine(30, update, render);
engine.start();

canvas.width = buffer.canvas.width = window.innerWidth;
canvas.height = buffer.canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    canvas.width = buffer.canvas.width = window.innerWidth;
    canvas.height = buffer.canvas.height = window.innerHeight;

    updateRender();

    viewport = [window.innerWidth, window.innerHeight];
    ps = Math.round(window.innerWidth/125/2)*2;
});