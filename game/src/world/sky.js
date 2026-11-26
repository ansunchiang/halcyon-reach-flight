import * as THREE from '../../vendor/three.module.min.js';

const DAY = {
  zenith: '#367fac', rim: '#f4d8aa', sun: '#ffe2a5', mist: '#b6beb5',
  cloud: '#ffeccd', shade: '#8d9fa9', brightness: 2.48, ambient: 1.72,
  direction: [-.90, .39, .21]
};
const DUSK = {
  zenith: '#152441', rim: '#c27d77', sun: '#ff9b70', mist: '#6d778e',
  cloud: '#d1989c', shade: '#475476', brightness: .82, ambient: 1.15,
  direction: [-.61, .009, -.79]
};

export function buildSky(scene) {
  const uniforms = {
    zenith: { value: new THREE.Color() }, rim: { value: new THREE.Color() },
    sun: { value: new THREE.Color() }, cloud: { value: new THREE.Color() },
    shade: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() },
    time: { value: 0 }, night: { value: 0 }
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(26000, 40, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms,
    vertexShader: `
      varying vec3 ray;
      void main() {
        ray = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: `
      varying vec3 ray;
      uniform vec3 zenith, rim, sun, cloud, shade, sunDir;
      uniform float time, night;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(73.74, 221.39))) * 17581.273); }
      float noise(vec2 p) {
        vec2 i=floor(p), f=fract(p);
        f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
      }
      float fbm(vec2 p) {
        return noise(p)*.52+noise(p*2.06+5.)*.25+noise(p*4.13-2.)*.13+noise(p*8.37+9.)*.07+noise(p*16.8)*.03;
      }
      void main() {
        vec3 d=normalize(ray);
        float h=max(0.,d.y);
        vec3 sky=mix(rim,zenith,smoothstep(-.04,.60,d.y));
        float glare=max(0.,dot(d,sunDir));
        sky=mix(sky,sun,pow(glare,12.)*.24+pow(glare,120.)*.53);
        sky+=sun*smoothstep(.99962,.99989,glare)*1.3;
        vec2 p=d.xz/max(.08,d.y+.2)*vec2(3.8,4.7)+vec2(time*.006,0.);
        float layers=fbm(p+vec2(0.,fbm(p*.4)*1.6));
        float wisps=smoothstep(.50,.75,layers)*smoothstep(.02,.22,h);
        float light=smoothstep(.43,.73,fbm(p-vec2(.19,.20)));
        sky=mix(sky,mix(cloud,shade,light*.62),wisps*.94);
        float stars=step(.9983,hash(floor(d.xz*830.)))*smoothstep(.24,.72,h)*night;
        sky+=vec3(stars*.28);
        gl_FragColor=vec4(sky,1.);
        #include <colorspace_fragment>
      }`
  }));
  sky.frustumCulled = false;
  sky.renderOrder = -30;
  scene.add(sky);
  scene.fog = new THREE.FogExp2(DAY.mist, .00022);
  const hemisphere = new THREE.HemisphereLight('#d9e7fb', '#657a62', DAY.ambient);
  const sunlight = new THREE.DirectionalLight(DAY.sun, DAY.brightness);
  scene.add(hemisphere, sunlight);

  function setLight(dusk) {
    const light = dusk ? DUSK : DAY;
    for (const key of ['zenith', 'rim', 'sun', 'cloud', 'shade']) uniforms[key].value.set(light[key]);
    uniforms.sunDir.value.set(...light.direction).normalize();
    uniforms.night.value = Number(dusk);
    scene.fog.color.set(light.mist);
    hemisphere.intensity = light.ambient;
    hemisphere.color.set(dusk ? '#8b9ac0' : '#e7efff');
    sunlight.color.set(light.sun);
    sunlight.intensity = light.brightness;
    sunlight.position.copy(uniforms.sunDir.value).multiplyScalar(1000);
  }
  setLight(false);
  return {
    setLight,
    uniforms,
    update(camera, time) {
      sky.position.copy(camera.position);
      uniforms.time.value = time;
    }
  };
}
