"""Shared ReLU Transformer control. See docs/transformer-protocol.md before use."""
import argparse
import dataclasses
import hashlib
import json
import math
from pathlib import Path
import random
import sys

import torch
from torch import nn
from torch.nn import functional as F

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import bdh_probe as baseline

@dataclasses.dataclass
class Config:
    n_embd: int = 32
    n_head: int = 4
    n_layer: int = 4
    vocab_size: int = 32
    d_ff: int = 1024

class TinyTransformer(nn.Module):
    def __init__(self, config=None):
        super().__init__()
        self.config = config or Config()
        c = self.config
        if (c.n_embd, c.n_head, c.vocab_size, c.d_ff) != (32, 4, 32, 1024):
            raise ValueError('This control locks widths to d_model=32, heads=4, vocab=32, d_ff=1024')
        if not isinstance(c.n_layer, int) or not 1 <= c.n_layer <= 16:
            raise ValueError('n_layer must be an integer from 1 to 16')
        self.embed = nn.Embedding(c.vocab_size, c.n_embd)
        for name, shape in {'Wq':(32,32),'Wk':(32,32),'Wv':(32,32),'Wo':(32,32),
                            'W1':(32,c.d_ff),'W2':(c.d_ff,32),'lm_head':(32,c.vocab_size)}.items():
            self.register_parameter(name, nn.Parameter(torch.empty(shape)))
        self.ln = nn.LayerNorm(c.n_embd, elementwise_affine=False, bias=False)
        self.register_buffer('freqs', baseline.get_freqs(c.n_embd//c.n_head, 2**16, torch.float32).view(1,1,1,-1))
        for p in self.parameters():
            nn.init.normal_(p, std=.02)

    def forward(self, idx, targets=None, capture=False):
        c = self.config
        B,T = idx.shape
        x = self.ln(self.embed(idx))
        phase = torch.arange(T, dtype=x.dtype, device=x.device).view(1,1,T,1)*self.freqs
        mask = torch.ones(T,T,dtype=torch.bool,device=x.device).tril()
        hidden = []
        for _ in range(c.n_layer):
            def heads(w):
                return (x@w).view(B,T,c.n_head,-1).transpose(1,2)
            q = baseline.Attention.rope(phase,heads(self.Wq))
            k = baseline.Attention.rope(phase,heads(self.Wk))
            scores = (q@k.transpose(-1,-2))/math.sqrt(c.n_embd//c.n_head)
            attn = scores.masked_fill(~mask,float('-inf')).softmax(-1)@heads(self.Wv)
            x = self.ln(x+attn.transpose(1,2).reshape(B,T,c.n_embd)@self.Wo)
            h = F.relu(x@self.W1)
            if capture: hidden.append(h)
            x = self.ln(x+h@self.W2)
        logits=x@self.lm_head
        loss=None if targets is None else F.cross_entropy(logits.reshape(-1,c.vocab_size),targets.reshape(-1))
        return logits,loss,hidden

def build_model():
    torch.manual_seed(baseline.SEED)
    return TinyTransformer()

def schedule(steps=2200):
    baseline.build_model()
    generator=torch.Generator().set_state(torch.get_rng_state())
    stream=baseline.make_stream(400,random.Random(1))
    indices=torch.stack([torch.randint(0,len(stream)-154-1,(4,),generator=generator) for _ in range(steps)])
    return stream,indices

def save(path,data):
    path=Path(path); path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(data,allow_nan=False))

@torch.no_grad()
def measure(model):
    cycle,word=baseline.make_cycle(random.Random(99))
    labels=baseline.phase_labels()
    model.eval()
    logits,_,hidden=model(torch.tensor([cycle]),capture=True)
    layers={}
    counts=[]
    for layer,h in enumerate(hidden):
        ct=(h[0]>0).sum(-1).tolist(); counts.append(ct)
        values=[v/1024 for v in ct]
        entry=baseline.phase_means(values[1:],labels[1:])
        entry.update(series=values,active_counts=ct,ratio=entry['memorize']/entry['repeat'] if entry['repeat'] else None)
        layers[str(layer)]=entry
    logp=F.log_softmax(logits[0],-1)
    ce=[-logp[t,cycle[t+1]].item()/math.log(2) for t in range(len(cycle)-1)]
    return dict(schema_version=1,config=dataclasses.asdict(model.config),n_total=1024,sequence=cycle,word=word,
                warmup=baseline.WARMUP,labels=labels,per_layer=layers,active_counts=counts,
                activity_policy={'exclude_token_0':True,'denominators':{'warmup':12,'memorize':8,'repeat':56}},
                cross_entropy={'series_bits':ce,'mean_bits':sum(ce)/len(ce),
                'at_position':baseline.phase_means(ce,labels[:-1]),'of_target':baseline.phase_means(ce,labels[1:])}),hidden,logits

def export(model,path,provenance):
    save(path,dict(schema_version=1,model='shared_relu_transformer',config=dataclasses.asdict(model.config),
        warmup=baseline.WARMUP,weights={k:baseline.to_nested_list(v) for k,v in model.named_parameters()},provenance=provenance))

def reference(path,result,hidden,logits,provenance):
    save(path,{**result,'hidden':[baseline.to_nested_list(h[0]) for h in hidden],
               'logits':baseline.to_nested_list(logits[0]),'provenance':provenance})

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--out',default=str(ROOT/'results_transformer.json'))
    ap.add_argument('--export-weights',default=None)
    ap.add_argument('--untrained',action='store_true')
    ap.add_argument('--dump-reference',nargs='?',const=str(ROOT/'probe/transformer_reference.json'))
    ap.add_argument('--dump-reference-untrained',nargs='?',const=str(ROOT/'probe/transformer_untrained_reference.json'))
    args=ap.parse_args()
    torch.set_num_threads(2)
    stream,indices=schedule()
    model=build_model()
    provenance=dict(seed=0,trained_steps=0,parameter_count=sum(p.numel() for p in model.parameters()),
        source='Independent synthetic shared ReLU Transformer control; not an official model',
        batch_schedule_sha256=hashlib.sha256(indices.numpy().tobytes()).hexdigest(),
        protocol='docs/transformer-protocol.md',torch_version=torch.__version__)
    if args.dump_reference_untrained:
        r,h,l=measure(model); reference(args.dump_reference_untrained,r,h,l,provenance)
    hist=[]
    if not args.untrained:
        save(ROOT/'probe/transformer_batch_schedule.json',{'indices':indices.tolist(),'sha256':provenance['batch_schedule_sha256']})
        model.train()
        opt=torch.optim.AdamW(model.parameters(),lr=.003,betas=(.9,.999),eps=1e-8,weight_decay=.01)
        for step,ix in enumerate(indices):
            xb=torch.stack([stream[i:i+154] for i in ix]); yb=torch.stack([stream[i+1:i+155] for i in ix])
            _,loss,_=model(xb,yb); opt.zero_grad(); loss.backward(); opt.step()
            if step%100==0 or step==2199:
                hist.append([step,loss.item()]); print(f'step {step}: {loss.item():.6f} nats',flush=True)
        provenance['trained_steps']=2200
    result,hidden,logits=measure(model)
    ce=result['cross_entropy']
    result.update(provenance=provenance,loss_hist=hist,final_training_loss_nats=hist[-1][1] if hist else None,
                  train={'steps':provenance['trained_steps'],'batch':4,'seqlen':154,'lr':.003},
                  convergence={'criterion':'mean_bits <= 1.6835368457 and target repeat bits <= 1.1492212212',
                    'passed':not args.untrained and ce['mean_bits']<=1.6835368457 and ce['of_target']['repeat']<=1.1492212212})
    save(args.out,result)
    if args.export_weights: export(model,args.export_weights,provenance)
    if args.dump_reference: reference(args.dump_reference,result,hidden,logits,provenance)
    print(json.dumps({'convergence':result['convergence'],'ce':ce['mean_bits'],'repeat_ce':ce['of_target']['repeat'],
                      'ratios':{k:v['ratio'] for k,v in result['per_layer'].items()}},indent=2))

if __name__=='__main__': main()
