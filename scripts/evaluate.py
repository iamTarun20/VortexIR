"""Developer-authored relevance sanity set; not a general accuracy claim."""
import pathlib
import subprocess
root = pathlib.Path(__file__).resolve().parents[1]
records = {}
for line in (root / 'data/resources.tsv').read_text().splitlines():
    if line and not line.startswith('#'):
        row = line.split('\t')
        records[row[2]] = int(row[0])
hits = 0
reciprocal = 0
count = 0
print('| Query | Subject | First relevant rank |\n|---|---|---:|')
for line in (root / 'data/relevance.tsv').read_text().splitlines():
    if not line or line.startswith('#'):
        continue
    query, subject, ids = line.split('\t')
    relevant = set(map(int, ids.split(',')))
    output = subprocess.check_output([str(root / 'build/vortexir'), str(root / 'data/resources.tsv'), query, subject], text=True)
    ranked = [records[row.split('] ', 1)[1].rsplit(' (BM25 ', 1)[0]] for row in output.splitlines() if row.startswith('[')]
    rank = next((i + 1 for i, rid in enumerate(ranked) if rid in relevant), 0)
    hits += 0 < rank <= 3
    reciprocal += 1 / rank if rank else 0
    count += 1
    print(f'| {query} | {subject} | {rank or "Not found"} |')
print(f'\nHit@3: {hits}/{count}. Mean reciprocal rank: {reciprocal/count:.3f}.')
print('\nEditorial labels are narrow and non-exhaustive; this is not independent evaluation.')
