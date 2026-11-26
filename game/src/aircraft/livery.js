import * as THREE from '../../vendor/three.module.min.js';

export function paintRegistration(text, ink = '#203e48', backing = '#f5cf92') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 104;
  const g = canvas.getContext('2d');
  g.fillStyle = backing;
  g.fillRect(0, 0, 512, 104);
  g.fillStyle = ink;
  g.font = '800 71px monospace';
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  g.fillText(text, 256, 56);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
}

export function paintPetrelWing() {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 320;
  const g = canvas.getContext('2d');
  g.fillStyle = '#e9dfc1';
  g.fillRect(0, 0, 1536, 320);
  g.fillStyle = '#be4b27';
  g.fillRect(0, 0, 201, 320);
  g.fillRect(1335, 0, 201, 320);
  g.fillStyle = '#253f4a';
  g.fillRect(201, 0, 35, 320);
  g.fillRect(1300, 0, 35, 320);
  g.fillRect(0, 280, 1536, 40);
  g.fillStyle = '#f9eac5';
  g.fillRect(0, 262, 1536, 13);
  for (let i = 70; i < 1480; i += 114) {
    g.fillStyle = '#70695350';
    g.fillRect(i, 15, 1.7, 241);
    for (let y = 32; y < 255; y += 30) {
      g.beginPath();
      g.arc(i + 5, y, 1.65, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.fillStyle = '#24414c';
  g.font = '800 79px monospace';
  g.textAlign = 'center';
  g.fillText('HR-PTL', 1114, 170);
  g.save();
  g.translate(421, 136);
  g.beginPath();
  g.moveTo(-87, -19);
  g.lineTo(-10, 5);
  g.lineTo(0, -23);
  g.lineTo(16, -25);
  g.lineTo(25, 4);
  g.lineTo(83, -23);
  g.lineTo(40, 25);
  g.lineTo(3, 38);
  g.lineTo(-40, 27);
  g.closePath();
  g.fill();
  g.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
}
