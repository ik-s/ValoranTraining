import * as THREE from "three";

import { angularSizeToWorldSize } from "../modes/TargetMath";
import type { HitResult, TrainingTarget } from "../modes/TrainingMode";

interface RenderedTarget {
  target: TrainingTarget;
  root: THREE.Object3D;
  hitObjects: THREE.Object3D[];
}

const degreesToRadians = (value: number): number => (value * Math.PI) / 180;

export class AimArenaScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(75, 1, 0.1, 250);
  readonly renderer: THREE.WebGLRenderer;
  private readonly targets = new Map<string, RenderedTarget>();

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0c0e10);
    this.container.replaceChildren(this.renderer.domElement);
    this.camera.position.set(0, 1.65, 0);
    this.camera.rotation.order = "YXZ";
    this.buildArena();
    this.resize();
  }

  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  addTarget(target: TrainingTarget): void {
    const root = target.hitRegions ? this.createRobotTarget(target) : this.createCircularTarget(target);
    const hitObjects: THREE.Object3D[] = [];
    root.traverse((object) => {
      if (object.userData.targetId) {
        hitObjects.push(object);
      }
    });
    this.targets.set(target.id, { target, root, hitObjects });
    this.scene.add(root);
  }

  updateTarget(target: TrainingTarget): void {
    const rendered = this.targets.get(target.id);
    if (!rendered) {
      return;
    }
    rendered.target = target;
    this.positionTarget(rendered.root, target);
    rendered.root.traverse((object) => {
      const material = object instanceof THREE.Mesh ? object.material : null;
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissive.setHex(target.active ? 0xff4655 : 0x3f1d22);
      }
    });
  }

  removeTarget(targetId: string): void {
    const rendered = this.targets.get(targetId);
    if (!rendered) {
      return;
    }
    this.scene.remove(rendered.root);
    this.disposeObject(rendered.root);
    this.targets.delete(targetId);
  }

  raycastCenter(): HitResult {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hitObjects = [...this.targets.values()].flatMap((target) => target.hitObjects);
    const hit = raycaster.intersectObjects(hitObjects, false)[0];
    if (!hit) {
      return { targetId: null };
    }
    return {
      targetId: hit.object.userData.targetId as string,
      region: hit.object.userData.region as "head" | "body" | undefined,
    };
  }

  getPrimaryTarget(): TrainingTarget | null {
    return this.targets.values().next().value?.target ?? null;
  }

  getAngularErrorToTarget(target: TrainingTarget): number {
    const yaw = THREE.MathUtils.radToDeg(this.camera.rotation.y);
    const pitch = THREE.MathUtils.radToDeg(this.camera.rotation.x);
    return Math.hypot(target.yaw - yaw, target.pitch - pitch);
  }

  applyCameraRotation(yaw: number, pitch: number): void {
    this.camera.rotation.set(degreesToRadians(pitch), degreesToRadians(yaw), 0);
  }

  resize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    for (const targetId of [...this.targets.keys()]) {
      this.removeTarget(targetId);
    }
    this.scene.traverse((object) => this.disposeObject(object));
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private buildArena(): void {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: 0x11171b, roughness: 0.92 }),
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(120, 60, 0x274047, 0x1b2a30);
    this.scene.add(grid);

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x161d22, roughness: 0.8, metalness: 0.15 });
    const wallGeometry = new THREE.BoxGeometry(120, 16, 1);
    const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
    frontWall.position.set(0, 8, -55);
    this.scene.add(frontWall);

    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-55, 8, 0);
    this.scene.add(leftWall);

    const rightWall = leftWall.clone();
    rightWall.position.x = 55;
    this.scene.add(rightWall);

    this.scene.add(new THREE.HemisphereLight(0xa8c7d1, 0x12161a, 1.3));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(6, 12, 4);
    this.scene.add(keyLight);
  }

  private createCircularTarget(target: TrainingTarget): THREE.Group {
    const group = new THREE.Group();
    const distance = target.distance ?? 25;
    const diameter = angularSizeToWorldSize(distance, target.angularSize);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(diameter / 2, 20, 16),
      new THREE.MeshStandardMaterial({
        color: target.active ? 0xff4655 : 0xff783f,
        emissive: target.active ? 0xff4655 : 0x3f1d22,
        emissiveIntensity: 0.65,
        roughness: 0.36,
      }),
    );
    mesh.userData.targetId = target.id;
    group.add(mesh);
    this.positionTarget(group, target);
    return group;
  }

  private createRobotTarget(target: TrainingTarget): THREE.Group {
    const group = new THREE.Group();
    const distance = target.distance ?? 16;
    const size = angularSizeToWorldSize(distance, target.angularSize);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x68737a, roughness: 0.62, metalness: 0.38 });
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0x9daab0, emissive: 0x267a75, emissiveIntensity: 0.45 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(size * 1.8, size * 2.5, size), bodyMaterial);
    body.position.y = 0;
    body.userData.targetId = target.id;
    body.userData.region = "body";
    const head = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.9, size * 0.9), headMaterial);
    head.position.y = size * 1.7;
    head.userData.targetId = target.id;
    head.userData.region = "head";
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(size * 2.4, size * 0.35, size * 0.7), bodyMaterial);
    shoulder.position.y = size * 0.75;
    group.add(body, head, shoulder);
    this.positionTarget(group, target);
    return group;
  }

  private positionTarget(object: THREE.Object3D, target: TrainingTarget): void {
    const distance = target.distance ?? 25;
    const yaw = degreesToRadians(target.yaw);
    const pitch = degreesToRadians(target.pitch);
    object.position.set(
      Math.sin(yaw) * Math.cos(pitch) * distance,
      1.65 + Math.sin(pitch) * distance,
      -Math.cos(yaw) * Math.cos(pitch) * distance,
    );
  }

  private disposeObject(object: THREE.Object3D): void {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    }
  }
}
