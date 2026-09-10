'use strict';
/* Independent inference port of probe/tiny_transformer.py. Shared ReLU FFN,
 * causal diagonal-0 scaled softmax, parameter-free LayerNorm. No training.
 * Raw hidden layout is TOKEN-MAJOR: hidden[layer][token * nTotal + neuron].
 * Unlike BDH's xySparse this tensor has no head axis. */
(function (root) {
  const f32 = Math.fround;
  function flat(value, count) {
    const a = value.flat(Infinity);
    if (a.length !== count || a.some(x => typeof x !== 'number' || !Number.isFinite(x))) throw new Error('Invalid Transformer tensor');
    return Float32Array.from(a);
  }
  function matmul(a, b, rows, inner, cols) {
    const out = new Float32Array(rows * cols);
    for (let t=0;t<rows;t++) for(let j=0;j<cols;j++) {
      let sum=0;
      for(let k=0;k<inner;k++) sum += a[t*inner+k]*b[k*cols+j];
      out[t*cols+j]=sum;
    }
    return out;
  }
  function norm(a, rows, width) {
    const out=new Float32Array(a.length);
    for(let t=0;t<rows;t++) {
      const o=t*width; let mean=0,variance=0;
      for(let d=0;d<width;d++) mean+=a[o+d];
      mean/=width;
      for(let d=0;d<width;d++) variance+=(a[o+d]-mean)**2;
      const inv=1/Math.sqrt(variance/width+1e-5);
      for(let d=0;d<width;d++) out[o+d]=(a[o+d]-mean)*inv;
    }
    return out;
  }
  function residual(a,b,T,D) {
    const sum=new Float32Array(a.length);
    for(let i=0;i<sum.length;i++) sum[i]=a[i]+b[i];
    return norm(sum,T,D);
  }
  class TinyTransformer {
    constructor(json) {
      const c=json.config;
      if(json.schema_version!==1 || !c || c.n_embd!==32 || c.n_head!==4 || c.d_ff!==1024 || c.vocab_size!==32 || !Number.isInteger(c.n_layer) || c.n_layer<1 || c.n_layer>16) throw new Error('Unsupported Transformer configuration');
      const D=c.n_embd,V=c.vocab_size,F=c.d_ff,p=json.weights;
      this.w={D,nh:c.n_head,N:D/c.n_head,nLayer:c.n_layer,nTotal:F,vocab:V,warmup:json.warmup,provenance:json.provenance};
      this.p={embed:flat(p['embed.weight'],V*D)};
      for(const name of ['Wq','Wk','Wv','Wo']) this.p[name]=flat(p[name],D*D);
      this.p.W1=flat(p.W1,D*F); this.p.W2=flat(p.W2,F*D); this.p.lmHead=flat(p.lm_head,D*V);
    }
    forward(tokens,opts) {
      const {D,nh,N,nLayer,nTotal:F,vocab:V}=this.w,p=this.p,T=tokens.length;
      if(!T || T>2048 || Array.from(tokens).some(t=>!Number.isInteger(t)||t<0||t>=V)) throw new Error('Invalid Transformer sequence');
      let x=new Float32Array(T*D);
      for(let t=0;t<T;t++) x.set(p.embed.subarray(tokens[t]*D,(tokens[t]+1)*D),t*D);
      x=norm(x,T,D);
      const half=N/2,cos=new Float32Array(T*half),sin=new Float32Array(T*half),twoPi=f32(2*Math.PI);
      for(let t=0;t<T;t++) for(let j=0;j<half;j++) {
        const freq=f32(f32(1/f32(Math.pow(65536,f32(2*j/N))))/twoPi);
        const phase=f32(f32(f32(t*freq)%1)*twoPi);
        cos[t*half+j]=Math.cos(phase); sin[t*half+j]=Math.sin(phase);
      }
      const rotate=a=> {
        for(let t=0;t<T;t++) for(let h=0;h<nh;h++) for(let j=0;j<half;j++) {
          const o=t*D+h*N+2*j,aa=a[o],bb=a[o+1],c=cos[t*half+j],s=sin[t*half+j];
          a[o]=f32(aa*c)-f32(bb*s); a[o+1]=f32(bb*c)+f32(aa*s);
        }
      };
      const activeCounts=[],activeFraction=[],hidden=[];
      for(let layer=0;layer<nLayer;layer++) {
        const q=matmul(x,p.Wq,T,D,D),k=matmul(x,p.Wk,T,D,D),v=matmul(x,p.Wv,T,D,D);
        rotate(q);rotate(k);
        const attn=new Float32Array(T*D),scores=new Float32Array(T),prob=new Float32Array(T);
        for(let h=0;h<nh;h++) for(let t=0;t<T;t++) {
          let max=-Infinity;
          for(let s=0;s<=t;s++) {
            let sum=0;
            for(let j=0;j<N;j++) sum+=q[t*D+h*N+j]*k[s*D+h*N+j];
            scores[s]=f32(sum)/Math.sqrt(N); max=Math.max(max,scores[s]);
          }
          let denom=0;
          for(let s=0;s<=t;s++) { prob[s]=Math.exp(f32(scores[s]-max));denom+=prob[s]; }
          for(let s=0;s<=t;s++) prob[s]=prob[s]/denom;
          for(let j=0;j<N;j++) {
            let sum=0;
            for(let s=0;s<=t;s++) sum+=prob[s]*v[s*D+h*N+j];
            attn[t*D+h*N+j]=sum;
          }
        }
        x=residual(x,matmul(attn,p.Wo,T,D,D),T,D);
        const h=matmul(x,p.W1,T,D,F),counts=new Int32Array(T),fractions=new Float64Array(T);
        for(let t=0;t<T;t++) {
          for(let j=0;j<F;j++) { const i=t*F+j;h[i]=Math.max(0,h[i]);if(h[i]>0)counts[t]++; }
          fractions[t]=counts[t]/F;
        }
        activeCounts.push(counts);activeFraction.push(fractions);
        if(opts&&opts.keepRaw)hidden.push(h);
        x=residual(x,matmul(h,p.W2,T,F,D),T,D);
      }
      const logits=matmul(x,p.lmHead,T,D,V),crossEntropyBits=new Float64Array(T-1);
      for(let t=0;t<T-1;t++) {
        let max=-Infinity,sum=0;
        for(let j=0;j<V;j++)max=Math.max(max,logits[t*V+j]);
        for(let j=0;j<V;j++)sum+=Math.exp(logits[t*V+j]-max);
        crossEntropyBits[t]=(Math.log(sum)+max-logits[t*V+tokens[t+1]])/Math.LN2;
      }
      return {T,activeCounts,activeFraction,hidden:opts&&opts.keepRaw?hidden:null,logits,crossEntropyBits};
    }
  }
  if(typeof module!=='undefined'&&module.exports) module.exports={TinyTransformer};
  else root.TinyTransformer=TinyTransformer;
})(typeof globalThis!=='undefined'?globalThis:this);
