import sys, os, time, requests, json, re, threading
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
AR_JSON_PATH = os.path.join(ROOT_DIR, 'frontend/src/locales/ar.json')
EN_JSON_PATH = os.path.join(ROOT_DIR, 'frontend/src/locales/en.json')
CACHE_PATH = os.path.join(ROOT_DIR, 'scripts/i18n/translation_cache.json')
UI_DICT_PATH = os.path.join(ROOT_DIR, 'frontend/src/lib/ui-dictionary.json')

ARABIC_RE = re.compile(r'[\u0600-\u06FF]')

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

def unflatten_dict(d):
    result = {}
    for k, v in d.items():
        parts = k.split('.')
        curr = result
        for p in parts[:-1]:
            if p not in curr or not isinstance(curr[p], dict):
                curr[p] = {}
            curr = curr[p]
        curr[parts[-1]] = v
    return result

def main():
    print("=== Z-Systems Full Autonomous Translation Engine ===")
    
    with open(AR_JSON_PATH, 'r', encoding='utf-8') as f:
        ar_data = json.load(f)
    
    en_data = {}
    if os.path.exists(EN_JSON_PATH):
        with open(EN_JSON_PATH, 'r', encoding='utf-8') as f:
            try:
                en_data = json.load(f)
            except:
                pass

    flat_ar = flatten_dict(ar_data)
    flat_en = flatten_dict(en_data)

    print(f"Total keys in ar.json: {len(flat_ar)}")
    print(f"Total keys in en.json: {len(flat_en)}")

    # Load cache
    cache = {}
    if os.path.exists(CACHE_PATH):
        try:
            with open(CACHE_PATH, 'r', encoding='utf-8') as f:
                cache = json.load(f)
            print(f"Loaded existing translation cache with {len(cache)} entries.")
        except:
            pass

    # Load UI dictionary to pre-populate cache
    if os.path.exists(UI_DICT_PATH):
        try:
            with open(UI_DICT_PATH, 'r', encoding='utf-8') as f:
                ui_dict = json.load(f)
            for k, v in ui_dict.items():
                if k and v and isinstance(v, str) and not ARABIC_RE.search(v):
                    if k.strip() not in cache:
                        cache[k.strip()] = v.strip()
            print(f"Cache now has {len(cache)} entries after merging ui-dictionary.")
        except:
            pass

    # Identify missing or empty keys in en.json
    missing_keys = []
    for k, ar_val in flat_ar.items():
        en_val = flat_en.get(k, '')
        if not en_val or not isinstance(en_val, str) or en_val.strip() == '' or ARABIC_RE.search(en_val):
            missing_keys.append(k)

    print(f"Keys needing translation in en.json: {len(missing_keys)}")

    # Collect unique Arabic strings that need translation
    needed_strings = set()
    for k in missing_keys:
        ar_text = flat_ar[k]
        if isinstance(ar_text, str) and ar_text.strip():
            trimmed = ar_text.strip()
            if trimmed not in cache:
                needed_strings.add(trimmed)

    print(f"Unique Arabic strings not in cache: {len(needed_strings)}")

    needed_list = list(needed_strings)
    
    if needed_list:
        NUM_WORKERS = 4
        BATCH_SIZE = 25
        workers = [BingWorker(i) for i in range(NUM_WORKERS)]
        print(f"Initialized {NUM_WORKERS} parallel Bing translation workers.")

        batches = [needed_list[i:i + BATCH_SIZE] for i in range(0, len(needed_list), BATCH_SIZE)]
        total_batches = len(batches)
        print(f"Split into {total_batches} batches of up to {BATCH_SIZE} items.")

        cache_lock = threading.Lock()
        completed_count = [0]
        t0 = time.time()

        def process_batch(worker, batch_items, b_idx):
            results = worker.translate_batch(batch_items)
            with cache_lock:
                for orig, tr in zip(batch_items, results):
                    if tr and isinstance(tr, str) and not ARABIC_RE.search(tr):
                        cache[orig] = tr
                    else:
                        # Fallback if translation failed or returned Arabic
                        cache[orig] = tr if tr else orig
                completed_count[0] += len(batch_items)
                
                # Save cache periodically every 5 batches
                if b_idx % 5 == 0:
                    with open(CACHE_PATH + '.tmp', 'w', encoding='utf-8') as cf:
                        json.dump(cache, cf, ensure_ascii=False, indent=2)
                    os.replace(CACHE_PATH + '.tmp', CACHE_PATH)

            elapsed = time.time() - t0
            rate = completed_count[0] / elapsed if elapsed > 0 else 0
            remaining_sec = (len(needed_list) - completed_count[0]) / rate if rate > 0 else 0
            percent = (completed_count[0] / len(needed_list)) * 100
            print(f"[{completed_count[0]}/{len(needed_list)}] ({percent:.1f}%) - {rate:.1f} items/sec - Est. remaining: {remaining_sec/60:.1f} min")

        # Distribute batches round-robin across workers
        with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
            futures = []
            for idx, batch in enumerate(batches):
                w = workers[idx % NUM_WORKERS]
                futures.append(executor.submit(process_batch, w, batch, idx))
            
            for f in as_completed(futures):
                try:
                    f.result()
                except Exception as e:
                    print("Batch execution error:", e)

        # Final cache save
        with open(CACHE_PATH, 'w', encoding='utf-8') as cf:
            json.dump(cache, cf, ensure_ascii=False, indent=2)
        print(f"Saved {len(cache)} translated strings to cache.")

    # Now populate flat_en with translations from cache
    translated_count = 0
    for k in missing_keys:
        ar_text = flat_ar[k]
        if isinstance(ar_text, str) and ar_text.strip():
            trimmed = ar_text.strip()
            if trimmed in cache and cache[trimmed] and not ARABIC_RE.search(cache[trimmed]):
                flat_en[k] = cache[trimmed]
                translated_count += 1
            else:
                flat_en[k] = cache.get(trimmed, trimmed)

    print(f"Injected {translated_count} translations into flat_en.")

    # Unflatten and save complete en.json
    unflattened_en = unflatten_dict(flat_en)
    with open(EN_JSON_PATH, 'w', encoding='utf-8') as ef:
        json.dump(unflattened_en, ef, ensure_ascii=False, indent=2)
    print(f"Successfully updated {EN_JSON_PATH} with complete translations!")

    # Also update ui-dictionary.json
    updated_ui_dict = {}
    if os.path.exists(UI_DICT_PATH):
        with open(UI_DICT_PATH, 'r', encoding='utf-8') as f:
            updated_ui_dict = json.load(f)
    
    for k, v in cache.items():
        if k and v and not ARABIC_RE.search(v):
            updated_ui_dict[k] = v
            
    with open(UI_DICT_PATH, 'w', encoding='utf-8') as f:
        json.dump(updated_ui_dict, f, ensure_ascii=False, indent=2)
    print(f"Successfully updated {UI_DICT_PATH} (now {len(updated_ui_dict)} entries)!")

if __name__ == '__main__':
    main()
