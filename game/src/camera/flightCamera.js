import * as THREE from '../../vendor/three.module.min.js';
import { clamp, smooth } from '../core/math.js';
import { surfaceHeight } from '../world/elevation.js';

export function createFlightCamera() {
  const camera = new THREE.PerspectiveCamera(58, 1, .16, 56000);
  const target = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const view = new THREE.Vector3();
  const pose = new THREE.Euler(0, 0, 0, 'YXZ');
  const orientation = new THREE.Quaternion();
  let initialized = false;
  let lookYaw = 0;
  let lookPitch = 0;

  return {
    camera, mode: 'chase',
    reset(mode = 'chase') {
      this.mode = mode;
      lookYaw = lookPitch = 0;
      initialized = false;
    },
    toggle() {
      this.reset(this.mode === 'chase' ? 'cockpit' : 'chase');
    },
    drag(dx, dy) {
      lookYaw = clamp(lookYaw - dx * .0055, -2.5, 2.5);
      lookPitch = clamp(lookPitch - dy * .0048, -.77, .85);
    },
    update(plane, dt, title) {
      const cockpit = this.mode === 'cockpit';
      pose.set(plane.pitch, -plane.yaw, -plane.roll);
      orientation.setFromEuler(pose);
      const fov = cockpit ? 66 : title ? 58 : 54;
      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      if (cockpit) {
        target.set(0, 1.19, -.83).applyQuaternion(orientation).add(view.set(plane.x, plane.y, plane.z));
        camera.position.copy(target);
        camera.quaternion.copy(orientation);
        camera.rotateY(lookYaw);
        camera.rotateX(lookPitch - .06);
      } else {
        const yaw = -plane.yaw + lookYaw;
        const range = title ? 48 : 27.0;
        offset.set(Math.sin(yaw) * range, title ? 16 : 11.2, Math.cos(yaw) * range);
        target.set(plane.x, plane.y, plane.z).add(offset);
        target.y = Math.max(target.y, surfaceHeight(target.x, target.z) + 3);
        if (!initialized) camera.position.copy(target);
        else camera.position.lerp(target, 1 - Math.exp(-5.9 * dt));
        view.set(-Math.sin(yaw), clamp(plane.vy * .004 - .184 + lookPitch, -.86, .79), -Math.cos(yaw));
        camera.lookAt(target.copy(camera.position).add(view));
        camera.rotateZ(smooth(0, -plane.roll * .15, 15, .13));
      }
      initialized = true;
    }
  };
}
