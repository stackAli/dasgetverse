(function(){
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isGame = document.body.classList.contains('game-page') || location.pathname.includes('game.html');
  const isLeaderboard = location.pathname.includes('leaderboard.html');

  function addShell(){
    if(document.querySelector('.three-bg')) return;
    const bg = document.createElement('div');
    bg.className = 'three-bg';
    bg.setAttribute('aria-hidden','true');
    const canvas = document.createElement('canvas');
    canvas.id = 'threePremiumCanvas';
    bg.appendChild(canvas);
    document.body.prepend(bg);
    const glow = document.createElement('div');
    glow.className = 'premium-glow';
    glow.setAttribute('aria-hidden','true');
    document.body.prepend(glow);
  }

  // Only add tilt to non-game, non-leaderboard pages
  function applyTilt(){
    if(isGame || isLeaderboard) return;
    document.querySelectorAll('.feature-card,.character-grid article,.gadget-card,.episode-card,.mission-card,.image-card').forEach((el,i)=>{
      el.style.setProperty('--tilt-delay',(i%8)*0.08+'s');
      el.classList.add('premium-tilt-card');
    });
  }

  function loadThree(cb){
    if(window.THREE) return cb();
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = cb;
    s.onerror = () => {}; // silent fail
    document.head.appendChild(s);
  }

  function init(){
    addShell();
    applyTilt();
    if(reduced) return;
    loadThree(()=>{
      const canvas = document.getElementById('threePremiumCanvas');
      if(!canvas || !window.THREE) return;
      const THREE = window.THREE;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 1000);
      camera.position.set(0, 0, 58);
      const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true});
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
      renderer.setSize(innerWidth, innerHeight);

      const group = new THREE.Group();
      scene.add(group);

      // Doraemon-themed materials
      const matBlue   = new THREE.MeshStandardMaterial({color:0x00AEEF, metalness:0.4, roughness:0.25, transparent:true, opacity:0.75});
      const matDark   = new THREE.MeshStandardMaterial({color:0x004D99, metalness:0.5, roughness:0.2,  transparent:true, opacity:0.7});
      const matYellow = new THREE.MeshStandardMaterial({color:0xFFD700, metalness:0.3, roughness:0.28, transparent:true, opacity:0.72});
      const matWhite  = new THREE.MeshStandardMaterial({color:0xE0F4FF, metalness:0.15, roughness:0.3, transparent:true, opacity:0.65});
      const matRed    = new THREE.MeshStandardMaterial({color:0xE60012, metalness:0.35, roughness:0.3, transparent:true, opacity:0.55});

      // Geometries: spheres (Doraemon head shapes), torus (bell), octahedron, cylinder
      const geos = [
        new THREE.SphereGeometry(1.2, 20, 16),
        new THREE.TorusGeometry(1.3, 0.38, 20, 60),
        new THREE.OctahedronGeometry(1.4),
        new THREE.CylinderGeometry(0.7, 0.9, 1.8, 8),
        new THREE.IcosahedronGeometry(1.3, 1)
      ];
      const mats = [matBlue, matDark, matYellow, matWhite, matRed];

      for(let i = 0; i < 38; i++){
        const mesh = new THREE.Mesh(geos[i % geos.length], mats[i % mats.length]);
        mesh.position.set(
          (Math.random()-0.5)*95,
          (Math.random()-0.5)*55,
          -Math.random()*58
        );
        mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
        const s = 0.5 + Math.random()*1.4;
        mesh.scale.setScalar(s);
        mesh.userData = {
          speed: 0.001+Math.random()*0.004,
          drift: 0.12+Math.random()*0.5,
          baseY: mesh.position.y
        };
        group.add(mesh);
      }

      // Stars (Doraemon's sky)
      const starsGeo = new THREE.BufferGeometry();
      const pts = [];
      for(let i = 0; i < 420; i++){
        pts.push((Math.random()-0.5)*130,(Math.random()-0.5)*75,-Math.random()*110);
      }
      starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const starMat = new THREE.PointsMaterial({size:0.14, color:0xCCEEFF, transparent:true, opacity:0.6});
      scene.add(new THREE.Points(starsGeo, starMat));

      // Lighting
      scene.add(new THREE.AmbientLight(0xCCEEFF, 0.8));
      const l1 = new THREE.DirectionalLight(0x00AEEF, 1.6);
      l1.position.set(12, 18, 24);
      scene.add(l1);
      const l2 = new THREE.PointLight(0xFFD700, 1.0, 90);
      l2.position.set(-22, -16, 20);
      scene.add(l2);
      const l3 = new THREE.PointLight(0x004D99, 0.8, 80);
      l3.position.set(18, 10, -10);
      scene.add(l3);

      let mouseX = 0, mouseY = 0;
      addEventListener('mousemove', e => {
        mouseX = (e.clientX/innerWidth - 0.5);
        mouseY = (e.clientY/innerHeight - 0.5);
      }, {passive:true});
      addEventListener('resize', ()=>{
        camera.aspect = innerWidth/innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
      });

      const clock = new THREE.Clock();
      function animate(){
        const t = clock.getElapsedTime();
        group.rotation.y += 0.0012 + mouseX*0.0006;
        group.rotation.x += (mouseY*0.08 - group.rotation.x)*0.012;
        group.children.forEach((m,i)=>{
          m.rotation.x += m.userData.speed*(i%3+1);
          m.rotation.y += m.userData.speed*1.6;
          m.position.y = m.userData.baseY + Math.sin(t*m.userData.drift+i)*1.3;
        });
        camera.position.x += (mouseX*3 - camera.position.x)*0.025;
        camera.position.y += (-mouseY*2.5 - camera.position.y)*0.025;
        camera.lookAt(0,0,0);
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      }
      animate();
    });
  }

  function enhanceGameFullscreen(){
    const wrap = document.querySelector('.game-wrap');
    const actions = document.querySelector('.game-actions');
    if(!wrap || !actions || document.getElementById('fullScreenGame')) return;
    const btn = document.createElement('button');
    btn.className = 'btn ghost fullscreen-btn';
    btn.id = 'fullScreenGame';
    btn.type = 'button';
    btn.textContent = '⛶ Full Screen';
    actions.prepend(btn);
    btn.addEventListener('click', async()=>{
      try {
        if(!document.fullscreenElement){ await wrap.requestFullscreen(); btn.textContent='⛶ Exit Full Screen'; }
        else { await document.exitFullscreen(); btn.textContent='⛶ Full Screen'; }
      } catch(e){}
    });
    document.addEventListener('fullscreenchange',()=>{
      btn.textContent = document.fullscreenElement ? '⛶ Exit Full Screen' : '⛶ Full Screen';
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    init();
    enhanceGameFullscreen();
  });
})();
