"""Focused numerical contract tests; no training needed."""
import dataclasses
import random
import unittest
import torch
from tiny_transformer import Config,TinyTransformer,build_model,measure,schedule,baseline

class TransformerContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        torch.set_num_threads(2)
        cls.model=build_model().eval()

    def test_sharing_and_parameter_budget(self):
        for depth in (2,4,6):
            m=TinyTransformer(dataclasses.replace(Config(),n_layer=depth))
            self.assertEqual(sum(p.numel() for p in m.parameters()),71680)

    def test_unsupported_configuration_is_rejected(self):
        for config in (Config(n_embd=64), Config(n_head=8), Config(vocab_size=26), Config(d_ff=512), Config(n_layer=0)):
            with self.assertRaises(ValueError):
                TinyTransformer(config)

    def test_causal_isolation_determinism_and_finiteness(self):
        x=torch.arange(20).remainder(26)[None,:]
        changed=x.clone(); changed[:,11:]=(changed[:,11:]+3)%26
        a,_,h=self.model(x,capture=True); b,_,j=self.model(changed,capture=True)
        again,_,_=self.model(x)
        self.assertTrue(torch.equal(a,again))
        self.assertTrue(torch.equal(a[:,:11],b[:,:11]))
        self.assertTrue(torch.isfinite(a).all())
        for v,w in zip(h,j):
            self.assertTrue(torch.equal(v[:,:11],w[:,:11]))
            self.assertTrue(torch.isfinite(v).all())

    def test_counts_and_phase_policy(self):
        result,hidden,_=measure(self.model)
        for layer,h in enumerate(hidden):
            counts=(h[0]>0).sum(-1).tolist()
            d=result['per_layer'][str(layer)]
            self.assertEqual(counts,d['active_counts'])
            self.assertTrue(all(0<=c<=1024 for c in counts))
            self.assertEqual([c/1024 for c in counts],d['series'])
            self.assertEqual(d['warmup'],sum(counts[1:13])/12/1024)
            self.assertEqual(d['memorize'],sum(counts[13:21])/8/1024)
            self.assertEqual(d['repeat'],sum(counts[21:])/56/1024)
        self.assertEqual(len(result['cross_entropy']['series_bits']),76)

    def test_sampler_replays_baseline(self):
        stream,indices=schedule(8)
        baseline.build_model()
        original=baseline.make_stream(400,random.Random(1))
        expected=torch.stack([torch.randint(0,len(original)-154-1,(4,)) for _ in range(8)])
        self.assertTrue(torch.equal(original,stream))
        self.assertTrue(torch.equal(expected,indices))

    def test_seed_export_roundtrip(self):
        a=build_model(); b=build_model()
        for p,q in zip(a.parameters(),b.parameters()):
            self.assertTrue(torch.equal(p,q))
            self.assertTrue(torch.equal(p,torch.tensor(baseline.to_nested_list(p),dtype=torch.float32)))

if __name__=='__main__': unittest.main()
