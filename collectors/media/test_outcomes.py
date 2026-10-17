import importlib.util,pathlib,tempfile,os,json
p=pathlib.Path(__file__).parent
spec=importlib.util.spec_from_file_location('c',p/'collect.py');c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
with tempfile.TemporaryDirectory() as d:
 c.BASE=d;c.STATE=d+'/state';c.QUEUE=d+'/queue/media-queue.jsonl';c.LOG=d+'/run.log'
 pathlib.Path(c.STATE).mkdir();pathlib.Path(d+'/queue').mkdir()
 c._run_site=lambda k,cfg:3
 assert c.run_site('safe',{})==3 and c.OUTCOMES[-1]['status']=='ok'
 def blocked(k,cfg):c.log('blocked: index fetch failed (http-429) - site skipped this run');return 0
 c._run_site=blocked;c.run_site('blocked',{});assert c.OUTCOMES[-1]['status']=='attention'
 def failure(k,cfg):raise RuntimeError('network failure')
 c._run_site=failure
 try:c.run_site('failed',{})
 except RuntimeError:pass
 assert c.OUTCOMES[-1]['status']=='failed'
print('PASS: successful/blocked/error site outcomes without network; blocked run is not healthy')
