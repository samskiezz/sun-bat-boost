// Simple Procrustes alignment: find R,s,t to map X→Y on anchor pairs
export function procrustesAlign(X: number[][], Y: number[][]) {
  const n = Math.min(X.length, Y.length);
  if (n === 0) return { map:(v:number[])=>v };

  // mean-center
  const mean = (A:number[][])=>A[0].map((_,j)=>A.reduce((s,r)=>s+r[j],0)/A.length);
  const mx = mean(X), my = mean(Y);
  const cx = X.map(r=>r.map((v,j)=>v-mx[j]));
  const cy = Y.map(r=>r.map((v,j)=>v-my[j]));

  // cross-covariance
  const d = cx[0].length;
  const C = Array.from({length:d},()=>Array(d).fill(0));
  for (let i=0;i<n;i++) for (let a=0;a<d;a++) for (let b=0;b<d;b++) C[a][b]+=cx[i][a]*cy[i][b];

  // SVD(C) ≈ UΣVᵀ → R = VUᵀ
  const {U,S,Vt} = svdSmall(C); // tiny helper below
  const R = multiply(Vt, transpose(U));
  const scale = trace(S) / (normF(cx)**2 || 1);

  const map = (v:number[])=>{
    const vc = v.map((x,j)=>x-mx[j]);
    const r = multiplyVec(R, vc);
    const s = r.map(x=>x*scale);
    return s.map((x,j)=>x+my[j]);
  };
  return { map };
}

// L2 + Z-score whitening
export function l2Normalize(X:number[][]){
  return X.map(r=>{const n=Math.hypot(...r)||1; return r.map(v=>v/n);});
}
export function zWhiten(X:number[][]){
  const d=X[0]?.length||0; const mu=Array(d).fill(0), sd=Array(d).fill(1);
  X.forEach(r=>r.forEach((v,j)=>mu[j]+=v/X.length));
  X.forEach(r=>r.forEach((v,j)=>sd[j]+= (v-mu[j])**2));
  sd.forEach((s,j)=>sd[j]=Math.sqrt(s/(X.length||1))||1);
  return X.map(r=>r.map((v,j)=>(v-mu[j])/sd[j]));
}

// --- tiny linear algebra helpers (good enough for small d) ---
function transpose(A:number[][]){return A[0].map((_,j)=>A.map(r=>r[j]));}
function multiply(A:number[][],B:number[][]){return A.map(r=>B[0].map((_,j)=>r.reduce((s,ai,i)=>s+ai*B[i][j],0)));}
function multiplyVec(A:number[][],v:number[]){return A.map(r=>r.reduce((s,ai,i)=>s+ai*v[i],0));}
function normF(A:number[][]){return Math.sqrt(A.flat().reduce((s,x)=>s+x*x,0));}
function trace(A:number[][]){let t=0; for(let i=0;i<Math.min(A.length,A[0].length);i++) t+=A[i][i]; return t;}

// very small SVD via power iterations for U,S,Vᵀ (rank ~ d)
function svdSmall(M:number[][]){
  // symmetric trick on MtM
  const Mt = transpose(M), MtM = multiply(Mt,M);
  const eigVecs:number[][] = [];
  const eigVals:number[] = [];
  const k = Math.min(3, MtM.length); // top-3 is enough
  let B = MtM.map(row=>row.slice());
  for(let c=0;c<k;c++){
    let v = Array(B.length).fill(0).map((_,i)=> i===c?1:0.001*i);
    for(let it=0;it<64;it++){
      const w = multiplyVec(B, v);
      const n = Math.hypot(...w)||1; v = w.map(x=>x/n);
    }
    const λ = dot(v, multiplyVec(B,v));
    eigVecs.push(v); eigVals.push(λ);
    // deflate
    const outer = v.map(vi=>v.map(vj=>vi*vj*λ));
    B = B.map((row,i)=>row.map((x,j)=>x-outer[i][j]));
  }
  const V = eigVecs; // columns
  const S = eigVals.map(x=>Math.sqrt(Math.max(0,x)));
  const Uapprox = multiply(M, V).map(row=>{
    const out = row.slice();
    for(let j=0;j<out.length;j++){ out[j] = out[j] / (S[j]||1); }
    return out;
  });
  return { U: Uapprox, S: diag(S), Vt: transpose(V) };
}
function diag(a:number[]){return a.map((v,i)=>a.map((_,j)=>i===j?v:0));}
function dot(a:number[],b:number[]){return a.reduce((s,x,i)=>s+x*b[i],0);}