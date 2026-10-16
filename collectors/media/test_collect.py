import importlib.util, pathlib, tempfile, json
p=pathlib.Path(__file__).parent
spec=importlib.util.spec_from_file_location('collect',p/'collect.py');c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
iso=c.parse_iso((p/'tests/fixtures/iso.html').read_text(),'https://isorepublic.com/photo/scenic-sunset/')
ns=c.parse_ns((p/'tests/fixtures/ns.html').read_text(),'https://negativespace.co/sliced-pink-grapefruit/')
assert iso['author']=='Free Nature Stock',iso
assert ns['author']=='Pixabay',ns
assert ns['file_url'].endswith('.jpg')
assert c.sitemap_urls('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>https://example.org/a.xml</loc></sitemap></sitemapindex>')[0]==['https://example.org/a.xml']
assert c.parse_iso('<a href="https://advert.invalid/foo.jpg">Download</a>','x') is None
assert 'stocksnap' not in c.SITES
print('PASS: ISO author/file parser, NegativeSpace author/file parser, sitemap parser, ad exclusion, StockSnap stopped')

v=c.parse_iso((p/'tests/fixtures/iso-video.html').read_text(),'https://isorepublic.com/video/birch-tree-leaves/')
assert v['media_type']=='video' and v['author']=='Free Nature Stock'
assert v['file_url'].endswith('.mp4')
print('PASS: ISO video download URL, author and media type')
