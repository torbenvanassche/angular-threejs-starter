import { Component, OnInit } from '@angular/core';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader'

@Component({
  selector: 'app-threejs',
  templateUrl: './threejs.component.html',
  styleUrls: ['./threejs.component.scss']
})
export class ThreejsComponent implements OnInit {
  scene: THREE.Scene = new THREE.Scene();
  renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();
  controls?: OrbitControls;

  gltfLoader: GLTFLoader = new GLTFLoader()
  dracoLoader: DRACOLoader = new DRACOLoader();
  ktx: KTX2Loader = new KTX2Loader();
  pmremGenerator: THREE.PMREMGenerator | undefined = undefined;

  ngOnInit(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.dracoLoader.setDecoderPath('/assets/draco/')
    this.ktx.setTranscoderPath('/assets/basis/')
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
    this.ktx.detectSupport(this.renderer)
    this.gltfLoader.setKTX2Loader(this.ktx)

    var that = this;

    this.gltfLoader.load('assets/carton_for_torben.glb', (glb) => {
      this.scene.add(glb.scene);
      this.scene.add(new THREE.AmbientLight())

      // Set up OrbitControls
      this.controls = new OrbitControls(glb.cameras[0], this.renderer.domElement);
      that.loadEXRFromGLB(glb).then(function(env: any) {
        that.scene.environment = env.texture;
      });

    }, undefined, (error) => {
      console.error('An error occurred while loading the GLTF model:', error);
    });

    this.renderer.setAnimationLoop(this.animate)

    // Handle window resize
    window.addEventListener('resize', () => {
      (this.controls!.object! as THREE.PerspectiveCamera).aspect = window.innerWidth / window.innerHeight;
      (this.controls!.object! as THREE.PerspectiveCamera).updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    });
  }

  // Animation loop
  private animate = () => {
    if (this.controls) {
      this.renderer.render(this.scene, (this.controls!.object! as THREE.PerspectiveCamera));
    }
  }

  loadEXRFromGLB = (glb: any) => {
    var image = glb.parser.json.images.filter(function (data: any) {
      return data.mimeType === "image/x-exr";
    })

    if (image.length > 0) {
      var bufferPromises = glb.parser.getDependency("bufferView", image[0].bufferView);

      var that = this;
      return bufferPromises.then(function (buffer: any) {
        var texData = (buffer);
        var texture = new THREE.DataTexture();

        texture.image.data = texData.data;
        texture.source.data.width = texData.width;
        texture.source.data.height = texData.height;
        texture.mapping = THREE.EquirectangularReflectionMapping;

        texture.format = texData.format;
        texture.type = texData.type;
        texture.colorSpace = THREE.LinearSRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        texture.flipY = false;

        texture.needsUpdate = true;
       that.pmremGenerator = new THREE.PMREMGenerator(that.renderer); 
        var envMap = that.pmremGenerator.fromEquirectangular(texture)
        return envMap;
      });
    }
  }
}