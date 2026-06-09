#!/usr/bin/env python3
"""
kakao_win.py — 윈도우 카카오톡 읽기 (Tier-2: 메모리 덤프 직접 파싱).

윈도우 카톡(v26.x)은 대화를 방마다 AES-256-CBC로 암호화한 chatLogs_*.edb로 저장한다.
키는 파일별이고 page별 IV 도출이 비공개라 오프라인 복호화는 막혀 있다.
대신 카톡 실행 중이면 복호화된 SQLite가 메모리에 있으므로, 프로세스 메모리를
덤프해 SQLite 리프 페이지를 직접 파싱하면 키 없이 메시지를 읽을 수 있다.

서브커맨드:
  dump                 실행 중인 KakaoTalk 메모리를 procdump로 덤프 (경로 config 저장)
  recent [N]           최근 메시지 N개 (시각 | 발신자 | 내용)
  rooms                방 목록 (prevLogId 사슬로 그룹핑, 참여자 이름 라벨)
  read <번호|이름> [N]  특정 방의 대화 N개 (시간순)
  search "kw" [N]      키워드 검색
  users                추출된 사용자(id→이름) 수 확인

방 구분 원리: chatLogs에 chatId는 없지만 prevLogId(이전 메시지 id)가 있어,
logId↔prevLogId 사슬의 연결요소 = 방. 참여자(non-me authorId)→이름으로 방 라벨.

전제: 카톡 실행 중 + 대화방 사용 이력. procdump64.exe(설치형 아님) 경로 필요.
출력 포맷은 Mac kakao-read와 최대한 맞춘다(파이프 구분).
"""
import sys, os, re, json, struct, subprocess, datetime, glob
from pathlib import Path

HOME = Path.home()
CONFIG = HOME / ".config/kakao-read/config.json"
PAGE = 4096

# 환경 감지: WSL이면 /mnt/c 로 윈도우 디스크 접근, 네이티브 윈도우면 C:\ 직접
IS_WSL = Path("/mnt/c").exists() and os.name != "nt"

def to_local(winpath):
    """윈도우 경로(C:\\Users\\x\\...)를 현재 환경에서 열 수 있는 경로로 변환.
    WSL: C:\\... -> /mnt/c/...  /  네이티브: 그대로."""
    if not IS_WSL:
        return winpath
    m = re.match(r'^([A-Za-z]):[\\/](.*)$', winpath)
    if m:
        return f"/mnt/{m.group(1).lower()}/" + m.group(2).replace('\\', '/')
    return winpath
# Mac kakao-read 와 동일한 타입 라벨
TYPE_LABEL = {1:None, 2:"[사진]", 27:"[사진]", 3:"[동영상]", 12:"[음성]",
              14:"[GIF/이모티콘]", 18:"[파일]", 26:None, 71:None, 72:None}


# ---------------- config ----------------
def _cfg():
    if CONFIG.exists():
        try: return json.loads(CONFIG.read_text())
        except Exception: return {}
    return {}

def _save_cfg(d):
    CONFIG.parent.mkdir(parents=True, exist_ok=True)
    CONFIG.write_text(json.dumps(d, ensure_ascii=False, indent=2))


# ---------------- SQLite leaf parser ----------------
def varint(buf, o):
    v = 0
    for i in range(9):
        if o + i >= len(buf): return None, o
        b = buf[o + i]
        if i == 8: return (v << 8) | b, o + 9
        v = (v << 7) | (b & 0x7f)
        if not (b & 0x80): return v, o + i + 1
    return v, o + 9

