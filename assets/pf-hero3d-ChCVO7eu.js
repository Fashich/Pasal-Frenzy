import{$ as e,C as t,G as n,H as r,I as i,J as a,K as o,N as s,Q as c,S as l,W as u,Y as d,et as f,h as ee,i as te,n as p,nt as ne,r as re}from"./three.module-S5ZDy1Ma.js";import{loadWords as ie,rng as m}from"./pf-kv-CevEu3QE.js";var ae=`
uniform float uTime, uMorph, uIntro, uPR, uAspect, uPointerOn;
uniform vec2 uPointer;
uniform vec4 uSeal;
attribute vec3 aStart, aB, aC, aD, aColor;
attribute vec4 aSizes;
attribute float aSeed, aKind;
varying vec3 vColor;
varying float vAlpha;
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float ease(float t){ return t < .5 ? 4. * t * t * t : 1. - pow(-2. * t + 2., 3.) / 2.; }
float stage(float k){ return ease(clamp((uMorph - k) * 1.35 - aSeed * .35, 0., 1.)); }
void main(){
  vec3 s = position;
  float sr = length(s.xy);
  if (aKind < .5 || aKind > 1.5) {
    float sp = sr > 17.8 ? .035 : (sr > 13.8 ? -.055 : .018);
    s.xy = rot(uTime * sp) * s.xy;
  }
  s.yz = rot(-.22) * s.yz;
  s.xz = rot(.30) * s.xz;
  s = s * uSeal.w + vec3(uSeal.xy, 0.);
  s.y += sin(uTime * .35) * .35;

  vec3 g = aB; float gr = length(g.xz);
  g.y += sin(gr * .32 - uTime * .9) * .5 * smoothstep(50., 6., gr);
  vec3 c = aC; c.xz = rot(uTime * .025) * c.xz;
  vec3 d = aD; float dr = length(d.xz); d.xz = rot(uTime * 1.1 / sqrt(max(dr, 1.5))) * d.xz;

  float t1 = stage(0.), t2 = stage(1.), t3 = stage(2.);
  vec3 pos = mix(s, g, t1); pos = mix(pos, c, t2); pos = mix(pos, d, t3);
  float tr = (t1 * (1. - t1) + t2 * (1. - t2) + t3 * (1. - t3)) * 4.;
  pos += vec3(sin(aSeed * 91. + uTime), cos(aSeed * 53. + uTime * .8), sin(aSeed * 27. + uTime * .6)) * tr * 3.2;
  pos += vec3(sin(uTime * .3 + aSeed * 40.), cos(uTime * .27 + aSeed * 31.), sin(uTime * .21 + aSeed * 17.)) * .12;
  float ti = ease(clamp(uIntro * 1.7 - aSeed * .7, 0., 1.));
  pos = mix(aStart, pos, ti);

  vec4 mv = modelViewMatrix * vec4(pos, 1.);
  vec4 clip = projectionMatrix * mv;
  vec2 ndc = clip.xy / clip.w;
  vec2 dd = (ndc - uPointer) * vec2(uAspect, 1.);
  float dl = length(dd);
  float f = uPointerOn * smoothstep(.26, 0., dl) * step(0., clip.w);
  mv.xy += (dd / max(dl, 1e-3)) * f * (-mv.z) * .06;
  gl_Position = projectionMatrix * mv;

  float depth = max(1., -mv.z);
  float sz = mix(mix(mix(aSizes.x, aSizes.y, t1), aSizes.z, t2), aSizes.w, t3);
  gl_PointSize = sz * uPR * (230. / depth) * (1. + f * .7);

  vec3 col = aColor;
  col = mix(col, vec3(.70, .80, 1.), t1 * (1. - t2) * .55);
  col = mix(col, vec3(.98, .80, .35), t2 * (1. - t3) * step(.7, aSeed) * .6);
  col = mix(col, vec3(.95, .22, .18), t3 * smoothstep(14., 3.5, length(aD.xz)) * .85);
  vColor = col + f * vec3(.15, .25, .5);
  float tw = .65 + .35 * sin(uTime * 1.7 + aSeed * 60.);
  vAlpha = .58 * mix(1., tw, .6) * smoothstep(260., 30., depth) * (.25 + .75 * ti);
}`,oe=`
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec2 c = gl_PointCoord - .5;
  float d = length(c);
  if (d > .5) discard;
  float a = smoothstep(.5, 0., d); a *= a;
  gl_FragColor = vec4(vColor * a, a * vAlpha);
}`,h=e=>{let t=0;for(;t===0;)t=e();return Math.sqrt(-2*Math.log(t))*Math.cos(2*Math.PI*e())},se=e=>e<.5?4*e*e*e:1-(-2*e+2)**3/2,g=e=>Math.max(0,Math.min(1,e)),_=(e,t,n)=>{let r=g((n-e)/(t-e));return r*r*(3-2*r)};async function ce(e,t,n){let r=document.createElement(`canvas`);r.width=640,r.height=260;let i=r.getContext(`2d`,{willReadFrequently:!0});try{await document.fonts.load(`700 220px "Playfair Display"`)}catch{}i.fillStyle=`#fff`,i.textAlign=`center`,i.textBaseline=`middle`,i.font=`700 220px "Playfair Display", Georgia, serif`,i.fillText(e,320,140);let a=i.getImageData(0,0,640,260).data,o=[];for(let e=0;e<260;e+=2)for(let t=0;t<640;t+=2)a[(e*640+t)*4+3]>140&&o.push([t,e]);let s=[];for(let e=0;e<t;e++){let e=o[Math.floor(n()*o.length)]||[320,130];s.push([(e[0]-320)/640*20+(n()-.5)*.06,-(e[1]-130)/640*20+(n()-.5)*.06])}return s}var le=[{p:[0,0,64],l:[0,0,0]},{p:[0,24,50],l:[0,-8,-6]},{p:[0,4,78],l:[0,0,0]},{p:[0,40,38],l:[0,-2,0]}];async function v(v,ue={}){let y=!!ue.lite,b=!!ue.reduced,x=new ne({canvas:v,antialias:!1,alpha:!1,powerPreference:`high-performance`,preserveDrawingBuffer:!0});x.setClearColor(526352,1);let S=new u;S.fog=new ee(526352,.012);let C=new s(50,1,.1,500);C.position.set(0,0,64);let w=y?7e3:18e3,T=m(1945),de=await ce(`1945`,Math.ceil(w*.26),T),E=new Float32Array(w*3),D=new Float32Array(w*3),O=new Float32Array(w*3),k=new Float32Array(w*3),A=new Float32Array(w*3),j=new Float32Array(w*3),fe=new Float32Array(w),pe=new Float32Array(w),M=new Float32Array(w*4),N=m(73),P=[];for(let e=0;e<73;e++)P.push([(N()-.5)*92,(N()-.5)*46,(N()-.5)*52]);let F=[],I=new Set;P.forEach((e,t)=>{let n=P.map((t,n)=>[n,(e[0]-t[0])**2+(e[1]-t[1])**2+(e[2]-t[2])**2]).filter(e=>e[0]!==t).sort((e,t)=>e[1]-t[1]);for(let[e]of n.slice(0,2)){let n=t<e?`${t}-${e}`:`${e}-${t}`;I.has(n)||(I.add(n),F.push([t,e]))}});let L=Math.PI*2/96,me=0;for(let e=0;e<w;e++){let t=e/w,n=e*3,r=e*4;fe[e]=T();let i=T()*Math.PI*2,a=Math.acos(2*T()-1),o=70+T()*110;A[n]=Math.sin(a)*Math.cos(i)*o,A[n+1]=Math.sin(a)*Math.sin(i)*o*.55,A[n+2]=Math.cos(a)*o*.8-30;let s,c,l=h(T)*.12,u=0,d=.8;if(t<.26){let e=de[me++%de.length];s=e[0],c=e[1],l=(T()-.5)*.6,u=1,d=.85+T()*.5}else if(t<.44){let e=Math.floor(T()*96),t=-Math.PI/2+e*L+T()*L*.52,n=18.5+T()*1.5;s=Math.cos(t)*n,c=Math.sin(t)*n,u=2,d=.95}else if(t<.52){let e=T()*Math.PI*2,t=16.9+h(T)*.07;s=Math.cos(e)*t,c=Math.sin(e)*t,d=.6}else if(t<.66){let e=Math.floor(T()*170),t=e%10==0,n=-Math.PI/2+Math.PI*2/170*e,r=t?13.9+T()*2.3:14.7+T()*1.3;s=Math.cos(n)*r,c=Math.sin(n)*r,u=t?3:0,d=t?1:.7}else if(t<.78){let e=T()*Math.PI*2,t=(T()<.6?12.2:11.55)+h(T)*.05;s=Math.cos(e)*t,c=Math.sin(e)*t,d=.75}else{let e=T()*Math.PI*2,t=Math.sqrt(T())*11;s=Math.cos(e)*t,c=Math.sin(e)*t,l=h(T)*1.6,d=.3+T()*.4}E[n]=s,E[n+1]=c,E[n+2]=l,pe[e]=u,M[r]=d;{let e=T()<.5,t=-62+(Math.floor(T()*46)+.5)*(124/46),i=(T()-.5)*124,a=e?i:t,o=e?t:i,s=a*a+o*o;D[n]=a,D[n+1]=-5-18*Math.exp(-s/240)-8*Math.exp(-s/34),D[n+2]=o,M[r+1]=.55+T()*.25}{let e=T(),t,i,a,o;if(e<.3){let e=P[Math.floor(T()*73)];t=e[0]+h(T)*.45,i=e[1]+h(T)*.45,a=e[2]+h(T)*.45,o=1.1+T()*.5}else if(e<.93){let[e,n]=F[Math.floor(T()*F.length)],r=T(),s=P[e],c=P[n];t=s[0]+(c[0]-s[0])*r+h(T)*.06,i=s[1]+(c[1]-s[1])*r+h(T)*.06,a=s[2]+(c[2]-s[2])*r+h(T)*.06,o=.45}else t=(T()-.5)*200,i=(T()-.5)*110,a=-T()*120+10,o=.4;O[n]=t,O[n+1]=i,O[n+2]=a,M[r+2]=o}{let e=T(),t,i,a,o;if(e<.1){let e=T()*Math.PI*2,n=3.3+h(T)*.12;t=Math.cos(e)*n,a=Math.sin(e)*n,i=h(T)*.08,o=1.1}else{let e=3.8+T()**1.7*46,n=Math.floor(T()*3),r=Math.log(e)*2.6+n*2.0944+h(T)*.28*(.6+e/40);t=Math.cos(r)*e,a=Math.sin(r)*e,i=h(T)*.3*(1+e/24),o=.45+T()*.6}k[n]=t,k[n+1]=i,k[n+2]=a,M[r+3]=o}let f=[.97,.95,.88];if(u===2||u===3)f=[.83,.63,.12];else{let e=T();e<.11?f=[.38,.6,1]:e<.14&&(f=[.9,.2,.18])}j[n]=f[0],j[n+1]=f[1],j[n+2]=f[2]}let R=new re;R.setAttribute(`position`,new p(E,3)),R.setAttribute(`aStart`,new p(A,3)),R.setAttribute(`aB`,new p(D,3)),R.setAttribute(`aC`,new p(O,3)),R.setAttribute(`aD`,new p(k,3)),R.setAttribute(`aColor`,new p(j,3)),R.setAttribute(`aSizes`,new p(M,4)),R.setAttribute(`aSeed`,new p(fe,1)),R.setAttribute(`aKind`,new p(pe,1)),R.boundingSphere=new o(new e,600);let z={uTime:{value:0},uMorph:{value:0},uIntro:{value:+!!b},uPR:{value:1},uAspect:{value:1},uPointer:{value:new c(0,0)},uPointerOn:{value:0},uSeal:{value:new f(14,3,0,1)}},B=new n({uniforms:z,vertexShader:ae,fragmentShader:oe,transparent:!0,depthWrite:!1,blending:2}),he=new i(R,B);he.frustumCulled=!1,S.add(he);let V=[],H=[],ge=[],U=m(17),_e=e=>{let t=document.createElement(`canvas`),n=t.getContext(`2d`),i=`italic 400 64px "Playfair Display", Georgia, serif`;n.font=i;let o=Math.ceil(n.measureText(e).width)+16;t.width=o,t.height=90,n.font=i,n.fillStyle=`#fff`,n.textBaseline=`middle`,n.fillText(e,8,t.height/2);let s=new te(t);s.colorSpace=r,ge.push(s);let c=new d({map:s,transparent:!0,depthWrite:!1,opacity:0,color:14411775,fog:!0}),l=new a(c),u=1.5+U()*1.7;return l.scale.set(u*o/t.height,u,1),l};(async()=>{try{await document.fonts.load(`italic 400 64px "Playfair Display"`)}catch{}let e=await ie(),t=[...new Set(e.filter(e=>e&&e.length>=6))];for(let e=0;e<(y?14:30)&&t.length;e++){let e=t.splice(Math.floor(U()*t.length),1)[0],n=_e(e);n.position.set((U()-.5)*96,(U()-.5)*50,-46+U()*58),V.push({sp:n,home:n.position.clone(),ph:U()*6.28,base:.2+U()*.38,glow:0}),S.add(n)}})();let ve=()=>{if(V.length<2)return;let e=V[Math.floor(Math.random()*V.length)],n=null,r=1e9;for(let t of V){if(t===e)continue;let i=t.sp.position.distanceToSquared(e.sp.position);i>60&&i<r&&(r=i,n=t)}if(!n)return;let i=new re;i.setAttribute(`position`,new p(new Float32Array(120),3));let a=new t({color:3900150,transparent:!0,opacity:0,blending:2,depthWrite:!1,fog:!0}),o=new l(i,a);o.frustumCulled=!1,S.add(o),H.push({line:o,a:e,b:n,life:0})},W=new e,ye=(e,t,n)=>{e.life+=t;let r=e.life/2.2,i=e.a.sp.position,a=e.b.sp.position;W.copy(i).add(a).multiplyScalar(.5),W.y+=i.distanceTo(a)*.25;let o=e.line.geometry.attributes.position.array,s=Math.min(1,r*2.2);for(let e=0;e<40;e++){let t=e/39*s,n=1-t;o[e*3]=n*n*i.x+2*n*t*W.x+t*t*a.x,o[e*3+1]=n*n*i.y+2*n*t*W.y+t*t*a.y,o[e*3+2]=n*n*i.z+2*n*t*W.z+t*t*a.z}e.line.geometry.attributes.position.needsUpdate=!0;let c=Math.sin(Math.min(1,r)*Math.PI);return e.line.material.opacity=c*.85*n,e.a.glow=Math.max(e.a.glow,c),e.b.glow=Math.max(e.b.glow,c),r>=1?(S.remove(e.line),e.line.geometry.dispose(),e.line.material.dispose(),!1):!0},G=0,K=0,q=b?12:0,J=+!!b,be=performance.now(),Y=0,X=1.6,Z={x:0,y:0,on:0},Q={x:0,y:0,on:0},$=new e,xe=new e,Se=()=>{let e=v.clientWidth||window.innerWidth,t=v.clientHeight||window.innerHeight;x.setPixelRatio(Math.min(window.devicePixelRatio||1,y?1:1.75)),x.setSize(e,t,!1),C.aspect=e/t,C.updateProjectionMatrix(),z.uAspect.value=e/t,z.uPR.value=x.getPixelRatio();let n=e/t>1.05&&e>=900;z.uSeal.value.set(n?14:0,n?3:10,0,n?1:Math.min(.66,e/t*1.3))};Se();let Ce=e=>{Y=requestAnimationFrame(Ce);let t=Math.min(.05,(e-be)/1e3);if(be=e,document.hidden)return;b||(q+=t),J=b?1:Math.min(1,J+t/3.4),K=b?G:K+(G-K)*(1-Math.exp(-t*2.6));let n=1-Math.exp(-t*5);Q.x+=(Z.x-Q.x)*n,Q.y+=(Z.y-Q.y)*n,Q.on+=((b?0:Z.on)-Q.on)*(1-Math.exp(-t*3)),z.uTime.value=q,z.uMorph.value=K,z.uIntro.value=J,z.uPointer.value.set(Q.x,Q.y),z.uPointerOn.value=Q.on;let r=Math.min(2,Math.floor(K)),i=se(g(K-r)),a=le[r],o=le[r+1];$.set(a.p[0]+(o.p[0]-a.p[0])*i,a.p[1]+(o.p[1]-a.p[1])*i,a.p[2]+(o.p[2]-a.p[2])*i),xe.set(a.l[0]+(o.l[0]-a.l[0])*i,a.l[1]+(o.l[1]-a.l[1])*i,a.l[2]+(o.l[2]-a.l[2])*i),$.x+=Q.x*3.2,$.y+=Q.y*2,C.position.copy($),C.lookAt(xe);let s=(1-_(.1,.7,K))*_(.35,1,J);for(let e of V){let t=q*.18+e.ph;e.sp.position.set(e.home.x+Math.sin(t)*1.6,e.home.y+Math.cos(t*.8)*1.1,e.home.z),e.glow*=.965,e.sp.material.opacity=(e.base+e.glow*.55)*s,e.sp.material.color.setRGB(.86-.45*e.glow,.91-.28*e.glow,1),e.sp.visible=s>.01}!b&&s>.2&&(X-=t,X<=0&&(ve(),X=2.2+Math.random()*1.4));for(let e=H.length-1;e>=0;e--)ye(H[e],b?0:t,s)||H.splice(e,1);x.render(S,C)};return Y=requestAnimationFrame(Ce),{setMorph(e){G=Math.max(0,Math.min(3,e))},setPointer(e,t,n){Z.x=e,Z.y=t,Z.on=+!!n},setReduced(e){b=!!e,b&&(J=1)},resize:Se,dispose(){cancelAnimationFrame(Y),R.dispose(),B.dispose();for(let e of V)e.sp.material.dispose();for(let e of ge)e.dispose();for(let e of H)e.line.geometry.dispose(),e.line.material.dispose();x.dispose()}}}export{v as createHero};