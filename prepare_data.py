"""Convert original UCI semicolon-delimited files into an offline browser asset."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).parent
rows = []
for subject, filename in [('Mathematics', 'student-mat.csv'), ('Portuguese', 'student-por.csv')]:
    with (ROOT / 'data' / filename).open(encoding='utf-8', newline='') as stream:
        for row in csv.DictReader(stream, delimiter=';'):
            row = {key: int(value) if value.isdigit() else value for key, value in row.items()}
            rows.append(dict(row, subject=subject))
payload = json.dumps(rows, separators=(',', ':'))
(ROOT / 'web' / 'data.json').write_text(payload, encoding='utf-8')
(ROOT / 'web' / 'data.js').write_text(f'window.SCHOOL_DATA={payload};\n', encoding='utf-8')
print(f'Prepared {len(rows)} course records.')
