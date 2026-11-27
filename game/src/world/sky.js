import * as THREE from '../../vendor/three.module.min.js';

const DAY = {
  zenith: '#346991', rim: '#eeac75', sun: '#ffd39a', mist: '#c18b79',
  cloud: '#f6c492', shade: '#6a7393', brightness: 3.18, ambient: 1.40,
  direction: [.375, .166, -.912], haze: .000115
};
const DUSK = {
  zenith: '#152441', rim: '#c27d77', sun: '#ff9b70', mist: '#6d778e',
  cloud: '#d1989c', shade: '#475476', brightness: .82, ambient: 1.15,
  direction: [-.61, .009, -.79], haze: .00019
};

export function buildSky(scene) {
  const uniforms = {
    zenith: { value: new THREE.Color() }, rim: { value: new THREE.Color() },
    sun: { value: new THREE.Color() }, cloud: { value: new THREE.Color() },
    shade: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() },
    time: { value: 0 }, night: { value: 0 }, haze: { value: DAY.haze }
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
        vec3 sky=mix(rim,zenith,smoothstep(-.025,.40,d.y));
        float glare=max(0.,dot(d,sunDir));
        sky+=sun*(pow(glare,26.)*.16+pow(glare,135.)*.31+pow(glare,900.)*.47);
        vec2 p=d.xz/max(.08,d.y+.2)*vec2(3.8,4.7)+vec2(time*.006,0.);
        float layers=fbm(p+vec2(0.,fbm(p*.4)*1.6));
        float wisps=smoothstep(.47,.69,layers)*smoothstep(.022,.17,h);
        float edge=clamp((layers-fbm(p-vec2(.14,.10)))*4.+.38,0.,1.);
        vec3 lit=mix(shade,cloud,edge)*(.82+pow(glare,20.)*.45);
        sky=mix(sky,lit,wisps*.90);
        sky+=sun*smoothstep(.99965,.99978,glare)*(3.-wisps);
        float stars=step(.9983,hash(floor(d.xz*830.)))*smoothstep(.24,.72,h)*night;
        sky+=vec3(stars*.28);
        gl_FragColor=vec4(sky,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  sky.frustumCulled = false;
  sky.renderOrder = -30;
  scene.add(sky);
  scene.fog = new THREE.FogExp2(DAY.mist, DAY.haze);
  const hemisphere = new THREE.HemisphereLight('#b6ccfa', '#717f9f', DAY.ambient);
  const sunlight = new THREE.DirectionalLight(DAY.sun, DAY.brightness);
  scene.add(hemisphere, sunlight);

  function setLight(dusk) {
    const light = dusk ? DUSK : DAY;
    for (const key of ['zenith', 'rim', 'sun', 'cloud', 'shade']) uniforms[key].value.set(light[key]);
    uniforms.sunDir.value.set(...light.direction).normalize();
    uniforms.night.value = Number(dusk);
    uniforms.haze.value = scene.fog.density = light.haze;
    scene.fog.color.set(light.mist);
    hemisphere.intensity = light.ambient;
    hemisphere.color.set(dusk ? '#8b9ac0' : '#b6ccfa');
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
