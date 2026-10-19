import sys, os, time, requests, json, re, threading
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
CATALOG_PATH = os.path.join(ROOT_DIR, 'frontend/scripts/master-catalog.json')
UI_DICT_PATH = os.path.join(ROOT_DIR, 'frontend/src/lib/ui-dictionary.json')
BACKUP_PATH = os.path.join(ROOT_DIR, 'frontend/src/lib/ui-dictionary.json.bak')
CACHE_PATH = os.path.join(ROOT_DIR, 'scripts/i18n/mass_translation_cache.json')

ARABIC_RE = re.compile(r'[\u0600-\u06FF]')
VAR_RE = re.compile(r'\$\{[^}]+\}')

class BingWorker:
    def __init__(self, worker_id=0):
        self.worker_id = worker_id
        self.session = requests.Session()
        self.headers = {
            'User-Agent': f'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/12{worker_id}.0.0.0 Safari/537.36',
            'Referer': 'https://www.bing.com/translator'
        }
        self.ig = None
        self.key = None
        self.token = None
        self.token_expiry = 0
        self.lock = threading.Lock()
        self.refresh_token()

    def refresh_token(self):
        with self.lock:
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
                except Exception:
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

        for _ in range(2):
            try:
                res = self.session.post(trans_url, data=data, headers=self.headers, timeout=12)
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
                res = self.session.post(trans_url, data=data, headers=self.headers, timeout=8)
                if res.status_code == 200:
                    return res.json()[0]['translations'][0]['text'].strip()
                self.refresh_token()
                time.sleep(0.5)
            except Exception:
                self.refresh_token()
                time.sleep(0.5)
        return text

def protect_vars(text):
    vars_found = VAR_RE.findall(text)
    protected = text
    for i, v in enumerate(vars_found):
        protected = protected.replace(v, f'__VAR_{i}__')
    return protected, vars_found

def restore_vars(text, vars_found):
    restored = text
    for i, v in enumerate(vars_found):
        # Match case-insensitive and with optional spaces
        pattern = re.compile(rf'__\s*var_{i}\s*__', re.IGNORECASE)
        restored = pattern.sub(v, restored)
    return restored

def main():
    print("=== Z-Systems Mass Universal Dictionary Builder ===")
    
    # 1. Load data
    with open(UI_DICT_PATH, 'r', encoding='utf-8') as f:
        ui_dict = json.load(f)
    print(f"Current UI dictionary entries: {len(ui_dict):,}")

    if not os.path.exists(BACKUP_PATH):
        with open(BACKUP_PATH, 'w', encoding='utf-8') as f:
            json.dump(ui_dict, f, ensure_ascii=False, indent=2)
        print("Created backup at ui-dictionary.json.bak")

    with open(CATALOG_PATH, 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    # 2. Load cache if exists
    cache = {}
    if os.path.exists(CACHE_PATH):
        try:
            with open(CACHE_PATH, 'r', encoding='utf-8') as f:
                cache = json.load(f)
            print(f"Loaded existing cache: {len(cache):,} translated phrases")
        except:
            cache = {}

    # 3. Filter candidates
    candidates = []
    for raw in catalog.keys():
        s = raw.strip()
        if not s or not ARABIC_RE.search(s):
            continue
        if s.startswith('//') or s.startswith('/*') or 'http://' in s or 'https://' in s:
            continue
        if re.match(r'^\$\{[^}]+\}$', s):
            continue
        if len(s) > 300:
            continue
        if s in ui_dict or s in cache:
            continue
        candidates.append(s)

    print(f"Total candidates requiring translation: {len(candidates):,}")

    if not candidates and not cache:
        print("Everything is already 100% translated in ui-dictionary.json!")
        return

    # 4. Multithreaded batch translation
    NUM_WORKERS = 8
    BATCH_SIZE = 25
    workers = [BingWorker(worker_id=i) for i in range(NUM_WORKERS)]

    # Group into batches
    batches = []
    for i in range(0, len(candidates), BATCH_SIZE):
        batches.append(candidates[i:i + BATCH_SIZE])

    print(f"Prepared {len(batches):,} batches across {NUM_WORKERS} workers...")

    cache_lock = threading.Lock()
    saved_counter = 0

    def process_batch(worker, batch_items):
        nonlocal saved_counter
        # Protect vars
        protected_items = []
        vars_map = []
        for item in batch_items:
            prot, v = protect_vars(item)
            protected_items.append(prot)
            vars_map.append(v)

        results = worker.translate_batch(protected_items)

        batch_result = {}
        for original, trans, v in zip(batch_items, results, vars_map):
            restored = restore_vars(trans, v)
            if restored and not ARABIC_RE.search(restored):
                batch_result[original] = restored
            elif restored:
                batch_result[original] = restored

        with cache_lock:
            for k, val in batch_result.items():
                cache[k] = val
            saved_counter += len(batch_result)
            if saved_counter >= 300:
                with open(CACHE_PATH, 'w', encoding='utf-8') as f:
                    json.dump(cache, f, ensure_ascii=False, indent=2)
                saved_counter = 0

        return len(batch_result)

    start_time = time.time()
    total_completed = 0

    if batches:
        with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
            future_to_batch = {
                executor.submit(process_batch, workers[idx % NUM_WORKERS], batch): idx
                for idx, batch in enumerate(batches)
            }
            for future in as_completed(future_to_batch):
                try:
                    count = future.result()
                    total_completed += count
                    if total_completed % 250 == 0 or total_completed == len(candidates):
                        elapsed = time.time() - start_time
                        pct = (total_completed / len(candidates)) * 100
                        print(f"Progress: {total_completed:,}/{len(candidates):,} ({pct:.1f}%) in {elapsed:.1f}s")
                except Exception as e:
                    pass

    # Save final cache
    with open(CACHE_PATH, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

    # 5. Merge cache into ui-dictionary.json
    merged_count = 0
    for k, v in cache.items():
        if k not in ui_dict and v and isinstance(v, str):
            ui_dict[k] = v.strip()
            merged_count += 1

    with open(UI_DICT_PATH, 'w', encoding='utf-8') as f:
        json.dump(ui_dict, f, ensure_ascii=False, indent=2)

    print(f"\n=== COMPLETED SUCCESSFULLY ===")
    print(f"Total new translations merged into ui-dictionary.json: {merged_count:,}")
    print(f"New total UI dictionary size: {len(ui_dict):,} entries!")

if __name__ == '__main__':
    main()
