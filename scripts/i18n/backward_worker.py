import sys, os, time, requests, json, re, threading
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
AR_JSON_PATH = os.path.join(ROOT_DIR, 'frontend/src/locales/ar.json')
CACHE_PATH = os.path.join(ROOT_DIR, 'scripts/i18n/translation_cache.json')

ARABIC_RE = re.compile(r'[\u0600-\u06FF]')

class BingWorker:
    def __init__(self, worker_id=10):
        self.worker_id = worker_id
        self.session = requests.Session()
        self.headers = {
            'User-Agent': f'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/13{worker_id}.0.0.0 Safari/537.36',
            'Referer': 'https://www.bing.com/translator'
        }
        self.ig = None
        self.key = None
        self.token = None
        self.token_expiry = 0
        self.refresh_token()

    def refresh_token(self):
        for attempt in range(4):
            try:
                r = self.session.get('https://www.bing.com/translator', headers=self.headers, timeout=12)
                ig_match = re.search(r'IG:"([^"]+)"', r.text)
                token_match = re.search(r'params_AbusePreventionHelper\s*=\s*\[([0-9]+),"([^"]+)",', r.text)
                if ig_match and token_match:
                    self.ig = ig_match.group(1)
                    self.key = token_match.group(1)
                    self.token = token_match.group(2)
                    self.token_expiry = time.time() + 600
                    return True
            except Exception as e:
                time.sleep(1 + attempt)
        return False

    def translate_batch(self, texts):
        if not texts:
            return []
        if time.time() > self.token_expiry:
            self.refresh_token()

        DELIM = " ||| "
        combined = DELIM.join(texts)
        trans_url = f"https://www.bing.com/ttranslatev3?isVertical=1&IG={self.ig}&IID=translator.5028"
        data = {
            'fromLang': 'ar',
            'text': combined,
            'to': 'en',
            'token': self.token,
            'key': self.key
        }

        for attempt in range(2):
            try:
                res = self.session.post(trans_url, data=data, headers=self.headers, timeout=15)
                if res.status_code == 200:
                    res_json = res.json()
                    translated_text = res_json[0]['translations'][0]['text']
                    parts = translated_text.split("|||")
                    if len(parts) == len(texts):
                        return [p.strip() for p in parts]
                    else:
                        return [self.translate_single(t) for t in texts]
                else:
                    self.refresh_token()
                    time.sleep(0.5)
            except Exception:
                self.refresh_token()
                time.sleep(0.5)

        return [self.translate_single(t) for t in texts]

    def translate_single(self, text):
        if not text or not text.strip():
            return text
        trans_url = f"https://www.bing.com/ttranslatev3?isVertical=1&IG={self.ig}&IID=translator.5028"
        data = {
            'fromLang': 'ar',
            'text': text,
            'to': 'en',
            'token': self.token,
            'key': self.key
        }
        for _ in range(2):
            try:
                res = self.session.post(trans_url, data=data, headers=self.headers, timeout=10)
                if res.status_code == 200:
                    return res.json()[0]['translations'][0]['text'].strip()
                self.refresh_token()
                time.sleep(0.5)
            except Exception:
                self.refresh_token()
                time.sleep(0.5)
        return text

def flatten_dict(d, prefix=''):
    items = {}
    for k, v in d.items():
        new_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            items.update(flatten_dict(v, new_key))
        else:
            items[new_key] = v
    return items

def main():
    print("=== Backward Translator Worker ===")
    with open(AR_JSON_PATH, 'r', encoding='utf-8') as f:
        ar_data = json.load(f)
    flat_ar = flatten_dict(ar_data)

    cache = {}
    if os.path.exists(CACHE_PATH):
        try:
            with open(CACHE_PATH, 'r', encoding='utf-8') as f:
                cache = json.load(f)
        except:
            pass

    # Find remaining strings
    needed = []
    for k, v in flat_ar.items():
        if isinstance(v, str) and v.strip() and v.strip() not in cache:
            needed.append(v.strip())

    # Reverse order!
    needed = list(reversed(list(dict.fromkeys(needed))))
    print(f"Backward worker: {len(needed)} strings remaining.")
    
    if not needed:
        print("Nothing remaining for backward worker.")
        return

    NUM_WORKERS = 4
    BATCH_SIZE = 25
    workers = [BingWorker(10 + i) for i in range(NUM_WORKERS)]
    batches = [needed[i:i + BATCH_SIZE] for i in range(0, len(needed), BATCH_SIZE)]

    cache_lock = threading.Lock()
    done = [0]
    t0 = time.time()

    def process(w, batch, b_idx):
        # Filter items that might have been added to cache by forward worker
        with cache_lock:
            # reload cache latest
            if os.path.exists(CACHE_PATH):
                try:
                    with open(CACHE_PATH, 'r', encoding='utf-8') as f:
                        fresh = json.load(f)
                        cache.update(fresh)
                except:
                    pass
        filtered = [t for t in batch if t not in cache]
        if not filtered:
            return

        results = w.translate_batch(filtered)
        with cache_lock:
            for orig, tr in zip(filtered, results):
                if tr and isinstance(tr, str) and not ARABIC_RE.search(tr):
                    cache[orig] = tr
                else:
                    cache[orig] = tr if tr else orig
            done[0] += len(filtered)
            
            with open(CACHE_PATH + '.tmp', 'w', encoding='utf-8') as cf:
                json.dump(cache, cf, ensure_ascii=False, indent=2)
            os.replace(CACHE_PATH + '.tmp', CACHE_PATH)

        elapsed = time.time() - t0
        print(f"[BW {done[0]}/{len(needed)}] ({done[0]/len(needed)*100:.1f}%)")

    with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
        futures = []
        for idx, b in enumerate(batches):
            futures.append(executor.submit(process, workers[idx % NUM_WORKERS], b, idx))
        for f in as_completed(futures):
            try:
                f.result()
            except:
                pass

if __name__ == '__main__':
    main()