def _slen(t):
    return {0:0,1:1,2:2,3:3,4:4,5:6,6:8,7:8,8:0,9:0}.get(t, (t-12)//2 if t>=12 else 0)

def _rval(buf, o, t):
    n = _slen(t); raw = buf[o:o+n]
    if t == 0: return None, o
    if t == 8: return 0, o
    if t == 9: return 1, o
    if t in (1,2,3,4,5,6): return int.from_bytes(raw,'big',signed=True), o+n
    if t == 7: return (struct.unpack('>d', raw)[0] if n==8 else None), o+n
    if t >= 13: return raw.decode('utf-8','replace'), o+n
    if t >= 12: return raw, o+n
    return None, o+n

def parse_leaf(page):
    """table-leaf(0x0d) 페이지 → [(rowid, [values])]"""
    recs = []
    if not page or page[0] != 0x0d: return recs
    ncell = int.from_bytes(page[3:5],'big')
    if not (1 <= ncell <= 1000): return recs
    for c in range(ncell):
        po = 8 + c*2
        if po+2 > len(page): break
        cell = int.from_bytes(page[po:po+2],'big')
        if not (0 < cell < len(page)): continue
        o = cell
        plen, o = varint(page, o); rowid, o = varint(page, o)
        if plen is None or not (0 < plen <= len(page)): continue
        rs = o
        hlen, o2 = varint(page, o)
        if hlen is None or not (0 < hlen <= plen): continue
        types = []; oo = o2
        while oo < rs + hlen:
            t, oo = varint(page, oo)
            if t is None: break
            types.append(t)
        vals = []; vo = rs + hlen; ok = True
        for t in types:
            if vo > len(page): ok = False; break
            v, vo = _rval(page, vo, t); vals.append(v)
        if ok and vals: recs.append((rowid, vals))
    return recs


def scan(dump_path):
    """덤프에서 chatLogs 메시지 + 사용자(id→이름) 추출.
    반환: (msgs, users, own_id)
      msgs: logId -> (sendAt, authorId, type, message, write_on_pc)
      own_id: write_on_pc=1 메시지의 최빈 authorId (= 본인 추정), 없으면 None"""
    data = Path(dump_path).read_bytes()
    msgs = {}     # logId -> (sendAt, authorId, type, message, write_on_pc)
    users = {}    # userId -> name
    n = len(data)
    for m in re.finditer(b'\x0d', data):
        off = m.start()
        if off + PAGE > n: break
        ncell = int.from_bytes(data[off+3:off+5],'big')
        ccs = int.from_bytes(data[off+5:off+7],'big')
        if not (1 <= ncell <= 400) or not (8+2*ncell <= ccs <= PAGE): continue
        for rowid, vals in parse_leaf(data[off:off+PAGE]):
            nc = len(vals)
            # chatLogs: 19~22컬럼, [0]=logId(int), [4]=sendAt(unix), [5]=message(text/None)
            if 19 <= nc <= 22 and isinstance(vals[0], int):
                sendAt = vals[4] if isinstance(vals[4], int) else None
                if sendAt and 1500000000 <= sendAt <= 1900000000:
                    logId = vals[0]
                    if logId not in msgs:
                        wpc = vals[12] if (len(vals) > 12 and isinstance(vals[12], int)) else 0
                        prev = vals[10] if (len(vals) > 10 and isinstance(vals[10], int)) else 0
                        msgs[logId] = (sendAt, vals[1], vals[2], vals[5], wpc, prev)
            # talkUser: ~39컬럼, [0]=userId(int), [2]=nickName(text), [10]=friendNickName
            elif 35 <= nc <= 42 and isinstance(vals[0], int):
                uid = vals[0]
                name = None
                if len(vals) > 10 and isinstance(vals[10], str) and vals[10].strip():
                    name = vals[10]
                elif isinstance(vals[2], str) and vals[2].strip():
                    name = vals[2]
                if name and uid not in users:
                    users[uid] = name
            # Profile: 19컬럼, [0]=userId,[2]=nickname  (보조 이름 소스)
            elif nc == 19 and isinstance(vals[0], int) and isinstance(vals[2], str) and vals[2].strip():
                users.setdefault(vals[0], vals[2])
    # 본인 추정: config 우선 → write_on_pc=1 최빈 authorId
    from collections import Counter
    own_id = _cfg().get("win_own_id")
    if not own_id:
        own = Counter(a for (_, a, _, _, w, _p) in msgs.values() if w)
        own_id = own.most_common(1)[0][0] if own else None
    return msgs, users, own_id


def build_rooms(msgs, users, own):
    """prevLogId 사슬로 메시지를 방(연결요소)으로 묶는다.
    msgs: logId -> (sendAt, authorId, type, message, write_on_pc, prevLogId)
    반환: [room dict] (last 내림차순). room = {label, participants, msgs[]}"""
    ids = set(msgs)
    parent = {}
    def find(x):
        parent.setdefault(x, x)
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    def uni(a, b): parent[find(a)] = find(b)
    for lid, rec in msgs.items():
        find(lid)
        prev = rec[5]
        if prev in ids: uni(lid, prev)
    from collections import defaultdict
    comp = defaultdict(list)
    for lid in msgs: comp[find(lid)].append(lid)
    # 1:1 방(참여자 1명)끼리 같은 상대면 병합
    rooms = []
    for logids in comp.values():
        rmsgs = sorted((msgs[l] for l in logids), key=lambda x: x[0])
        authors = [r[1] for r in rmsgs]
        others = [a for a in authors if not (own and a == own)]
        partset = frozenset(others)
        rooms.append({"msgs": rmsgs, "others": partset,
                      "last": rmsgs[-1][0], "authors": set(authors)})
    # 참여자 집합이 같은 방 병합
    merged = {}
    for r in rooms:
        key = r["others"]
        if key in merged:
            m = merged[key]
            m["msgs"] = sorted(m["msgs"] + r["msgs"], key=lambda x: x[0])
            m["last"] = max(m["last"], r["last"])
            m["authors"] |= r["authors"]
        else:
            merged[key] = r
    out = list(merged.values())
    for r in out:
        names = [users.get(a, str(a)) for a in r["others"]]
        if not names:
            r["label"] = "(나만/시스템)"
        elif len(names) <= 3:
            r["label"] = ", ".join(names)
        else:
            r["label"] = f"{names[0]} 외 {len(names)-1}명"
    out.sort(key=lambda r: r["last"], reverse=True)
    return out


def is_system(message):
    """feedType 등 시스템/JSON 메시지 판별."""
    if not isinstance(message, str):
        return True
    s = message.lstrip()
    return s.startswith('{"feedType"') or s.startswith('{"feed') or ('"feedType"' in s[:40])


def fmt_msg(sendAt, authorId, typ, message, users, own_id=None):
    t = datetime.datetime.fromtimestamp(sendAt).strftime("%Y-%m-%d %H:%M")
    sender = "나" if (own_id and authorId == own_id) else users.get(authorId, str(authorId))
    label = TYPE_LABEL.get(typ, None)
    if label is not None:
        body = label + ((" " + message) if (typ == 18 and message) else "")
    elif message:
        body = str(message).replace("\n", " ")
    else:
        body = ""
    return t, sender, body


# ---------------- commands ----------------
def get_dump():
    p = _cfg().get("win_dump_path")
    if not p or not os.path.exists(p):
        sys.exit("덤프 없음. 먼저:  python3 kakao_win.py dump")
    return p

def cmd_dump():
    """KakaoTalk PID 찾아 procdump로 메모리 덤프."""
    procdump = _cfg().get("procdump_path") or shutil_which_procdump()
    if not procdump:
        sys.exit("procdump64.exe 경로를 config(procdump_path)에 지정하거나 PATH에 두세요.\n"
                 "다운로드: https://download.sysinternals.com/files/Procdump.zip")
    # PID
    r = subprocess.run(["powershell.exe","-NoProfile","-Command",
        "(Get-Process KakaoTalk -ErrorAction SilentlyContinue | Select-Object -First 1).Id"],
        capture_output=True, text=True)
    pid = (r.stdout or "").strip()
    if not pid.isdigit():
        sys.exit("KakaoTalk 프로세스를 못 찾음. 카톡 실행 + 대화방 하나 열어두세요.")
    # 사용자명 확보 → 윈도우/ WSL 경로
    user = subprocess.run(["powershell.exe","-NoProfile","-Command","$env:USERNAME"],
                          capture_output=True, text=True).stdout.strip()
    out_win = rf"C:\Users\{user}\AppData\Local\Temp\kt_kakao.dmp"   # procdump엔 항상 윈도우 경로
    out_access = to_local(out_win)                                   # 현재 환경에서 열 경로
    print(f"KakaoTalk PID={pid} → 덤프 중... (env={'WSL' if IS_WSL else 'native'})")
    subprocess.run([procdump, "-accepteula", "-ma", pid, out_win],
                   capture_output=True, text=True)
    if not os.path.exists(out_access):
        sys.exit("덤프 실패. procdump 권한/경로 확인.")
    d = _cfg(); d["win_dump_path"] = out_access; _save_cfg(d)
    sz = os.path.getsize(out_access)
    print(f"덤프 완료: {out_access} ({sz:,} bytes)")
    print("이제: python3 kakao_win.py recent 20")

def shutil_which_procdump():
    import shutil
    for n in ("procdump64.exe","procdump.exe","procdump"):
        p = shutil.which(n)
        if p: return p
    cands = [to_local(r"C:\Users\*\Downloads\procdump64.exe"),
             to_local(r"C:\Users\*\Downloads\procdump.exe")]
    if IS_WSL:
        cands.append("/tmp/procdump/procdump64.exe")
    for c in cands:
        g = glob.glob(c)
        if g: return g[0]
    return None

def cmd_recent(n=20):
    msgs, users, own = scan(get_dump())
    rows = sorted(msgs.values(), key=lambda x: x[0], reverse=True)
    print(f"# 최근 메시지 (덤프 기준 · 발신자 {len(users)}명 매핑 · 본인={'나' if own else '미상'})")
    shown = 0
    for sendAt, aid, typ, message, wpc, prev in rows:
        if is_system(message) and typ in (None, 0, 26, 71, 72): continue
        t, sender, body = fmt_msg(sendAt, aid, typ, message, users, own)
        if not body or is_system(body): continue
        print(f"{t}|{sender}|{body[:80]}")
        shown += 1
        if shown >= int(n): break

def cmd_search(kw, n=30):
    msgs, users, own = scan(get_dump())
    rows = sorted(msgs.values(), key=lambda x: x[0], reverse=True)
    print(f"# 검색: '{kw}'")
    shown = 0
    for sendAt, aid, typ, message, wpc, prev in rows:
        if not message or kw not in str(message) or is_system(message): continue
        t, sender, body = fmt_msg(sendAt, aid, typ, message, users, own)
        print(f"{t}|{sender}|{str(message).replace(chr(10),' ')[:80]}")
        shown += 1
        if shown >= int(n): break

def cmd_rooms():
    msgs, users, own = scan(get_dump())
    rooms = build_rooms(msgs, users, own)
    print(f"# 방 목록 (prevLogId 사슬 기준 · {len(rooms)}개 · 메모리에 올라온 것만)")
    for i, r in enumerate(rooms):
        last = datetime.datetime.fromtimestamp(r["last"]).strftime("%m-%d %H:%M")
        # 마지막 텍스트 미리보기
        prev = ""
        for sendAt, aid, typ, message, wpc, p in reversed(r["msgs"]):
            _, _, body = fmt_msg(sendAt, aid, typ, message, users, own)
            if body and not is_system(body): prev = body[:30]; break
        print(f"[{i}] {r['label']} | {len(r['msgs'])}건 | 최근 {last} | {prev}")
    print("# 특정 방 읽기: python3 kakao_win.py read <번호 또는 이름> [N]")

def cmd_read(query, n=40):
    msgs, users, own = scan(get_dump())
    rooms = build_rooms(msgs, users, own)
    room = None
    if query.isdigit() and int(query) < len(rooms):
        room = rooms[int(query)]
    else:
        for r in rooms:
            if query in r["label"]: room = r; break
    if not room:
        sys.exit(f"방 못 찾음: {query}  (먼저 rooms 로 목록 확인)")
    print(f"# {room['label']} ({len(room['msgs'])}건)")
    for sendAt, aid, typ, message, wpc, p in room["msgs"][-int(n):]:
        if is_system(message) and typ in (None,0,26,71,72): continue
        t, sender, body = fmt_msg(sendAt, aid, typ, message, users, own)
        if not body or is_system(body): continue
        print(f"{t}|{sender}|{body[:80]}")

def cmd_users():
    msgs, users, own = scan(get_dump())
    print(f"메시지 {len(msgs)}건, 사용자 매핑 {len(users)}명, 본인 추정 id={own}")
    for uid, name in list(users.items())[:20]:
        print(f"  {uid} -> {name}")


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    cmd = sys.argv[1]; a = sys.argv[2:]
    if cmd == "dump": cmd_dump()
    elif cmd == "recent": cmd_recent(a[0] if a else 20)
    elif cmd == "rooms": cmd_rooms()
    elif cmd == "read":
        if not a: sys.exit("방 번호/이름 필요 (rooms 로 목록 확인)")
        cmd_read(a[0], a[1] if len(a)>1 else 40)
    elif cmd == "search":
        if not a: sys.exit("검색어 필요")
        cmd_search(a[0], a[1] if len(a)>1 else 30)
    elif cmd == "users": cmd_users()
    else: sys.exit(__doc__)

if __name__ == "__main__":
    main()
