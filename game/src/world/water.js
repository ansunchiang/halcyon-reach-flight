import * as THREE from '../../vendor/three.module.min.js';
import { LAKE } from './chart.js';
import { elevation, lakeRadius, riverCenter, waterLevel } from './elevation.js';

export function buildWater(scene, sky) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: sky.uniforms.time, sunDir: sky.uniforms.sunDir,
      sun: sky.uniforms.sun, rim: sky.uniforms.rim, night: sky.uniforms.night, haze: sky.uniforms.haze
    },
    vertexShader: `
      attribute float depth;
      varying vec3 point;
      varying float bottom;
      void main() {
        point=(modelMatrix*vec4(position,1.)).xyz;
        bottom=depth;
        gl_Position=projectionMatrix*viewMatrix*vec4(point,1.);
      }`,
    fragmentShader: `
      uniform float time, night, haze;
      uniform vec3 sunDir, sun, rim;
      varying vec3 point;
      varying float bottom;
      void main() {
        vec2 p=point.xz;
        float a=p.x*.109+p.y*.060+time*1.17+sin(p.y*.031)*1.9;
        float b=p.x*.049-p.y*.133-time*.76;
        float c=p.x*.79+p.y*.51+cos(p.y*.043)*2.+time*1.9;
        float fine=1.-smoothstep(.7,3.2,fwidth(c));
        vec3 n=normalize(vec3(cos(a)*.034+cos(c)*.019*fine,1.,cos(b)*.042+cos(c)*.012*fine));
        vec3 view=normalize(cameraPosition-point);
        float atmosphere=pow(1.-max(0.,dot(view,n)),4.);
        vec3 deep=mix(vec3(.016,.078,.124),vec3(.030,.064,.103),night);
        vec3 shallow=mix(vec3(.039,.23,.22),vec3(.064,.154,.176),night);
        vec3 col=mix(shallow,deep,smoothstep(1.,30.,bottom));
        col=mix(col,rim,atmosphere*.37);
        float flash=pow(max(0.,dot(reflect(-sunDir,n),view)),96.);
        col+=sun*flash*(.70+.37*sin(c));
        col+=.017*sin(a)*sin(b)+.008*sin(c)*fine;
        float breakers=1.-smoothstep(.08,.43,abs(bottom-1.52-sin(a)*.77));
        float ripples=1.-smoothstep(.10,.44,abs(bottom-4.7-sin(b)*1.06));
        float foam = (.5+.5*sin(b+sin(c*.41)))*.44+.52;
        col=mix(col,vec3(.66,.76,.72),max(breakers*.70,ripples*.30)*foam);
        float horizon=1.-exp(-pow(distance(cameraPosition,point)*haze,2.));
        col=mix(col,rim,horizon*.69);
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });

  function addWater(geometry, level) {
    const positions = geometry.attributes.position;
    const depth = new Float32Array(positions.count);
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const y = level(x, z);
      positions.setY(i, y);
      depth[i] = y - elevation(x, z);
    }
    geometry.setAttribute('depth', new THREE.BufferAttribute(depth, 1));
    scene.add(new THREE.Mesh(geometry, material));
  }
  const sea = new THREE.PlaneGeometry(52000, 52000, 308, 308);
  sea.rotateX(-Math.PI / 2);
  const vertices = sea.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i) / 26000;
    const z = vertices.getZ(i) / 26000;
    vertices.setX(i, x * (5800 + 20200 * x ** 6));
    vertices.setZ(i, z * (5800 + 20200 * z ** 6) - 1000);
  }
  addWater(sea, () => .05);

  const lake = new THREE.PlaneGeometry(1020, 1460, 63, 83);
  lake.rotateX(-Math.PI / 2).translate(LAKE.x, 0, LAKE.z);
  addWater(lake, (x, z) => lakeRadius(x, z) < 1.045 ? LAKE.y + .19 : LAKE.y - 8);

  const river = new THREE.PlaneGeometry(101, 1320, 11, 66);
  river.rotateX(-Math.PI / 2);
  const riverPoints = river.attributes.position;
  for (let i = 0; i < riverPoints.count; i++) {
    const z = riverPoints.getZ(i) - 173;
    riverPoints.setX(i, riverPoints.getX(i) + riverCenter(z));
    riverPoints.setZ(i, z);
  }
  addWater(river, (x, z) => waterLevel(x, z) + .18);
}
