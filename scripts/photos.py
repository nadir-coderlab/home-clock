# ينزّل صور Bing اليومية (٨ صور) لمجلد photos ويكتب photos.json — يشتغل في GitHub Actions كل يوم
import json, os, urllib.request
out = os.path.join(os.path.dirname(__file__), '..', 'web', 'photos')
os.makedirs(out, exist_ok=True)
req = urllib.request.Request('https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=en-US', headers={'User-Agent': 'Mozilla/5.0'})
data = json.load(urllib.request.urlopen(req, timeout=30))
images = []
for i, im in enumerate(data['images']):
    name = f'{i}.jpg'
    urllib.request.urlretrieve('https://www.bing.com' + im['url'], os.path.join(out, name))
    images.append({'file': name, 'caption': im.get('copyright', '')})
json.dump({'images': images}, open(os.path.join(out, 'photos.json'), 'w'), ensure_ascii=False)
print(len(images), 'photos')
